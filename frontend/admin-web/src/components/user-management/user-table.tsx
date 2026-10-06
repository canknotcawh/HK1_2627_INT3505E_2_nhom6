import { Avatar, AvatarFallback } from "../ui/avatar"
import { Badge } from "../ui/badge"
import { Checkbox } from "../ui/checkbox"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "../ui/table"
import { cn, formatDateTime, getInitials } from "../../lib/utils"
import type { UserResponse } from "../../mockdata/users"
import type { UserSortDirection, UserSortKey } from "./user-list"
import { roleLabels, statusLabels } from "./user-display"
import { UserRowActions } from "./user-row-actions"
import { UserSortButton } from "./user-sort-button"

type UserTableProps = {
    visibleUsers: UserResponse[]
    selectedIds: Set<string>
    sortKey: UserSortKey
    sortDirection: UserSortDirection
    onToggleSelect: (id: string) => void
    onToggleSelectAll: () => void
    onToggleSort: (key: UserSortKey) => void
    onEditUser: (user: UserResponse) => void
    onDeleteUser: (user: UserResponse) => void
}

export function UserTable({
    visibleUsers,
    selectedIds,
    sortKey,
    sortDirection,
    onToggleSelect,
    onToggleSelectAll,
    onToggleSort,
    onEditUser,
    onDeleteUser,
}: UserTableProps) {
    const selectedOnPage = visibleUsers.filter((user) => selectedIds.has(user.id)).length
    const allSelected = visibleUsers.length > 0 && selectedOnPage === visibleUsers.length

    const nameSort = sortKey === "fullname"
        ? sortDirection === "asc"
            ? "ascending"
            : "descending"
        : "none"

    const dateSort = sortKey === "createdAt"
        ? sortDirection === "asc"
            ? "ascending"
            : "descending"
        : "none"

    return (
        <Table>
            <TableHeader>
                <TableRow className="hover:bg-transparent">
                    <TableHead className="w-10">
                        <Checkbox
                            checked={allSelected}
                            indeterminate={selectedOnPage > 0 && !allSelected}
                            onCheckedChange={onToggleSelectAll}
                            aria-label="Chọn tất cả người dùng trên trang này"
                        />
                    </TableHead>
                    <TableHead aria-sort={nameSort}>
                        <UserSortButton column="fullname" sortKey={sortKey} sortDirection={sortDirection} onToggleSort={onToggleSort}>Họ và tên</UserSortButton>
                    </TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Vai trò</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead aria-sort={dateSort}>
                        <UserSortButton column="createdAt" sortKey={sortKey} sortDirection={sortDirection} onToggleSort={onToggleSort}>Ngày tạo</UserSortButton>
                    </TableHead>
                    <TableHead className="w-20 text-right">Thao tác</TableHead>
                </TableRow>
            </TableHeader>

            <TableBody>
                {visibleUsers.map((user) => {
                    const isSelected = selectedIds.has(user.id)

                    return (
                        <TableRow
                            key={user.id}
                            data-state={isSelected ? "selected" : undefined}
                            className={cn(isSelected && "bg-muted")}
                        >
                            <TableCell>
                                <Checkbox
                                    checked={isSelected}
                                    onCheckedChange={() => onToggleSelect(user.id)}
                                    aria-label={`Chọn ${user.fullname}`}
                                />
                            </TableCell>

                            <TableCell>
                                <div className="flex items-center gap-3">
                                    <Avatar>
                                        <AvatarFallback className="bg-neutral-800 text-xs text-white">
                                            {getInitials(user.fullname)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <span className="font-medium">{user.fullname}</span>
                                </div>
                            </TableCell>

                            <TableCell className="text-muted-foreground">{user.email}</TableCell>

                            <TableCell>{roleLabels[user.role]}</TableCell>

                            <TableCell>
                                <Badge
                                    variant="outline"
                                    className={cn(
                                        user.status === "active"
                                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                            : "border-red-200 bg-red-50 text-red-700"
                                    )}
                                >
                                    {statusLabels[user.status]}
                                </Badge>
                            </TableCell>

                            <TableCell className="text-muted-foreground tabular-nums">
                                {formatDateTime(user.createdAt)}
                            </TableCell>

                            <TableCell>
                                <UserRowActions user={user} onEditUser={onEditUser} onDeleteUser={onDeleteUser} />
                            </TableCell>
                        </TableRow>
                    )
                })}

                {visibleUsers.length === 0 && (
                    <TableRow className="hover:bg-transparent">
                        <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                            Không có người dùng nào khớp bộ lọc
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
        </Table>
    )
}
