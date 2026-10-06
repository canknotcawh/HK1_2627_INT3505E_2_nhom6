import { useMemo, useState } from "react"
import { UserCheckIcon, UsersIcon, UserXIcon } from "lucide-react"
import { mockUsers } from "../mockdata/users"
import type { UserResponse } from "../mockdata/users"
import { MetricCard } from "../components/common/metric-card"
import { UserFilters } from "../components/user-management/user-filters"
import { UserPagination } from "../components/user-management/user-pagination"
import { UserSearchInput } from "../components/user-management/user-search-input"
import { UserTable } from "../components/user-management/user-table"
import { filterUsers, sortUsers } from "../components/user-management/user-list"
import type { RoleFilter, StatusFilter, UserSortKey } from "../components/user-management/user-list"

const PAGE_SIZE = 10

export default function UserPage() {
    const [users, setUsers] = useState<UserResponse[]>(mockUsers)
    const [query, setQuery] = useState("")
    const [role, setRole] = useState<RoleFilter>("all")
    const [status, setStatus] = useState<StatusFilter>("all")
    const [dateFrom, setDateFrom] = useState("")
    const [dateTo, setDateTo] = useState("")
    const [sortKey, setSortKey] = useState<UserSortKey>("fullname")
    const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
    const [page, setPage] = useState(1)
    const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())

    const filteredUsers = useMemo(
        () => filterUsers(users, { query, role, status, dateFrom, dateTo }),
        [users, query, role, status, dateFrom, dateTo]
    )

    const sortedUsers = useMemo(
        () => sortUsers(filteredUsers, sortKey, sortDirection),
        [filteredUsers, sortKey, sortDirection]
    )

    const pageCount = Math.max(1, Math.ceil(sortedUsers.length / PAGE_SIZE))
    const currentPage = Math.min(page, pageCount)

    const visibleUsers = useMemo(
        () => sortedUsers.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
        [sortedUsers, currentPage]
    )

    const total = users.length
    const activeCount = users.filter((user) => user.status === "active").length
    const inactiveCount = total - activeCount
    const hasFilters = query !== "" || role !== "all" || status !== "all" || dateFrom !== "" || dateTo !== ""
    const firstRow = sortedUsers.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1
    const lastRow = Math.min(currentPage * PAGE_SIZE, sortedUsers.length)

    const updateQuery = (value: string) => {
        setQuery(value)
        setPage(1)
    }

    const updateRole = (value: RoleFilter) => {
        setRole(value)
        setPage(1)
    }

    const updateStatus = (value: StatusFilter) => {
        setStatus(value)
        setPage(1)
    }

    const updateDateFrom = (value: string) => {
        setDateFrom(value)
        setPage(1)
    }

    const updateDateTo = (value: string) => {
        setDateTo(value)
        setPage(1)
    }

    const toggleSort = (key: UserSortKey) => {
        if (key === sortKey) {
            setSortDirection((current) => (current === "asc" ? "desc" : "asc"))
            return
        }

        setSortKey(key)
        setSortDirection("asc")
    }

    const toggleSelect = (id: string) => {
        setSelectedIds((previous) => {
            const next = new Set(previous)

            if (next.has(id)) next.delete(id)
            else next.add(id)

            return next
        })
    }

    const toggleSelectAll = () => {
        setSelectedIds((previous) => {
            const next = new Set(previous)
            const allSelected = visibleUsers.every((user) => previous.has(user.id))

            visibleUsers.forEach((user) => {
                if (allSelected) next.delete(user.id)
                else next.add(user.id)
            })

            return next
        })
    }

    const resetFilters = () => {
        setQuery("")
        setRole("all")
        setStatus("all")
        setDateFrom("")
        setDateTo("")
        setPage(1)
    }

    const editUser = (updated: UserResponse) => {
        setUsers((previous) =>
            previous.map((user) => (user.id === updated.id ? updated : user))
        )
    }

    const deleteUser = (deleted: UserResponse) => {
        setUsers((previous) => previous.filter((user) => user.id !== deleted.id))
        setSelectedIds((previous) => {
            const next = new Set(previous)
            next.delete(deleted.id)
            return next
        })
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <MetricCard
                    label="Tổng số người dùng"
                    value={total}
                    icon={UsersIcon}
                />
                <MetricCard
                    label="Người dùng activate"
                    value={activeCount}
                    icon={UserCheckIcon}
                    tone="active"
                />
                <MetricCard
                    label="Người dùng unactivate"
                    value={inactiveCount}
                    icon={UserXIcon}
                    tone="inactive"
                />
            </div>

            <div className="flex flex-col gap-4 rounded-lg border bg-card p-4">
                <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                        <h2 className="font-medium">Danh sách người dùng</h2>
                        <span className="text-sm text-muted-foreground">
                            {selectedIds.size > 0
                                ? `Đã chọn ${selectedIds.size} người dùng`
                                : "Chọn một hoặc nhiều dòng để thao tác"}
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        {selectedIds.size > 0 && (
                            <button
                                type="button"
                                onClick={() => setSelectedIds(new Set())}
                                className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                            >
                                Bỏ chọn tất cả
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <UserSearchInput query={query} onQueryChange={updateQuery} />

                    <UserFilters
                        role={role}
                        status={status}
                        dateFrom={dateFrom}
                        dateTo={dateTo}
                        onRoleChange={updateRole}
                        onStatusChange={updateStatus}
                        onDateFromChange={updateDateFrom}
                        onDateToChange={updateDateTo}
                    />

                    {hasFilters && (
                        <button
                            type="button"
                            onClick={resetFilters}
                            className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                        >
                            Xoá bộ lọc
                        </button>
                    )}
                </div>

                <UserTable
                    visibleUsers={visibleUsers}
                    selectedIds={selectedIds}
                    sortKey={sortKey}
                    sortDirection={sortDirection}
                    onToggleSelect={toggleSelect}
                    onToggleSelectAll={toggleSelectAll}
                    onToggleSort={toggleSort}
                    onEditUser={editUser}
                    onDeleteUser={deleteUser}
                />
            </div>

            <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                    Hiển thị {firstRow}–{lastRow} trên tổng {sortedUsers.length} người dùng
                    {sortedUsers.length < total && ` (lọc từ ${total})`}
                </span>

                <UserPagination currentPage={currentPage} pageCount={pageCount} onPageChange={setPage} />
            </div>
        </div>
    )
}
