import { NavLink } from 'react-router-dom'
import { Library } from 'lucide-react'
import { cn } from "../../lib/utils"
import { adminRoutes } from "../../routes/index"

export function Sidebar() {
    return (
        <aside className="flex h-dvh w-60 min-w-60 shrink-0 flex-col overflow-y-auto border-r border-gray-100 bg-white text-gray-700">
            <div className="border-b border-gray-100 px-5 py-5">
                <div className="flex items-center gap-2">
                    <div className="rounded-lg bg-[#e60023] p-1.5 text-white shadow-sm">
                        <Library className="size-5" />
                    </div>
                    <div>
                        <div className="text-base font-bold tracking-tight text-gray-900">Thư viện điện tử</div>
                        <div className="text-xs text-gray-500">Cổng quản trị</div>
                    </div>
                </div>
            </div>

            <nav className="flex flex-1 flex-col gap-1 p-3">
                {adminRoutes.map(({ path, handle }) => (
                    <NavLink key={path} to={path} end={path === "/"}>
                        {({ isActive }) => (
                        <span
                            className={cn(
                                'flex min-h-10 w-full items-center justify-between rounded-lg border-l-2 px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e60023]/30',
                                isActive
                                    ? 'border-[#e60023] bg-red-50 font-semibold text-[#c7001e]'
                                    : 'border-transparent text-gray-600 hover:bg-gray-50 hover:text-[#e60023]'
                            )}
                        >
                            {handle.label}
                        </span>
                        )}
                    </NavLink>
                ))}
            </nav>
        </aside>
    )
}
