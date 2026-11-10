import { Outlet, useLocation } from "react-router-dom";
import NavBar from "./NavBar";

export default function PublicLayout() {
    const { pathname } = useLocation();
    // The landing page draws edge-to-edge backgrounds and manages its own containers.
    const fullBleed = pathname === "/";

    return (
        <div>
            <NavBar />
            <main className={fullBleed ? "overflow-x-clip" : "container mx-auto p-4 md:p-8"}>
                <Outlet />
            </main>
        </div>
    )
}
