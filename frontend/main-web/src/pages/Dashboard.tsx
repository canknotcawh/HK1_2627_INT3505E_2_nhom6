import { useAuth } from "../contexts/AuthContext";
import { BookOpen, Clock, CheckCircle, AlertTriangle, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";

export default function Dashboard() {
    const { loans, books } = useAuth();
    const navigate = useNavigate();

    const activeLoans = loans.filter(l => l.status === 'active');
    const returnedLoans = loans.filter(l => l.status === 'returned');
    const overdueLoans = loans.filter(l => l.status === 'overdue');
    const pendingLoans = loans.filter(l => l.status === 'pending_return');

    // Upcoming due dates (active loans sorted by due date, soonest first)
    const upcomingDue = [...activeLoans]
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
        .slice(0, 5);

    const today = new Date();
    const getDaysUntilDue = (dueDate: string) => {
        const due = new Date(dueDate);
        return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    };

    return (
        <div className="space-y-6">
            {/* Welcome */}
            <div className="bg-white p-6 md:p-8 rounded-xl shadow-sm border border-gray-100">
                <h1 className="text-3xl font-bold text-gray-800">Xin chào! 👋</h1>
                <p className="text-gray-500 mt-2">Chào mừng bạn quay lại hệ thống thư viện.</p>
            </div>

            {/* Stats */}
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

            {/* Overdue warning */}
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

            {/* Upcoming due dates */}
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
                            const book = books.find(b => b.id === loan.bookId);
                            const daysLeft = getDaysUntilDue(loan.dueDate);
                            const isUrgent = daysLeft <= 3;

                            return (
                                <div key={loan.id} className="px-5 py-4 flex items-center justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-gray-800 truncate">{book?.title || 'Không rõ'}</p>
                                        <p className="text-xs text-gray-400 mt-0.5">
                                            Mượn ngày {loan.borrowDate}
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

            {/* Quick actions */}
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