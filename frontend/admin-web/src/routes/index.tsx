import type { ReactElement } from "react";
import { createBrowserRouter, Navigate, redirect } from "react-router-dom";
import ProtectedRoute from "./protected-route";
import Login from "../pages/Login";
import UserPage from "../pages/UserPage";
import UserDetailPage from "../pages/UserDetailPage";
import Dashboard from "../pages/Dashboard";
import UserRequest from "../pages/UserRequest";
import Borrow from "../pages/Borrow";
import BookCatalog from "../pages/BookCatalog";
import Categories from "../pages/Categories";

export interface AdminRouteDef {
    path: string;
    fullPath: string;
    element: ReactElement;
    handle: { title: string; label: string; hidden?: boolean };
}

export const adminRoutes: AdminRouteDef[] = [
    { path: "dashboard", fullPath: "/admin/dashboard", element: <Dashboard />, handle: { title: "Bảng điều khiển", label: "Bảng điều khiển" } },
    { path: "users", fullPath: "/admin/users", element: <UserPage />, handle: { title: "Quản lý người dùng", label: "Quản lý người dùng" } },
    { path: "users/:userId", fullPath: "/admin/users/:userId", element: <UserDetailPage />, handle: { title: "Chi tiết người dùng", label: "Chi tiết người dùng", hidden: true } },
    { path: "books", fullPath: "/admin/books", element: <BookCatalog />, handle: { title: "Quản lý sách", label: "Quản lý sách" } },
    { path: "categories", fullPath: "/admin/categories", element: <Categories />, handle: { title: "Quản lý danh mục", label: "Quản lý danh mục" } },
    { path: "loans", fullPath: "/admin/loans", element: <Borrow />, handle: { title: "Quản lý mượn/trả", label: "Quản lý mượn/trả" } },
    { path: "return-requests", fullPath: "/admin/return-requests", element: <UserRequest />, handle: { title: "Yêu cầu trả sách", label: "Yêu cầu trả sách" } },
    { path: "logs", fullPath: "/admin/logs", element: <></>, handle: { title: "Nhật ký", label: "Nhật ký" } },
];

const router = createBrowserRouter([
    {
        path: "/",
        element: <Navigate to="/admin" replace />,
    },
    {
        path: "/login",
        element: <Navigate to="/admin/login" replace />,
    },
    {
        path: "/admin/login",
        element: <Login />,
    },
    {
        path: "/admin",
        element: <ProtectedRoute />,
        children: [
            { index: true, element: <Navigate to="/admin/dashboard" replace /> },
            ...adminRoutes.map(({ path, element, handle }) => ({ path, element, handle })),
        ],
    },
    { path: "/return-requests", element: <Navigate to="/admin/return-requests" replace /> },
    { path: "/borrow", element: <Navigate to="/admin/loans" replace /> },
    { path: "/books", element: <Navigate to="/admin/books" replace /> },
    { path: "/categories", element: <Navigate to="/admin/categories" replace /> },
    { path: "/user", element: <Navigate to="/admin/users" replace /> },
    { path: "/user/:userId", loader: ({ params }) => redirect(`/admin/users/${params.userId}`) },
    { path: "/logs", element: <Navigate to="/admin/logs" replace /> },
]);

export default router;
