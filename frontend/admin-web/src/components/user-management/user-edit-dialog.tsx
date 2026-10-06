import { useState } from "react"
import type { UserResponse, UserRole, UserStatus } from "../../mockdata/users"
import { Button } from "../ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "../ui/dialog"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { roleLabels, roleOptions, statusLabels, statusOptions } from "./user-display"

type UserEditDialogProps = {
    user: UserResponse
    open: boolean
    onOpenChange: (open: boolean) => void
    onSave: (user: UserResponse) => void
}

export function UserEditDialog({ user, open, onOpenChange, onSave }: UserEditDialogProps) {
    const [fullname, setFullname] = useState(user.fullname)
    const [email, setEmail] = useState(user.email)
    const [role, setRole] = useState<UserRole>(user.role)
    const [status, setStatus] = useState<UserStatus>(user.status)

    const handleSave = () => {
        onSave({ ...user, fullname: fullname.trim(), email: email.trim(), role, status })
        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Chỉnh sửa người dùng</DialogTitle>
                    <DialogDescription>Cập nhật thông tin của {user.fullname}.</DialogDescription>
                </DialogHeader>

                <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor={`edit-fullname-${user.id}`}>Họ và tên</Label>
                        <Input
                            id={`edit-fullname-${user.id}`}
                            value={fullname}
                            onChange={(event) => setFullname(event.target.value)}
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor={`edit-email-${user.id}`}>Email</Label>
                        <Input
                            id={`edit-email-${user.id}`}
                            type="email"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor={`edit-role-${user.id}`}>Vai trò</Label>
                        <Select
                            items={roleLabels}
                            value={role}
                            onValueChange={(value) => setRole(value ?? "user")}
                        >
                            <SelectTrigger id={`edit-role-${user.id}`} className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {roleOptions.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor={`edit-status-${user.id}`}>Trạng thái</Label>
                        <Select
                            items={statusLabels}
                            value={status}
                            onValueChange={(value) => setStatus(value ?? "inactive")}
                        >
                            <SelectTrigger id={`edit-status-${user.id}`} className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {statusOptions.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Huỷ
                    </Button>
                    <Button onClick={handleSave}>Lưu thay đổi</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
