import { useAuth } from "../contexts/AuthContext";
import { Button } from "../components/ui/button";

export default function History() {
    const { loans, books, returnBook } = useAuth();

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h1 className="text-2xl font-bold mb-6 text-gray-800">Lịch sử mượn sách</h1>

            {loans.length === 0 ? (
                <p className="text-gray-500 italic">Bạn chưa mượn cuốn sách nào.</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse table-fixed">
                        <thead>
                            <tr className="bg-gray-50 text-gray-600 border-b">
                                <th className="p-4 font-semibold w-[35%]">Tên sách</th>
                                <th className="p-4 font-semibold w-[15%]">Ngày mượn</th>
                                <th className="p-4 font-semibold w-[15%]">Hạn trả</th>
                                <th className="p-4 font-semibold w-[20%]">Trạng thái</th>
                                <th className="p-4 font-semibold text-right w-[15%]">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loans.map(loan => {
                                const book = books.find(b => b.id === loan.bookId);
                                return (
                                    <tr key={loan.id} className="border-b hover:bg-gray-50/50">
                                        <td className="p-4 font-medium">{book?.title || 'Unknown'}</td>
                                        <td className="p-4">{loan.borrowDate}</td>
                                        <td className="p-4">{loan.dueDate}</td>
                                        <td className="p-4">
                                            <span className={`px-3 py-1 text-sm rounded-full font-medium ${loan.status === 'active' ? 'bg-blue-100 text-blue-700' :
                                                loan.status === 'returned' ? 'bg-green-100 text-green-700' :
                                                    'bg-red-100 text-red-700'
                                                }`}>
                                                {loan.status === 'active' ? 'Đang mượn' :
                                                    loan.status === 'returned' ? 'Đã trả' : 'Quá hạn'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            {loan.status === 'active' ? (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => returnBook(loan.id)}
                                                    className="border-gray-300 hover:bg-gray-100 rounded-full"
                                                >
                                                    Trả sách
                                                </Button>
                                            ) : (
                                                <span className="text-gray-300 block text-center">-</span>
                                            )}
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
