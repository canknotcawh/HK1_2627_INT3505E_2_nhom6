import { Outlet } from "react-router-dom";
// Outlet matchs with routes defines in App.jsx

function AdminLayout() {
    return (
        <main style={{ padding: "24px" }}>
            <Outlet />
        </main>
    );
}

export default AdminLayout;