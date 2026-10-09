import { createBrowserRouter } from "react-router-dom";
import ProtecedRoute from "./protected-route";
import PublicLayout from "@/components/layouts/PublicLayout";
import HomePage from "@/pages/PortalPage";
import UserHomePage from "@/pages/UserHomePage";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import History from "@/pages/History";
import Books from "@/pages/Books";
import BookDetail from "@/pages/BookDetail";
import Profile from "@/pages/Profile";
import { useAuth } from "@/contexts/AuthContext";

function HomeRouter() {
    const { role } = useAuth();
    return role === 'user' ? <UserHomePage /> : <HomePage />;
}

const router = createBrowserRouter([
    {
        path: "/login",
        element: <Login />
    },
    {
        element: <PublicLayout />,
        children: [
            { path: "/", element: <HomeRouter /> },
            { path: "/books", element: <Books /> },
            { path: "/books/:id", element: <BookDetail /> },
        ]
    },
    {
        path: "/user",
        element: <ProtecedRoute />,
        children: [
            { path: "", element: <Dashboard /> },
            { path: "history", element: <History /> },
            { path: "profile", element: <Profile /> }
        ]
    }
]);

export default router;
