import { Outlet } from "react-router-dom"

export default function UserLayout() {
    return (
        <div>
            This is User Layout
            <Outlet />
        </div>
    )
}