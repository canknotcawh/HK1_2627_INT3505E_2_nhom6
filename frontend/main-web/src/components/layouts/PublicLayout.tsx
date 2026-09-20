import { Outlet } from "react-router-dom";

export default function PublicLayout() {
    return (
        <div>
            This is Public Layout
            <Outlet />
        </div>
    )
}