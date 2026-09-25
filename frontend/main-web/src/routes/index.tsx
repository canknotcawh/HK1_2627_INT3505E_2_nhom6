import { createBrowserRouter } from "react-router-dom";
import ProtecedRoute from "./protected-route";
import PublicLayout from "@/components/layouts/PublicLayout";
import HomePage from "@/pages/PortalPage";
import Login from "@/pages/Login";
import Profile from "@/pages/Dashboard";

const router = createBrowserRouter([
    {
        path: "/login",
        element: <Login />
    },
    {
        element: <PublicLayout />,
        children: [
            { path: "/", element: <HomePage /> }
        ]
    },
    {
        element: <ProtecedRoute />,
        children: [
            { path: "/user", element: <Profile /> },
        ]
    }
]);

export default router;
