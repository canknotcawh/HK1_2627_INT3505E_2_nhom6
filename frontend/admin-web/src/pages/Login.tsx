import { useEffect, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { LoaderCircle, ShieldCheck } from "lucide-react";
import { Button } from "../components/ui/button";
import { useAuth } from "../contexts/AuthContext";
import { loadGoogleIdentityScript } from "../lib/google-identity";

export default function Login() {
  const { initialized, authenticated, user, authError, loginWithGoogleToken, logout, refreshUser } = useAuth();
  const [checking, setChecking] = useState(false);
  const [googleError, setGoogleError] = useState("");
  const buttonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authenticated || !user || user.role === "ADMIN") return;

    const mainWebUrl = new URL(import.meta.env.VITE_MAIN_WEB_URL || window.location.origin);
    if (!import.meta.env.VITE_MAIN_WEB_URL) mainWebUrl.port = "5173";
    mainWebUrl.pathname = "/";
    mainWebUrl.search = "";
    mainWebUrl.hash = "";
    window.location.replace(mainWebUrl.toString());
  }, [authenticated, user]);

  useEffect(() => {
    if (!initialized || authenticated) return;

    let cancelled = false;

    loadGoogleIdentityScript()
      .then(() => {
        if (cancelled || !buttonRef.current || !window.google) return;

        window.google.accounts.id.initialize({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
          callback: (response) => {
            loginWithGoogleToken(response.credential).catch(() => {
              setGoogleError("Đăng nhập bằng Google không thành công. Vui lòng thử lại.");
            });
          },
        });
        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: "outline",
          size: "large",
          width: 300,
          text: "signin_with",
        });
      })
      .catch(() => setGoogleError("Không thể tải Google Sign-In. Vui lòng thử lại."));

    return () => {
      cancelled = true;
    };
  }, [initialized, authenticated, loginWithGoogleToken]);

  const checkAdminAccess = async () => {
    setChecking(true);
    try {
      await refreshUser();
    } catch {
      // The context keeps the connection error visible for the user.
    } finally {
      setChecking(false);
    }
  };

  if (!initialized) {
    return (
      <main className="flex min-h-screen items-center justify-center gap-3 text-sm text-neutral-500">
        <LoaderCircle className="size-5 animate-spin" />
        Đang kiểm tra đăng nhập…
      </main>
    );
  }

  if (authenticated && user?.role === "ADMIN") {
    return <Navigate to="/" replace />;
  }

  if (authenticated && user && user.role !== "ADMIN") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-neutral-100 p-5">
        <p className="text-sm text-neutral-600">Tài khoản bạn đọc không có quyền quản trị. Đang chuyển về cổng bạn đọc…</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-100 p-5">
      <section className="w-full max-w-md rounded-2xl border bg-white p-8 shadow-sm">
        <div className="mb-6 flex size-12 items-center justify-center rounded-xl bg-neutral-950 text-white">
          <ShieldCheck className="size-6" />
        </div>
        <h1 className="text-2xl font-semibold">Cổng quản trị thư viện</h1>
        <p className="mt-2 text-sm leading-6 text-neutral-600">
          Đăng nhập bằng tài khoản Google được cấp quyền admin trong hệ thống.
        </p>

        {authError && (
          <p role="alert" className="mt-5 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
            {authError}
          </p>
        )}

        {authenticated && !user ? (
          <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p>Phiên đăng nhập đã được xác nhận, nhưng chưa lấy được hồ sơ và quyền từ backend.</p>
            <div className="mt-3 flex gap-3">
              <Button type="button" disabled={checking} onClick={() => void checkAdminAccess()}>
                {checking ? "Đang kiểm tra…" : "Thử kiểm tra lại"}
              </Button>
              <Button type="button" variant="outline" onClick={() => logout()}>
                Đăng xuất
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-7">
            <div ref={buttonRef} />
            {googleError && <p className="mt-3 text-sm text-red-600" role="alert">{googleError}</p>}
          </div>
        )}
      </section>
    </main>
  );
}
