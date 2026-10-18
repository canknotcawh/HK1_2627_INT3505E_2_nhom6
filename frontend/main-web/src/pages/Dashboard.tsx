import { useEffect, useState } from "react";
import { listMyLoans } from "../lib/loans";
import type { LoanDto } from "../lib/loans";
import { BookOpen, Clock, CheckCircle, AlertTriangle, ArrowRight, LoaderCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";

export default function Dashboard() {
    const navigate = useNavigate();
    const [loans, setLoans] = useState<LoanDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let cancelled = false;
        listMyLoans()
            .then(result => { if (!cancelled) setLoans(result.content); })
            .catch(requestError => {
                console.error("Không tải được số liệu:", requestError);
                if (!cancelled) setError("Không tải được số liệu mượn sách.");
            })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-gray-500" role="status">
                <LoaderCircle className="h-5 w-5 animate-spin" /> Đang tải...
            </div>
        );
    }

    const activeLoans = loans.filter(l => l.status === 'ACTIVE');
    const returnedLoans = loans.filter(l => l.status === 'RETURNED');
    const overdueLoans = loans.filter(l => l.status === 'OVERDUE');
    const pendingLoans = loans.filter(l => l.status === 'PENDING_RETURN');

    const upcomingDue = [...activeLoans]
        .sort((a, b) => a.dueAt.localeCompare(b.dueAt))
        .slice(0, 5);

    const getDaysUntilDue = (dueAt: string) => {
        const due = new Date(dueAt);
        return Math.ceil((due.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    };

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 md:p-8 rounded-xl shadow-sm border border-gray-100">
                <h1 className="text-3xl font-bold text-gray-800">Xin chào! 👋</h1>
                <p className="text-gray-500 mt-2">Chào mừng bạn quay lại hệ thống thư viện.</p>
            </div>

            {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-5 rounded-xl border border-blue-100 bg-blue-50/50 flex items-start gap-3">
                    <div className="p-2.5 bg-blue-100 rounded-lg text-blue-600 shrink-0">
                        <BookOpen className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-gray-500 text-xs font-medium">Đang mượn</p>
                        <h3 className="text-2xl font-bold text-gray-900 mt-0.5">{activeLoans.length}</h3>
                    </div>
                </div>

                <div className="p-5 rounded-xl border border-amber-100 bg-amber-50/50 flex items-start gap-3">
                    <div className="p-2.5 bg-amber-100 rounded-lg text-amber-600 shrink-0">
                        <Clock className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-gray-500 text-xs font-medium">Chờ xác nhận</p>
                        <h3 className="text-2xl font-bold text-gray-900 mt-0.5">{pendingLoans.length}</h3>
                    </div>
                </div>

                <div className="p-5 rounded-xl border border-green-100 bg-green-50/50 flex items-start gap-3">
                    <div className="p-2.5 bg-green-100 rounded-lg text-green-600 shrink-0">
                        <CheckCircle className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-gray-500 text-xs font-medium">Đã trả</p>
                        <h3 className="text-2xl font-bold text-gray-900 mt-0.5">{returnedLoans.length}</h3>
                    </div>
                </div>

                <div className="p-5 rounded-xl border border-red-100 bg-red-50/50 flex items-start gap-3">
                    <div className="p-2.5 bg-red-100 rounded-lg text-red-600 shrink-0">
                        <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-gray-500 text-xs font-medium">Quá hạn</p>
                        <h3 className="text-2xl font-bold text-gray-900 mt-0.5">{overdueLoans.length}</h3>
                    </div>
                </div>
            </div>

            {overdueLoans.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-5 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    <div>
                        <h3 className="font-semibold text-red-800">Bạn có {overdueLoans.length} khoản mượn quá hạn!</h3>
                        <p className="text-red-600 text-sm mt-1">
                            Vui lòng trả sách sớm nhất có thể để tránh phát sinh phí phạt.
                        </p>
                        <Button
                            variant="outline"
                            size="sm"
                            className="mt-3 border-red-200 text-red-700 hover:bg-red-100"
                            onClick={() => navigate('/user/history')}
                        >
                            Xem lịch sử mượn
                        </Button>
                    </div>
                </div>
            )}

            {upcomingDue.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-5 border-b border-gray-100 flex justify-between items-center">
                        <h2 className="text-lg font-bold text-gray-800">Hạn trả sắp tới</h2>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate('/user/history')}
                            className="text-gray-500"
                        >
                            Xem tất cả
                            <ArrowRight className="w-3.5 h-3.5 ml-1" />
                        </Button>
                    </div>
                    <div className="divide-y divide-gray-50">
                        {upcomingDue.map(loan => {
                            const daysLeft = getDaysUntilDue(loan.dueAt);
                            const isUrgent = daysLeft <= 3;

                            return (
                                <div key={loan.id} className="px-5 py-4 flex items-center justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-gray-800 truncate">{loan.bookTitle}</p>
                                        <p className="text-xs text-gray-400 mt-0.5">
                                            Mượn ngày {new Date(loan.borrowedAt).toLocaleDateString('vi-VN')}
                                        </p>
                                    </div>
                                    <span className={`shrink-0 text-sm font-medium px-3 py-1 rounded-full ${
                                        isUrgent
                                            ? 'bg-red-100 text-red-700'
                                            : 'bg-blue-50 text-blue-700'
                                    }`}>
                                        {daysLeft <= 0
                                            ? 'Hôm nay!'
                                            : daysLeft === 1
                                                ? 'Còn 1 ngày'
                                                : `Còn ${daysLeft} ngày`
                                        }
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            <div className="p-5 bg-gray-50 rounded-xl border border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                    <h3 className="text-base font-bold text-gray-800">Khám phá thêm sách mới</h3>
                    <p className="text-gray-500 text-sm mt-1">Duyệt danh mục thư viện để tìm cuốn sách tiếp theo.</p>
                </div>
                <Button
                    variant="brand"
                    onClick={() => navigate('/books')}
                    className="shrink-0"
                >
                    Danh mục sách
                    <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
            </div>
        </div>
    );
}
