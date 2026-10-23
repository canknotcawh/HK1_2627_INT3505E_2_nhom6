import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { searchBooks } from "../lib/books";
import type { BookDto } from "../lib/books";
import { borrowBook as borrowBookApi } from "../lib/loans";
import { useToast } from "../hooks/useToast";
import Toast from "../components/Toast";
import BorrowConfirmDialog from "../components/BorrowConfirmDialog";
import BookCover from "../components/BookCover";
import { Button } from "../components/ui/button";
import { useNavigate, useSearchParams } from "react-router-dom";
import { isAxiosError } from "axios";
import { Library, Search, X, BookOpen, LoaderCircle } from "lucide-react";

const PAGE_SIZE = 12;

function searchErrorMessage(error: unknown): string {
    if (!isAxiosError(error)) return "Không tải được danh sách sách. Vui lòng thử lại.";
    if (!error.response) return "Không kết nối được tới backend. Kiểm tra lại kết nối mạng.";
    return "Không tải được danh sách sách. Vui lòng thử lại.";
}

export default function Books() {
    const { role } = useAuth();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
    const [books, setBooks] = useState<BookDto[]>([]);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [confirmBook, setConfirmBook] = useState<BookDto | null>(null);
    const { toast, showToast } = useToast();

    const loadBooks = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const result = await searchBooks(searchQuery, page, PAGE_SIZE);
            setBooks(result.content);
            setTotalPages(result.totalPages);
            setTotalElements(result.totalElements);
        } catch (requestError) {
            console.error("Không tải được danh sách sách:", requestError);
            setError(searchErrorMessage(requestError));
        } finally {
            setLoading(false);
        }
    }, [searchQuery, page]);

    useEffect(() => {
        void loadBooks();
    }, [loadBooks]);

    // Debounce typing before re-querying the backend
    useEffect(() => {
        const handle = setTimeout(() => {
            setPage(0);
            setSearchParams(searchQuery ? { q: searchQuery } : {}, { replace: true });
        }, 400);
        return () => clearTimeout(handle);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchQuery]);

    const handleBorrow = async () => {
        if (!confirmBook) return;
        const book = confirmBook;
        setConfirmBook(null);
        try {
            await borrowBookApi(book.id);
            showToast(`Mượn "${book.title}" thành công!`, 'success');
            void loadBooks();
        } catch (requestError) {
            console.error("Không thể mượn sách:", requestError);
            showToast("Không thể mượn sách lúc này. Vui lòng thử lại.", 'error');
        }
    };

    return (
        <div className="container mx-auto p-4 md:p-8">
            <Toast toast={toast} />

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <h1 className="text-3xl font-bold flex items-center gap-2">
                    <Library className="w-8 h-8 text-[#e60023]" />
                    Danh mục sách
                </h1>
                <p className="text-gray-500 text-sm">{totalElements} cuốn</p>
            </div>

            {/* Search bar */}
            <div className="relative mb-8 max-w-xl">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-gray-400" />
                </div>
                <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="block w-full pl-10 pr-10 py-2.5 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#e60023]/20 focus:border-[#e60023] transition-all text-sm"
                    placeholder="Tìm kiếm theo tên sách..."
                    aria-label="Tìm kiếm sách"
                />
                {searchQuery && (
                    <button
                        onClick={() => setSearchQuery('')}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                        aria-label="Xóa tìm kiếm"
                    >
                        <X className="h-4 w-4" />
                    </button>
                )}
            </div>

            {error && <p role="alert" className="mb-6 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}

            {loading ? (
                <div className="flex items-center justify-center gap-2 py-16 text-sm text-gray-500" role="status">
                    <LoaderCircle className="h-5 w-5 animate-spin" /> Đang tải...
                </div>
            ) : books.length === 0 ? (
                <div className="text-center py-16">
                    <BookOpen className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-600 mb-2">Không tìm thấy sách</h3>
                    <p className="text-gray-400 text-sm mb-4">
                        {searchQuery ? `Không có kết quả cho "${searchQuery}"` : 'Hiện chưa có sách nào trong danh mục.'}
                    </p>
                    {searchQuery && (
                        <Button variant="outline" onClick={() => setSearchQuery('')}>
                            Xóa tìm kiếm
                        </Button>
                    )}
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {books.map(book => (
                            <div
                                key={book.id}
                                className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between h-full"
                            >
                                <div>
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex-1 min-w-0 mr-3">
                                            <h3
                                                className="text-lg font-bold text-gray-800 line-clamp-2 hover:text-[#e60023] cursor-pointer transition-colors"
                                                onClick={() => navigate(`/books/${book.id}`)}
                                            >
                                                {book.title}
                                            </h3>
                                        </div>
                                        <span className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium ${
                                            book.availableCopies > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                                        }`}>
                                            {book.availableCopies > 0 ? `Còn ${book.availableCopies}` : 'Hết sách'}
                                        </span>
                                    </div>

                                    <div
                                        className="w-full h-36 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg mb-4 flex items-center justify-center border border-gray-100 cursor-pointer hover:from-gray-100 hover:to-gray-150 transition-colors"
                                        onClick={() => navigate(`/books/${book.id}`)}
                                    >
                                        <BookCover
                                            imageUrl={book.coverImageUrl}
                                            title={book.title}
                                            imageClassName="h-full w-full rounded-lg object-contain"
                                            iconClassName="w-10 h-10 text-gray-300"
                                        />
                                    </div>

                                    <div className="flex flex-wrap gap-2 mb-4">
                                        {book.language && <span className="text-xs bg-gray-50 text-gray-500 px-2 py-1 rounded-md">{book.language}</span>}
                                        {book.publishedYear && <span className="text-xs bg-gray-50 text-gray-500 px-2 py-1 rounded-md">{book.publishedYear}</span>}
                                        {book.pageCount && <span className="text-xs bg-gray-50 text-gray-500 px-2 py-1 rounded-md">{book.pageCount} trang</span>}
                                    </div>
                                </div>

                                <div className="mt-auto">
                                    {role === 'guest' ? (
                                        <Button className="w-full" variant="outline" onClick={() => navigate('/login')}>
                                            Đăng nhập để mượn
                                        </Button>
                                    ) : (
                                        <Button
                                            variant="brand"
                                            className="w-full"
                                            disabled={book.availableCopies <= 0}
                                            onClick={() => setConfirmBook(book)}
                                        >
                                            {book.availableCopies > 0 ? 'Mượn sách' : 'Không khả dụng'}
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-4 mt-10">
                            <Button variant="outline" disabled={page <= 0} onClick={() => setPage(p => Math.max(0, p - 1))}>
                                Trang trước
                            </Button>
                            <span className="text-sm text-gray-500">Trang {page + 1} / {totalPages}</span>
                            <Button variant="outline" disabled={page + 1 >= totalPages} onClick={() => setPage(p => p + 1)}>
                                Trang sau
                            </Button>
                        </div>
                    )}
                </>
            )}

            <BorrowConfirmDialog
                book={confirmBook}
                onCancel={() => setConfirmBook(null)}
                onConfirm={handleBorrow}
            />
        </div>
    );
}
