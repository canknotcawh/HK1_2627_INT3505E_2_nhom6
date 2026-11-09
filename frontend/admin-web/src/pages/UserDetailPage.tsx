import { useEffect, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Ban, Check, LoaderCircle, Shield, ShieldOff } from "lucide-react";
import apiClient from "../lib/api-client";
import { useAuth } from "../contexts/AuthContext";
import { listErrorMessage } from "../lib/http-errors";
import {
  actionNotice,
  confirmMessage,
  formatDateTime,
  isNotFound,
  runUserAction,
  userActionErrorMessage,
  type ManagedUser,
  type UserAction,
} from "../lib/admin-users";
import { RoleBadge, StatusBadge } from "../components/user-badges";

type DetailResult = {
  key: string;
  id: string | undefined;
  user: ManagedUser | null;
  notFound: boolean;
  error: string | null;
};

const actionButtonClass = "inline-flex min-h-9 items-center justify-center gap-2 whitespace-nowrap rounded-md border px-3 py-2 text-sm transition-colors hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-45";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-neutral-500">{label}</dt>
      <dd className="mt-1 text-sm text-neutral-900">{children}</dd>
    </div>
  );
}

export default function UserDetailPage() {
  const { userId } = useParams<{ userId: string }>();
  const { user: currentUser } = useAuth();
  const [result, setResult] = useState<DetailResult | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [working, setWorking] = useState<UserAction | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const requestKey = `${userId}|${reloadToken}`;
  const loading = result?.key !== requestKey;
  const current = result && result.id === userId ? result : null; // never show another account's data
  const user = current?.user ?? null;
  const reload = () => setReloadToken((value) => value + 1);

  useEffect(() => {
    let cancelled = false;
    apiClient.get<ManagedUser>(`/admin/users/${userId}`).then(
      (response) => {
        if (!cancelled) setResult({ key: requestKey, id: userId, user: response.data, notFound: false, error: null });
      },
      (requestError: unknown) => {
        if (cancelled) return;
        if (isNotFound(requestError)) {
          setResult({ key: requestKey, id: userId, user: null, notFound: true, error: null });
        } else {
          console.error("Không thể tải thông tin tài khoản:", requestError);
          setResult({ key: requestKey, id: userId, user: null, notFound: false, error: listErrorMessage(requestError) });
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, [requestKey, userId]);

  const performAction = async (action: UserAction) => {
    if (!user || !window.confirm(confirmMessage(action, user))) return;

    setWorking(action);
    setActionError(null);
    setNotice(null);
    try {
      const updated = await runUserAction(user.id, action);
      setResult((previous) => (previous ? { ...previous, user: updated } : previous));
      setNotice(actionNotice(action, user));
    } catch (requestError) {
      console.error("Không thể cập nhật người dùng:", requestError);
      setActionError(userActionErrorMessage(requestError));
    } finally {
      setWorking(null);
    }
  };

  const backLink = (
    <Link to="/admin/users" className="inline-flex items-center gap-1.5 text-sm text-neutral-600 hover:text-neutral-900">
      <ArrowLeft className="size-4" />Quay lại danh sách
    </Link>
  );

  if (!user && (loading || !current)) {
    return (
      <section className="space-y-5">
        {backLink}
        <p className="py-12 text-center text-neutral-500"><LoaderCircle className="mr-2 inline size-4 animate-spin" />Đang tải…</p>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="space-y-5">
        {backLink}
        {current?.notFound ? (
          <p role="alert" className="rounded-lg bg-neutral-100 p-4 text-sm text-neutral-700">Không tìm thấy tài khoản này.</p>
        ) : (
          <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-red-50 p-4 text-sm text-red-800">
            <span>{current?.error ?? "Không tải được thông tin tài khoản."}</span>
            <button type="button" onClick={reload} className="rounded-md border border-red-200 bg-white px-3 py-1 text-xs hover:bg-red-100">Thử lại</button>
          </div>
        )}
      </section>
    );
  }

  const isSelf = user.id === currentUser?.id;
  const busy = working !== null;

  return (
    <section className="space-y-5">
      {backLink}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">{user.fullName}</h2>
          <p className="mt-1 text-sm text-neutral-500">{user.email}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <RoleBadge role={user.role} />
          <StatusBadge status={user.status} />
        </div>
      </div>

      {notice && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
      {actionError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{actionError}</p>}

      <div className="rounded-xl border bg-white p-5">
        <h3 className="text-sm font-semibold">Thông tin tài khoản</h3>
        <dl className="mt-4 grid gap-5 sm:grid-cols-2">
          <Field label="Họ tên">{user.fullName}</Field>
          <Field label="Email">{user.email}</Field>
          <Field label="Ngày tạo">{formatDateTime(user.createdAt)}</Field>
          <Field label="Cập nhật gần nhất">{formatDateTime(user.updatedAt)}</Field>
          <Field label="Mã tài khoản"><code className="break-all text-xs text-neutral-600">{user.id}</code></Field>
        </dl>
      </div>

      <div className="rounded-xl border bg-white p-5">
        <h3 className="text-sm font-semibold">Quản lý truy cập</h3>
        {isSelf && (
          <p className="mt-2 text-sm text-neutral-500">Đây là tài khoản bạn đang đăng nhập, nên không thể tự khóa hoặc tự hạ quyền.</p>
        )}
        <div className="mt-4 flex flex-wrap gap-3">
          {user.status === "ACTIVE" ? (
            <button type="button" disabled={busy || isSelf} onClick={() => void performAction("suspend")} className={actionButtonClass}>
              {working === "suspend" ? <LoaderCircle className="size-4 animate-spin" /> : <Ban className="size-4" />}
              Tạm khóa
            </button>
          ) : (
            <button type="button" disabled={busy} onClick={() => void performAction("reactivate")} className={actionButtonClass}>
              {working === "reactivate" ? <LoaderCircle className="size-4 animate-spin" /> : <Check className="size-4" />}
              Mở khóa
            </button>
          )}
          {user.role === "ADMIN" ? (
            <button type="button" disabled={busy || isSelf} onClick={() => void performAction("demote")} className={actionButtonClass}>
              {working === "demote" ? <LoaderCircle className="size-4 animate-spin" /> : <ShieldOff className="size-4" />}
              Hạ quyền admin
            </button>
          ) : (
            <button type="button" disabled={busy} onClick={() => void performAction("promote")} className={actionButtonClass}>
              {working === "promote" ? <LoaderCircle className="size-4 animate-spin" /> : <Shield className="size-4" />}
              Cấp quyền admin
            </button>
          )}
        </div>
        <p className="mt-3 text-xs text-neutral-500">
          Tài khoản không bị xóa; khóa tài khoản sẽ thu hồi các phiên đăng nhập đã lưu. Hệ thống luôn giữ lại ít nhất một admin đang hoạt động.
        </p>
      </div>
    </section>
  );
}
