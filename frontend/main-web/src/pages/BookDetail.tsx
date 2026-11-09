import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { getBook } from "../lib/books";
import type { BookDto } from "../lib/books";
import { borrowBook as borrowBookApi } from "../lib/loans";
import { useToast } from "../hooks/useToast";
import Toast from "../components/ui/Toast";
import BorrowConfirmDialog from "../components/loans/BorrowConfirmDialog";
import BookPreviewDialog, { preloadGoogleBooksApi } from "../components/books/BookPreviewDialog";
import { Button } from "../components/ui/button";
import {
    Library,
    ArrowLeft,
    Calendar,
    Hash,
    Globe,
    Star,
    Tag,
    LoaderCircle,
    Eye,
    BookOpen,
    Layers,
    CheckCircle2,
    XCircle,
} from "lucide-react";

const LANGUAGE_NAMES: Record<string, string> = {
    en: 'Tiếng Anh',
    vi: 'Tiếng Việt',
    fr: 'Tiếng Pháp',
    de: 'Tiếng Đức',
    ja: 'Tiếng Nhật',
    ko: 'Tiếng Hàn',
    zh: 'Tiếng Trung',
    es: 'Tiếng Tây Ban Nha',
    ru: 'Tiếng Nga',
};

function formatLanguage(code: string | null): string {
    if (!code) return 'Không xác định';
    return LANGUAGE_NAMES[code.toLowerCase()] || code;
}

