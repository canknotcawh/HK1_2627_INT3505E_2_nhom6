import { createBrowserRouter } from "react-router-dom";
import ProtecedRoute from "./protected-route";
import Login from "../pages/Login";
import UserPage from "../pages/UserPage";
import Dashboard from "../pages/Dashboard";

const router = createBrowserRouter([
    {
        path: "/login",
        element: <Login />
    },
    {
        element: <ProtecedRoute />,
        children: [
            { path: "/user", element: <UserPage /> },
            { path: "/", element: <Dashboard /> },
        ]
    }
]);

export default router;
