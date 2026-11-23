import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AlertTriangle, LoaderCircle, Search, ShieldOff, ShieldCheck } from "lucide-react";
import apiClient from "../lib/api-client";
import type { Page } from "../lib/page";
import { actionErrorMessage, listErrorMessage } from "../lib/http-errors";

type BookRef = { id: string; title: string };
type UserRef = { id: string; email: string; fullName: string };

type TokenSummary = {
  id: string;
  tokenPrefix: string;
  book: BookRef;
  user: UserRef;
  loanId: string | null;
  purpose: "READ" | "PREVIEW";
  issuedAt: string;
  expiresAt: string;
  revokedAt: string | null;
  lastSeenAt: string | null;
  accessCount: number;
  distinctIpCount: number;
  status: "ACTIVE" | "EXPIRED" | "REVOKED";
};

type LookupResult = {
  matched: boolean;
  matchType: string | null;
  tokens: TokenSummary[];
  signals: string[];
};

const PAGE_SIZE = 10;

function formatDateTime(value: string | null) {
  return value ? new Date(value).toLocaleString("vi-VN") : "—";
}

const statusStyles: Record<TokenSummary["status"], string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700",
  EXPIRED: "bg-neutral-100 text-neutral-600",
  REVOKED: "bg-red-50 text-red-700",
};

