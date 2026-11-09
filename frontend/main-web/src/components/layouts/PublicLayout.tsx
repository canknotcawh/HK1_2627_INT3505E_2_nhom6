import { Outlet, useLocation } from "react-router-dom";
import NavBar from "./NavBar";

export default function PublicLayout() {
    const location = useLocation();
    const isBookDetail = location.pathname.startsWith("/books/");

    return (
        <div className="min-h-screen flex flex-col bg-white">
            <NavBar />
            {isBookDetail ? (
                <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
                    <Outlet />
                </main>
            ) : (
                <main className="container mx-auto p-4 md:p-8 flex-1">
                    <Outlet />
                </main>
            )}
        </div>
    );
}