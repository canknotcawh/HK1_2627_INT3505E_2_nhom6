import { Navigate } from "react-router-dom"
import AdminLayout from "../components/layouts/AdminLayout"
import { useAuth } from "../contexts/AuthContext"
import { LoaderCircle } from "lucide-react"

export default function ProtectedRoute() {
    const { initialized, authenticated, user, authError } = useAuth()

    if (!initialized) {
        return (
            <div className="flex min-h-screen items-center justify-center gap-3 text-sm text-neutral-500">
                <LoaderCircle className="size-5 animate-spin" />
                Đang xác thực tài khoản…
            </div>
        )
    }

    if (!authenticated) {
        return <Navigate to="/login" replace />
    }

    if (authError && !user) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
                <h1 className="text-xl font-semibold">Không kiểm tra được quyền truy cập</h1>
                <p className="max-w-md text-sm text-neutral-600">{authError}</p>
            </div>
        )
    }

    if (user?.role !== "ADMIN") {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
                <h1 className="text-xl font-semibold">Tài khoản chưa có quyền quản trị</h1>
                <p className="max-w-md text-sm text-neutral-600">
                    Hãy đăng nhập bằng tài khoản admin đã được cấp quyền hoặc liên hệ người quản trị hệ thống.
                </p>
            </div>
        )
    }

    return <AdminLayout />
}
