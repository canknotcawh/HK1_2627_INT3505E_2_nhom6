import { useAuth } from "../contexts/AuthContext";
import { Button } from "../components/ui/button";
import { useNavigate } from "react-router-dom";
import { Library } from "lucide-react";

export default function Books() {
    const { books, role, borrowBook } = useAuth();
    const navigate = useNavigate();

    return (
        <div className="container mx-auto p-4 md:p-8">
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                <h1 className="text-3xl font-bold flex items-center gap-2">
                    <Library className="w-8 h-8 text-[#e60023]" />
                    Danh mục sách
                </h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {books.map(book => (
                    <div key={book.id} className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between h-full">
                        <div>
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-xl font-bold text-gray-800 line-clamp-2">{book.title}</h3>
                                    <p className="text-gray-500 mt-1">{book.author}</p>
                                </div>
                                <span className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium ${book.status === 'available' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                                    }`}>
                                    {book.status === 'available' ? 'Còn sách' : 'Đã hết'}
                                </span>
                            </div>

                            <div className="w-full h-40 bg-gray-50 rounded-lg mb-6 flex items-center justify-center border border-gray-100">
                                <Library className="w-12 h-12 text-gray-300" />
                            </div>
                        </div>

                        <div className="mt-auto">
                            {role === 'guest' ? (
                                <Button
                                    className="w-full"
                                    variant="outline"
                                    onClick={() => navigate('/login')}
                                >
                                    Đăng nhập để mượn
                                </Button>
                            ) : (
                                <Button
                                    variant="brand"
                                    className="w-full"
                                    disabled={book.status !== 'available'}
                                    onClick={() => {
                                        borrowBook(book.id);
                                        navigate('/user/history');
                                    }}
                                >
                                    {book.status === 'available' ? 'Mượn sách' : 'Không khả dụng'}
                                </Button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
