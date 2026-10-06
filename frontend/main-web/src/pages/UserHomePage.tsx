import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import type { Book } from "../contexts/AuthContext";
import { Button } from "../components/ui/button";
import { useNavigate } from "react-router-dom";
import { Library, ChevronLeft, ChevronRight, Star, ArrowRight, CheckCircle, AlertCircle } from "lucide-react";

type ToastType = { message: string; type: 'success' | 'error' } | null;

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
    const { books, borrowBook } = useAuth();
    const navigate = useNavigate();

    const [currentSlide, setCurrentSlide] = useState(0);
    const [confirmBook, setConfirmBook] = useState<Book | null>(null);
    const [toast, setToast] = useState<ToastType>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Featured books = top 5 by rating
    const featuredBooks = [...books]
        .sort((a, b) => b.rating - a.rating)
        .slice(0, 5);

    // Group books by category
    const categories = [...new Set(books.map(b => b.category))];
    const booksByCategory = categories.map(cat => ({
        name: cat,
        books: books.filter(b => b.category === cat),
    }));

    // Auto-slide
    const startAutoSlide = useCallback(() => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = setInterval(() => {
            setCurrentSlide(prev => (prev + 1) % featuredBooks.length);
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

    const showToast = (message: string, type: 'success' | 'error') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    };

    const handleBorrow = () => {
        if (!confirmBook) return;
        const result = borrowBook(confirmBook.id);
        setConfirmBook(null);
        if (result.success) {
            showToast(`Mượn "${confirmBook.title}" thành công!`, 'success');
        } else {
            showToast(!result.success ? result.message : 'Có lỗi xảy ra.', 'error');
        }
    };

    return (
        <div className="pb-8">
            {/* Toast */}
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

            {/* Book slider */}
            {featuredBooks.length > 0 && (
                <section className="relative mb-10">
                    <div className="overflow-hidden rounded-2xl border border-gray-100 shadow-sm bg-white">
                        <div
                            className="flex transition-transform duration-500 ease-out"
                            style={{ transform: `translateX(-${currentSlide * 100}%)` }}
                        >
                            {featuredBooks.map((book, i) => (
                                <div
                                    key={book.id}
                                    className={`w-full shrink-0 flex flex-col md:flex-row items-center gap-6 md:gap-10 p-6 md:p-10 bg-gradient-to-br ${SLIDE_COLORS[i % SLIDE_COLORS.length]}`}
                                >
                                    {/* Cover placeholder */}
                                    <div
                                        className="w-40 h-56 md:w-48 md:h-64 rounded-xl bg-white/80 border border-gray-200 flex items-center justify-center shadow-sm cursor-pointer hover:shadow-md transition-shadow shrink-0"
                                        onClick={() => navigate(`/books/${book.id}`)}
                                    >
                                        <Library className="w-16 h-16 text-gray-200" />
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 text-center md:text-left">
                                        <div className="flex items-center gap-2 justify-center md:justify-start mb-2">
                                            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                                            <span className="text-sm font-medium text-amber-600">{book.rating} / 5</span>
                                            <span className="text-xs bg-[#e60023]/10 text-[#e60023] px-2 py-0.5 rounded-full font-medium ml-1">Nổi bật</span>
                                        </div>
                                        <h2
                                            className="text-2xl md:text-3xl font-bold text-gray-800 mb-2 cursor-pointer hover:text-[#e60023] transition-colors"
                                            onClick={() => navigate(`/books/${book.id}`)}
                                        >
                                            {book.title}
                                        </h2>
                                        <p className="text-gray-500 mb-1">{book.author}</p>
                                        <div className="flex flex-wrap gap-2 justify-center md:justify-start mt-3 mb-5">
                                            <span className="text-xs bg-white/80 text-gray-500 px-2 py-1 rounded-md border border-gray-100">{book.category}</span>
                                            <span className="text-xs bg-white/80 text-gray-500 px-2 py-1 rounded-md border border-gray-100">{book.publishYear}</span>
                                            <span className={`text-xs px-2 py-1 rounded-md ${book.quantity > 0 ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-gray-50 text-gray-400 border border-gray-100'}`}>
                                                {book.quantity > 0 ? `Còn ${book.quantity} cuốn` : 'Hết sách'}
                                            </span>
                                        </div>
                                        <div className="flex gap-3 justify-center md:justify-start">
                                            <Button
                                                variant="brand"
                                                disabled={book.quantity <= 0}
                                                onClick={() => setConfirmBook(book)}
                                            >
                                                {book.quantity > 0 ? 'Mượn sách' : 'Không khả dụng'}
                                            </Button>
                                            <Button variant="outline" onClick={() => navigate(`/books/${book.id}`)}>
                                                Chi tiết
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Slider controls */}
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
                                        className={`w-2.5 h-2.5 rounded-full transition-all ${i === currentSlide
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
            {booksByCategory.map(({ name, books: catBooks }) => {
                const colors = CATEGORY_COLORS[name] || { from: 'from-gray-50', to: 'to-slate-50' };
                return (
                    <section key={name} className="mb-10">
                        {/* Category header */}
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-gray-800">{name}</h2>
                            <button
                                onClick={() => navigate(`/books?category=${encodeURIComponent(name)}`)}
                                className="flex items-center gap-1 text-sm text-[#e60023] hover:text-[#cc0020] font-medium transition-colors"
                            >
                                Xem tất cả
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Horizontal scroll */}
                        <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-thin scrollbar-thumb-gray-200 snap-x snap-mandatory">
                            {catBooks.map(book => (
                                <div
                                    key={book.id}
                                    className={`shrink-0 w-56 bg-gradient-to-br ${colors.from} ${colors.to} rounded-xl border border-gray-100 p-4 flex flex-col snap-start hover:shadow-md transition-shadow`}
                                >
                                    {/* Cover */}
                                    <div
                                        className="w-full h-32 bg-white/60 rounded-lg flex items-center justify-center border border-gray-100 mb-3 cursor-pointer hover:bg-white/80 transition-colors"
                                        onClick={() => navigate(`/books/${book.id}`)}
                                    >
                                        <Library className="w-8 h-8 text-gray-300" />
                                    </div>

                                    {/* Info */}
                                    <h3
                                        className="text-sm font-bold text-gray-800 line-clamp-2 mb-1 cursor-pointer hover:text-[#e60023] transition-colors"
                                        onClick={() => navigate(`/books/${book.id}`)}
                                    >
                                        {book.title}
                                    </h3>
                                    <p className="text-xs text-gray-500 mb-2 truncate">{book.author}</p>

                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-xs text-amber-600 flex items-center gap-0.5">
                                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                            {book.rating}
                                        </span>
                                        <span className={`text-xs font-medium ${book.quantity > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                                            {book.quantity > 0 ? `Còn ${book.quantity}` : 'Hết'}
                                        </span>
                                    </div>

                                    <Button
                                        variant="brand"
                                        size="sm"
                                        className="w-full"
                                        disabled={book.quantity <= 0}
                                        onClick={() => setConfirmBook(book)}
                                    >
                                        {book.quantity > 0 ? 'Mượn sách' : 'Hết sách'}
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </section>
                );
            })}

            {/* Borrow Confirmation */}
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
                            Bạn muốn mượn cuốn <strong className="text-gray-800">"{confirmBook.title}"</strong> của {confirmBook.author}?
                            <br />
                            <span className="text-sm mt-2 block text-gray-400">
                                Thời hạn mượn: 14 ngày kể từ hôm nay.
                            </span>
                        </p>
                        <div className="flex gap-3 justify-end">
                            <Button variant="outline" onClick={() => setConfirmBook(null)}>
                                Hủy
                            </Button>
                            <Button variant="brand" onClick={handleBorrow}>
                                Xác nhận mượn
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
