import { createBrowserRouter } from "react-router-dom";
import ProtecedRoute from "./protected-route";
import PublicLayout from "@/components/layouts/PublicLayout";
import HomePage from "@/pages/PortalPage";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import History from "@/pages/History";
import Books from "@/pages/Books";

const router = createBrowserRouter([
    {
        path: "/login",
        element: <Login />
    },
    {
        element: <PublicLayout />,
        children: [
            { path: "/", element: <HomePage /> },
            { path: "/books", element: <Books /> }
        ]
    },
    {
        path: "/user",
        element: <ProtecedRoute />,
        children: [
            { path: "", element: <Dashboard /> },
            { path: "history", element: <History /> }
        ]
    }
]);

export default router;
