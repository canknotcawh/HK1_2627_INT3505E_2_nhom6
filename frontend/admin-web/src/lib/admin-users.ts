import { isAxiosError } from "axios";
import apiClient from "./api-client";
import { actionErrorMessage as sharedActionErrorMessage } from "./http-errors";

export type UserRole = "ADMIN" | "USER";
export type UserStatus = "ACTIVE" | "SUSPENDED";
export type UserAction = "suspend" | "reactivate" | "promote" | "demote";

export type ManagedUser = {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
};

const ACTION_VERBS: Record<UserAction, string> = {
  suspend: "tạm khóa",
  reactivate: "mở khóa",
  promote: "cấp quyền admin cho",
  demote: "hạ quyền admin của",
};

export function confirmMessage(action: UserAction, target: Pick<ManagedUser, "email">): string {
  const base = `Bạn có chắc muốn ${ACTION_VERBS[action]} ${target.email}?`;
  return action === "suspend"
    ? `${base}\nCác phiên đăng nhập đã lưu của tài khoản này sẽ bị thu hồi.`
    : base;
}

export function actionNotice(action: UserAction, target: Pick<ManagedUser, "email">): string {
  const done: Record<UserAction, string> = {
    suspend: "Đã tạm khóa",
    reactivate: "Đã mở khóa",
    promote: "Đã cấp quyền admin cho",
    demote: "Đã hạ quyền admin của",
  };
  return `${done[action]} ${target.email}.`;
}

export function userActionErrorMessage(error: unknown): string {
  if (isAxiosError<{ code?: string }>(error)) {
    const code = error.response?.data?.code;
    if (code === "CANNOT_SUSPEND_SELF" || code === "CANNOT_DEMOTE_SELF") {
      return "Bạn không thể tự khóa hoặc tự hạ quyền tài khoản đang đăng nhập.";
    }
    if (code === "CANNOT_SUSPEND_LAST_ACTIVE_ADMIN" || code === "CANNOT_DEMOTE_LAST_ACTIVE_ADMIN") {
      return "Cần giữ lại ít nhất một admin đang hoạt động.";
    }
    if (error.response?.status === 404) {
      return "Tài khoản không còn tồn tại.";
    }
  }
  return sharedActionErrorMessage(error, "Không cập nhật được tài khoản. Vui lòng thử lại.");
}

export function isNotFound(error: unknown): boolean {
  return isAxiosError(error) && error.response?.status === 404;
}

export async function runUserAction(userId: string, action: UserAction): Promise<ManagedUser> {
  const response = await apiClient.post<ManagedUser>(`/admin/users/${userId}/${action}`);
  return response.data;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("vi-VN");
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("vi-VN");
}
