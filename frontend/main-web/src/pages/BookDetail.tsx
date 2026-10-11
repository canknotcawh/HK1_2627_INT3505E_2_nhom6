import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import type { Book } from "../contexts/AuthContext";
import { Button } from "../components/ui/button";
import { Library, ArrowLeft, Star, Calendar, Hash, Tag, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

type ToastType = { message: string; type: 'success' | 'error' } | null;

export default function BookDetail() {
    const { id } = useParams<{ id: string }>();
    const { books, booksLoading, role, borrowBook } = useAuth();
    const navigate = useNavigate();

    const [confirmBook, setConfirmBook] = useState<Book | null>(null);
    const [toast, setToast] = useState<ToastType>(null);
    const [borrowing, setBorrowing] = useState(false);

    const book = books.find(b => b.id === id);

    const showToast = (message: string, type: 'success' | 'error') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    };

    const handleBorrow = async () => {
        if (!confirmBook) return;
        setBorrowing(true);
        const result = await borrowBook(confirmBook.id);
        setBorrowing(false);
        setConfirmBook(null);
        if (result.success) {
            showToast(`Mượn "${confirmBook.title}" thành công!`, 'success');
        } else {
            showToast(`Mượn "${confirmBook.title}" thất bại: ${result.message}`, 'error');
        }
    };

    if (booksLoading) {
        return (
            <div className="flex items-center justify-center py-32">
                <Loader2 className="w-8 h-8 animate-spin text-[#e60023]" />
                <span className="ml-3 text-gray-500">Đang tải...</span>
            </div>
        );
    }

    if (!book) {
        return (
            <div className="container mx-auto p-4 md:p-8">
                <div className="text-center py-16">
                    <Library className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-gray-600 mb-2">Không tìm thấy sách</h2>
                    <p className="text-gray-400 mb-6">Cuốn sách này không tồn tại hoặc đã bị xóa.</p>
                    <Button variant="outline" onClick={() => navigate('/books')}>
                        <ArrowLeft className="w-4 h-4 mr-1" />
                        Quay lại danh mục
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-4xl">
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

            {/* Back button */}
            <button
                onClick={() => navigate('/books')}
                className="flex items-center gap-1 text-gray-500 hover:text-gray-800 mb-6 text-sm transition-colors"
            >
                <ArrowLeft className="w-4 h-4" />
                Quay lại danh mục
            </button>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="flex flex-col md:flex-row">
                    {/* Cover */}
                    <div className="w-full md:w-80 h-64 md:h-auto bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center border-b md:border-b-0 md:border-r border-gray-100 shrink-0">
                        {book.coverUrl ? (
                            <img src={book.coverUrl} alt={book.title} className="w-full h-full object-cover" />
                        ) : (
                            <Library className="w-20 h-20 text-gray-200" />
                        )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 p-6 md:p-8">
                        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                            <div>
                                <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-1">{book.title}</h1>
                                {book.subtitle && <p className="text-gray-400 text-base mb-1">{book.subtitle}</p>}
                                <p className="text-gray-500 text-lg">
                                    {book.authors.length > 0 ? book.authors.join(', ') : book.author}
                                </p>
                            </div>
                            <span className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium ${book.quantity > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                                }`}>
                                {book.quantity > 0 ? `Còn ${book.quantity} cuốn` : 'Hết sách'}
                            </span>
                        </div>

                        {/* Description */}
                        {book.description && (
                            <p className="text-gray-600 text-sm leading-relaxed mb-4 line-clamp-4">{book.description}</p>
                        )}

                        {/* Details grid */}
                        <div className="grid grid-cols-2 gap-4 mb-6 py-4 border-y border-gray-100">
                            {book.category && (
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <Tag className="w-4 h-4 text-gray-400" />
                                    <span className="text-gray-400">Thể loại:</span>
                                    <span className="font-medium">{book.categories.length > 0 ? book.categories.join(', ') : book.category}</span>
                                </div>
                            )}
                            {book.publishYear && (
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <Calendar className="w-4 h-4 text-gray-400" />
                                    <span className="text-gray-400">Năm XB:</span>
                                    <span className="font-medium">{book.publishYear}</span>
                                </div>
                            )}
                            {book.isbn && (
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <Hash className="w-4 h-4 text-gray-400" />
                                    <span className="text-gray-400">ISBN:</span>
                                    <span className="font-medium">{book.isbn}</span>
                                </div>
                            )}
                            {book.rating > 0 && (
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                                    <span className="text-gray-400">Đánh giá:</span>
                                    <span className="font-medium text-amber-600">
                                        {book.rating.toFixed(1)} / 5
                                        {book.ratingCount > 0 && (
                                            <span className="text-gray-400 text-xs font-normal ml-1.5">
                                                ({book.ratingCount.toLocaleString('vi-VN')} lượt đánh giá)
                                            </span>
                                        )}
                                    </span>
                                </div>
                            )}
                            {book.pageCount && (
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <span className="text-gray-400">Số trang:</span>
                                    <span className="font-medium">{book.pageCount}</span>
                                </div>
                            )}
                            {book.language && (
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <span className="text-gray-400">Ngôn ngữ:</span>
                                    <span className="font-medium">{book.language}</span>
                                </div>
                            )}
                        </div>

                        {/* Action */}
                        <div>
                            {role === 'guest' ? (
                                <Button variant="outline" onClick={() => navigate('/login')} className="w-full sm:w-auto">
                                    Đăng nhập để mượn sách
                                </Button>
                            ) : (
                                <Button
                                    variant="brand"
                                    disabled={book.quantity <= 0}
                                    onClick={() => setConfirmBook(book)}
                                    className="w-full sm:w-auto"
                                >
                                    {book.quantity > 0 ? 'Mượn sách này' : 'Sách đã hết'}
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Borrow Confirmation Modal */}
            {confirmBook && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
                    onClick={() => setConfirmBook(null)}
                >
                    <div
                        className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6"
                        onClick={e => e.stopPropagation()}
                    >
                        <h2 className="text-xl font-bold text-gray-800 mb-2">Xác nhận mượn sách</h2>
                        <p className="text-gray-500 mb-6">
                            Bạn muốn mượn cuốn <strong className="text-gray-800">"{confirmBook.title}"</strong> của {confirmBook.authors.length > 0 ? confirmBook.authors.join(', ') : confirmBook.author}?
                            <br />
                            <span className="text-sm mt-2 block text-gray-400">
                                Thời hạn mượn: 14 ngày kể từ hôm nay.
                            </span>
                        </p>
                        <div className="flex gap-3 justify-end">
                            <Button variant="outline" onClick={() => setConfirmBook(null)} disabled={borrowing}>
                                Hủy
                            </Button>
                            <Button variant="brand" onClick={handleBorrow} disabled={borrowing}>
                                {borrowing ? 'Đang xử lý...' : 'Xác nhận mượn'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
