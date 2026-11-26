import { useEffect, useState, type ReactNode } from "react";
import { ShieldAlert } from "lucide-react";

function runDebuggerCheck(): boolean {
  const start = performance.now();
  // Invoke debugger via Function constructor so bundlers do not strip it
  (Function("debugger"))();
  return performance.now() - start > 100;
}

export default function DevToolsGuard({ children }: { children: ReactNode }) {
  const [devToolsOpen, setDevToolsOpen] = useState(() => runDebuggerCheck());

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      if (runDebuggerCheck()) {
        setDevToolsOpen(true);
      }
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, []);

  if (devToolsOpen) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-neutral-950 p-6 text-center text-neutral-100">
        <ShieldAlert className="size-12 text-red-500" aria-hidden="true" />
        <h1 className="text-xl font-bold text-red-400">
          Phát hiện DevTools đang mở
        </h1>
        <p className="max-w-md text-sm text-neutral-300">
          Để bảo vệ bản quyền tài liệu và an toàn hệ thống, vui lòng đóng toàn bộ cửa sổ DevTools rồi nhấn nút bên dưới để tiếp tục.
        </p>
        <button
          type="button"
          onClick={() => setDevToolsOpen(runDebuggerCheck())}
          className="cursor-pointer rounded-lg bg-[#e60023] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#cc0020]"
        >
          Tôi đã đóng DevTools, thử lại
        </button>
      </main>
    );
  }

  return <>{children}</>;
}

