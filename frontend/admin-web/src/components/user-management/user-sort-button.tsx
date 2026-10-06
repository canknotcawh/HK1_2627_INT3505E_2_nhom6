import type { ReactNode } from "react"
import { ArrowDownIcon, ArrowUpIcon, ChevronsUpDownIcon } from "lucide-react"
import { cn } from "../../lib/utils"
import type { UserSortDirection, UserSortKey } from "./user-list"

type UserSortButtonProps = {
    column: UserSortKey
    sortKey: UserSortKey
    sortDirection: UserSortDirection
    onToggleSort: (key: UserSortKey) => void
    children: ReactNode
}

export function UserSortButton({ column, sortKey, sortDirection, onToggleSort, children }: UserSortButtonProps) {
    const isActive = sortKey === column
    const Icon = isActive
        ? sortDirection === "asc"
            ? ArrowUpIcon
            : ArrowDownIcon
        : ChevronsUpDownIcon

    return (
        <button
            type="button"
            onClick={() => onToggleSort(column)}
            className="inline-flex items-center gap-1.5 whitespace-nowrap hover:text-foreground"
        >
            {children}
            <Icon className={cn("size-3.5", isActive ? "text-foreground" : "text-muted-foreground/60")} />
        </button>
    )
}
