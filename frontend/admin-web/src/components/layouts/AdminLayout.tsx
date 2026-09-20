import { Outlet } from "react-router-dom"

export default function AdminLayout () {
    return (
        <div> 
            Đây là AdminLayout
            <Outlet />
        </div>
    )
}