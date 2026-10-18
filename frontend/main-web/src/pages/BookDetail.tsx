import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { getBook } from "../lib/books";
import type { BookDto } from "../lib/books";
import { borrowBook as borrowBookApi } from "../lib/loans";
import { useToast } from "../hooks/useToast";
import Toast from "../components/Toast";
import BorrowConfirmDialog from "../components/BorrowConfirmDialog";
import { Button } from "../components/ui/button";
import { Library, ArrowLeft, Calendar, Hash, Globe, LoaderCircle } from "lucide-react";

export default function BookDetail() {
    const { id } = useParams<{ id: string }>();
    const { role } = useAuth();
    const navigate = useNavigate();

    const [book, setBook] = useState<BookDto | null>(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [confirmBook, setConfirmBook] = useState<BookDto | null>(null);
    const { toast, showToast } = useToast();

    useEffect(() => {
        if (!id) return;
        let cancelled = false;
        setLoading(true);
        setNotFound(false);

        getBook(id)
            .then(result => { if (!cancelled) setBook(result); })
            .catch(error => {
                console.error("Không tải được thông tin sách:", error);
                if (!cancelled) setNotFound(true);
            })
            .finally(() => { if (!cancelled) setLoading(false); });

        return () => { cancelled = true; };
    }, [id]);

    const handleBorrow = async () => {
        if (!confirmBook) return;
        const target = confirmBook;
        setConfirmBook(null);
        try {
            await borrowBookApi(target.id);
            showToast(`Mượn "${target.title}" thành công!`, 'success');
            const refreshed = await getBook(target.id);
            setBook(refreshed);
        } catch (requestError) {
            console.error("Không thể mượn sách:", requestError);
            showToast(`Mượn "${target.title}" thất bại. Vui lòng thử lại.`, 'error');
        }
    };

    if (loading) {
        return (
            <div className="container mx-auto p-4 md:p-8 flex items-center justify-center gap-2 py-16 text-sm text-gray-500" role="status">
                <LoaderCircle className="h-5 w-5 animate-spin" /> Đang tải...
            </div>
        );
    }

    if (notFound || !book) {
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
            <Toast toast={toast} />

            <button
                onClick={() => navigate('/books')}
                className="flex items-center gap-1 text-gray-500 hover:text-gray-800 mb-6 text-sm transition-colors"
            >
                <ArrowLeft className="w-4 h-4" />
                Quay lại danh mục
            </button>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="flex flex-col md:flex-row">
                    <div className="w-full md:w-80 h-64 md:h-auto bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center border-b md:border-b-0 md:border-r border-gray-100 shrink-0">
                        <Library className="w-20 h-20 text-gray-200" />
                    </div>

                    <div className="flex-1 p-6 md:p-8">
                        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                            <div>
                                <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-1">{book.title}</h1>
                                {book.subtitle && <p className="text-gray-500 text-lg">{book.subtitle}</p>}
                            </div>
                            <span className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium ${book.availableCopies > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                                }`}>
                                {book.availableCopies > 0 ? `Còn ${book.availableCopies} cuốn` : 'Hết sách'}
                            </span>
                        </div>

                        {book.description && <p className="text-gray-600 mb-6">{book.description}</p>}

                        <div className="grid grid-cols-2 gap-4 mb-6 py-4 border-y border-gray-100">
                            {book.language && (
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <Globe className="w-4 h-4 text-gray-400" />
                                    <span className="text-gray-400">Ngôn ngữ:</span>
                                    <span className="font-medium">{book.language}</span>
                                </div>
                            )}
                            {book.publishedYear && (
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <Calendar className="w-4 h-4 text-gray-400" />
                                    <span className="text-gray-400">Năm XB:</span>
                                    <span className="font-medium">{book.publishedYear}</span>
                                </div>
                            )}
                            {book.isbn13 && (
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <Hash className="w-4 h-4 text-gray-400" />
                                    <span className="text-gray-400">ISBN:</span>
                                    <span className="font-medium">{book.isbn13}</span>
                                </div>
                            )}
                            {book.pageCount && (
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <span className="text-gray-400">Số trang:</span>
                                    <span className="font-medium">{book.pageCount}</span>
                                </div>
                            )}
                        </div>

                        <div>
                            {role === 'guest' ? (
                                <Button variant="outline" onClick={() => navigate('/login')} className="w-full sm:w-auto">
                                    Đăng nhập để mượn sách
                                </Button>
                            ) : (
                                <Button
                                    variant="brand"
                                    disabled={book.availableCopies <= 0}
                                    onClick={() => setConfirmBook(book)}
                                    className="w-full sm:w-auto"
                                >
                                    {book.availableCopies > 0 ? 'Mượn sách này' : 'Sách đã hết'}
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <BorrowConfirmDialog
                book={confirmBook}
                onCancel={() => setConfirmBook(null)}
                onConfirm={handleBorrow}
            />
        </div>
    );
}
