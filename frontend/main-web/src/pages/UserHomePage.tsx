import { useState, useEffect, useCallback, useRef } from "react";
import { searchBooks, type BookDto } from "../lib/books";
import { borrowBook as borrowBookApi } from "../lib/loans";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "../components/ui/button";
import { useNavigate } from "react-router-dom";
import { Library, ChevronLeft, ChevronRight, Star, ArrowRight, LoaderCircle } from "lucide-react";
import { useToast } from "../hooks/useToast";
import Toast from "../components/Toast";

// Color palette for category gradients
const CATEGORY_COLORS: Record<string, { from: string; to: string }> = {
    'Khoa học': { from: 'from-blue-50', to: 'to-indigo-50' },
    'Kỹ năng sống': { from: 'from-emerald-50', to: 'to-teal-50' },
    'Văn học': { from: 'from-rose-50', to: 'to-pink-50' },
    'Công nghệ': { from: 'from-violet-50', to: 'to-purple-50' },
};

const SLIDE_COLORS = [
    'from-[#e60023]/5 to-rose-50',
    'from-blue-50 to-indigo-50',
    'from-emerald-50 to-teal-50',
    'from-amber-50 to-yellow-50',
    'from-violet-50 to-purple-50',
];

export default function UserHomePage() {
    const { role } = useAuth();
    const navigate = useNavigate();
    const { toast, showToast } = useToast();

    const [books, setBooks] = useState<BookDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentSlide, setCurrentSlide] = useState(0);
    const [confirmBook, setConfirmBook] = useState<BookDto | null>(null);
    const [borrowing, setBorrowing] = useState(false);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const loadBooks = useCallback(async () => {
        setLoading(true);
        try {
            const page = await searchBooks({ size: 60 });
            setBooks(page.content);
        } catch (err) {
            console.error("Failed to load books for homepage:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadBooks();
    }, [loadBooks]);

    // Featured books = top 5 by rating
    const featuredBooks = [...books]
        .sort((a, b) => Number(b.ratingAvg ?? 0) - Number(a.ratingAvg ?? 0))
        .slice(0, 5);

    // Group books by categories
    const categories = [...new Set(books.flatMap(b => b.categories ?? []).filter(Boolean))];
    const booksByCategory = categories.map(cat => ({
        name: cat,
        books: books.filter(b => b.categories?.includes(cat)),
    }));

    // Auto-slide
    const startAutoSlide = useCallback(() => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = setInterval(() => {
            setCurrentSlide(prev => (prev + 1) % (featuredBooks.length || 1));
        }, 5000);
    }, [featuredBooks.length]);

    useEffect(() => {
        if (featuredBooks.length <= 1) return;
        startAutoSlide();
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [startAutoSlide, featuredBooks.length]);

    const goToSlide = (index: number) => {
        setCurrentSlide(index);
        startAutoSlide();
    };

    const prevSlide = () => {
        goToSlide((currentSlide - 1 + featuredBooks.length) % featuredBooks.length);
    };

    const nextSlide = () => {
        goToSlide((currentSlide + 1) % featuredBooks.length);
    };

    const handleBorrow = async () => {
        if (!confirmBook) return;
        setBorrowing(true);
        try {
            await borrowBookApi(confirmBook.id);
            showToast(`Mượn "${confirmBook.title}" thành công!`, 'success');
            setConfirmBook(null);
            void loadBooks();
        } catch (err) {
            console.error("Mượn sách thất bại:", err);
            showToast(`Mượn "${confirmBook.title}" thất bại. Vui lòng thử lại.`, 'error');
        } finally {
            setBorrowing(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-32 gap-3" role="status">
                <LoaderCircle className="w-8 h-8 animate-spin text-[#e60023]" />
                <span className="text-gray-400 text-sm">Đang tải dữ liệu sách...</span>
            </div>
        );
    }

    return (
        <div className="pb-8">
            <Toast toast={toast} />

            {/* ===== FEATURED HERO BANNER / SLIDER ===== */}
            {featuredBooks.length > 0 && (
                <section className="relative mb-12 overflow-hidden rounded-2xl">
                    <div
                        className="flex transition-transform duration-700 ease-in-out"
                        style={{ transform: `translateX(-${currentSlide * 100}%)` }}
                    >
                        {featuredBooks.map((book, index) => {
                            const slideColor = SLIDE_COLORS[index % SLIDE_COLORS.length];
                            return (
                                <div
                                    key={book.id}
                                    className={`w-full shrink-0 bg-gradient-to-r ${slideColor} p-6 md:p-10 rounded-2xl border border-gray-100 flex flex-col md:flex-row items-center gap-8 justify-between`}
                                >
                                    <div className="flex-1 max-w-xl">
                                        <div className="flex items-center gap-2 mb-3">
                                            <span className="px-3 py-1 bg-white/80 rounded-full text-xs font-semibold text-[#e60023] shadow-xs">
                                                ★ Nổi bật
                                            </span>
                                            {book.ratingAvg != null && Number(book.ratingAvg) > 0 && (
                                                <span className="flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200/60">
                                                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                                                    {Number(book.ratingAvg).toFixed(1)}
                                                    {book.ratingCount ? ` (${book.ratingCount})` : ''}
                                                </span>
                                            )}
                                        </div>
                                        <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-2 leading-tight">
                                            {book.title}
                                        </h1>
                                        <p className="text-sm text-gray-600 mb-2 font-medium">
                                            {book.authors && book.authors.length > 0
                                                ? book.authors.join(', ')
                                                : 'Chưa rõ tác giả'}
                                        </p>
                                        <p className="text-gray-500 text-sm line-clamp-2 md:line-clamp-3 mb-6">
                                            {book.description || 'Khám phá tựa sách hấp dẫn này ngay hôm nay tại thư viện.'}
                                        </p>
                                        <div className="flex items-center gap-3">
                                            <Button
                                                variant="brand"
                                                onClick={() => navigate(`/books/${book.id}`)}
                                                className="rounded-xl px-5"
                                            >
                                                Xem chi tiết
                                            </Button>
                                            {role !== 'guest' && (
                                                <Button
                                                    variant="outline"
                                                    disabled={book.availableCopies <= 0}
                                                    onClick={() => setConfirmBook(book)}
                                                    className="rounded-xl"
                                                >
                                                    {book.availableCopies > 0 ? 'Mượn ngay' : 'Tạm hết'}
                                                </Button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Slide Cover Preview */}
                                    <div
                                        className="w-40 h-56 md:w-52 md:h-72 bg-white rounded-xl shadow-lg border border-gray-100 flex items-center justify-center shrink-0 cursor-pointer hover:scale-105 transition-transform overflow-hidden"
                                        onClick={() => navigate(`/books/${book.id}`)}
                                    >
                                        {book.coverImageUrl ? (
                                            <img
                                                src={book.coverImageUrl}
                                                alt={book.title}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <Library className="w-16 h-16 text-gray-300" />
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Slider navigation controls */}
                    {featuredBooks.length > 1 && (
                        <>
                            <button
                                onClick={prevSlide}
                                className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white shadow-md rounded-full p-2 text-gray-600 hover:text-gray-900 transition-colors z-10"
                                aria-label="Slide trước"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <button
                                onClick={nextSlide}
                                className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white shadow-md rounded-full p-2 text-gray-600 hover:text-gray-900 transition-colors z-10"
                                aria-label="Slide sau"
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>
                            <div className="flex justify-center gap-2 mt-4">
                                {featuredBooks.map((_, i) => (
                                    <button
                                        key={i}
                                        onClick={() => goToSlide(i)}
                                        className={`w-2.5 h-2.5 rounded-full transition-all ${
                                            i === currentSlide
                                                ? 'bg-[#e60023] scale-110'
                                                : 'bg-gray-300 hover:bg-gray-400'
                                        }`}
                                        aria-label={`Slide ${i + 1}`}
                                    />
                                ))}
                            </div>
                        </>
                    )}
                </section>
            )}

            {/* ===== BOOKS BY CATEGORY ===== */}
            {booksByCategory.length > 0 ? (
                booksByCategory.map(({ name, books: catBooks }) => {
                    const colors = CATEGORY_COLORS[name] || { from: 'from-gray-50', to: 'to-slate-50' };
                    return (
                        <section key={name} className="mb-10">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-bold text-gray-900">{name}</h2>
                                <button
                                    onClick={() => navigate(`/books?category=${encodeURIComponent(name)}`)}
                                    className="flex items-center gap-1 text-sm text-[#e60023] hover:text-[#cc0020] font-medium transition-colors cursor-pointer"
                                >
                                    Xem tất cả
                                    <ArrowRight className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-thin scrollbar-thumb-gray-200 snap-x snap-mandatory">
                                {catBooks.map(book => (
                                    <div
                                        key={book.id}
                                        className={`shrink-0 w-56 bg-gradient-to-br ${colors.from} ${colors.to} rounded-2xl border border-gray-100 p-4 flex flex-col justify-between snap-start hover:shadow-md transition-shadow`}
                                    >
                                        <div>
                                            <div
                                                className="w-full h-32 bg-white/70 rounded-xl flex items-center justify-center border border-gray-100 mb-3 cursor-pointer hover:bg-white transition-colors overflow-hidden"
                                                onClick={() => navigate(`/books/${book.id}`)}
                                            >
                                                {book.coverImageUrl ? (
                                                    <img
                                                        src={book.coverImageUrl}
                                                        alt={book.title}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <Library className="w-8 h-8 text-gray-300" />
                                                )}
                                            </div>

                                            <h3
                                                className="text-sm font-bold text-gray-800 line-clamp-2 mb-1 cursor-pointer hover:text-[#e60023] transition-colors"
                                                onClick={() => navigate(`/books/${book.id}`)}
                                            >
                                                {book.title}
                                            </h3>
                                            <p className="text-xs text-gray-500 mb-2 truncate">
                                                {book.authors && book.authors.length > 0
                                                    ? book.authors.join(', ')
                                                    : 'Chưa rõ tác giả'}
                                            </p>

                                            <div className="flex items-center justify-between mb-3">
                                                {book.ratingAvg != null && Number(book.ratingAvg) > 0 ? (
                                                    <span className="text-xs text-amber-600 flex items-center gap-1 font-medium">
                                                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                                        {Number(book.ratingAvg).toFixed(1)}
                                                    </span>
                                                ) : <span />}
                                                <span className={`text-xs font-medium ml-auto ${
                                                    book.availableCopies > 0 ? 'text-green-600' : 'text-gray-400'
                                                }`}>
                                                    {book.availableCopies > 0 ? `Còn ${book.availableCopies}` : 'Hết'}
                                                </span>
                                            </div>
                                        </div>

                                        <Button
                                            variant="brand"
                                            size="sm"
                                            className="w-full rounded-xl"
                                            disabled={book.availableCopies <= 0}
                                            onClick={() => setConfirmBook(book)}
                                        >
                                            {book.availableCopies > 0 ? 'Mượn sách' : 'Hết sách'}
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </section>
                    );
                })
            ) : (
                <section className="mb-10">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-gray-900">Sách trong thư viện</h2>
                        <button
                            onClick={() => navigate('/books')}
                            className="flex items-center gap-1 text-sm text-[#e60023] hover:text-[#cc0020] font-medium transition-colors"
                        >
                            Xem tất cả
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                        {books.slice(0, 8).map(book => (
                            <div
                                key={book.id}
                                className="bg-white rounded-xl border border-gray-100 p-4 flex flex-col hover:shadow-md transition-shadow"
                            >
                                <div
                                    className="w-full h-32 bg-gray-50 rounded-lg flex items-center justify-center border border-gray-100 mb-3 cursor-pointer overflow-hidden"
                                    onClick={() => navigate(`/books/${book.id}`)}
                                >
                                    {book.coverImageUrl ? (
                                        <img src={book.coverImageUrl} alt={book.title} className="w-full h-full object-cover" />
                                    ) : (
                                        <Library className="w-8 h-8 text-gray-300" />
                                    )}
                                </div>
                                <h3
                                    className="text-sm font-bold text-gray-800 line-clamp-2 mb-1 cursor-pointer hover:text-[#e60023] transition-colors"
                                    onClick={() => navigate(`/books/${book.id}`)}
                                >
                                    {book.title}
                                </h3>
                                <p className="text-xs text-gray-500 mb-2 truncate">
                                    {book.authors && book.authors.length > 0 ? book.authors.join(', ') : 'Chưa rõ tác giả'}
                                </p>
                                <span className={`text-xs font-medium mb-3 ${book.availableCopies > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                                    {book.availableCopies > 0 ? `Còn ${book.availableCopies}` : 'Hết sách'}
                                </span>
                                <Button
                                    variant="brand"
                                    size="sm"
                                    className="w-full mt-auto rounded-xl"
                                    disabled={book.availableCopies <= 0}
                                    onClick={() => setConfirmBook(book)}
                                >
                                    {book.availableCopies > 0 ? 'Mượn sách' : 'Hết sách'}
                                </Button>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Borrow Confirmation Modal */}
            {confirmBook && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4"
                    onClick={() => setConfirmBook(null)}
                >
                    <div
                        className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95"
                        onClick={e => e.stopPropagation()}
                    >
                        <h2 className="text-xl font-bold text-gray-900 mb-2">Xác nhận mượn sách</h2>
                        <p className="text-gray-500 text-sm mb-6 leading-relaxed">
                            Bạn muốn mượn cuốn <strong className="text-gray-900">&quot;{confirmBook.title}&quot;</strong> của {confirmBook.authors && confirmBook.authors.length > 0 ? confirmBook.authors.join(', ') : 'tác giả'}?
                            <br />
                            <span className="text-xs mt-2 block text-gray-400">
                                Thời hạn mượn mặc định: 14 ngày kể từ hôm nay.
                            </span>
                        </p>
                        <div className="flex gap-3 justify-end">
                            <Button variant="outline" onClick={() => setConfirmBook(null)} disabled={borrowing} className="rounded-xl">
                                Hủy
                            </Button>
                            <Button variant="brand" onClick={handleBorrow} disabled={borrowing} className="rounded-xl">
                                {borrowing ? 'Đang xử lý...' : 'Xác nhận mượn'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
