import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { searchBooks, type BookDto } from "../lib/books";
import { borrowBook as borrowBookApi } from "../lib/loans";
import { Button } from "../components/ui/button";
import { useNavigate } from "react-router-dom";
import {
    ChevronLeft,
    ChevronRight,
    Star,
    ArrowRight,
    LoaderCircle,
    Cpu,
    BookOpenText,
    Lightbulb,
    Globe2
} from "lucide-react";
import { useToast } from "../hooks/useToast";
import Toast from "../components/ui/Toast";
import BookCover from "../components/books/BookCover";
import Top10Leaderboard from "../components/books/Top10Leaderboard";
import BorrowConfirmDialog from "../components/loans/BorrowConfirmDialog";

const SLIDE_COLORS = [
    'from-[#e60023]/10 via-rose-50 to-amber-50',
    'from-blue-100/50 via-indigo-50 to-slate-50',
    'from-emerald-100/50 via-teal-50 to-neutral-50',
    'from-amber-100/50 via-yellow-50 to-stone-50',
    'from-violet-100/50 via-purple-50 to-zinc-50',
];

export default function Explore() {
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
            const page = await searchBooks({ size: 80 });
            setBooks(page.content);
        } catch (err) {
            console.error("Failed to load books for explore page:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadBooks();
    }, [loadBooks]);

    // Top 5 highest-rated books for Slider
    const featuredBooks = useMemo(() => {
        return [...books]
            .sort((a, b) => Number(b.ratingAvg ?? 0) - Number(a.ratingAvg ?? 0) || (b.ratingCount ?? 0) - (a.ratingCount ?? 0))
            .slice(0, 5);
    }, [books]);

    // Curated Main Genres (3 thể loại chính)
    const curatedClusters = useMemo(() => {
        const scienceTech = books.filter(b =>
            b.categories?.some(c => /khoa học|công nghệ|máy tính|technology|science|computer/i.test(c))
        );
        const literature = books.filter(b =>
            b.categories?.some(c => /văn học|tiểu thuyết|nghệ thuật|literature|fiction|art/i.test(c))
        );
        const skillsSelfHelp = books.filter(b =>
            b.categories?.some(c => /kỹ năng|kinh doanh|kinh tế|tâm lý|business|self/i.test(c))
        );

        return [
            {
                id: 'tech',
                title: 'Khoa học & Công nghệ',
                icon: <Cpu className="w-5 h-5 text-blue-600" />,
                searchQuery: 'Khoa học',
                books: scienceTech.length ? scienceTech.slice(0, 6) : books.slice(0, 6),
            },
            {
                id: 'literature',
                title: 'Văn học & Nghệ thuật',
                icon: <BookOpenText className="w-5 h-5 text-rose-600" />,
                searchQuery: 'Văn học',
                books: literature.length ? literature.slice(0, 6) : books.slice(6, 12),
            },
            {
                id: 'skills',
                title: 'Kỹ năng & Phát triển bản thân',
                icon: <Lightbulb className="w-5 h-5 text-amber-600" />,
                searchQuery: 'Kỹ năng sống',
                books: skillsSelfHelp.length ? skillsSelfHelp.slice(0, 6) : books.slice(12, 18),
            },
        ];
    }, [books]);

    // Country / Language Grouping
    const vietnameseBooks = useMemo(() => {
        return books.filter(b => b.language === 'vi').slice(0, 6);
    }, [books]);

    const internationalBooks = useMemo(() => {
        return books.filter(b => b.language !== 'vi').slice(0, 6);
    }, [books]);

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

    const handleBorrowConfirm = async () => {
        if (!confirmBook) return;
        setBorrowing(true);
        try {
            await borrowBookApi(confirmBook.id);
            showToast(`Mượn cuốn "${confirmBook.title}" thành công!`, 'success');
            setConfirmBook(null);
            void loadBooks();
        } catch (err) {
            console.error("Mượn sách thất bại:", err);
            showToast(`Mượn "${confirmBook.title}" thất bại. Vui lòng thử lại.`, 'error');
        } finally {
            setBorrowing(false);
        }
    };

    if (loading && !books.length) {
        return (
            <div className="flex flex-col items-center justify-center py-32 gap-3" role="status">
                <LoaderCircle className="w-8 h-8 animate-spin text-[#e60023]" />
                <span className="text-gray-400 text-sm">Đang tải không gian khám phá sách...</span>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-6">
            <Toast toast={toast} />

            {/* Borrow Confirmation Dialog */}
            <BorrowConfirmDialog
                book={confirmBook}
                onCancel={() => setConfirmBook(null)}
                onConfirm={() => void handleBorrowConfirm()}
            />

            {/* SLIDER CAROUSEL */}
            {featuredBooks.length > 0 && (
                <section className="relative mb-10 overflow-hidden rounded-2xl shadow-sm border border-gray-100">
                    <div
                        className="flex transition-transform duration-700 ease-in-out"
                        style={{ transform: `translateX(-${currentSlide * 100}%)` }}
                    >
                        {featuredBooks.map((book, index) => {
                            const slideColor = SLIDE_COLORS[index % SLIDE_COLORS.length];
                            return (
                                <div
                                    key={book.id}
                                    className={`w-full shrink-0 bg-gradient-to-r ${slideColor} p-6 md:p-10 flex flex-col md:flex-row items-center gap-8 justify-between`}
                                >
                                    <div className="flex-1 max-w-xl">
                                        <div className="flex items-center gap-2 mb-3">
                                            <span className="px-3 py-1 bg-white/90 rounded-full text-xs font-bold text-[#e60023] shadow-xs">
                                                ★ Tuyển chọn nổi bật
                                            </span>
                                            {book.ratingAvg != null && Number(book.ratingAvg) > 0 && (
                                                <span className="flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200/60">
                                                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                                                    {Number(book.ratingAvg).toFixed(1)}
                                                </span>
                                            )}
                                        </div>
                                        <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-2 leading-tight">
                                            {book.title}
                                        </h1>
                                        <p className="text-sm text-gray-600 mb-2 font-medium">
                                            {book.authors?.join(', ') || 'Chưa rõ tác giả'}
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
                                            <Button
                                                variant="outline"
                                                disabled={book.availableCopies <= 0 || borrowing}
                                                onClick={() => setConfirmBook(book)}
                                                className="rounded-xl bg-white/80 hover:bg-white"
                                            >
                                                {book.availableCopies > 0 ? 'Mượn ngay' : 'Tạm hết'}
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Cover Preview */}
                                    <div
                                        className="w-36 aspect-2/3 md:w-48 bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden shrink-0 cursor-pointer hover:scale-105 transition-transform"
                                        onClick={() => navigate(`/books/${book.id}`)}
                                    >
                                        <BookCover
                                            imageUrl={book.coverImageUrl}
                                            title={book.title}
                                            imageClassName="w-full h-full object-cover"
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Navigation Buttons */}
                    {featuredBooks.length > 1 && (
                        <>
                            <button
                                type="button"
                                onClick={prevSlide}
                                className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white shadow-md rounded-full p-2 text-gray-700 hover:text-gray-900 transition-colors z-10"
                                aria-label="Slide trước"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <button
                                type="button"
                                onClick={nextSlide}
                                className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white shadow-md rounded-full p-2 text-gray-700 hover:text-gray-900 transition-colors z-10"
                                aria-label="Slide sau"
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>
                            <div className="flex justify-center gap-2 mt-3 pb-3">
                                {featuredBooks.map((_, i) => (
                                    <button
                                        key={i}
                                        type="button"
                                        onClick={() => goToSlide(i)}
                                        className={`w-2 h-2 rounded-full transition-all ${i === currentSlide
                                            ? 'bg-[#e60023] w-6'
                                            : 'bg-gray-300 hover:bg-gray-400'
                                            }`}
                                        aria-label={`Chuyển tới slide ${i + 1}`}
                                    />
                                ))}
                            </div>
                        </>
                    )}
                </section>
            )}

            {/* 2-COLUMN ENTERTAINMENT / PORTAL LAYOUT */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                <main className="lg:col-span-8 space-y-10">
                    {curatedClusters.map(cluster => (
                        <section key={cluster.id} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-xs">
                            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-50">
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 rounded-lg bg-gray-50">
                                        {cluster.icon}
                                    </div>
                                    <h2 className="text-lg font-bold text-gray-900 tracking-tight">
                                        {cluster.title}
                                    </h2>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => navigate(`/search?q=${encodeURIComponent(cluster.searchQuery)}`)}
                                    className="flex items-center gap-1 text-xs font-semibold text-[#e60023] hover:text-[#c7001e] transition-colors"
                                >
                                    Xem tất cả
                                    <ArrowRight className="w-3.5 h-3.5" />
                                </button>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                {cluster.books.map(book => {
                                    const isAvailable = book.availableCopies > 0;
                                    const rating = Number(book.ratingAvg ?? 0);

                                    return (
                                        <div
                                            key={book.id}
                                            className="group flex flex-col justify-between bg-gray-50/60 rounded-xl p-3 border border-gray-100/80 hover:bg-white hover:shadow-md transition-all duration-300"
                                        >
                                            <div
                                                onClick={() => navigate(`/books/${book.id}`)}
                                                className="cursor-pointer"
                                            >
                                                <div className="relative aspect-2/3 bg-gray-200 rounded-lg overflow-hidden mb-2.5">
                                                    <BookCover
                                                        imageUrl={book.coverImageUrl}
                                                        title={book.title}
                                                        imageClassName="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                    />
                                                    <span className={`absolute top-1.5 right-1.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${isAvailable ? 'bg-emerald-500 text-white' : 'bg-gray-700 text-white'
                                                        }`}>
                                                        {isAvailable ? 'Có sẵn' : 'Hết'}
                                                    </span>
                                                </div>
                                                <h3 className="text-xs font-bold text-gray-900 line-clamp-2 group-hover:text-[#e60023] transition-colors">
                                                    {book.title}
                                                </h3>
                                                <p className="text-[11px] text-gray-500 truncate mt-0.5">
                                                    {book.authors?.join(', ') || 'Nhiều tác giả'}
                                                </p>
                                                {rating > 0 && (
                                                    <div className="flex items-center gap-1 mt-1 text-[10px] text-amber-500">
                                                        <Star className="w-3 h-3 fill-amber-400 stroke-amber-400" />
                                                        <span className="font-semibold">{rating.toFixed(1)}</span>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="mt-3 pt-2 border-t border-gray-100">
                                                <Button
                                                    variant={isAvailable ? "brand" : "outline"}
                                                    size="sm"
                                                    disabled={!isAvailable}
                                                    onClick={() => setConfirmBook(book)}
                                                    className="w-full h-7 text-[11px] rounded-lg"
                                                >
                                                    {isAvailable ? 'Mượn sách' : 'Tạm hết'}
                                                </Button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    ))}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Vietnamese Books */}
                        <section className="bg-white rounded-2xl border border-gray-100 p-5 shadow-xs">
                            <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-50">
                                <div className="flex items-center gap-2">
                                    <span className="text-lg">🇻🇳</span>
                                    <h3 className="font-bold text-sm text-gray-900">Sách Tiếng Việt</h3>
                                </div>
                                <span className="text-xs text-gray-400">{vietnameseBooks.length} cuốn nổi bật</span>
                            </div>

                            <div className="space-y-3">
                                {vietnameseBooks.slice(0, 4).map(book => (
                                    <div
                                        key={book.id}
                                        onClick={() => navigate(`/books/${book.id}`)}
                                        className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors"
                                    >
                                        <div className="w-10 aspect-2/3 rounded bg-gray-100 overflow-hidden shrink-0">
                                            <BookCover
                                                imageUrl={book.coverImageUrl}
                                                title={book.title}
                                                imageClassName="w-full h-full object-cover"
                                            />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-xs font-semibold text-gray-800 truncate hover:text-[#e60023]">
                                                {book.title}
                                            </h4>
                                            <p className="text-[11px] text-gray-400 truncate">
                                                {book.authors?.join(', ') || 'Việt Nam'}
                                            </p>
                                        </div>
                                        <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full shrink-0 font-medium">
                                            {book.availableCopies > 0 ? 'Có sẵn' : 'Đã mượn'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* International Books */}
                        <section className="bg-white rounded-2xl border border-gray-100 p-5 shadow-xs">
                            <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-50">
                                <div className="flex items-center gap-2">
                                    <Globe2 className="w-4 h-4 text-indigo-500" />
                                    <h3 className="font-bold text-sm text-gray-900">Sách Quốc Tế (Ngoại văn)</h3>
                                </div>
                                <span className="text-xs text-gray-400">{internationalBooks.length} cuốn nổi bật</span>
                            </div>

                            <div className="space-y-3">
                                {internationalBooks.slice(0, 4).map(book => (
                                    <div
                                        key={book.id}
                                        onClick={() => navigate(`/books/${book.id}`)}
                                        className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors"
                                    >
                                        <div className="w-10 aspect-2/3 rounded bg-gray-100 overflow-hidden shrink-0">
                                            <BookCover
                                                imageUrl={book.coverImageUrl}
                                                title={book.title}
                                                imageClassName="w-full h-full object-cover"
                                            />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-xs font-semibold text-gray-800 truncate hover:text-[#e60023]">
                                                {book.title}
                                            </h4>
                                            <p className="text-[11px] text-gray-400 truncate">
                                                {book.authors?.join(', ') || 'International'}
                                            </p>
                                        </div>
                                        <span className="text-[10px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full shrink-0 font-medium">
                                            {book.language ? book.language.toUpperCase() : 'EN'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>
                </main>

                {/* RIGHT COLUMN: TOP 10 LEADERBOARD */}
                <aside className="lg:col-span-4 sticky top-20">
                    <Top10Leaderboard books={books} />
                </aside>
            </div>
        </div>
    );
}
