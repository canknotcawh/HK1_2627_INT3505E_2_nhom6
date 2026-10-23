import { Avatar, AvatarFallback } from "../ui/avatar"
import { getInitials } from "../../lib/utils"
import { LogOut } from "lucide-react"
import { useAuth } from "../../contexts/AuthContext"

export function Header({ title }: { title: string }) {
    const { user, logout } = useAuth()
    const name = user?.fullName || user?.email || "Quản trị viên"

    return (
        <header className="flex h-16 items-center justify-between border-b px-6">
            <h1 className="text-lg font-semibold">{title}</h1>

            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-black text-xs text-white">
                            {getInitials(name)}
                        </AvatarFallback>
                    </Avatar>
                    <div className="text-sm">
                        <span className="font-medium">{name}</span>
                        <span className="text-muted-foreground"> · Quản trị viên </span>
                    </div>
                </div>

                <a
                    href={import.meta.env.VITE_MAIN_WEB_URL || "http://localhost:5173"}
                    className="inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm hover:bg-muted text-neutral-700"
                    title="Mở giao diện bạn đọc"
                >
                    ← Xem trang bạn đọc
                </a>

                <button
                    type="button"
                    onClick={() => void logout()}
                    className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted"
                >
                    <LogOut className="size-4" />
                    Đăng xuất
                </button>
            </div>
        </header>
    )
}
