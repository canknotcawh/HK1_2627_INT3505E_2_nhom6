import { useCallback, useEffect, useState, startTransition } from "react";
import { apiClient, ApiClientError } from "../lib/api-client";
import { Button } from "../components/ui/button";
import { RotateCcw, AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";

type LoanStatus = "ACTIVE" | "RETURNED" | "OVERDUE" | "LOST";

type LoanResponse = {
    id: string;
    bookId: string;
    bookTitle: string;
    userId: string;
    borrowerName: string;
    borrowerEmail: string;
    borrowedAt: string;
    dueAt: string;
    returnedAt: string | null;
    status: LoanStatus;
    renewedCount: number;
};

type PageResponse<T> = {
    content: T[];
    totalElements: number;
    totalPages: number;
    number: number;
    size: number;
};

const STATUS_TABS: { label: string; value: LoanStatus | undefined }[] = [
    { label: "Tất cả", value: undefined },
    { label: "Đang mượn", value: "ACTIVE" },
    { label: "Quá hạn", value: "OVERDUE" },
    { label: "Đã trả", value: "RETURNED" },
    { label: "Mất sách", value: "LOST" },
];

const STATUS_BADGE: Record<LoanStatus, string> = {
    ACTIVE: "bg-blue-50 text-blue-700 border-blue-200",
    OVERDUE: "bg-red-50 text-red-700 border-red-200",
    RETURNED: "bg-emerald-50 text-emerald-700 border-emerald-200",
    LOST: "bg-neutral-100 text-neutral-600 border-neutral-300",
};

const STATUS_LABEL: Record<LoanStatus, string> = {
    ACTIVE: "Đang mượn",
    OVERDUE: "Quá hạn",
    RETURNED: "Đã trả",
    LOST: "Mất sách",
};

function formatDate(iso: string | null) {
    return iso ? new Date(iso).toLocaleDateString("vi-VN") : "—";
}

export default function Borrow() {
    const [status, setStatus] = useState<LoanStatus | undefined>(undefined);
    const [page, setPage] = useState(0);
    const [data, setData] = useState<PageResponse<LoanResponse> | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [actingId, setActingId] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await apiClient.get<PageResponse<LoanResponse>>("/api/v1/admin/loans", {
                status,
                page,
                size: 10,
            });
            setData(result);
        } catch (err) {
            setError(err instanceof ApiClientError ? err.message : "Không tải được danh sách phiếu mượn");
        } finally {
            setLoading(false);
        }
    }, [status, page]);

    useEffect(() => {
        startTransition(() => {
            load();
        });
    }, [load]);

    async function handleAction(loanId: string, action: "return" | "lost" | "recover") {
        setActingId(loanId);
        try {
            await apiClient.post(`/api/v1/admin/loans/${loanId}/${action}`);
            await load();
        } catch (err) {
            setError(err instanceof ApiClientError ? err.message : "Thao tác thất bại");
        } finally {
            setActingId(null);
        }
    }

    async function handleMarkOverdue() {
        setLoading(true);
        try {
            await apiClient.post<{ updated: number }>("/api/v1/admin/loans/mark-overdue");
            await load();
        } catch (err) {
            setError(err instanceof ApiClientError ? err.message : "Thao tác thất bại");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <div className="flex gap-1 rounded-lg border bg-white p-1">
                    {STATUS_TABS.map((tab) => (
                        <button
                            key={tab.label}
                            onClick={() => {
                                setStatus(tab.value);
                                setPage(0);
                            }}
                            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                                status === tab.value ? "bg-neutral-900 text-white" : "text-neutral-500 hover:bg-neutral-100"
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <Button variant="outline" size="sm" onClick={handleMarkOverdue} disabled={loading}>
                    <RefreshCw className="size-3.5" />
                    Đánh dấu quá hạn
                </Button>
            </div>

            {error && (
                <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>
            )}

            <div className="overflow-hidden rounded-lg border bg-white">
                <table className="w-full text-sm">
                    <thead className="border-b bg-neutral-50 text-left text-neutral-500">
                        <tr>
                            <th className="px-4 py-2.5 font-medium">Sách</th>
                            <th className="px-4 py-2.5 font-medium">Độc giả</th>
                            <th className="px-4 py-2.5 font-medium">Ngày mượn</th>
                            <th className="px-4 py-2.5 font-medium">Hạn trả</th>
                            <th className="px-4 py-2.5 font-medium">Trạng thái</th>
                            <th className="px-4 py-2.5 font-medium text-right">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && !data && (
                            <tr><td colSpan={6} className="px-4 py-8 text-center text-neutral-400">Đang tải...</td></tr>
                        )}
                        {data && data.content.length === 0 && (
                            <tr><td colSpan={6} className="px-4 py-8 text-center text-neutral-400">Không có phiếu mượn nào</td></tr>
                        )}
                        {data?.content.map((loan) => (
                            <tr key={loan.id} className="border-b last:border-0">
                                <td className="px-4 py-2.5 font-medium">{loan.bookTitle}</td>
                                <td className="px-4 py-2.5">
                                    <div>{loan.borrowerName}</div>
                                    <div className="text-xs text-neutral-400">{loan.borrowerEmail}</div>
                                </td>
                                <td className="px-4 py-2.5">{formatDate(loan.borrowedAt)}</td>
                                <td className="px-4 py-2.5">{formatDate(loan.dueAt)}</td>
                                <td className="px-4 py-2.5">
                                    <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[loan.status]}`}>
                                        {STATUS_LABEL[loan.status]}
                                    </span>
                                </td>
                                <td className="px-4 py-2.5">
                                    <div className="flex justify-end gap-1.5">
                                        {(loan.status === "ACTIVE" || loan.status === "OVERDUE") && (
                                            <>
                                                <Button variant="outline" size="xs" disabled={actingId === loan.id} onClick={() => handleAction(loan.id, "return")}>
                                                    <CheckCircle2 className="size-3" />
                                                    Trả sách
                                                </Button>
                                                <Button variant="destructive" size="xs" disabled={actingId === loan.id} onClick={() => handleAction(loan.id, "lost")}>
                                                    <AlertTriangle className="size-3" />
                                                    Báo mất
                                                </Button>
                                            </>
                                        )}
                                        {loan.status === "LOST" && (
                                            <Button variant="outline" size="xs" disabled={actingId === loan.id} onClick={() => handleAction(loan.id, "recover")}>
                                                <RotateCcw className="size-3" />
                                                Khôi phục
                                            </Button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {data && data.totalPages > 1 && (
                <div className="flex items-center justify-end gap-2 text-sm">
                    <Button variant="outline" size="xs" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>Trước</Button>
                    <span className="text-neutral-500">Trang {data.number + 1} / {data.totalPages}</span>
                    <Button variant="outline" size="xs" disabled={page >= data.totalPages - 1} onClick={() => setPage((p) => p + 1)}>Sau</Button>
                </div>
            )}
        </div>
    );
}