import { NavLink, Outlet } from "react-router-dom"

const links = [
    { to: "/user", label: "Hồ sơ", end: true },
    { to: "/user/books", label: "Danh mục sách" },
    { to: "/user/loans", label: "Sách đang mượn" },
]

export default function UserLayout() {
    return (
        <div className="min-h-screen bg-neutral-50">
            <header className="border-b bg-white px-6 py-4">
                <div className="mb-3 text-lg font-semibold">Thư Viện Điện Tử</div>
                <nav className="flex gap-1">
                    {links.map((link) => (
                        <NavLink
                            key={link.to}
                            to={link.to}
                            end={link.end}
                            className={({ isActive }) => `rounded-md px-3 py-1.5 text-sm font-medium ${isActive ? "bg-neutral-900 text-white" : "text-neutral-500 hover:bg-neutral-100"}`}
                        >
                            {link.label}
                        </NavLink>
                    ))}
                </nav>
            </header>
            <main className="p-6"><Outlet /></main>
        </div>
    )
}