import { useEffect, useRef, useState } from "react"
import { Navigate, useLocation } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"
import { Library, Loader2 } from "lucide-react"
import { loadGoogleIdentityScript } from "../lib/google-identity"

export default function Login() {
    const { loginWithGoogleToken, role, initialized } = useAuth();
    const from = (useLocation().state as { from?: { pathname: string; search?: string } } | null)?.from;
    const buttonRef = useRef<HTMLDivElement>(null);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!initialized || role === 'user') return;

        let cancelled = false;

        loadGoogleIdentityScript()
            .then(() => {
                if (cancelled || !buttonRef.current || !window.google) return;

                window.google.accounts.id.initialize({
                    client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
                    callback: (response) => {
                        loginWithGoogleToken(response.credential).catch(() => {
                            setError("Đăng nhập bằng Google không thành công. Vui lòng thử lại.");
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
            .catch(() => setError("Không thể tải Google Sign-In. Vui lòng thử lại."));

        return () => {
            cancelled = true;
        };
    }, [initialized, role, loginWithGoogleToken]);

    // Show loading spinner while checking authentication status
    if (!initialized) {
        return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
            <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-[#e60023]" />

            <p className="text-sm text-gray-500">
                Đang kiểm tra đăng nhập...
            </p>
            </div>
        </div>
        );
    }

    // Redirect to user dashboard if already logged in
    if (role === 'user') {
        return <Navigate to={from ? `${from.pathname}${from.search ?? ""}` : "/user"} replace />;
    }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="p-8 bg-white shadow-lg rounded-2xl max-w-sm w-full flex flex-col items-center border border-gray-100">

        {/* Logo */}
        <div className="bg-[#e60023] p-3 rounded-xl mb-6">
          <Library className="w-8 h-8 text-white" />
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          Chào mừng bạn
        </h2>

        <p className="text-gray-500 text-sm text-center mb-8">
          Đăng nhập để mượn sách, theo dõi lịch sử
          và quản lý khoản mượn.
        </p>

        {/* Google Sign-In */}
        <div ref={buttonRef} />

        {error && <p className="mt-3 text-sm text-red-600" role="alert">{error}</p>}

        {/* Back */}
        <button
          onClick={() => {
            window.location.href = "/";
          }}
          className="mt-6 text-sm text-gray-500 hover:text-[#e60023] transition-colors"
        >
          ← Quay lại trang chủ
        </button>
      </div>
    </div>
  );
}
