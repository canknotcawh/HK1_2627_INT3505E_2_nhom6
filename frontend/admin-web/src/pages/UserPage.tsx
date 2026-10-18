import { useCallback, useEffect, useState } from "react";
import { Ban, Check, ChevronLeft, ChevronRight, LoaderCircle, Search, Shield, ShieldOff, UserRound } from "lucide-react";
import { isAxiosError } from "axios";
import apiClient from "../lib/api-client";
import { useAuth } from "../contexts/AuthContext";

type ManagedUser = {
  id: string;
  email: string;
  fullName: string;
  role: "ADMIN" | "USER";
  status: "ACTIVE" | "SUSPENDED";
  createdAt: string;
};

type Page<T> = {
  content: T[];
  number: number;
  totalPages: number;
  totalElements: number;
};

const PAGE_SIZE = 10;

type UserAction = "suspend" | "reactivate" | "promote" | "demote";

function actionErrorMessage(error: unknown) {
  if (!isAxiosError<{ code?: string; message?: string }>(error)) {
    return "Không cập nhật được tài khoản. Vui lòng thử lại.";
  }

  const code = error.response?.data?.code;
  if (code === "CANNOT_SUSPEND_SELF" || code === "CANNOT_DEMOTE_SELF") {
    return "Bạn không thể tự khóa hoặc tự hạ quyền tài khoản đang đăng nhập.";
  }
  if (code === "CANNOT_SUSPEND_LAST_ACTIVE_ADMIN" || code === "CANNOT_DEMOTE_LAST_ACTIVE_ADMIN") {
    return "Cần giữ lại ít nhất một admin đang hoạt động.";
  }
  if (error.response?.status === 401 || error.response?.status === 403) {
    return "Phiên đăng nhập không còn quyền quản trị. Hãy đăng nhập lại bằng tài khoản admin.";
  }
  return error.response?.data?.message || "Không cập nhật được tài khoản. Vui lòng thử lại.";
}

function listErrorMessage(error: unknown) {
  if (!isAxiosError<{ code?: string; message?: string }>(error)) {
    return "Không tải được danh sách người dùng. Vui lòng tải lại trang.";
  }

  if (error.response?.status === 401) {
    return "Phiên đăng nhập hết hạn. Hãy đăng xuất rồi đăng nhập lại.";
  }
  if (error.response?.status === 403) {
    return "Backend từ chối quyền xem danh sách. Hãy đăng nhập bằng tài khoản ADMIN.";
  }
  if (error.response) {
    const detail = error.response.data?.message || error.response.data?.code;
    return `Backend trả lỗi HTTP ${error.response.status}${detail ? `: ${detail}` : "."}`;
  }
  return "Không kết nối được backend tại API đã cấu hình. Kiểm tra backend, cổng 8080 và cấu hình CORS.";
}

