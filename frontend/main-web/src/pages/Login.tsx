import { useNavigate, Navigate } from "react-router-dom"
import { Button } from "../components/ui/button"
import { useAuth } from "../contexts/AuthContext"

export default function Login() {
    const navigate = useNavigate();
    const { login, role } = useAuth();

    if (role === 'user') {
        return <Navigate to="/user" replace />;
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="p-8 bg-white shadow rounded max-w-sm w-full flex flex-col items-center">
                <h2 className="text-2xl font-bold mb-6">Đăng nhập (Simulate)</h2>
                <Button
                    variant="brand"
                    className="w-full"
                    onClick={() => {
                        login(); // Set state to 'user'
                        navigate("/user"); // Go back to Home
                    }}
                >
                    Đăng nhập dưới quyền User
                </Button>
            </div>
        </div>
    )
}