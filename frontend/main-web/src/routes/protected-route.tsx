import UserLayout from "@/components/layouts/UserLayout"
import { Navigate } from "react-router-dom"

export default function ProtecedRoute() {
    const token = true  // Them hook lay token nguoi dung sau :(
    return token ? < UserLayout/> : <Navigate to="/login" replace />
}