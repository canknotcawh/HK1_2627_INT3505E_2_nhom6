import type { ReactElement } from "react";
import { createBrowserRouter } from "react-router-dom";
import ProtectedRoute from "./protected-route";
import Login from "../pages/Login";
import UserPage from "../pages/UserPage";
import UserDetailPage from "../pages/UserDetailPage";
import Dashboard from "../pages/Dashboard";
import UserRequest from "../pages/UserRequest";
import Borrow from "../pages/Borrow";

type AdminRoute = {
    path: string;
    element: ReactElement;
    handle: { title: string; label: string; hidden?: boolean };
};

export const adminRoutes: AdminRoute[] = [
    { path: "/", element: <Dashboard />, handle: { title: "Bảng điều khiển", label: "Bảng điều khiển" }},
    { path: "/return-requests", element: <UserRequest />, handle: { title: "Yêu cầu trả sách", label: "Yêu cầu trả sách" }},
    { path: "/borrow", element: <Borrow />, handle: { title: "Quản lý mượn/trả", label: "Quản lý mượn/trả" }},
    { path: "/categories", element: <></>, handle: { title: "Quản lý danh mục", label: "Quản lý danh mục" }},
    { path: "/user", element: <UserPage />, handle: { title: "Quản lý người dùng", label: "Quản lý người dùng" }},
    { path: "/user/:userId", element: <UserDetailPage />, handle: { title: "Chi tiết người dùng", label: "Chi tiết người dùng", hidden: true }},
    { path: "/logs", element: <></>, handle: { title: "Nhật ký", label: "Nhật ký" }},
]

const router = createBrowserRouter([
    {
        path: "/login",
        element: <Login />
    },
    {
        element: <ProtectedRoute />,
        children: adminRoutes
    }
]);

export default router;
