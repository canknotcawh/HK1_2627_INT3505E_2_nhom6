import { useEffect, useRef, useState, type ReactNode } from "react";
import { ShieldAlert } from "lucide-react";
import { reportSecurityEvent } from "../../lib/security-events";

function runDebuggerCheck(): boolean {
  const start = performance.now();
  // Invoke debugger via Function constructor so bundlers do not strip it
  (Function("debugger"))();
  return performance.now() - start > 100;
}

export default function DevToolsGuard({ children }: { children: ReactNode }) {
  const [devToolsOpen, setDevToolsOpen] = useState(() => runDebuggerCheck());
  const reportedRef = useRef(false);

  useEffect(() => {
    if (devToolsOpen && !reportedRef.current) {
      reportedRef.current = true;
      reportSecurityEvent({
        eventType: "DEVTOOLS_DETECTED",
        severity: "HIGH",
        details: "Debugger timing check exceeded 100ms threshold",
      });
    } else if (!devToolsOpen) {
      reportedRef.current = false;
    }
  }, [devToolsOpen]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      if (runDebuggerCheck()) {
        setDevToolsOpen(true);
      }
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, []);

  if (devToolsOpen) {
    // Overlay cố định phủ toàn viewport: khung đọc (dialog) là phần tử trong luồng trang
    // nên nếu render tại chỗ, cảnh báo sẽ rơi xuống cuối trang và không che được nội dung.
    return (
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="devtools-guard-title"
        aria-describedby="devtools-guard-description"
        className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-4 overflow-y-auto bg-neutral-950 p-6 text-center text-neutral-100"
      >
        <ShieldAlert className="size-12 shrink-0 text-red-500" aria-hidden="true" />
        <h1 id="devtools-guard-title" className="text-xl font-bold text-red-400">
          Phát hiện DevTools đang mở
        </h1>
        <p id="devtools-guard-description" className="max-w-md text-sm text-neutral-300">
          Để bảo vệ bản quyền tài liệu và an toàn hệ thống, vui lòng đóng toàn bộ cửa sổ DevTools rồi nhấn nút bên dưới để tiếp tục.
        </p>
        <button
          type="button"
          onClick={() => setDevToolsOpen(runDebuggerCheck())}
          className="cursor-pointer rounded-lg bg-[#e60023] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#cc0020]"
        >
          Tôi đã đóng DevTools, thử lại
        </button>
      </div>
    );
  }

  return <>{children}</>;
}

