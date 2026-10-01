import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import type { LoanStatus } from "../contexts/AuthContext";
import { Button } from "../components/ui/button";
import { useNavigate } from "react-router-dom";
import { BookOpen, CheckCircle, AlertCircle, Clock } from "lucide-react";

type ToastType = { message: string; type: 'success' | 'error' } | null;

const STATUS_CONFIG: Record<LoanStatus, { label: string; className: string }> = {
    active: { label: 'Đang mượn', className: 'bg-blue-100 text-blue-700' },
    pending_return: { label: 'Đang chờ xác nhận', className: 'bg-amber-100 text-amber-700' },
    returned: { label: 'Đã trả', className: 'bg-green-100 text-green-700' },
    overdue: { label: 'Quá hạn', className: 'bg-red-100 text-red-700' },
};

export default function History() {
    const { loans, books, requestReturn } = useAuth();
    const navigate = useNavigate();
    const [toast, setToast] = useState<ToastType>(null);

    const showToast = (message: string, type: 'success' | 'error') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    };

    const handleReturn = (loanId: string, bookTitle: string) => {
        const result = requestReturn(loanId);
        if (!result.success) {
            showToast(result.message, 'error');
        } else {
            showToast(`Yêu cầu trả "${bookTitle}" đã được gửi. Vui lòng chờ admin xác nhận.`, 'success');
        }
    };

    const canReturn = (status: LoanStatus) => status === 'active' || status === 'overdue';

    return (
        <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100">
            {/* Toast notification */}
            {toast && (
                <div
                    role="status"
                    aria-live="polite"
                    className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-5 py-3 rounded-xl shadow-lg text-sm font-medium ${toast.type === 'success'
                            ? 'bg-green-50 text-green-800 border border-green-200'
                            : 'bg-red-50 text-red-800 border border-red-200'
                        }`}
                >
                    {toast.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                    {toast.message}
                </div>
            )}

            <h1 className="text-2xl font-bold mb-6 text-gray-800">Lịch sử mượn sách</h1>

            {loans.length === 0 ? (
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
                                    const book = books.find(b => b.id === loan.bookId);
                                    const statusInfo = STATUS_CONFIG[loan.status];
                                    return (
                                        <tr key={loan.id} className="border-b hover:bg-gray-50/50">
                                            <td className="p-4 font-medium text-gray-800">{book?.title || 'Không rõ'}</td>
                                            <td className="p-4 text-gray-600 text-sm">{loan.borrowDate}</td>
                                            <td className="p-4 text-gray-600 text-sm">{loan.dueDate}</td>
                                            <td className="p-4">
                                                <span className={`px-3 py-1 text-xs rounded-full font-medium ${statusInfo.className}`}>
                                                    {statusInfo.label}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right">
                                                {canReturn(loan.status) ? (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleReturn(loan.id, book?.title || '')}
                                                        className="border-gray-300 hover:bg-gray-100 rounded-full"
                                                    >
                                                        Trả sách
                                                    </Button>
                                                ) : loan.status === 'pending_return' ? (
                                                    <span className="text-xs text-amber-600 flex items-center justify-end gap-1">
                                                        <Clock className="w-3.5 h-3.5" />
                                                        Đang chờ
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-300">—</span>
                                                )}
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
                            const book = books.find(b => b.id === loan.bookId);
                            const statusInfo = STATUS_CONFIG[loan.status];
                            return (
                                <div key={loan.id} className="p-4 rounded-xl border border-gray-100 bg-gray-50/30">
                                    <div className="flex justify-between items-start gap-2 mb-3">
                                        <h3 className="font-medium text-gray-800 text-sm flex-1">{book?.title || 'Không rõ'}</h3>
                                        <span className={`shrink-0 px-2.5 py-0.5 text-xs rounded-full font-medium ${statusInfo.className}`}>
                                            {statusInfo.label}
                                        </span>
                                    </div>
                                    <div className="flex gap-4 text-xs text-gray-500 mb-3">
                                        <span>Mượn: {loan.borrowDate}</span>
                                        <span>Hạn: {loan.dueDate}</span>
                                    </div>
                                    {canReturn(loan.status) && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleReturn(loan.id, book?.title || '')}
                                            className="w-full border-gray-300 hover:bg-gray-100 rounded-lg"
                                        >
                                            Trả sách
                                        </Button>
                                    )}
                                    {loan.status === 'pending_return' && (
                                        <p className="text-xs text-amber-600 text-center flex items-center justify-center gap-1 mt-1">
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