export default function UserPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [role, setRole] = useState("");
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [workingUserIds, setWorkingUserIds] = useState<Set<string>>(() => new Set());
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get<Page<ManagedUser>>("/admin/users", {
        params: {
          page,
          size: PAGE_SIZE,
          ...(query.trim() ? { q: query.trim() } : {}),
          ...(status ? { status } : {}),
          ...(role ? { role } : {}),
        },
      });
      setUsers(response.data.content);
      setTotalPages(response.data.totalPages);
      setTotalElements(response.data.totalElements);
      if (response.data.totalPages > 0 && page >= response.data.totalPages) {
        setPage(response.data.totalPages - 1);
      }
    } catch (requestError) {
      console.error("Không thể tải danh sách người dùng:", requestError);
      setError(listErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [page, query, role, status]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const performAction = async (target: ManagedUser, action: UserAction) => {
    const labels = {
      suspend: "tạm khóa",
      reactivate: "mở khóa",
      promote: "cấp quyền admin cho",
      demote: "hạ quyền admin của",
    };
    if (!window.confirm(`Bạn có chắc muốn ${labels[action]} ${target.email}?`)) return;

    setWorkingUserIds((current) => new Set(current).add(target.id));
    setError(null);
    setNotice(null);
    try {
      await apiClient.post(`/admin/users/${target.id}/${action}`);
      setNotice(`Đã cập nhật tài khoản ${target.email}.`);
      await loadUsers();
    } catch (requestError) {
      console.error("Không thể cập nhật người dùng:", requestError);
      setError(actionErrorMessage(requestError));
    } finally {
      setWorkingUserIds((current) => {
        const next = new Set(current);
        next.delete(target.id);
        return next;
      });
    }
  };

  const changeFilter = (setter: (value: string) => void, value: string) => {
    setPage(0);
    setter(value);
  };

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Quản lý người dùng</h2>
          <p className="mt-1 text-sm text-neutral-500">Tìm kiếm, khóa tài khoản và quản lý quyền truy cập.</p>
        </div>
        <span className="rounded-full bg-neutral-100 px-3 py-1 text-sm text-neutral-600">
          {totalElements} tài khoản
        </span>
      </div>

      <div className="flex flex-wrap gap-3 rounded-xl border bg-white p-4">
        <label className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
          <input
            value={query}
            onChange={(event) => changeFilter(setQuery, event.target.value)}
            placeholder="Tìm theo tên hoặc email"
            className="h-10 w-full rounded-lg border bg-white pl-9 pr-3 text-sm outline-none focus:border-neutral-500"
          />
        </label>
        <select
          value={role}
          onChange={(event) => changeFilter(setRole, event.target.value)}
          aria-label="Lọc theo quyền"
          className="h-10 rounded-lg border bg-white px-3 text-sm"
        >
          <option value="">Tất cả quyền</option>
          <option value="USER">Người dùng</option>
          <option value="ADMIN">Admin</option>
        </select>
        <select
          value={status}
          onChange={(event) => changeFilter(setStatus, event.target.value)}
          aria-label="Lọc theo trạng thái"
          className="h-10 rounded-lg border bg-white px-3 text-sm"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="ACTIVE">Đang hoạt động</option>
          <option value="SUSPENDED">Đã khóa</option>
        </select>
      </div>

      {notice && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}

      <div className="overflow-hidden rounded-xl border bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-4 py-3 font-medium">Người dùng</th>
                <th className="px-4 py-3 font-medium">Quyền</th>
                <th className="px-4 py-3 font-medium">Trạng thái</th>
                <th className="px-4 py-3 font-medium">Ngày tạo</th>
                <th className="px-4 py-3 text-right font-medium">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-neutral-500"><LoaderCircle className="mr-2 inline size-4 animate-spin" />Đang tải…</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-neutral-500">Không tìm thấy tài khoản phù hợp.</td></tr>
              ) : users.map((item) => {
                const isWorking = workingUserIds.has(item.id);
                const isCurrentAdmin = item.id === currentUser?.id;
                const actionButtonClass = "inline-flex min-h-8 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border px-2.5 py-1.5 text-xs transition-colors hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-45";

                return (
                <tr key={item.id} className="hover:bg-neutral-50/70">
                  <td className="px-4 py-3">
                    <div className="font-medium">{item.fullName}</div>
                    <div className="mt-0.5 text-xs text-neutral-500">{item.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${item.role === "ADMIN" ? "bg-violet-50 text-violet-700" : "bg-neutral-100 text-neutral-600"}`}>
                      {item.role === "ADMIN" ? <Shield className="size-3.5" /> : <UserRound className="size-3.5" />}
                      {item.role === "ADMIN" ? "Admin" : "Người dùng"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${item.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>
                      {item.status === "ACTIVE" ? <Check className="size-3.5" /> : <Ban className="size-3.5" />}
                      {item.status === "ACTIVE" ? "Đang hoạt động" : "Đã khóa"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-neutral-600">{new Date(item.createdAt).toLocaleDateString("vi-VN")}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      {item.status === "ACTIVE" ? (
                        <button
                          type="button"
                          disabled={isWorking || isCurrentAdmin}
                          title={isCurrentAdmin ? "Không thể tự khóa tài khoản đang dùng" : "Tạm khóa tài khoản"}
                          onClick={() => void performAction(item, "suspend")}
                          className={actionButtonClass}
                        >
                          {isWorking ? <LoaderCircle className="size-3.5 animate-spin" /> : <Ban className="size-3.5" />}
                          Tạm khóa
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={isWorking}
                          onClick={() => void performAction(item, "reactivate")}
                          className={actionButtonClass}
                        >
                          {isWorking ? <LoaderCircle className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                          Mở khóa
                        </button>
                      )}
                      {item.role === "ADMIN" ? (
                        <button
                          type="button"
                          disabled={isWorking || isCurrentAdmin}
                          title={isCurrentAdmin ? "Không thể tự hạ quyền tài khoản đang dùng" : "Hạ quyền admin"}
                          onClick={() => void performAction(item, "demote")}
                          className={actionButtonClass}
                        ><ShieldOff className="size-3.5" />Hạ quyền</button>
                      ) : (
                        <button
                          type="button"
                          disabled={isWorking}
                          onClick={() => void performAction(item, "promote")}
                          className={actionButtonClass}
                        ><Shield className="size-3.5" />Cấp admin</button>
                      )}
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-neutral-500">
          <span>Trang {totalPages === 0 ? 0 : page + 1} / {totalPages}</span>
          <div className="flex gap-2">
            <button disabled={page <= 0 || loading} onClick={() => setPage((value) => Math.max(0, value - 1))} aria-label="Trang trước" className="rounded-md border p-2 disabled:opacity-40"><ChevronLeft className="size-4" /></button>
            <button disabled={page + 1 >= totalPages || loading} onClick={() => setPage((value) => value + 1)} aria-label="Trang sau" className="rounded-md border p-2 disabled:opacity-40"><ChevronRight className="size-4" /></button>
          </div>
        </div>
      </div>
    </section>
  );
}
