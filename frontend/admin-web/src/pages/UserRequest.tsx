import { useCallback, useEffect, useState } from "react";
import { Check, ChevronLeft, ChevronRight, LoaderCircle, X } from "lucide-react";
import apiClient from "../lib/api-client";
import type { Page } from "../lib/page";
import type { LoanDto } from "../lib/loans";
import { actionErrorMessage, listErrorMessage } from "../lib/http-errors";

const PAGE_SIZE = 10;

type RequestAction = "return" | "reject-return";

export default function UserRequest() {
    const [loans, setLoans] = useState<LoanDto[]>([]);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);
    const [loading, setLoading] = useState(true);
    const [workingLoanIds, setWorkingLoanIds] = useState<Set<string>>(() => new Set());
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);

    const loadRequests = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await apiClient.get<Page<LoanDto>>("/admin/loans", {
                params: { page, size: PAGE_SIZE, status: "PENDING_RETURN" },
            });
            setLoans(response.data.content);
            setTotalPages(response.data.totalPages);
            setTotalElements(response.data.totalElements);
        } catch (requestError) {
            console.error("Không thể tải danh sách yêu cầu trả sách:", requestError);
            setError(listErrorMessage(requestError));
        } finally {
            setLoading(false);
        }
    }, [page]);

    useEffect(() => {
        void loadRequests();
    }, [loadRequests]);

    const performAction = async (loan: LoanDto, action: RequestAction) => {
        const confirmMessage = action === "return"
            ? `Xác nhận đã nhận lại sách "${loan.bookTitle}" từ ${loan.userEmail}?`
            : `Từ chối yêu cầu trả sách "${loan.bookTitle}" của ${loan.userEmail}?`;
        if (!window.confirm(confirmMessage)) return;

        setWorkingLoanIds(current => new Set(current).add(loan.id));
        setError(null);
        setNotice(null);
        try {
            await apiClient.post(`/admin/loans/${loan.id}/${action}`);
            setNotice(action === "return"
                ? `Đã xác nhận trả sách "${loan.bookTitle}".`
                : `Đã từ chối yêu cầu trả sách "${loan.bookTitle}".`);
            await loadRequests();
        } catch (requestError) {
            console.error("Không thể xử lý yêu cầu trả sách:", requestError);
            setError(actionErrorMessage(requestError, "Không xử lý được yêu cầu. Vui lòng thử lại."));
        } finally {
            setWorkingLoanIds(current => {
                const next = new Set(current);
                next.delete(loan.id);
                return next;
            });
        }
    };

    const formatDate = (iso: string) => new Date(iso).toLocaleDateString("vi-VN");
    const actionButtonClass = "inline-flex min-h-8 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border px-2.5 py-1.5 text-xs transition-colors hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-45";

    return (
        <section className="space-y-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h2 className="text-xl font-semibold">Yêu cầu trả sách</h2>
                    <p className="mt-1 text-sm text-neutral-500">Xác nhận hoặc từ chối các yêu cầu trả sách từ bạn đọc.</p>
                </div>
                <span className="rounded-full bg-neutral-100 px-3 py-1 text-sm text-neutral-600">
                    {totalElements} yêu cầu
                </span>
            </div>

            {notice && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
            {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}

            <div className="overflow-hidden rounded-xl border bg-white">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[720px] text-left text-sm">
                        <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
                            <tr>
                                <th className="px-4 py-3 font-medium">Sách</th>
                                <th className="px-4 py-3 font-medium">Người mượn</th>
                                <th className="px-4 py-3 font-medium">Ngày mượn</th>
                                <th className="px-4 py-3 font-medium">Hạn trả</th>
                                <th className="px-4 py-3 text-right font-medium">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {loading ? (
                                <tr><td colSpan={5} className="px-4 py-12 text-center text-neutral-500"><LoaderCircle className="mr-2 inline size-4 animate-spin" />Đang tải…</td></tr>
                            ) : loans.length === 0 ? (
                                <tr><td colSpan={5} className="px-4 py-12 text-center text-neutral-500">Không có yêu cầu trả sách nào đang chờ.</td></tr>
                            ) : loans.map((loan) => {
                                const isWorking = workingLoanIds.has(loan.id);
                                return (
                                    <tr key={loan.id} className="hover:bg-neutral-50/70">
                                        <td className="px-4 py-3 font-medium">{loan.bookTitle}</td>
                                        <td className="px-4 py-3">
                                            <div>{loan.userFullName}</div>
                                            <div className="text-xs text-neutral-500">{loan.userEmail}</div>
                                        </td>
                                        <td className="px-4 py-3 text-neutral-600">{formatDate(loan.borrowedAt)}</td>
                                        <td className="px-4 py-3 text-neutral-600">{formatDate(loan.dueAt)}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    type="button"
                                                    disabled={isWorking}
                                                    onClick={() => void performAction(loan, "return")}
                                                    className={actionButtonClass}
                                                >
                                                    {isWorking ? <LoaderCircle className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                                                    Xác nhận
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={isWorking}
                                                    onClick={() => void performAction(loan, "reject-return")}
                                                    className={actionButtonClass}
                                                >
                                                    <X className="size-3.5" />
                                                    Từ chối
                                                </button>
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
