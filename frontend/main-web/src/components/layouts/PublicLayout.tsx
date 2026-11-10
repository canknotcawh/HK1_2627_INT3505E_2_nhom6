import { Outlet, useLocation } from "react-router-dom";
import NavBar from "./NavBar";

export default function PublicLayout() {
    const { pathname } = useLocation();
    // The landing and book detail pages draw edge-to-edge backgrounds and manage their own containers.
    const fullBleed = pathname === "/" || pathname.startsWith("/books/");

    return (
        <div>
            <NavBar />
            <main className={fullBleed ? "overflow-x-clip" : "container mx-auto p-4 md:p-8"}>
                <Outlet />
            </main>
        </div>
    )
}
