import { NavLink } from 'react-router-dom'
import { cn } from "../../lib/utils"
import { adminRoutes } from "../../routes/index"

export function Sidebar() {
    return (
        <aside className="flex h-dvh w-60 min-w-60 shrink-0 flex-col overflow-y-auto bg-neutral-950 text-neutral-300">
            <div className="border-b border-neutral-800 px-5 py-5">
                <div className="text-lg font-semibold text-white">
                    Thư Viện <span className="text-red-600">Điện Tử</span>
                </div>
                <div className="text-xs text-neutral-500">Cổng quản trị</div>
            </div>

            <nav className="flex flex-1 flex-col gap-1 p-2">
                {adminRoutes.map(({ path, handle }) => (
                    <NavLink key={path} to={path} end={path === "/"}>
                        {({ isActive }) => (
                        <span
                            className={cn(
                                'flex min-h-10 w-full items-center justify-between rounded-md border-l-2 px-3 py-2 text-sm transition-colors',
                                isActive
                                    ? 'border-red-600 bg-neutral-900 font-medium text-white'
                                    : 'border-transparent text-neutral-400 hover:bg-neutral-900 hover:text-white'
                            )}
                        >
                            {handle.label}
                            {handle.badge && (
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[11px] font-medium text-white">
                                {handle.badge}
                            </span>
                            )}
                        </span>
                        )}
                    </NavLink>
                ))}
            </nav>
        </aside>
    )
}
