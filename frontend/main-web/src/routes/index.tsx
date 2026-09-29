import { createBrowserRouter } from "react-router-dom";
import ProtecedRoute from "./protected-route";
import PublicLayout from "@/components/layouts/PublicLayout";
import HomePage from "@/pages/PortalPage";
import Login from "@/pages/Login";
import Profile from "@/pages/Dashboard";
import Books from "@/pages/Books";
import MyLoans from "@/pages/MyLoans";

const router = createBrowserRouter([
  { path: "/login", element: <Login /> },
  {
    element: <PublicLayout />,
    children: [{ path: "/", element: <HomePage /> }],
  },
  {
    element: <ProtecedRoute />,
    children: [
      { path: "/user", element: <Profile /> },
      { path: "/user/books", element: <Books /> },
      { path: "/user/loans", element: <MyLoans /> },
    ],
  },
]);

export default router;
