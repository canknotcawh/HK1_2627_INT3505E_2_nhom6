import { Avatar, AvatarFallback } from "../ui/avatar"
import { getInitials } from "../../lib/utils"
import { LogOut } from "lucide-react"
import { useAuth } from "../../contexts/AuthContext"

export function Header({ title }: { title: string }) {
    const { user, logout } = useAuth()
    const name = user?.fullName || user?.email || "Quản trị viên"

    return (
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-gray-100 bg-white/80 px-4 backdrop-blur-md md:px-6">
            <h1 className="text-lg font-bold tracking-tight text-gray-900">{title}</h1>

            <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="flex items-center gap-2">
                    <Avatar className="size-9">
                        <AvatarFallback className="bg-gray-100 text-xs font-semibold text-gray-600">
                            {getInitials(name)}
                        </AvatarFallback>
                    </Avatar>
                    <div className="hidden min-w-0 text-sm md:block">
                        <div className="max-w-40 truncate font-medium text-gray-800">{name}</div>
                        <div className="text-xs text-gray-500">Quản trị viên</div>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={() => void logout()}
                    className="inline-flex h-9 items-center gap-1.5 rounded-md px-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e60023] sm:px-3"
                    aria-label="Đăng xuất"
                >
                    <LogOut className="size-4" />
                    <span className="hidden sm:inline">Đăng xuất</span>
                </button>
            </div>
        </header>
    )
}
