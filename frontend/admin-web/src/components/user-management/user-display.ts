import type { UserRole, UserStatus } from "../../mockdata/users"
import type { RoleFilter, StatusFilter } from "./user-list"

export const roleLabels: Record<UserRole, string> = {
    admin: "Quản trị viên",
    user: "Người dùng",
}

export const statusLabels: Record<UserStatus, string> = {
    active: "Activate",
    inactive: "Unactivate",
}

export const roleFilterLabels: Record<RoleFilter, string> = {
    all: "Tất cả vai trò",
    ...roleLabels,
}

export const statusFilterLabels: Record<StatusFilter, string> = {
    all: "Tất cả trạng thái",
    ...statusLabels,
}

function toOptions<T extends string>(labels: Record<T, string>) {
    return (Object.keys(labels) as T[]).map((value) => ({
        value,
        label: labels[value],
    }))
}

export const roleOptions = toOptions(roleLabels)

export const statusOptions = toOptions(statusLabels)

export const roleFilterOptions = toOptions(roleFilterLabels)

export const statusFilterOptions = toOptions(statusFilterLabels)
