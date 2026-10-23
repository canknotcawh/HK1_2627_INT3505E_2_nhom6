import UserLayout from "@/components/layouts/UserLayout"
import { Navigate, useLocation } from "react-router-dom"
import { Loader2 } from "lucide-react"
import { useAuth } from "../contexts/AuthContext"

export default function ProtectedRoute() {
    const { role, initialized } = useAuth();
    const location = useLocation();

    // Session restore from the stored access token is async: until it finishes `role` is still
    // "guest" and redirecting now would bounce a signed-in user to /login on every refresh / deep link.
    if (!initialized) {
        return (
            <div className="flex min-h-screen items-center justify-center" role="status">
                <Loader2 className="h-8 w-8 animate-spin text-[#e60023]" />
            </div>
        )
    }
    return (role === 'user' || role === 'admin') ? <UserLayout /> : <Navigate to="/login" replace state={{ from: location }} />
}
