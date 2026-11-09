import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Ban, Check, ChevronLeft, ChevronRight, LoaderCircle, RefreshCw, Search, Shield, ShieldOff } from "lucide-react";
import apiClient from "../lib/api-client";
import { useAuth } from "../contexts/AuthContext";
import { listErrorMessage } from "../lib/http-errors";
import type { Page } from "../lib/page";
import {
  actionNotice,
  confirmMessage,
  formatDate,
  runUserAction,
  userActionErrorMessage,
  type ManagedUser,
  type UserAction,
} from "../lib/admin-users";
import { useDebouncedValue } from "../lib/use-debounced-value";
import { RoleBadge, StatusBadge } from "../components/user-badges";

const PAGE_SIZE = 10;

type ListResult = {
  key: string;
  users: ManagedUser[];
  totalPages: number;
  totalElements: number;
  error: string | null;
};
const ROLES = ["USER", "ADMIN"] as const;
const STATUSES = ["ACTIVE", "SUSPENDED"] as const;

function parsePage(raw: string | null): number {
  const value = Number.parseInt(raw ?? "", 10);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function pick<T extends string>(raw: string | null, allowed: readonly T[]): T | "" {
  return allowed.find((item) => item === raw) ?? "";
}

export default function UserPage() {
  const { user: currentUser } = useAuth();

  // Filters and page live in the URL so they survive navigating to a detail page and back.
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get("q") ?? "";
  const role = pick(searchParams.get("role"), ROLES);
  const status = pick(searchParams.get("status"), STATUSES);
  const page = parsePage(searchParams.get("page"));
  const term = useDebouncedValue(query, 350).trim();

  // The list is keyed by the request that produced it, so "loading" is derived rather than
  // set from inside an effect, and a superseded request can never overwrite a newer one.
  const [result, setResult] = useState<ListResult | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [workingUserIds, setWorkingUserIds] = useState<Set<string>>(() => new Set());
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const requestKey = [page, term, role, status, reloadToken].join("|");
  const loading = result?.key !== requestKey;
  const users = result?.users ?? [];
  const totalPages = result?.totalPages ?? 0;
  const totalElements = result?.totalElements ?? 0;
  const loadError = result?.key === requestKey ? result.error : null;
  const reload = () => setReloadToken((value) => value + 1);

  // Changing any filter returns to the first page unless the patch sets the page itself.
  const updateParams = useCallback((patch: Record<string, string>) => {
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      for (const [key, value] of Object.entries(patch)) {
        if (value) next.set(key, value);
        else next.delete(key);
      }
      if (!("page" in patch)) next.delete("page");
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  useEffect(() => {
    let cancelled = false;
    apiClient
      .get<Page<ManagedUser>>("/admin/users", {
        params: {
          page,
          size: PAGE_SIZE,
          sort: "createdAt,desc",
          ...(term ? { q: term } : {}),
          ...(status ? { status } : {}),
          ...(role ? { role } : {}),
        },
      })
      .then(
        (response) => {
          if (cancelled) return;
          setResult({
            key: requestKey,
            users: response.data.content,
            totalPages: response.data.totalPages,
            totalElements: response.data.totalElements,
            error: null,
          });
        },
        (requestError: unknown) => {
          if (cancelled) return;
          console.error("Không thể tải danh sách người dùng:", requestError);
          setResult((previous) => ({
            key: requestKey,
            users: previous?.users ?? [],
            totalPages: previous?.totalPages ?? 0,
            totalElements: previous?.totalElements ?? 0,
            error: listErrorMessage(requestError),
          }));
        },
      );
    return () => {
      cancelled = true;
    };
  }, [requestKey, page, term, role, status]);

  // If the current page no longer exists (filter narrowed the result), step back to the last one.
  useEffect(() => {
    if (!result || loading || result.error) return;
    const lastPage = Math.max(0, result.totalPages - 1);
    if (page > lastPage) updateParams({ page: lastPage > 0 ? String(lastPage) : "" });
  }, [result, loading, page, updateParams]);

  const performAction = async (target: ManagedUser, action: UserAction) => {
    if (!window.confirm(confirmMessage(action, target))) return;

    setWorkingUserIds((current) => new Set(current).add(target.id));
    setActionError(null);
    setNotice(null);
    try {
      await runUserAction(target.id, action);
      setNotice(actionNotice(action, target));
      reload();
    } catch (requestError) {
      console.error("Không thể cập nhật người dùng:", requestError);
      setActionError(userActionErrorMessage(requestError));
    } finally {
      setWorkingUserIds((current) => {
        const next = new Set(current);
        next.delete(target.id);
        return next;
      });
    }
  };

  const actionButtonClass = "inline-flex min-h-8 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border px-2.5 py-1.5 text-xs transition-colors hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-45";

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-neutral-500">Tìm kiếm, khóa tài khoản và quản lý quyền truy cập.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-neutral-100 px-3 py-1 text-sm text-neutral-600">
            {totalElements} tài khoản
          </span>
          <button
            type="button"
            onClick={reload}
            disabled={loading}
            aria-label="Tải lại danh sách"
            title="Tải lại danh sách"
            className="rounded-md border p-2 hover:bg-neutral-100 disabled:opacity-40"
          >
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 rounded-xl border bg-white p-4">
        <label className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
          <input
            value={query}
            onChange={(event) => updateParams({ q: event.target.value })}
            placeholder="Tìm theo tên hoặc email"
            className="h-10 w-full rounded-lg border bg-white pl-9 pr-3 text-sm outline-none focus:border-neutral-500"
          />
        </label>
        <select
          value={role}
          onChange={(event) => updateParams({ role: event.target.value })}
          aria-label="Lọc theo quyền"
          className="h-10 rounded-lg border bg-white px-3 text-sm"
        >
          <option value="">Tất cả quyền</option>
          <option value="USER">Người dùng</option>
          <option value="ADMIN">Admin</option>
        </select>
        <select
          value={status}
          onChange={(event) => updateParams({ status: event.target.value })}
          aria-label="Lọc theo trạng thái"
          className="h-10 rounded-lg border bg-white px-3 text-sm"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="ACTIVE">Đang hoạt động</option>
          <option value="SUSPENDED">Đã khóa</option>
        </select>
      </div>

      {notice && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
      {actionError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{actionError}</p>}
      {loadError && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">
          <span>{loadError}</span>
          <button type="button" onClick={reload} className="rounded-md border border-red-200 bg-white px-3 py-1 text-xs hover:bg-red-100">
            Thử lại
          </button>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-4 py-3 font-medium">Người dùng</th>
                <th className="px-4 py-3 font-medium">Quyền</th>
                <th className="px-4 py-3 font-medium">Trạng thái</th>
                <th className="px-4 py-3 font-medium">Ngày tạo</th>
                <th className="px-4 py-3 font-medium">Cập nhật</th>
                <th className="px-4 py-3 text-right font-medium">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading && users.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-neutral-500"><LoaderCircle className="mr-2 inline size-4 animate-spin" />Đang tải…</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-neutral-500">Không tìm thấy tài khoản phù hợp.</td></tr>
              ) : users.map((item) => {
                const isWorking = workingUserIds.has(item.id);
                const isCurrentAdmin = item.id === currentUser?.id;

                return (
                  <tr key={item.id} className={`hover:bg-neutral-50/70 ${loading ? "opacity-60" : ""}`}>
                    <td className="px-4 py-3">
                      <Link to={`/admin/users/${item.id}`} className="font-medium hover:underline">{item.fullName}</Link>
                      <div className="mt-0.5 text-xs text-neutral-500">{item.email}</div>
                    </td>
                    <td className="px-4 py-3"><RoleBadge role={item.role} /></td>
                    <td className="px-4 py-3"><StatusBadge status={item.status} /></td>
                    <td className="px-4 py-3 text-neutral-600">{formatDate(item.createdAt)}</td>
                    <td className="px-4 py-3 text-neutral-600">{formatDate(item.updatedAt)}</td>
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
            <button disabled={page <= 0 || loading} onClick={() => updateParams({ page: page > 1 ? String(page - 1) : "" })} aria-label="Trang trước" className="rounded-md border p-2 disabled:opacity-40"><ChevronLeft className="size-4" /></button>
            <button disabled={page + 1 >= totalPages || loading} onClick={() => updateParams({ page: String(page + 1) })} aria-label="Trang sau" className="rounded-md border p-2 disabled:opacity-40"><ChevronRight className="size-4" /></button>
          </div>
        </div>
      </div>
    </section>
  );
}