export default function CanaryManager() {
  const [searchParams] = useSearchParams();
  const bookId = searchParams.get("bookId") ?? "";

  const [tab, setTab] = useState<"tokens" | "lookup">("tokens");
  const [tokens, setTokens] = useState<TokenSummary[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [statusFilter, setStatusFilter] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [lookupValue, setLookupValue] = useState("");
  const [lookupResult, setLookupResult] = useState<LookupResult | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookingUp, setLookingUp] = useState(false);

  const loadTokens = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get<Page<TokenSummary>>("/admin/canary-tokens", {
        params: {
          page,
          size: PAGE_SIZE,
          ...(bookId ? { bookId } : {}),
          ...(statusFilter ? { status: statusFilter } : {}),
          ...(query.trim() ? { q: query.trim() } : {}),
        },
      });
      setTokens(response.data.content);
      setTotalPages(response.data.totalPages);
      setTotalElements(response.data.totalElements);
    } catch (requestError) {
      setError(listErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [bookId, page, query, statusFilter]);

  useEffect(() => {
    void loadTokens();
  }, [loadTokens]);

  const revoke = async (token: TokenSummary) => {
    const reason = window.prompt(
      `Thu hồi token ${token.tokenPrefix} của ${token.user.email}. Lý do (ADMIN/RETURNED/LOST/SUSPENDED/PASSWORD_CHANGED):`,
      "ADMIN",
    );
    if (!reason) return;
    setBusyId(token.id);
    setError(null);
    setNotice(null);
    try {
      await apiClient.post(`/admin/canary-tokens/${token.id}/revoke`, { reason: reason.trim().toUpperCase() });
      setNotice(`Đã thu hồi token ${token.tokenPrefix}.`);
      await loadTokens();
    } catch (requestError) {
      setError(actionErrorMessage(requestError, "Không thu hồi được token."));
    } finally {
      setBusyId(null);
    }
  };

  const lookup = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!lookupValue.trim()) return;
    setLookingUp(true);
    setLookupError(null);
    setLookupResult(null);
    try {
      const response = await apiClient.get<LookupResult>("/admin/canary-tokens/lookup", {
        params: { value: lookupValue.trim() },
      });
      setLookupResult(response.data);
    } catch (requestError) {
      setLookupError(actionErrorMessage(requestError, "Không tra cứu được token."));
    } finally {
      setLookingUp(false);
    }
  };

  const inputClass = "h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none focus:border-[#e60023] focus:ring-2 focus:ring-[#e60023]/15";

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="text-sm text-neutral-500">
          Mỗi lượt đọc PDF được cấp một token định danh. Token lưu dưới dạng hash; tại đây chỉ thấy prefix,
          người đọc, phiên mượn và lịch sử truy cập.
        </p>
        {bookId && <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800">Đang lọc theo sách</span>}
      </div>

      <div className="flex gap-2">
        <button type="button" onClick={() => setTab("tokens")} className={`rounded-lg px-3 py-1.5 text-sm font-medium ${tab === "tokens" ? "bg-[#e60023] text-white" : "border border-gray-200 text-gray-700"}`}>Token</button>
        <button type="button" onClick={() => setTab("lookup")} className={`rounded-lg px-3 py-1.5 text-sm font-medium ${tab === "lookup" ? "bg-[#e60023] text-white" : "border border-gray-200 text-gray-700"}`}>Tra cứu rò rỉ</button>
      </div>

      {notice && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}

      {tab === "tokens" ? (
        <>
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-100 bg-white p-4">
            <label className="relative min-w-56 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
              <input
                value={query}
                onChange={(event) => { setPage(0); setQuery(event.target.value); }}
                placeholder="Tìm theo prefix, email hoặc tên sách"
                className="h-10 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-[#e60023] focus:ring-2 focus:ring-[#e60023]/15"
              />
            </label>
            <select value={statusFilter} onChange={(event) => { setPage(0); setStatusFilter(event.target.value); }} className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm">
              <option value="">Mọi trạng thái</option>
              <option value="ACTIVE">Còn hạn</option>
              <option value="EXPIRED">Hết hạn</option>
              <option value="REVOKED">Đã thu hồi</option>
            </select>
            <span className="rounded-full bg-red-50 px-3 py-1 text-sm font-medium text-[#c7001e]">{totalElements} token</span>
          </div>

          <div className="overflow-hidden rounded-xl border border-gray-100 bg-white">
            <table className="w-full table-fixed text-left text-sm">
              <colgroup>
                <col className="w-[12%]" /><col className="w-[20%]" /><col className="w-[20%]" />
                <col className="w-[8%]" /><col className="w-[14%]" /><col className="w-[10%]" /><col className="w-[8%]" /><col className="w-[8%]" />
              </colgroup>
              <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
                <tr>
                  <th className="px-3 py-3 font-medium">Mã</th>
                  <th className="px-3 py-3 font-medium">Sách</th>
                  <th className="px-3 py-3 font-medium">Người đọc</th>
                  <th className="px-3 py-3 font-medium">Mục đích</th>
                  <th className="px-3 py-3 font-medium">Hết hạn</th>
                  <th className="px-3 py-3 font-medium">Lần cuối</th>
                  <th className="px-3 py-3 font-medium">Lượt / IP</th>
                  <th className="px-3 py-3 text-right font-medium">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={8} className="px-3 py-10 text-center text-neutral-500"><LoaderCircle className="mr-2 inline size-4 animate-spin" />Đang tải…</td></tr>
                ) : tokens.length === 0 ? (
                  <tr><td colSpan={8} className="px-3 py-10 text-center text-neutral-500">Chưa có token nào.</td></tr>
                ) : tokens.map(token => (
                  <tr key={token.id} className="hover:bg-neutral-50/70">
                    <td className="px-3 py-3 font-mono text-xs text-gray-700">{token.tokenPrefix}…</td>
                    <td className="px-3 py-3 text-gray-700"><span className="line-clamp-2">{token.book.title}</span></td>
                    <td className="px-3 py-3 text-gray-700"><span className="line-clamp-1">{token.user.email}</span></td>
                    <td className="px-3 py-3 text-xs text-neutral-600">{token.purpose === "READ" ? "Đọc đầy đủ" : "Xem trước"}</td>
                    <td className="px-3 py-3 text-xs text-neutral-600">{formatDateTime(token.expiresAt)}</td>
                    <td className="px-3 py-3 text-xs text-neutral-600">{formatDateTime(token.lastSeenAt)}</td>
                    <td className="px-3 py-3 text-xs text-neutral-600">
                      {token.accessCount} / {token.distinctIpCount}
                      {token.distinctIpCount > 1 && <AlertTriangle className="ml-1 inline size-3.5 text-amber-600" aria-label="Nhiều IP" />}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex justify-end gap-1.5">
                        <span className={`rounded-full px-2 py-1 text-[10px] font-medium ${statusStyles[token.status]}`}>{token.status}</span>
                        {token.status !== "REVOKED" && (
                          <button type="button" disabled={busyId === token.id} onClick={() => void revoke(token)} className="rounded-md border border-gray-200 p-1 text-red-700 hover:bg-red-50 disabled:opacity-50" aria-label={`Thu hồi ${token.tokenPrefix}`}>
                            {busyId === token.id ? <LoaderCircle className="size-3.5 animate-spin" /> : <ShieldOff className="size-3.5" />}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3 text-sm text-neutral-500">
              <span>Trang {totalPages === 0 ? 0 : page + 1} / {totalPages}</span>
              <div className="flex gap-2">
                <button type="button" disabled={page <= 0 || loading} onClick={() => setPage(value => Math.max(0, value - 1))} className="rounded-md border border-gray-200 px-3 py-1 disabled:opacity-40">Trước</button>
                <button type="button" disabled={page + 1 >= totalPages || loading} onClick={() => setPage(value => value + 1)} className="rounded-md border border-gray-200 px-3 py-1 disabled:opacity-40">Sau</button>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="space-y-4">
          <form onSubmit={lookup} className="flex flex-wrap gap-2 rounded-xl border border-gray-100 bg-white p-4">
            <input
              value={lookupValue}
              onChange={(event) => setLookupValue(event.target.value)}
              placeholder="Dán URL /reader/files/cnr_…, token cnr_… hoặc prefix (≥ 6 ký tự)"
              className={inputClass + " min-w-64 flex-1"}
            />
            <button type="submit" disabled={lookingUp} className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-[#e60023] px-4 text-sm font-semibold text-white disabled:opacity-50">
              {lookingUp ? <LoaderCircle className="size-4 animate-spin" /> : <Search className="size-4" />} Tra cứu
            </button>
          </form>

          {lookupError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{lookupError}</p>}

          {lookupResult && !lookupResult.matched && (
            <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
              Không tìm thấy token. Kiểm tra lại prefix 8 ký tự hoặc token có thể đã bị xoá theo thời hạn lưu trữ.
            </p>
          )}

          {lookupResult?.matched && (
            <div className="space-y-3 rounded-xl border border-gray-100 bg-white p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                <ShieldCheck className="size-4 text-emerald-600" /> Khớp theo {lookupResult.matchType}
              </div>
              {lookupResult.signals.length > 0 && (
                <ul className="list-inside list-disc text-sm text-neutral-600">
                  {lookupResult.signals.map(signal => <li key={signal}>{signal}</li>)}
                </ul>
              )}
              {lookupResult.tokens.map(token => (
                <div key={token.id} className="rounded-lg border border-gray-100 bg-neutral-50/60 p-3 text-sm">
                  <div className="font-mono text-xs text-gray-700">{token.tokenPrefix}…</div>
                  <div className="mt-1 text-gray-800">{token.book.title}</div>
                  <div className="text-neutral-600">{token.user.email} · {token.user.fullName}</div>
                  <div className="mt-1 text-xs text-neutral-500">
                    Cấp: {formatDateTime(token.issuedAt)} · Hết hạn: {formatDateTime(token.expiresAt)} ·
                    Lượt đọc: {token.accessCount} · IP khác nhau: {token.distinctIpCount} · Trạng thái: {token.status}
                  </div>
                  {token.status !== "REVOKED" && (
                    <button type="button" onClick={() => void revoke(token)} className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50">
                      <ShieldOff className="size-3.5" /> Thu hồi ngay
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
