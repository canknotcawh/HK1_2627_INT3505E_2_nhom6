import { Fragment, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AlertTriangle, ChevronDown, ChevronRight, History, LoaderCircle, MapPin, Search, ShieldOff, ShieldCheck } from "lucide-react";
import apiClient from "../lib/api-client";
import type { Page } from "../lib/page";
import { actionErrorMessage, listErrorMessage } from "../lib/http-errors";

type BookRef = { id: string; title: string };
type UserRef = { id: string; email: string; fullName: string };

type GroupSummary = {
  book: BookRef;
  user: UserRef;
  tokenCount: number;
  activeTokenCount: number;
  accessCount: number;
  distinctIpCount: number;
  lastSeenAt: string | null;
  lastIssuedAt: string | null;
};

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

type LocationInfo = {
  ipAddress: string | null;
  ipVersion: string | null;
  countryCode: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  timezone: string | null;
  isp: string | null;
  source: string | null;
};

type AccessRow = {
  id: number;
  accessedAt: string;
  ipAddress: string | null;
  location: LocationInfo | null;
  outcome: "OK" | "EXPIRED" | "REVOKED" | "FORBIDDEN" | "NOT_FOUND";
  bytesSent: number | null;
  requestId: string | null;
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

const outcomeStyles: Record<AccessRow["outcome"], string> = {
  OK: "text-emerald-700",
  EXPIRED: "text-neutral-500",
  REVOKED: "text-red-700",
  FORBIDDEN: "text-amber-700",
  NOT_FOUND: "text-neutral-500",
};

function locationLabel(location: LocationInfo | null) {
  if (!location?.ipAddress) return "—";
  if (location.source === "PENDING") return "Đang xác định…";
  if (location.source === "LOCAL") return "Mạng nội bộ / thiết bị cục bộ";
  if (location.source === "UNKNOWN") return "Không xác định được";
  const parts = [location.city, location.region, location.country].filter(Boolean);
  if (parts.length === 0) return "Không xác định được";
  return location.countryCode ? `${parts.join(", ")} (${location.countryCode})` : parts.join(", ");
}

const groupKey = (group: GroupSummary) => `${group.book.id}:${group.user.id}`;

export default function CanaryManager() {
  const [searchParams] = useSearchParams();
  const bookId = searchParams.get("bookId") ?? "";

  const [tab, setTab] = useState<"groups" | "lookup">("groups");
  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [groupTokens, setGroupTokens] = useState<Record<string, TokenSummary[]>>({});
  const [groupLoading, setGroupLoading] = useState(false);
  const [groupError, setGroupError] = useState<string | null>(null);

  const [openAccessTokenId, setOpenAccessTokenId] = useState<string | null>(null);
  const [accesses, setAccesses] = useState<Record<string, AccessRow[]>>({});
  const [accessLoading, setAccessLoading] = useState(false);
  const [accessError, setAccessError] = useState<string | null>(null);

  const [lookupValue, setLookupValue] = useState("");
  const [lookupResult, setLookupResult] = useState<LookupResult | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookingUp, setLookingUp] = useState(false);

  const loadGroups = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get<Page<GroupSummary>>("/admin/canary-tokens/groups", {
        params: {
          page,
          size: PAGE_SIZE,
          ...(bookId ? { bookId } : {}),
          ...(query.trim() ? { q: query.trim() } : {}),
        },
      });
      setGroups(response.data.content);
      setTotalPages(response.data.totalPages);
      setTotalElements(response.data.totalElements);
      setExpandedGroup(null);
      setOpenAccessTokenId(null);
    } catch (requestError) {
      setError(listErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [bookId, page, query]);

  useEffect(() => {
    void loadGroups();
  }, [loadGroups]);

  const loadGroupTokens = useCallback(async (group: GroupSummary) => {
    const key = groupKey(group);
    setGroupLoading(true);
    setGroupError(null);
    try {
      const response = await apiClient.get<Page<TokenSummary>>("/admin/canary-tokens", {
        params: { bookId: group.book.id, userId: group.user.id, page: 0, size: 50 },
      });
      setGroupTokens(current => ({ ...current, [key]: response.data.content }));
    } catch (requestError) {
      setGroupError(actionErrorMessage(requestError, "Không tải được token của nhóm này."));
    } finally {
      setGroupLoading(false);
    }
  }, []);

  const toggleGroup = async (group: GroupSummary) => {
    const key = groupKey(group);
    if (expandedGroup === key) {
      setExpandedGroup(null);
      setOpenAccessTokenId(null);
      return;
    }
    setExpandedGroup(key);
    setOpenAccessTokenId(null);
    setGroupTokens(current => {
      const { [key]: _removed, ...rest } = current;
      return rest;
    });
    await loadGroupTokens(group);
  };

  const refreshGroup = async (group: GroupSummary) => {
    await loadGroupTokens(group);
    await loadGroups();
  };

  const toggleAccesses = async (token: TokenSummary) => {
    if (openAccessTokenId === token.id) {
      setOpenAccessTokenId(null);
      return;
    }
    setOpenAccessTokenId(token.id);
    setAccessError(null);
    if (accesses[token.id]) return;
    setAccessLoading(true);
    try {
      const response = await apiClient.get<Page<AccessRow>>(`/admin/canary-tokens/${token.id}/accesses`, {
        params: { page: 0, size: 20 },
      });
      setAccesses(current => ({ ...current, [token.id]: response.data.content }));
    } catch (requestError) {
      setAccessError(actionErrorMessage(requestError, "Không tải được lịch sử truy cập."));
    } finally {
      setAccessLoading(false);
    }
  };

  const revoke = async (token: TokenSummary, group?: GroupSummary) => {
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
      setAccesses(current => {
        const { [token.id]: _stale, ...rest } = current;
        return rest;
      });
      if (group) {
        await refreshGroup(group);
      } else {
        await loadGroups();
      }
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

  const accessPanel = (token: TokenSummary) => (
    <div className="rounded-lg border border-gray-200 bg-white p-3">
      <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-500">
        <MapPin className="size-3.5" /> Lịch sử truy cập và vị trí thiết bị
      </div>
      {accessError && <p role="alert" className="mb-2 rounded-md bg-red-50 p-2 text-xs text-red-800">{accessError}</p>}
      {accessLoading && !accesses[token.id] ? (
        <p className="py-4 text-center text-xs text-neutral-500"><LoaderCircle className="mr-1 inline size-3.5 animate-spin" />Đang tải…</p>
      ) : (accesses[token.id] ?? []).length === 0 ? (
        <p className="py-4 text-center text-xs text-neutral-500">Token này chưa có lượt truy cập nào.</p>
      ) : (
        <table className="w-full text-left text-xs">
          <thead className="text-[10px] uppercase tracking-wide text-neutral-400">
            <tr>
              <th className="py-1.5 pr-3 font-medium">Thời điểm</th>
              <th className="py-1.5 pr-3 font-medium">IP</th>
              <th className="py-1.5 pr-3 font-medium">Vị trí</th>
              <th className="py-1.5 pr-3 font-medium">Nhà mạng</th>
              <th className="py-1.5 pr-3 font-medium">Kết quả</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(accesses[token.id] ?? []).map(row => (
              <tr key={row.id}>
                <td className="py-2 pr-3 whitespace-nowrap text-neutral-600">{formatDateTime(row.accessedAt)}</td>
                <td className="py-2 pr-3 font-mono text-gray-800">
                  {row.ipAddress ?? "—"}
                  {row.location?.ipVersion && <span className="ml-1 text-[10px] text-neutral-400">{row.location.ipVersion}</span>}
                </td>
                <td className="py-2 pr-3 text-neutral-700">
                  {locationLabel(row.location)}
                  {row.location?.latitude != null && row.location?.longitude != null && (
                    <span className="ml-1 text-[10px] text-neutral-400">
                      {row.location.latitude.toFixed(2)}, {row.location.longitude.toFixed(2)}
                    </span>
                  )}
                </td>
                <td className="py-2 pr-3 text-neutral-600">{row.location?.isp ?? "—"}</td>
                <td className={`py-2 pr-3 font-medium ${outcomeStyles[row.outcome]}`}>{row.outcome}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  const tokenTable = (group: GroupSummary, tokens: TokenSummary[]) => (
    <table className="w-full text-left text-xs">
      <thead className="text-[10px] uppercase tracking-wide text-neutral-400">
        <tr>
          <th className="py-1.5 pr-3 font-medium">Mã</th>
          <th className="py-1.5 pr-3 font-medium">Mục đích</th>
          <th className="py-1.5 pr-3 font-medium">Cấp lúc</th>
          <th className="py-1.5 pr-3 font-medium">Hết hạn</th>
          <th className="py-1.5 pr-3 font-medium">Lượt / IP</th>
          <th className="py-1.5 pr-3 font-medium">Trạng thái</th>
          <th className="py-1.5 text-right font-medium">Thao tác</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {tokens.map(token => (
          <Fragment key={token.id}>
            <tr>
              <td className="py-2 pr-3 font-mono text-gray-700">{token.tokenPrefix}…</td>
              <td className="py-2 pr-3 text-neutral-600">{token.purpose === "READ" ? "Đọc đầy đủ" : "Xem trước"}</td>
              <td className="py-2 pr-3 whitespace-nowrap text-neutral-600">{formatDateTime(token.issuedAt)}</td>
              <td className="py-2 pr-3 whitespace-nowrap text-neutral-600">{formatDateTime(token.expiresAt)}</td>
              <td className="py-2 pr-3 text-neutral-600">
                {token.accessCount} / {token.distinctIpCount}
                {token.distinctIpCount > 1 && <AlertTriangle className="ml-1 inline size-3 text-amber-600" aria-label="Nhiều IP" />}
              </td>
              <td className="py-2 pr-3">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusStyles[token.status]}`}>{token.status}</span>
              </td>
              <td className="py-2">
                <div className="flex justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => void toggleAccesses(token)}
                    className={`rounded-md border p-1 hover:bg-neutral-100 ${openAccessTokenId === token.id ? "border-gray-300 bg-neutral-100 text-gray-800" : "border-gray-200 text-gray-600"}`}
                    aria-label={`Lịch sử truy cập ${token.tokenPrefix}`}
                    aria-expanded={openAccessTokenId === token.id}
                  >
                    <History className="size-3.5" />
                  </button>
                  {token.status !== "REVOKED" && (
                    <button type="button" disabled={busyId === token.id} onClick={() => void revoke(token, group)} className="rounded-md border border-gray-200 p-1 text-red-700 hover:bg-red-50 disabled:opacity-50" aria-label={`Thu hồi ${token.tokenPrefix}`}>
                      {busyId === token.id ? <LoaderCircle className="size-3.5 animate-spin" /> : <ShieldOff className="size-3.5" />}
                    </button>
                  )}
                </div>
              </td>
            </tr>
            {openAccessTokenId === token.id && (
              <tr>
                <td colSpan={7} className="pb-3">{accessPanel(token)}</td>
              </tr>
            )}
          </Fragment>
        ))}
      </tbody>
    </table>
  );

  const inputClass = "h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none focus:border-[#e60023] focus:ring-2 focus:ring-[#e60023]/15";

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="text-sm text-neutral-500">
          Mỗi dòng gom tất cả lượt cấp token của <strong>một người đọc cho một PDF</strong>. Bấm vào dòng
          để xem từng token, lịch sử đọc, IP và vị trí thiết bị.
        </p>
        {bookId && <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800">Đang lọc theo sách</span>}
      </div>

      <div className="flex gap-2">
        <button type="button" onClick={() => setTab("groups")} className={`rounded-lg px-3 py-1.5 text-sm font-medium ${tab === "groups" ? "bg-[#e60023] text-white" : "border border-gray-200 text-gray-700"}`}>Người đọc × PDF</button>
        <button type="button" onClick={() => setTab("lookup")} className={`rounded-lg px-3 py-1.5 text-sm font-medium ${tab === "lookup" ? "bg-[#e60023] text-white" : "border border-gray-200 text-gray-700"}`}>Tra cứu rò rỉ</button>
      </div>

      {notice && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}

      {tab === "groups" ? (
        <>
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-100 bg-white p-4">
            <label className="relative min-w-64 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
              <input
                value={query}
                onChange={(event) => { setPage(0); setQuery(event.target.value); }}
                placeholder="Tìm theo email người đọc, họ tên, tên sách hoặc mã token"
                className="h-10 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-[#e60023] focus:ring-2 focus:ring-[#e60023]/15"
              />
            </label>
            <span className="rounded-full bg-red-50 px-3 py-1 text-sm font-medium text-[#c7001e]">{totalElements} nhóm</span>
          </div>

          <div className="overflow-hidden rounded-xl border border-gray-100 bg-white">
            <table className="w-full table-fixed text-left text-sm">
              <colgroup>
                <col className="w-[26%]" /><col className="w-[22%]" /><col className="w-[12%]" />
                <col className="w-[9%]" /><col className="w-[8%]" /><col className="w-[15%]" /><col className="w-[8%]" />
              </colgroup>
              <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
                <tr>
                  <th className="px-3 py-3 font-medium">Người đọc</th>
                  <th className="px-3 py-3 font-medium">Sách</th>
                  <th className="px-3 py-3 font-medium">Token</th>
                  <th className="px-3 py-3 font-medium">Lượt đọc</th>
                  <th className="px-3 py-3 font-medium">IP</th>
                  <th className="px-3 py-3 font-medium">Lần cuối</th>
                  <th className="px-3 py-3 text-right font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={7} className="px-3 py-10 text-center text-neutral-500"><LoaderCircle className="mr-2 inline size-4 animate-spin" />Đang tải…</td></tr>
                ) : groups.length === 0 ? (
                  <tr><td colSpan={7} className="px-3 py-10 text-center text-neutral-500">Không có lượt cấp token nào khớp.</td></tr>
                ) : groups.map(group => {
                  const key = groupKey(group);
                  const isOpen = expandedGroup === key;
                  return (
                    <Fragment key={key}>
                      <tr className="cursor-pointer hover:bg-neutral-50/70" onClick={() => void toggleGroup(group)}>
                        <td className="px-3 py-3">
                          <span className="block truncate text-gray-800">{group.user.email}</span>
                          <span className="block truncate text-xs text-neutral-500">{group.user.fullName}</span>
                        </td>
                        <td className="px-3 py-3 text-gray-700"><span className="line-clamp-2">{group.book.title}</span></td>
                        <td className="px-3 py-3 text-xs text-neutral-600">
                          {group.tokenCount}
                          <span className="ml-1 text-neutral-400">({group.activeTokenCount} còn hạn)</span>
                        </td>
                        <td className="px-3 py-3 text-xs text-neutral-600">{group.accessCount}</td>
                        <td className="px-3 py-3 text-xs text-neutral-600">
                          {group.distinctIpCount}
                          {group.distinctIpCount > 1 && <AlertTriangle className="ml-1 inline size-3.5 text-amber-600" aria-label="Nhiều IP" />}
                        </td>
                        <td className="px-3 py-3 text-xs text-neutral-600">{formatDateTime(group.lastSeenAt)}</td>
                        <td className="px-3 py-3 text-right text-neutral-400">
                          {isOpen ? <ChevronDown className="inline size-4" /> : <ChevronRight className="inline size-4" />}
                        </td>
                      </tr>
                      {isOpen && (
                        <tr className="bg-neutral-50/70">
                          <td colSpan={7} className="px-4 py-3">
                            <div className="rounded-lg border border-gray-200 bg-white p-3">
                              <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                                <span>{group.tokenCount} token đã cấp cho {group.user.email} · {group.book.title}</span>
                                <button type="button" onClick={() => void refreshGroup(group)} className="rounded-md border border-gray-200 px-2 py-1 text-[10px] font-medium normal-case text-gray-600 hover:bg-neutral-50">
                                  Làm mới
                                </button>
                              </div>
                              {groupError && <p role="alert" className="mb-2 rounded-md bg-red-50 p-2 text-xs text-red-800">{groupError}</p>}
                              {groupLoading && !groupTokens[key] ? (
                                <p className="py-4 text-center text-xs text-neutral-500"><LoaderCircle className="mr-1 inline size-3.5 animate-spin" />Đang tải…</p>
                              ) : (groupTokens[key] ?? []).length === 0 ? (
                                <p className="py-4 text-center text-xs text-neutral-500">Nhóm này không còn token nào.</p>
                              ) : (
                                tokenTable(group, groupTokens[key] ?? [])
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
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
              placeholder="Dán URL /reader/files/cnr_…, token cnr_…, mã prefix (≥ 6 ký tự), email hoặc tên sách"
              className={inputClass + " min-w-64 flex-1"}
            />
            <button type="submit" disabled={lookingUp} className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-[#e60023] px-4 text-sm font-semibold text-white disabled:opacity-50">
              {lookingUp ? <LoaderCircle className="size-4 animate-spin" /> : <Search className="size-4" />} Tra cứu
            </button>
          </form>

          {lookupError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{lookupError}</p>}

          {lookupResult && !lookupResult.matched && (
            <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
              Không tìm thấy token. Kiểm tra lại mã prefix 6–8 ký tự, hoặc token có thể đã bị xoá theo thời hạn lưu trữ.
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
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button type="button" onClick={() => void toggleAccesses(token)} className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-white">
                      <History className="size-3.5" /> {openAccessTokenId === token.id ? "Ẩn IP & vị trí" : "Xem IP & vị trí"}
                    </button>
                    {token.status !== "REVOKED" && (
                      <button type="button" onClick={() => void revoke(token)} className="inline-flex items-center gap-1.5 rounded-md border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50">
                        <ShieldOff className="size-3.5" /> Thu hồi ngay
                      </button>
                    )}
                  </div>
                  {openAccessTokenId === token.id && <div className="mt-2">{accessPanel(token)}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
