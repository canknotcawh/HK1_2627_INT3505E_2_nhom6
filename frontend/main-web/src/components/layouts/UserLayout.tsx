import { Outlet } from "react-router-dom"
import NavBar from "./NavBar"

export default function UserLayout() {
    return (
        <div>
            <NavBar />
            <main className="container mx-auto p-4 md:p-8">
                <Outlet />
            </main>
        </div>
    )
}