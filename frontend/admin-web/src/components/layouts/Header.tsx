import { Avatar, AvatarFallback } from "../ui/avatar"
import { getInitials } from "../../lib/utils"

export function Header({ title }: { title: string }) {
    const user = {name: "Nguyễn Trần Quang Tuyển"} // MOCK DATA SAU SE GOI HOOK DE LAY TEN

    return (
        <header className="flex h-16 items-center justify-between border-b px-6">
            <h1 className="text-lg font-semibold">{title}</h1>

            <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Đã xác thực OTP
                </span>

                <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-black text-xs text-white">
                            {getInitials(user.name)}
                        </AvatarFallback>
                    </Avatar>
                    <div className="text-sm">
                        <span className="font-medium">{user.name}</span>
                        <span className="text-muted-foreground"> · Quản trị viên </span>
                    </div>
                </div>
            </div>
        </header>
    )
}