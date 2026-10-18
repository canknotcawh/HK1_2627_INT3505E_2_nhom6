import { useEffect } from "react";
import { RouterProvider } from "react-router-dom";
import router from "./routes";
import { AuthProvider } from "./contexts/AuthContext";
import { useAuth } from "./contexts/AuthContext";

function MainWebGate() {
  const { role, initialized, roleError, logout } = useAuth();

  useEffect(() => {
    if (!initialized || role !== "admin") return;

    const adminUrl = new URL(import.meta.env.VITE_ADMIN_WEB_URL || window.location.origin);
    if (!import.meta.env.VITE_ADMIN_WEB_URL) adminUrl.port = "5175";
    adminUrl.pathname = "/";
    adminUrl.search = "";
    adminUrl.hash = "";
    window.location.replace(adminUrl.toString());
  }, [initialized, role]);

  if (!initialized) {
    return <main className="flex min-h-screen items-center justify-center text-sm text-neutral-500">Đang kiểm tra quyền truy cập…</main>;
  }

  if (role === "admin") {
    return <main className="flex min-h-screen items-center justify-center text-sm text-neutral-500">Đang chuyển tới cổng quản trị…</main>;
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
      <MainWebGate />
    </AuthProvider>
  );
}
