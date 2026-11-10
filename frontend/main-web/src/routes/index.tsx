import { createBrowserRouter, Navigate } from "react-router-dom";
import ProtectedRoute from "./protected-route";
import PublicLayout from "@/components/layouts/PublicLayout";
import HomePage from "@/pages/PortalPage";
import Explore from "@/pages/Explore";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import History from "@/pages/History";
import Search from "@/pages/Search";
import Categories from "@/pages/Categories";
import BookDetail from "@/pages/BookDetail";
import Profile from "@/pages/Profile";
import PasswordReset from "@/pages/PasswordReset";
import EmailVerification from "@/pages/EmailVerification";
import { useAuth } from "@/contexts/AuthContext";

function HomeRouter() {
    const { role } = useAuth();
    if (role === 'user' || role === 'admin') {
        return <Navigate to="/dashboard" replace />;
    }
    return <HomePage />;
}

const router = createBrowserRouter([
    {
        path: "/login",
        element: <Login />
    },
    { path: "/reset-password", element: <PasswordReset /> },
    { path: "/verify-email", element: <EmailVerification /> },
    {
        element: <PublicLayout />,
        children: [
            { path: "/", element: <HomeRouter /> },
            { path: "/search", element: <Search /> },
            { path: "/categories", element: <Categories /> },
            { path: "/books", element: <Navigate to="/search" replace /> },
            { path: "/books/:id", element: <BookDetail /> },
        ]
    },
    {
        element: <ProtectedRoute />,
        children: [
            { path: "/dashboard", element: <Dashboard /> },
            { path: "/explore", element: <Explore /> },
            { path: "/history", element: <History /> },
            { path: "/profile", element: <Profile /> },
            // Backwards compatibility for old /user routes
            { path: "/user", element: <Navigate to="/dashboard" replace /> },
            { path: "/user/history", element: <Navigate to="/history" replace /> },
            { path: "/user/profile", element: <Navigate to="/profile" replace /> },
        ]
    }
]);

export default router;
