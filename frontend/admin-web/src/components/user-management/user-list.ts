import type { UserResponse, UserRole, UserStatus } from "../../mockdata/users"

export type UserSortKey = "fullname" | "createdAt"

export type UserSortDirection = "asc" | "desc"

export type RoleFilter = UserRole | "all"

export type StatusFilter = UserStatus | "all"

export type UserListFilters = {
    query: string
    role: RoleFilter
    status: StatusFilter
    dateFrom: string
    dateTo: string
}

export function filterUsers(users: UserResponse[], filters: UserListFilters): UserResponse[] {
    const query = filters.query.trim().toLowerCase()

    return users.filter((user) => {
        if (query !== "") {
            const matchesQuery =
                user.fullname.toLowerCase().includes(query) ||
                user.email.toLowerCase().includes(query)

            if (!matchesQuery) return false
        }

        if (filters.role !== "all" && user.role !== filters.role) return false
        if (filters.status !== "all" && user.status !== filters.status) return false

        const createdDay = user.createdAt.slice(0, 10)

        if (filters.dateFrom !== "" && createdDay < filters.dateFrom) return false
        if (filters.dateTo !== "" && createdDay > filters.dateTo) return false

        return true
    })
}

export function sortUsers(
    users: UserResponse[],
    key: UserSortKey,
    direction: UserSortDirection
): UserResponse[] {
    const factor = direction === "asc" ? 1 : -1

    return [...users].sort((a, b) => {
        if (key === "createdAt") {
            return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * factor
        }

        return a.fullname.localeCompare(b.fullname, "vi") * factor
    })
}
