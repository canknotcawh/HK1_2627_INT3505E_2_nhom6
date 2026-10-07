import { useNavigate, Navigate } from "react-router-dom"
import { Button } from "../components/ui/button"
import { useAuth } from "../contexts/AuthContext"
import { Library, LogIn } from "lucide-react"

export default function Login() {
    const navigate = useNavigate();
    const { login, role } = useAuth();

    if (role === 'user') {
        return <Navigate to="/user" replace />;
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
            <div className="p-8 bg-white shadow-lg rounded-2xl max-w-sm w-full flex flex-col items-center border border-gray-100">
                {/* Logo */}
                <div className="bg-[#e60023] p-3 rounded-xl mb-6">
                    <Library className="w-8 h-8 text-white" />
                </div>

                <h2 className="text-2xl font-bold text-gray-800 mb-2">Chào mừng bạn</h2>
                <p className="text-gray-500 text-sm text-center mb-8">
                    Đăng nhập để mượn sách, theo dõi lịch sử và quản lý khoản mượn.
                </p>

                <Button
                    variant="brand"
                    className="w-full py-2.5 rounded-xl text-base"
                    onClick={() => {
                        login();
                        navigate("/user");
                    }}
                >
                    <LogIn className="w-4 h-4 mr-2" />
                    Đăng nhập Demo
                </Button>

                <p className="text-xs text-gray-400 mt-6 text-center">
                    Đây là chế độ demo. Nhấn nút để đăng nhập với tài khoản mẫu.
                </p>

                <button
                    onClick={() => navigate("/")}
                    className="mt-4 text-sm text-gray-500 hover:text-[#e60023] transition-colors"
                >
                    ← Quay lại trang chủ
                </button>
            </div>
        </div>
    )
}