function getOptimalCoverUrl(url: string | null): string | null {
    if (!url) return null;
    return url.replace(/^http:\/\//i, 'https://');
}

export default function BookDetail() {
    const { id } = useParams<{ id: string }>();
    const { role } = useAuth();
    const navigate = useNavigate();

    const [book, setBook] = useState<BookDto | null>(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [confirmBook, setConfirmBook] = useState<BookDto | null>(null);
    const [showPreview, setShowPreview] = useState(false);
    const [imgError, setImgError] = useState(false);
    const { toast, showToast } = useToast();

    const rightPanelRef = useRef<HTMLDivElement>(null);

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

    // Forward scroll wheel from left thumbnail panel to right scrollable content
    const handleLeftWheel = (e: React.WheelEvent<HTMLDivElement>) => {
        if (rightPanelRef.current) {
            rightPanelRef.current.scrollTop += e.deltaY;
        }
    };

    if (loading) {
        return (
            <div className="w-full h-[calc(100vh-4rem)] flex flex-col items-center justify-center gap-3 bg-neutral-900 text-white/80" role="status">
                <LoaderCircle className="h-8 w-8 animate-spin text-[#e60023]" />
                <span className="text-sm font-medium tracking-wide">Đang tải thông tin sách...</span>
            </div>
        );
    }

    if (notFound || !book) {
        return (
            <div className="w-full h-[calc(100vh-4rem)] flex flex-col items-center justify-center p-8 bg-neutral-50 text-center">
                <div className="w-16 h-16 rounded-full bg-red-50 text-[#e60023] flex items-center justify-center mb-4">
                    <XCircle className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Không tìm thấy sách</h2>
                <p className="text-gray-500 max-w-md mb-6 text-sm">
                    Cuốn sách bạn đang tìm kiếm không tồn tại hoặc đã bị xóa khỏi hệ thống thư viện.
                </p>
                <Button variant="brand" onClick={() => navigate('/search')}>
                    Quay lại tìm kiếm sách
                </Button>
            </div>
        );
    }

    return (
        <div className="relative w-full h-[calc(100vh-4rem)] flex flex-row overflow-hidden bg-white select-text">
            <Toast toast={toast} />

            {/* Back floating button */}
            <button
                type="button"
                onClick={() => navigate(-1)}
                className="absolute top-6 left-6 z-30 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-black/45 hover:bg-black/65 text-white backdrop-blur-md text-xs font-semibold border border-white/20 transition-all shadow-lg group cursor-pointer hover:border-white/40 active:scale-95"
            >
                <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
                <span>Quay lại</span>
            </button>

            {/* LEFT PANEL: Fixed Book Thumbnail & Ambient Backdrop & Right Fade */}
            <div
                onWheel={handleLeftWheel}
                className="w-[45%] xl:w-[42%] 2xl:w-[40%] h-full shrink-0 relative flex items-center justify-center overflow-hidden bg-neutral-900 select-none cursor-default"
            >
                {/* Layer 1: Ambient Blurred Backdrop Cover */}
                {book.coverImageUrl && !imgError && (
                    <div
                        aria-hidden="true"
                        className="absolute inset-0 bg-cover bg-center scale-125 filter blur-3xl opacity-65 brightness-95 saturate-150 transition-all duration-700 pointer-events-none"
                        style={{ backgroundImage: `url("${getOptimalCoverUrl(book.coverImageUrl)}")` }}
                    />
                )}

                {/* Layer 2: Soft Ambient Overlay */}
                <div
                    aria-hidden="true"
                    className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-black/25 pointer-events-none"
                />

                {/* Layer 3: Hero Book Cover Centered with 3D Depth - Proportional and Large */}
                <div className="relative z-10 flex flex-col items-center justify-center p-6 sm:p-8 xl:pr-12 w-full h-full">
                    <div className="relative group transition-transform duration-500 ease-out hover:scale-[1.02] will-change-transform inline-flex">
                        {book.coverImageUrl && !imgError ? (
                            <div className="relative rounded-r-2xl rounded-l-sm overflow-hidden shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7),0_0_40px_rgba(0,0,0,0.35)] border-l-4 border-white/25 bg-neutral-900 inline-flex">
                                <img
                                    src={getOptimalCoverUrl(book.coverImageUrl) || ''}
                                    alt={book.title}
                                    className="h-[68vh] xl:h-[74vh] max-h-[660px] min-h-[380px] w-auto max-w-[85vw] object-contain block select-none rounded-r-2xl rounded-l-sm"
                                    onError={() => setImgError(true)}
                                />
                                {/* Realistic spine highlights & paper depth */}
                                <div className="absolute inset-y-0 left-0 w-3.5 bg-gradient-to-r from-black/45 via-white/15 to-transparent pointer-events-none" />
                                <div className="absolute inset-y-0 right-0 w-2.5 bg-gradient-to-l from-black/25 to-transparent pointer-events-none" />
                            </div>
                        ) : (
                            <div className="h-[68vh] xl:h-[74vh] max-h-[660px] min-h-[380px] aspect-[2/3] rounded-r-2xl rounded-l-sm bg-neutral-800/90 border border-neutral-700 shadow-2xl flex flex-col items-center justify-center p-8 text-center text-neutral-400">
                                <Library className="w-16 h-16 text-neutral-500 mb-4" />
                                <span className="font-semibold text-neutral-200 line-clamp-3 text-lg">{book.title}</span>
                                <span className="text-sm text-neutral-500 mt-2">{book.authors?.join(', ') || 'Chưa rõ tác giả'}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Layer 4: Multi-stop Smooth Fade to White into Right Side */}
                <div
                    aria-hidden="true"
                    className="absolute inset-y-0 -right-[1px] w-28 xl:w-40 pointer-events-none z-20"
                    style={{
                        background: 'linear-gradient(to right, transparent 0%, rgba(255,255,255,0.12) 20%, rgba(255,255,255,0.45) 50%, rgba(255,255,255,0.85) 80%, #ffffff 100%)'
                    }}
                />
            </div>

            {/* RIGHT PANEL: Scrollable Book Information */}
            <div
                ref={rightPanelRef}
                className="flex-1 h-full overflow-y-auto overscroll-contain bg-white scroll-smooth"
            >
                <div className="max-w-2xl 2xl:max-w-3xl px-8 py-10 xl:px-14 xl:py-12 min-h-full flex flex-col justify-between">
                    <div>
                        {/* Categories & Availability Badges */}
                        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                            <div className="flex flex-wrap items-center gap-2">
                                {book.categories && book.categories.length > 0 ? (
                                    book.categories.map((cat, idx) => (
                                        <span
                                            key={idx}
                                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-50 text-[#e60023] border border-red-100"
                                        >
                                            <Tag className="w-3 h-3" />
                                            {cat}
                                        </span>
                                    ))
                                ) : (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                        <Tag className="w-3 h-3 text-gray-400" />
                                        Tài liệu tổng hợp
                                    </span>
                                )}
                            </div>

                            <span className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold ${
                                book.availableCopies > 0
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                                    : 'bg-gray-100 text-gray-600 border border-gray-200'
                            }`}>
                                <span className={`w-2 h-2 rounded-full ${book.availableCopies > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
                                {book.availableCopies > 0 ? `Còn ${book.availableCopies} cuốn trong kho` : 'Tạm thời hết sách'}
                            </span>
                        </div>

                        {/* Title & Subtitle */}
                        <h1 className="text-3xl xl:text-4xl font-extrabold text-gray-900 tracking-tight leading-tight mb-2">
                            {book.title}
                        </h1>
                        {book.subtitle && (
                            <p className="text-base xl:text-lg text-gray-500 font-normal leading-relaxed mb-4">
                                {book.subtitle}
                            </p>
                        )}

                        {/* Authors */}
                        <div className="flex items-center gap-2 text-sm text-gray-600 mb-8 pb-4 border-b border-gray-100">
                            <span className="text-gray-400">Tác giả:</span>
                            <span className="font-semibold text-gray-900">
                                {book.authors && book.authors.length > 0 ? book.authors.join(', ') : 'Chưa rõ tác giả'}
                            </span>
                        </div>

                        {/* Specs Card Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
                            {/* Rating */}
                            <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-3.5 flex flex-col gap-1 transition-colors hover:bg-gray-50">
                                <div className="flex items-center gap-1.5 text-xs text-gray-400 font-medium">
                                    <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400 shrink-0" />
                                    <span>Đánh giá</span>
                                </div>
                                <span className="font-semibold text-gray-900 text-sm">
                                    {book.ratingCount
                                        ? `${Number(book.ratingAvg ?? 0).toFixed(1)} / 5 (${book.ratingCount})`
                                        : 'Chưa có đánh giá'}
                                </span>
                            </div>

                            {/* Published Year */}
                            <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-3.5 flex flex-col gap-1 transition-colors hover:bg-gray-50">
                                <div className="flex items-center gap-1.5 text-xs text-gray-400 font-medium">
                                    <Calendar className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                                    <span>Năm xuất bản</span>
                                </div>
                                <span className="font-semibold text-gray-900 text-sm">
                                    {book.publishedYear || 'Chưa cập nhật'}
                                </span>
                            </div>

                            {/* Page count */}
                            <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-3.5 flex flex-col gap-1 transition-colors hover:bg-gray-50">
                                <div className="flex items-center gap-1.5 text-xs text-gray-400 font-medium">
                                    <BookOpen className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                                    <span>Số trang</span>
                                </div>
                                <span className="font-semibold text-gray-900 text-sm">
                                    {book.pageCount ? `${book.pageCount} trang` : 'Chưa cập nhật'}
                                </span>
                            </div>

                            {/* Language */}
                            <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-3.5 flex flex-col gap-1 transition-colors hover:bg-gray-50">
                                <div className="flex items-center gap-1.5 text-xs text-gray-400 font-medium">
                                    <Globe className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                                    <span>Ngôn ngữ</span>
                                </div>
                                <span className="font-semibold text-gray-900 text-sm">
                                    {formatLanguage(book.language)}
                                </span>
                            </div>

                            {/* ISBN */}
                            <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-3.5 flex flex-col gap-1 transition-colors hover:bg-gray-50 sm:col-span-2">
                                <div className="flex items-center gap-1.5 text-xs text-gray-400 font-medium">
                                    <Hash className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                                    <span>Mã ISBN-13</span>
                                </div>
                                <span className="font-semibold text-gray-900 text-sm font-mono">
                                    {book.isbn13 || 'Chưa cập nhật'}
                                </span>
                            </div>
                        </div>

                        {/* Description */}
                        <div className="mb-10">
                            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-2">
                                <Layers className="w-3.5 h-3.5 text-gray-400" />
                                Giới thiệu nội dung
                            </h2>
                            <p className="text-gray-600 text-sm xl:text-base leading-relaxed whitespace-pre-line">
                                {book.description || 'Chưa có thông tin giới thiệu nội dung cho cuốn sách này.'}
                            </p>
                        </div>
                    </div>

                    {/* Action Bar (Sticky at the bottom of the right panel) */}
                    <div className="sticky bottom-0 -mx-8 -mb-10 xl:-mx-14 xl:-mb-12 px-8 xl:px-14 py-4 bg-white/95 backdrop-blur-md border-t border-gray-100 flex items-center justify-between gap-4 mt-8 z-20 shadow-[0_-8px_20px_rgba(0,0,0,0.02)]">
                        <div className="flex items-center gap-2 text-xs">
                            {book.availableCopies > 0 ? (
                                <span className="inline-flex items-center gap-1.5 text-emerald-700 font-medium">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                    Sẵn sàng mượn ngay
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1.5 text-gray-400 font-medium">
                                    <XCircle className="w-4 h-4 text-gray-400" />
                                    Tạm hết bản cứng
                                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-3">
                            {role === 'guest' ? (
                                <Button
                                    variant="outline"
                                    onClick={() => navigate('/login')}
                                    className="rounded-xl text-sm"
                                >
                                    Đăng nhập để mượn sách
                                </Button>
                            ) : (
                                <Button
                                    variant="brand"
                                    disabled={book.availableCopies <= 0}
                                    onClick={() => setConfirmBook(book)}
                                    className="rounded-xl text-sm shadow-sm"
                                >
                                    {book.availableCopies > 0 ? 'Mượn sách này' : 'Sách đã hết'}
                                </Button>
                            )}

                            <Button
                                variant="outline"
                                onClick={() => setShowPreview(true)}
                                onPointerEnter={preloadGoogleBooksApi}
                                onFocus={preloadGoogleBooksApi}
                                className="rounded-xl text-sm"
                            >
                                <Eye className="w-4 h-4 mr-1.5" aria-hidden="true" />
                                Xem trước
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Dialogs */}
            <BorrowConfirmDialog
                book={confirmBook}
                onCancel={() => setConfirmBook(null)}
                onConfirm={handleBorrow}
            />
            {showPreview && (
                <BookPreviewDialog
                    title={book.title}
                    ggId={book.ggId}
                    onClose={() => setShowPreview(false)}
                />
            )}
        </div>
    );
}
