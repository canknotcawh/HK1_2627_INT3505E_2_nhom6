import { Input } from "../ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import type { RoleFilter, StatusFilter } from "./user-list"
import {
    roleFilterLabels,
    roleFilterOptions,
    statusFilterLabels,
    statusFilterOptions,
} from "./user-display"

type UserFiltersProps = {
    role: RoleFilter
    status: StatusFilter
    dateFrom: string
    dateTo: string
    onRoleChange: (role: RoleFilter) => void
    onStatusChange: (status: StatusFilter) => void
    onDateFromChange: (date: string) => void
    onDateToChange: (date: string) => void
}

export function UserFilters({
    role,
    status,
    dateFrom,
    dateTo,
    onRoleChange,
    onStatusChange,
    onDateFromChange,
    onDateToChange,
}: UserFiltersProps) {
    return (
        <div className="flex flex-wrap items-center gap-2">
            <Select
                items={roleFilterLabels}
                value={role}
                onValueChange={(value) => onRoleChange((value ?? "all") as RoleFilter)}
            >
                <SelectTrigger className="w-40" aria-label="Lọc theo vai trò">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {roleFilterOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                            {option.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            <Select
                items={statusFilterLabels}
                value={status}
                onValueChange={(value) => onStatusChange((value ?? "all") as StatusFilter)}
            >
                <SelectTrigger className="w-44" aria-label="Lọc theo trạng thái">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {statusFilterOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                            {option.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            <div className="flex items-center gap-1.5">
                <Input
                    type="date"
                    value={dateFrom}
                    onChange={(event) => onDateFromChange(event.target.value)}
                    aria-label="Ngày bắt đầu"
                    className="w-40"
                />
                <span className="text-sm text-muted-foreground">→</span>
                <Input
                    type="date"
                    value={dateTo}
                    onChange={(event) => onDateToChange(event.target.value)}
                    aria-label="Ngày kết thúc"
                    className="w-40"
                />
            </div>
        </div>
    )
}
