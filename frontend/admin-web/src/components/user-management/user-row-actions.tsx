import { useState } from "react"
import { PencilIcon, Trash2Icon } from "lucide-react"
import type { UserResponse } from "../../mockdata/users"
import { Button } from "../ui/button"
import { UserDeleteDialog } from "./user-delete-dialog"
import { UserEditDialog } from "./user-edit-dialog"

type UserRowActionsProps = {
    user: UserResponse
    onEditUser: (user: UserResponse) => void
    onDeleteUser: (user: UserResponse) => void
}

export function UserRowActions({ user, onEditUser, onDeleteUser }: UserRowActionsProps) {
    const [editOpen, setEditOpen] = useState(false)
    const [deleteOpen, setDeleteOpen] = useState(false)

    return (
        <div className="flex items-center justify-end gap-1">
            <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Sửa ${user.fullname}`}
                onClick={() => setEditOpen(true)}
            >
                <PencilIcon />
            </Button>

            <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Xoá ${user.fullname}`}
                className="text-red-600 hover:bg-red-50 hover:text-red-700"
                onClick={() => setDeleteOpen(true)}
            >
                <Trash2Icon />
            </Button>

            <UserEditDialog
                user={user}
                open={editOpen}
                onOpenChange={setEditOpen}
                onSave={onEditUser}
            />

            <UserDeleteDialog
                user={user}
                open={deleteOpen}
                onOpenChange={setDeleteOpen}
                onConfirm={() => onDeleteUser(user)}
            />
        </div>
    )
}
