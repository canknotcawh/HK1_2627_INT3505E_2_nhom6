import { useCallback, useEffect, useState } from "react";
import { listMyLoans, requestReturn as requestReturnApi, renewLoan as renewLoanApi } from "../lib/loans";
import type { LoanDto, LoanStatus } from "../lib/loans";
import { Button } from "../components/ui/button";
import { useNavigate } from "react-router-dom";
import { useToast } from "../hooks/useToast";
import Toast from "../components/Toast";
import { BookOpen, Clock, LoaderCircle } from "lucide-react";

const STATUS_CONFIG: Record<LoanStatus, { label: string; className: string }> = {
    ACTIVE: { label: 'Đang mượn', className: 'bg-blue-100 text-blue-700' },
    PENDING_RETURN: { label: 'Đang chờ xác nhận', className: 'bg-amber-100 text-amber-700' },
    RETURNED: { label: 'Đã trả', className: 'bg-green-100 text-green-700' },
    OVERDUE: { label: 'Quá hạn', className: 'bg-red-100 text-red-700' },
    LOST: { label: 'Báo mất', className: 'bg-gray-200 text-gray-700' },
};

export default function History() {
    const navigate = useNavigate();
    const [loans, setLoans] = useState<LoanDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [workingLoanIds, setWorkingLoanIds] = useState<Set<string>>(() => new Set());
    const { toast, showToast } = useToast();

    const loadLoans = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const result = await listMyLoans();
            setLoans(result.content);
        } catch (requestError) {
            console.error("Không tải được lịch sử mượn sách:", requestError);
            setError("Không tải được lịch sử mượn sách. Vui lòng thử lại.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadLoans();
    }, [loadLoans]);

    const withBusy = async (loanId: string, action: () => Promise<void>) => {
        setWorkingLoanIds(current => new Set(current).add(loanId));
        try {
            await action();
        } finally {
            setWorkingLoanIds(current => {
                const next = new Set(current);
                next.delete(loanId);
                return next;
            });
        }
    };

    const handleReturn = (loan: LoanDto) => withBusy(loan.id, async () => {
        try {
            await requestReturnApi(loan.id);
            showToast(`Yêu cầu trả "${loan.bookTitle}" đã được gửi. Vui lòng chờ admin xác nhận.`, 'success');
            void loadLoans();
        } catch (requestError) {
            console.error("Không thể gửi yêu cầu trả sách:", requestError);
            showToast("Không thể gửi yêu cầu trả sách. Vui lòng thử lại.", 'error');
        }
    });

    const handleRenew = (loan: LoanDto) => withBusy(loan.id, async () => {
        try {
            await renewLoanApi(loan.id);
            showToast(`Đã gia hạn "${loan.bookTitle}" thêm 14 ngày.`, 'success');
            void loadLoans();
        } catch (requestError) {
            console.error("Không thể gia hạn:", requestError);
            showToast("Không thể gia hạn khoản mượn này. Vui lòng thử lại.", 'error');
        }
    });

    const canReturn = (status: LoanStatus) => status === 'ACTIVE' || status === 'OVERDUE';
    const canRenew = (loan: LoanDto) => loan.status === 'ACTIVE' && loan.renewedCount < 1;
    const formatDate = (iso: string) => new Date(iso).toLocaleDateString('vi-VN');

    return (
        <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100">
            <Toast toast={toast} />

            <h1 className="text-2xl font-bold mb-6 text-gray-800">Lịch sử mượn sách</h1>

            {error && <p role="alert" className="mb-6 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}

            {loading ? (
                <div className="flex items-center justify-center gap-2 py-16 text-sm text-gray-500" role="status">
                    <LoaderCircle className="h-5 w-5 animate-spin" /> Đang tải...
                </div>
            ) : loans.length === 0 ? (
                <div className="text-center py-16">
                    <BookOpen className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-600 mb-2">Chưa có lịch sử mượn</h3>
                    <p className="text-gray-400 text-sm mb-4">
                        Bạn chưa mượn cuốn sách nào. Hãy khám phá danh mục thư viện!
                    </p>
                    <Button variant="brand" onClick={() => navigate('/books')}>
                        Duyệt danh mục sách
                    </Button>
                </div>
            ) : (
                <>
                    {/* Desktop table */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 text-gray-600 border-b">
                                    <th className="p-4 font-semibold text-sm">Tên sách</th>
                                    <th className="p-4 font-semibold text-sm">Ngày mượn</th>
                                    <th className="p-4 font-semibold text-sm">Hạn trả</th>
                                    <th className="p-4 font-semibold text-sm">Trạng thái</th>
                                    <th className="p-4 font-semibold text-sm text-right">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loans.map(loan => {
                                    const statusInfo = STATUS_CONFIG[loan.status];
                                    const isWorking = workingLoanIds.has(loan.id);
                                    return (
                                        <tr key={loan.id} className="border-b hover:bg-gray-50/50">
                                            <td className="p-4 font-medium text-gray-800">{loan.bookTitle}</td>
                                            <td className="p-4 text-gray-600 text-sm">{formatDate(loan.borrowedAt)}</td>
                                            <td className="p-4 text-gray-600 text-sm">{formatDate(loan.dueAt)}</td>
                                            <td className="p-4">
                                                <span className={`px-3 py-1 text-xs rounded-full font-medium ${statusInfo.className}`}>
                                                    {statusInfo.label}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    {canRenew(loan) && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            disabled={isWorking}
                                                            onClick={() => void handleRenew(loan)}
                                                            className="border-gray-300 hover:bg-gray-100 rounded-full"
                                                        >
                                                            Gia hạn
                                                        </Button>
                                                    )}
                                                    {canReturn(loan.status) ? (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            disabled={isWorking}
                                                            onClick={() => void handleReturn(loan)}
                                                            className="border-gray-300 hover:bg-gray-100 rounded-full"
                                                        >
                                                            Trả sách
                                                        </Button>
                                                    ) : loan.status === 'PENDING_RETURN' ? (
                                                        <span className="text-xs text-amber-600 flex items-center justify-end gap-1">
                                                            <Clock className="w-3.5 h-3.5" />
                                                            Đang chờ
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-300">—</span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile cards */}
                    <div className="md:hidden space-y-3">
                        {loans.map(loan => {
                            const statusInfo = STATUS_CONFIG[loan.status];
                            const isWorking = workingLoanIds.has(loan.id);
                            return (
                                <div key={loan.id} className="p-4 rounded-xl border border-gray-100 bg-gray-50/30">
                                    <div className="flex justify-between items-start gap-2 mb-3">
                                        <h3 className="font-medium text-gray-800 text-sm flex-1">{loan.bookTitle}</h3>
                                        <span className={`shrink-0 px-2.5 py-0.5 text-xs rounded-full font-medium ${statusInfo.className}`}>
                                            {statusInfo.label}
                                        </span>
                                    </div>
                                    <div className="flex gap-4 text-xs text-gray-500 mb-3">
                                        <span>Mượn: {formatDate(loan.borrowedAt)}</span>
                                        <span>Hạn: {formatDate(loan.dueAt)}</span>
                                    </div>
                                    <div className="flex gap-2">
                                        {canRenew(loan) && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                disabled={isWorking}
                                                onClick={() => void handleRenew(loan)}
                                                className="flex-1 border-gray-300 hover:bg-gray-100 rounded-lg"
                                            >
                                                Gia hạn
                                            </Button>
                                        )}
                                        {canReturn(loan.status) && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                disabled={isWorking}
                                                onClick={() => void handleReturn(loan)}
                                                className="flex-1 border-gray-300 hover:bg-gray-100 rounded-lg"
                                            >
                                                Trả sách
                                            </Button>
                                        )}
                                    </div>
                                    {loan.status === 'PENDING_RETURN' && (
                                        <p className="text-xs text-amber-600 text-center flex items-center justify-center gap-1 mt-2">
                                            <Clock className="w-3.5 h-3.5" />
                                            Đang chờ admin xác nhận
                                        </p>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
}
