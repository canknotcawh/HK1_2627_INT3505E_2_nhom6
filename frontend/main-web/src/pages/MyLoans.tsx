import { useCallback, useEffect, useState, startTransition } from "react";
import { apiClient, ApiClientError } from "../lib/api-client";
import { Button } from "../components/ui/button";

type LoanStatus = "ACTIVE" | "RETURNED" | "OVERDUE" | "LOST";

type LoanResponse = {
    id: string;
    bookTitle: string;
    borrowedAt: string;
    dueAt: string;
    status: LoanStatus;
    renewedCount: number;
};

type PageResponse<T> = { content: T[] };

const STATUS_LABEL: Record<LoanStatus, string> = { ACTIVE: "Đang mượn", OVERDUE: "Quá hạn", RETURNED: "Đã trả", LOST: "Mất sách" };
const STATUS_BADGE: Record<LoanStatus, string> = {
    ACTIVE: "bg-blue-50 text-blue-700 border-blue-200",
    OVERDUE: "bg-red-50 text-red-700 border-red-200",
    RETURNED: "bg-emerald-50 text-emerald-700 border-emerald-200",
    LOST: "bg-neutral-100 text-neutral-600 border-neutral-300",
};

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("vi-VN");
}

export default function MyLoans() {
    const [data, setData] = useState<PageResponse<LoanResponse> | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [renewingId, setRenewingId] = useState<string | null>(null);

    const load = useCallback(async () => {
        try {
            setData(await apiClient.get<PageResponse<LoanResponse>>("/api/v1/users/me/loans", { size: 50 }));
        } catch (err) {
            setError(err instanceof ApiClientError ? err.message : "Không tải được danh sách");
        }
    }, []);

    useEffect(() => {
        startTransition(() => {
            load();
        });
    }, [load]);

    async function handleRenew(loanId: string) {
        setRenewingId(loanId);
        try {
            await apiClient.post(`/api/v1/users/me/loans/${loanId}/renew`);
            await load();
        } catch (err) {
            setError(err instanceof ApiClientError ? err.message : "Gia hạn thất bại");
        } finally {
            setRenewingId(null);
        }
    }

    return (
        <div className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold">Sách đang mượn</h2>
            {error && <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>}
            <div className="overflow-hidden rounded-lg border bg-white">
                <table className="w-full text-sm">
                    <thead className="border-b bg-neutral-50 text-left text-neutral-500">
                        <tr>
                            <th className="px-4 py-2.5 font-medium">Sách</th>
                            <th className="px-4 py-2.5 font-medium">Ngày mượn</th>
                            <th className="px-4 py-2.5 font-medium">Hạn trả</th>
                            <th className="px-4 py-2.5 font-medium">Trạng thái</th>
                            <th className="px-4 py-2.5 font-medium text-right">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data?.content.length === 0 && (
                            <tr><td colSpan={5} className="px-4 py-8 text-center text-neutral-400">Bạn chưa mượn quyển sách nào</td></tr>
                        )}
                        {data?.content.map((loan) => (
                            <tr key={loan.id} className="border-b last:border-0">
                                <td className="px-4 py-2.5 font-medium">{loan.bookTitle}</td>
                                <td className="px-4 py-2.5">{formatDate(loan.borrowedAt)}</td>
                                <td className="px-4 py-2.5">{formatDate(loan.dueAt)}</td>
                                <td className="px-4 py-2.5">
                                    <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[loan.status]}`}>{STATUS_LABEL[loan.status]}</span>
                                </td>
                                <td className="px-4 py-2.5 text-right">
                                    {(loan.status === "ACTIVE" || loan.status === "OVERDUE") && loan.renewedCount < 1 && (
                                        <Button variant="outline" size="xs" disabled={renewingId === loan.id} onClick={() => handleRenew(loan.id)}>Gia hạn</Button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}