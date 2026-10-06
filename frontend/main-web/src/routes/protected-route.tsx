import UserLayout from "@/components/layouts/UserLayout"
import { Navigate } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"

export default function ProtecedRoute() {
    const { role } = useAuth();
    return role === 'user' ? <UserLayout /> : <Navigate to="/login" replace />
}