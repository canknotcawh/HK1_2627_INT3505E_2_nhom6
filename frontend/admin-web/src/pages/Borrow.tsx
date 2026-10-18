import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, LoaderCircle, RotateCcw, AlertTriangle, PackageCheck } from "lucide-react";
import apiClient from "../lib/api-client";
import type { Page } from "../lib/page";
import type { LoanDto, LoanStatus } from "../lib/loans";
import { actionErrorMessage, listErrorMessage } from "../lib/http-errors";

const PAGE_SIZE = 10;

type LoanAction = "return" | "lost" | "recover";

export default function Borrow() {
    const [loans, setLoans] = useState<LoanDto[]>([]);
    const [status, setStatus] = useState<LoanStatus | "">("ACTIVE");
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);
    const [loading, setLoading] = useState(true);
    const [markingOverdue, setMarkingOverdue] = useState(false);
    const [workingLoanIds, setWorkingLoanIds] = useState<Set<string>>(() => new Set());
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);

    const loadLoans = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await apiClient.get<Page<LoanDto>>("/admin/loans", {
                params: { page, size: PAGE_SIZE, ...(status ? { status } : {}) },
            });
            setLoans(response.data.content);
            setTotalPages(response.data.totalPages);
            setTotalElements(response.data.totalElements);
        } catch (requestError) {
            console.error("Không thể tải danh sách khoản mượn:", requestError);
            setError(listErrorMessage(requestError));
        } finally {
            setLoading(false);
        }
    }, [page, status]);

    useEffect(() => {
        void loadLoans();
    }, [loadLoans]);

    const performAction = async (loan: LoanDto, action: LoanAction) => {
        const labels: Record<LoanAction, string> = {
            return: "xác nhận trả",
            lost: "báo mất",
            recover: "thu hồi (đã tìm lại)",
        };
        if (!window.confirm(`Bạn có chắc muốn ${labels[action]} sách "${loan.bookTitle}" của ${loan.userEmail}?`)) return;

        setWorkingLoanIds(current => new Set(current).add(loan.id));
        setError(null);
        setNotice(null);
        try {
            await apiClient.post(`/admin/loans/${loan.id}/${action}`);
            setNotice(`Đã cập nhật khoản mượn "${loan.bookTitle}".`);
            await loadLoans();
        } catch (requestError) {
            console.error("Không thể cập nhật khoản mượn:", requestError);
            setError(actionErrorMessage(requestError, "Không cập nhật được khoản mượn. Vui lòng thử lại."));
        } finally {
            setWorkingLoanIds(current => {
                const next = new Set(current);
                next.delete(loan.id);
                return next;
            });
        }
    };

    const handleMarkOverdue = async () => {
        setMarkingOverdue(true);
        setError(null);
        setNotice(null);
        try {
            const response = await apiClient.post<{ updated: number }>("/admin/loans/mark-overdue");
            setNotice(`Đã đánh dấu ${response.data.updated} khoản mượn quá hạn.`);
            await loadLoans();
        } catch (requestError) {
            console.error("Không thể đánh dấu quá hạn:", requestError);
            setError(actionErrorMessage(requestError, "Không thực hiện được. Vui lòng thử lại."));
        } finally {
            setMarkingOverdue(false);
        }
    };

    const changeStatus = (value: LoanStatus | "") => {
        setPage(0);
        setStatus(value);
    };

    const formatDate = (iso: string) => new Date(iso).toLocaleDateString("vi-VN");
    const actionButtonClass = "inline-flex min-h-8 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border px-2.5 py-1.5 text-xs transition-colors hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-45";

    return (
        <section className="space-y-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h2 className="text-xl font-semibold">Quản lý mượn/trả</h2>
                    <p className="mt-1 text-sm text-neutral-500">Xem và xử lý các khoản mượn đang mở.</p>
                </div>
                <div className="flex items-center gap-3">
                    <span className="rounded-full bg-neutral-100 px-3 py-1 text-sm text-neutral-600">
                        {totalElements} khoản mượn
                    </span>
                    <button
                        type="button"
                        disabled={markingOverdue}
                        onClick={() => void handleMarkOverdue()}
                        className="inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm hover:bg-neutral-100 disabled:opacity-50"
                    >
                        {markingOverdue ? <LoaderCircle className="size-3.5 animate-spin" /> : <AlertTriangle className="size-3.5" />}
                        Đánh dấu quá hạn
                    </button>
                </div>
            </div>

            <div className="flex flex-wrap gap-3 rounded-xl border bg-white p-4">
                <select
                    value={status}
                    onChange={(event) => changeStatus(event.target.value as LoanStatus | "")}
                    aria-label="Lọc theo trạng thái"
                    className="h-10 rounded-lg border bg-white px-3 text-sm"
                >
                    <option value="">Tất cả trạng thái</option>
                    <option value="ACTIVE">Đang mượn</option>
                    <option value="OVERDUE">Quá hạn</option>
                    <option value="PENDING_RETURN">Chờ xác nhận trả</option>
                    <option value="LOST">Báo mất</option>
                    <option value="RETURNED">Đã trả</option>
                </select>
            </div>

            {notice && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
            {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}

            <div className="overflow-hidden rounded-xl border bg-white">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[800px] text-left text-sm">
                        <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
                            <tr>
                                <th className="px-4 py-3 font-medium">Sách</th>
                                <th className="px-4 py-3 font-medium">Người mượn</th>
                                <th className="px-4 py-3 font-medium">Hạn trả</th>
                                <th className="px-4 py-3 font-medium">Trạng thái</th>
                                <th className="px-4 py-3 text-right font-medium">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {loading ? (
                                <tr><td colSpan={5} className="px-4 py-12 text-center text-neutral-500"><LoaderCircle className="mr-2 inline size-4 animate-spin" />Đang tải…</td></tr>
                            ) : loans.length === 0 ? (
                                <tr><td colSpan={5} className="px-4 py-12 text-center text-neutral-500">Không có khoản mượn phù hợp.</td></tr>
                            ) : loans.map((loan) => {
                                const isWorking = workingLoanIds.has(loan.id);
                                return (
                                    <tr key={loan.id} className="hover:bg-neutral-50/70">
                                        <td className="px-4 py-3 font-medium">{loan.bookTitle}</td>
                                        <td className="px-4 py-3">
                                            <div>{loan.userFullName}</div>
                                            <div className="text-xs text-neutral-500">{loan.userEmail}</div>
                                        </td>
                                        <td className="px-4 py-3 text-neutral-600">{formatDate(loan.dueAt)}</td>
                                        <td className="px-4 py-3">
                                            <span className="inline-flex items-center rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-600">
                                                {loan.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex justify-end gap-2">
                                                {loan.status !== "RETURNED" && loan.status !== "LOST" && (
                                                    <button
                                                        type="button"
                                                        disabled={isWorking}
                                                        onClick={() => void performAction(loan, "return")}
                                                        className={actionButtonClass}
                                                    >
                                                        {isWorking ? <LoaderCircle className="size-3.5 animate-spin" /> : <PackageCheck className="size-3.5" />}
                                                        Trả hộ
                                                    </button>
                                                )}
                                                {loan.status !== "LOST" && loan.status !== "RETURNED" && (
                                                    <button
                                                        type="button"
                                                        disabled={isWorking}
                                                        onClick={() => void performAction(loan, "lost")}
                                                        className={actionButtonClass}
                                                    >
                                                        <AlertTriangle className="size-3.5" />
                                                        Báo mất
                                                    </button>
                                                )}
                                                {loan.status === "LOST" && (
                                                    <button
                                                        type="button"
                                                        disabled={isWorking}
                                                        onClick={() => void performAction(loan, "recover")}
                                                        className={actionButtonClass}
                                                    >
                                                        <RotateCcw className="size-3.5" />
                                                        Thu hồi
                                                    </button>
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
