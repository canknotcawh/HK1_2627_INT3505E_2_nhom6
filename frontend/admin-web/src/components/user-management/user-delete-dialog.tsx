import { Trash2Icon } from "lucide-react"
import type { UserResponse } from "../../mockdata/users"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogMedia,
    AlertDialogTitle,
} from "../ui/alert-dialog"

type UserDeleteDialogProps = {
    user: UserResponse
    open: boolean
    onOpenChange: (open: boolean) => void
    onConfirm: () => void
}

export function UserDeleteDialog({ user, open, onOpenChange, onConfirm }: UserDeleteDialogProps) {
    const handleConfirm = () => {
        onConfirm()
        onOpenChange(false)
    }

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogMedia className="bg-red-50 text-red-600">
                        <Trash2Icon />
                    </AlertDialogMedia>
                    <AlertDialogTitle>Xoá người dùng?</AlertDialogTitle>
                    <AlertDialogDescription>
                        {user.fullname} ({user.email}) sẽ bị xoá khỏi danh sách. Hành động này không thể hoàn tác.
                    </AlertDialogDescription>
                </AlertDialogHeader>

                <AlertDialogFooter>
                    <AlertDialogCancel>Huỷ</AlertDialogCancel>
                    <AlertDialogAction variant="destructive" onClick={handleConfirm}>
                        Xoá
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}
