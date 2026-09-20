import { Navigate } from "react-router-dom"
import AdminLayout from "../components/layouts/AdminLayout"

export default function ProtecedRoute() {
    const token = true  // Them hook lay token nguoi dung sau :(
    return token ? <AdminLayout /> : <Navigate to="/login" replace />
}