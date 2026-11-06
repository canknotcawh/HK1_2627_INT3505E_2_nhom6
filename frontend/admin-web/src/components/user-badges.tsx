import { Ban, Check, Shield, UserRound } from "lucide-react";
import type { UserRole, UserStatus } from "../lib/admin-users";

export function RoleBadge({ role }: { role: UserRole }) {
  const admin = role === "ADMIN";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${admin ? "bg-violet-50 text-violet-700" : "bg-neutral-100 text-neutral-600"}`}>
      {admin ? <Shield className="size-3.5" /> : <UserRound className="size-3.5" />}
      {admin ? "Admin" : "Người dùng"}
    </span>
  );
}

export function StatusBadge({ status }: { status: UserStatus }) {
  const active = status === "ACTIVE";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${active ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>
      {active ? <Check className="size-3.5" /> : <Ban className="size-3.5" />}
      {active ? "Đang hoạt động" : "Đã khóa"}
    </span>
  );
}
