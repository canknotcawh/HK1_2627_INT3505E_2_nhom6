import { useAuth } from "../contexts/AuthContext";
import { BookOpen, Clock, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
export default function Dashboard() {
    const { loans, books } = useAuth();
    const navigate = useNavigate();
    const activeLoans = loans.filter(l => l.status === 'active');
    const returnedLoans = loans.filter(l => l.status === 'returned');
    const overdueLoans = loans.filter(l => l.status === 'overdue');
    return (
        <div className="bg-white p-6 md:p-8 rounded-xl shadow-sm border border-gray-100 min-h-[500px]">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">Xin chào! 👋</h1>
                    <p className="text-gray-500 mt-2">Chào mừng bạn quay lại hệ thống thư viện.</p>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* Thẻ thống kê 1 */}
                <div className="p-6 rounded-xl border border-blue-100 bg-blue-50/50 flex items-start gap-4">
                    <div className="p-3 bg-blue-100 rounded-lg text-blue-600">
                        <BookOpen className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-gray-500 text-sm font-medium">Đang mượn</p>
                        <h3 className="text-2xl font-bold text-gray-900 mt-1">{activeLoans.length} <span className="text-sm font-normal text-gray-500">cuốn</span></h3>
                    </div>
                </div>
                {/* Thẻ thống kê 2 */}
                <div className="p-6 rounded-xl border border-green-100 bg-green-50/50 flex items-start gap-4">
                    <div className="p-3 bg-green-100 rounded-lg text-green-600">
                        <CheckCircle className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-gray-500 text-sm font-medium">Đã trả</p>
                        <h3 className="text-2xl font-bold text-gray-900 mt-1">{returnedLoans.length} <span className="text-sm font-normal text-gray-500">cuốn</span></h3>
                    </div>
                </div>
                {/* Thẻ thống kê 3 */}
                <div className="p-6 rounded-xl border border-red-100 bg-red-50/50 flex items-start gap-4">
                    <div className="p-3 bg-red-100 rounded-lg text-red-600">
                        <Clock className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-gray-500 text-sm font-medium">Quá hạn</p>
                        <h3 className="text-2xl font-bold text-gray-900 mt-1">{overdueLoans.length} <span className="text-sm font-normal text-gray-500">cuốn</span></h3>
                    </div>
                </div>
            </div>
            {/* Khối gọi hành động */}
            <div className="p-6 bg-gray-50 rounded-xl border border-gray-100 flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                    <h3 className="text-lg font-bold text-gray-800">Bạn muốn xem chi tiết sách đang mượn?</h3>
                    <p className="text-gray-500 mt-1">Truy cập lịch sử để kiểm tra hạn trả và thực hiện trả sách.</p>
                </div>
                <Button
                    variant="brand"
                    onClick={() => navigate('/user/history')}
                    className="shrink-0"
                >
                    Lịch sử mượn
                </Button>
            </div>
        </div>
    );
}