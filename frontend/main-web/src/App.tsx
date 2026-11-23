import { useEffect } from "react";
import { RouterProvider } from "react-router-dom";
import router from "./routes";
import { AuthProvider } from "./contexts/AuthContext";
import { useAuth } from "./contexts/AuthContext";

function ShortcutBlock() {
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F12") {
        e.preventDefault();
        return;
      }

      const ctrlOrMeta = e.ctrlKey || e.metaKey;

      if (ctrlOrMeta && ["s", "S", "p", "P", "u", "U"].includes(e.key)) {
        e.preventDefault();
        return;
      }

      if (ctrlOrMeta && e.shiftKey && ["i", "I", "j", "J", "c", "C"].includes(e.key)) {
        e.preventDefault();
        return;
      }
    };

    window.addEventListener("contextmenu", handleContextMenu, { capture: true });
    window.addEventListener("keydown", handleKeyDown, { capture: true });

    return () => {
      window.removeEventListener("contextmenu", handleContextMenu, { capture: true });
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
    };
  }, []);

  return null;
}

function MainWebGate() {
  const { role, initialized, roleError, logout } = useAuth();

  if (!initialized) {
    return <main className="flex min-h-screen items-center justify-center text-sm text-neutral-500">Đang kiểm tra quyền truy cập…</main>;
  }

  if (role === "unknown") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
        <h1 className="text-xl font-semibold">Chưa xác minh được quyền tài khoản</h1>
        <p className="max-w-md text-sm text-neutral-600">Không thể lấy hồ sơ từ backend nên chưa thể mở cổng bạn đọc. Hãy kiểm tra backend hoặc đăng xuất rồi thử lại.</p>
        {roleError && <p className="max-w-md text-sm text-red-700">{roleError}</p>}
        <button type="button" onClick={() => void logout()} className="rounded-md border px-4 py-2 text-sm">Đăng xuất</button>
      </main>
    );
  }

  return <RouterProvider router={router} />;
}

export default function App() {
  return (
    <AuthProvider>
      <ShortcutBlock />
      <MainWebGate />
    </AuthProvider>
  );
}
