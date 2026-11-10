import { useEffect, useRef, useState } from "react"
import { Navigate, useLocation, useNavigate } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"
import { Library, Loader2 } from "lucide-react"
import ThemeToggle from "@/components/ui/ThemeToggle";
import { loadGoogleIdentityScript } from "../lib/google-identity"
import { isAxiosError } from "axios"
import { Button } from "../components/ui/button"
import { PasswordRequirements } from "../components/PasswordRequirements";
import { isStrongPassword } from "../lib/password-policy";

type Mode = 'login' | 'register';

function authErrorMessage(error: unknown): string {
    if (!isAxiosError<{ code?: string }>(error)) {
        return "Có lỗi xảy ra. Vui lòng thử lại.";
    }
    if (!error.response) {
        return "Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.";
    }
    const code = error.response?.data?.code;
    if (code === "ACCOUNT_DISABLED" || error.response?.status === 403) {
        return "Tài khoản của bạn đang bị khóa (Suspended).";
    }
    if (code === "GOOGLE_ACCOUNT_ONLY") {
        return "Email này đăng nhập bằng Google, hãy dùng nút Google ở trên.";
    }
    if (code === "EMAIL_ALREADY_REGISTERED") {
        return "Email đã được đăng ký, hãy đăng nhập.";
    }
    if (code === "EMAIL_REGISTERED_WITH_PASSWORD") {
        return "Email này đã đăng ký bằng mật khẩu, hãy đăng nhập bằng mật khẩu.";
    }
    if (error.response?.status === 401) {
        return "Email hoặc mật khẩu không đúng.";
    }
    return "Có lỗi xảy ra. Vui lòng thử lại.";
}

function redirectToAdminWeb(accessToken: string, refreshToken: string) {
    const adminUrl = new URL(import.meta.env.VITE_ADMIN_WEB_URL || window.location.origin);
    if (!import.meta.env.VITE_ADMIN_WEB_URL) adminUrl.port = "5175";
    adminUrl.pathname = "/admin";
    adminUrl.hash = `access_token=${accessToken}&refresh_token=${refreshToken}`;
    window.location.replace(adminUrl.toString());
}

export default function Login() {
    const { loginWithGoogleToken, loginWithPassword, register, role, initialized } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const from = (location.state as { from?: { pathname: string; search?: string } } | null)?.from;
    const buttonRef = useRef<HTMLDivElement>(null);
    const [error, setError] = useState("");

    const [mode, setMode] = useState<Mode>('login');
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [fullName, setFullName] = useState("");
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!initialized || role === 'user' || role === 'admin') return;

        const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim();
        if (!googleClientId) {
            setError("Google Sign-In chưa được cấu hình. Hãy điền VITE_GOOGLE_CLIENT_ID rồi khởi động lại main-web.");
            return;
        }

        let cancelled = false;

        loadGoogleIdentityScript()
            .then(() => {
                if (cancelled || !buttonRef.current || !window.google) return;

                window.google.accounts.id.initialize({
                    client_id: googleClientId,
                    callback: (response) => {
                        loginWithGoogleToken(response.credential)
                            .then((payload) => {
                                if (payload.user.role === 'ADMIN') {
                                    redirectToAdminWeb(payload.accessToken, payload.refreshToken);
                                }
                            })
                            .catch((e) => {
                                setError(authErrorMessage(e));
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

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setError("");
        if (mode === 'register' && !isStrongPassword(password)) {
            setError("Mật khẩu chưa đáp ứng đủ yêu cầu.");
            return;
        }
        setSubmitting(true);
        try {
            if (mode === 'login') {
                const payload = await loginWithPassword(email, password);
                if (payload.user.role === 'ADMIN') {
                    redirectToAdminWeb(payload.accessToken, payload.refreshToken);
                    return;
                }
            } else {
                await register(email, password, fullName);
                navigate('/verify-email', { state: { email, resendIn: 60 } });
            }
        } catch (submitError) {
            if (mode === 'register' && isAxiosError<{ code?: string }>(submitError)
                && submitError.response?.data?.code === 'EMAIL_VERIFICATION_DELIVERY_FAILED') {
                navigate('/verify-email', { state: { email, deliveryFailed: true } });
                return;
            }
            if (mode === 'login' && isAxiosError<{ code?: string }>(submitError)
                && submitError.response?.data?.code === 'EMAIL_NOT_VERIFIED') {
                navigate('/verify-email', { state: { email } });
                return;
            }
            setError(authErrorMessage(submitError));
        } finally {
            setSubmitting(false);
        }
    };

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
    if (role === 'user' || role === 'admin') {
        return <Navigate to={from ? `${from.pathname}${from.search ?? ""}` : "/dashboard"} replace />;
    }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <ThemeToggle floating />
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

        <div className="flex items-center gap-3 w-full my-5">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400">hoặc</span>
            <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* Email/password form */}
        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3">
            {mode === 'register' && (
                <input
                    type="text"
                    required
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="Họ và tên"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#e60023]/20 focus:border-[#e60023]"
                />
            )}
            <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Email"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#e60023]/20 focus:border-[#e60023]"
            />
            <input
                type="password"
                required
                minLength={mode === 'register' ? 8 : undefined}
                maxLength={mode === 'register' ? 100 : undefined}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Mật khẩu"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#e60023]/20 focus:border-[#e60023]"
            />
            {mode === 'register' && <PasswordRequirements value={password} />}
            <Button type="submit" variant="brand" className="w-full" disabled={submitting}>
                {submitting ? "Đang xử lý..." : mode === 'login' ? "Đăng nhập" : "Đăng ký"}
            </Button>
        </form>

        <button
            type="button"
            onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(""); }}
            className="mt-3 text-sm font-medium text-[#e60023] hover:underline"
        >
            {mode === 'login' ? "Chưa có tài khoản? Đăng ký" : "Đã có tài khoản? Đăng nhập"}
        </button>

        {mode === 'login' && (
            <a href="/reset-password" className="mt-2 text-xs text-gray-500 hover:text-[#e60023] hover:underline">
                Quên mật khẩu?
            </a>
        )}

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
