import { Navigate } from "react-router-dom"
import { Button } from "../components/ui/button"
import { useAuth } from "../contexts/AuthContext"
import { Library, Mail, Loader2 } from "lucide-react"

export default function Login() {
    const { login, forgotPassword, role, initialized } = useAuth();

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
        return <Navigate to="/user" replace />;
    }

    // Redirect to admin dashboard if already logged in
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

        {/* Email login */}
        <Button
          variant="brand"
          className="w-full py-2.5 rounded-xl text-base"
          onClick={() => login()}
        >
          <Mail className="w-4 h-4 mr-2" />
          Đăng nhập bằng email
        </Button>

        <button
          type="button"
          onClick={() => void forgotPassword()}
          className="mt-3 text-sm font-medium text-[#e60023] hover:underline"
        >
          Quên mật khẩu?
        </button>

        <Button
          variant="outline"
          className="w-full py-2.5 rounded-xl text-base mt-3"
          onClick={() => login("facebook")}
        >
          <span className="mr-2 text-lg font-bold text-[#1877F2]">f</span>
          Tiếp tục với Facebook
        </Button>

        <p className="text-xs text-gray-400 mt-6 text-center">
          Đăng nhập email và mật khẩu qua Keycloak. Facebook cần được cấu hình
          trong Keycloak trước khi sử dụng.
        </p>

        {/* Back */}
        <button
          onClick={() => {
            window.location.href = "/";
          }}
          className="mt-4 text-sm text-gray-500 hover:text-[#e60023] transition-colors"
        >
          ← Quay lại trang chủ
        </button>
      </div>
    </div>
  );
}
