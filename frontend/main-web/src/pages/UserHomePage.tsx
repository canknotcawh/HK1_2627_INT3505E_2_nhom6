import { useEffect, useState } from "react";
import { searchBooks } from "../lib/books";
import type { BookDto } from "../lib/books";
import { borrowBook as borrowBookApi } from "../lib/loans";
import { Button } from "../components/ui/button";
import { useNavigate } from "react-router-dom";
import { Library, ArrowRight, LoaderCircle } from "lucide-react";
import { useToast } from "../hooks/useToast";
import Toast from "../components/Toast";
import BorrowConfirmDialog from "../components/BorrowConfirmDialog";

export default function UserHomePage() {
    const navigate = useNavigate();
    const [books, setBooks] = useState<BookDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [confirmBook, setConfirmBook] = useState<BookDto | null>(null);
    const { toast, showToast } = useToast();

    const loadBooks = () => {
        setLoading(true);
        searchBooks("", 0, 12)
            .then(result => setBooks(result.content))
            .catch(error => console.error("Không tải được danh sách sách:", error))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        loadBooks();
    }, []);

    const handleBorrow = async () => {
        if (!confirmBook) return;
        const book = confirmBook;
        setConfirmBook(null);
        try {
            await borrowBookApi(book.id);
            showToast(`Mượn "${book.title}" thành công!`, 'success');
            loadBooks();
        } catch (requestError) {
            console.error("Không thể mượn sách:", requestError);
            showToast(`Mượn "${book.title}" thất bại. Vui lòng thử lại.`, 'error');
        }
    };

    return (
        <div className="pb-8">
            <Toast toast={toast} />

            <section className="mb-10">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-gray-800">Sách trong thư viện</h2>
                    <button
                        onClick={() => navigate('/books')}
                        className="flex items-center gap-1 text-sm text-[#e60023] hover:text-[#cc0020] font-medium transition-colors"
                    >
                        Xem tất cả
                        <ArrowRight className="w-4 h-4" />
                    </button>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center gap-2 py-16 text-sm text-gray-500" role="status">
                        <LoaderCircle className="h-5 w-5 animate-spin" /> Đang tải...
                    </div>
                ) : books.length === 0 ? (
                    <p className="text-gray-400 text-sm py-8 text-center">Hiện chưa có sách nào trong thư viện.</p>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                        {books.map(book => (
                            <div
                                key={book.id}
                                className="bg-white rounded-xl border border-gray-100 p-4 flex flex-col hover:shadow-md transition-shadow"
                            >
                                <div
                                    className="w-full h-32 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg flex items-center justify-center border border-gray-100 mb-3 cursor-pointer hover:from-gray-100 hover:to-gray-150 transition-colors"
                                    onClick={() => navigate(`/books/${book.id}`)}
                                >
                                    <Library className="w-8 h-8 text-gray-300" />
                                </div>

                                <h3
                                    className="text-sm font-bold text-gray-800 line-clamp-2 mb-1 cursor-pointer hover:text-[#e60023] transition-colors"
                                    onClick={() => navigate(`/books/${book.id}`)}
                                >
                                    {book.title}
                                </h3>
                                {book.publishedYear && <p className="text-xs text-gray-500 mb-2">{book.publishedYear}</p>}

                                <span className={`text-xs font-medium mb-3 ${book.availableCopies > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                                    {book.availableCopies > 0 ? `Còn ${book.availableCopies}` : 'Hết sách'}
                                </span>

                                <Button
                                    variant="brand"
                                    size="sm"
                                    className="w-full mt-auto"
                                    disabled={book.availableCopies <= 0}
                                    onClick={() => setConfirmBook(book)}
                                >
                                    {book.availableCopies > 0 ? 'Mượn sách' : 'Hết sách'}
                                </Button>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            <BorrowConfirmDialog
                book={confirmBook}
                onCancel={() => setConfirmBook(null)}
                onConfirm={handleBorrow}
            />
        </div>
    );
}
