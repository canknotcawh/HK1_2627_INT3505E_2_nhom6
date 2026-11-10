import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { fetchRandomBooksByCategory, getBook } from "../lib/books";
import type { BookDto } from "../lib/books";
import { borrowBook as borrowBookApi } from "../lib/loans";
import { useToast } from "../hooks/useToast";
import Toast from "../components/ui/Toast";
import BookCover from "../components/books/BookCover";
import BorrowConfirmDialog from "../components/loans/BorrowConfirmDialog";
import BookPreviewDialog, { preloadGoogleBooksApi, probePreviewAvailable } from "../components/books/BookPreviewDialog";
import { Button } from "../components/ui/button";
import {
    ArrowLeft,
    BookOpen,
    CalendarDays,
    ClipboardCheck,
    CalendarClock,
    Eye,
    FileText,
    Globe,
    Hash,
    Layers,
    LoaderCircle,
    RefreshCw,
    Star,
    Tag,
    User,
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

const BORROW_STEPS = [
    { icon: BookOpen, title: 'Mượn trực tuyến', text: 'Đăng nhập và bấm "Mượn ngay" khi sách còn bản. Bản mượn được giữ cho bạn ngay lập tức.' },
    { icon: CalendarClock, title: 'Đọc trong 14 ngày', text: 'Bạn có thể gia hạn 1 lần, thêm 14 ngày, nếu khoản mượn chưa quá hạn.' },
    { icon: ClipboardCheck, title: 'Gửi yêu cầu trả', text: 'Bấm trả sách trong lịch sử mượn. Thủ thư xác nhận khi đã nhận lại sách.' },
];

const DESCRIPTION_LIMIT = 320;
const RELATED_COUNT = 8;

function formatLanguage(code: string | null): string {
    if (!code) return 'Không xác định';
    return LANGUAGE_NAMES[code.toLowerCase()] || code;
}

export default function BookDetail() {
    const { id } = useParams<{ id: string }>();
    const { role } = useAuth();
    const navigate = useNavigate();

    const [book, setBook] = useState<BookDto | null>(null);
    const [related, setRelated] = useState<BookDto[]>([]);
    const [relatedCategory, setRelatedCategory] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [confirmBook, setConfirmBook] = useState<BookDto | null>(null);
    const [showPreview, setShowPreview] = useState(false);
    const [previewAvailable, setPreviewAvailable] = useState<boolean | null>(null);
    const [expanded, setExpanded] = useState(false);
    const [backdropFailed, setBackdropFailed] = useState(false);
    const { toast, showToast } = useToast();

    useEffect(() => {
        if (!id) return;
        let cancelled = false;
        setLoading(true);
        setNotFound(false);
        setExpanded(false);
        setBackdropFailed(false);
        setRelated([]);
        setRelatedCategory(null);
        window.scrollTo({ top: 0 });

        getBook(id)
            .then(result => { if (!cancelled) setBook(result); })
            .catch(error => {
                console.error("Không tải được thông tin sách:", error);
                if (!cancelled) setNotFound(true);
            })
            .finally(() => { if (!cancelled) setLoading(false); });

        return () => { cancelled = true; };
    }, [id]);

    const bookId = book?.id;
    useEffect(() => {
        if (!book || !book.categories || book.categories.length === 0) return;
        let cancelled = false;
        const currentId = book.id;
        const categories = book.categories;
        const category = categories[Math.floor(Math.random() * categories.length)];

        const loadRelated = async () => {
            try {
                const picked = await fetchRandomBooksByCategory(category, RELATED_COUNT, currentId);
                if (!cancelled) {
                    setRelated(picked);
                    setRelatedCategory(category);
                }
            } catch {
                // The related list is optional; the page works without it.
            }
        };
        void loadRelated();
        return () => { cancelled = true; };
        // Reshuffle only when the user opens a different book, not when the same book refreshes.
    }, [bookId]);

    useEffect(() => {
        if (!book) return;
        let cancelled = false;
        setPreviewAvailable(null);
        probePreviewAvailable(book.ggId, book.isbn13)
            .then(available => { if (!cancelled) setPreviewAvailable(available); })
            .catch(() => { if (!cancelled) setPreviewAvailable(true); });
        return () => { cancelled = true; };
    }, [bookId]);

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

    const facts = useMemo(() => {
        if (!book) return [];
        const rating = book.ratingCount
            ? `${Number(book.ratingAvg ?? 0).toFixed(1)} / 5 (${book.ratingCount} lượt)`
            : 'Chưa có đánh giá';
        const rows: Array<{ icon: typeof Hash; label: string; value: string | null }> = [
            { icon: User, label: 'Tác giả', value: book.authors?.length ? book.authors.join(', ') : null },
            { icon: Tag, label: 'Thể loại', value: book.categories?.length ? book.categories.join(', ') : null },
            { icon: CalendarDays, label: 'Năm xuất bản', value: book.publishedYear ? String(book.publishedYear) : null },
            { icon: FileText, label: 'Số trang', value: book.pageCount ? String(book.pageCount) : null },
            { icon: Globe, label: 'Ngôn ngữ', value: book.language ? formatLanguage(book.language) : null },
            { icon: Hash, label: 'ISBN-13', value: book.isbn13 },
            { icon: Layers, label: 'Số bản', value: `${book.availableCopies} còn / ${book.totalCopies} tổng` },
            { icon: Star, label: 'Đánh giá', value: rating },
        ];
        return rows.filter((row): row is { icon: typeof Hash; label: string; value: string } => Boolean(row.value));
    }, [book]);

    if (loading) {
        return (
            <div className="container mx-auto p-4 md:p-8 flex items-center justify-center gap-2 py-16 text-sm text-gray-500" role="status">
                <LoaderCircle className="h-5 w-5 animate-spin text-[#e60023]" /> Đang tải thông tin sách...
            </div>
        );
    }

    if (notFound || !book) {
        return (
            <div className="container mx-auto p-4 md:p-8 text-center py-16">
                <h2 className="text-xl font-bold text-gray-800 mb-2">Không tìm thấy sách</h2>
                <p className="text-gray-500 mb-6">Cuốn sách bạn đang tìm kiếm không tồn tại hoặc đã bị xóa.</p>
                <Button variant="brand" onClick={() => navigate('/explore')}>
                    Quay lại danh mục sách
                </Button>
            </div>
        );
    }

    const available = book.availableCopies > 0;
    const availablePercent = book.totalCopies > 0
        ? Math.round((book.availableCopies / book.totalCopies) * 100)
        : 0;
    const hasRating = Boolean(book.ratingCount);
    const ratingValue = Number(book.ratingAvg ?? 0);
    const description = book.description?.trim() ?? '';
    const isLongDescription = description.length > DESCRIPTION_LIMIT;
    const shownDescription = isLongDescription && !expanded
        ? `${description.slice(0, DESCRIPTION_LIMIT).trimEnd()}…`
        : description;

    return (
        <div>
            <Toast toast={toast} />
            {/* Hero: bìa sách làm nền mờ, trải hết chiều rộng trang */}
            <section className="relative isolate overflow-hidden bg-slate-950 text-white dark:bg-slate-800">
                    {book.coverImageUrl && !backdropFailed ? (
                        <img
                            src={book.coverImageUrl}
                            alt=""
                            aria-hidden="true"
                            onError={() => setBackdropFailed(true)}
                            className="pointer-events-none absolute inset-0 h-full w-full scale-125 object-cover opacity-70 blur-2xl saturate-150 dark:opacity-100"
                        />
                    ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-slate-800 via-slate-900 to-[#e60023]/40" aria-hidden="true" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/75 to-slate-950/40 dark:from-slate-950/80 dark:via-slate-900/60 dark:to-slate-950/35" aria-hidden="true" />
                    <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-[var(--background)] via-[var(--background)]/60 to-transparent" aria-hidden="true" />

                    <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-6 md:px-8 md:pb-24">
                    <button
                        onClick={() => navigate(-1)}
                        className="mb-6 flex cursor-pointer items-center gap-1 text-sm text-slate-300 transition-colors hover:text-white"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Quay lại
                    </button>
                    <div className="grid gap-8 md:grid-cols-12 md:gap-10">
                        {/* Cover */}
                        <div className="md:col-span-4">
                            <div className="mx-auto w-full max-w-[260px]">
                                <div className="aspect-[2/3] overflow-hidden rounded-2xl bg-slate-800 shadow-2xl shadow-black/60 ring-1 ring-white/20">
                                    <BookCover
                                        imageUrl={book.coverImageUrl}
                                        title={book.title}
                                        iconClassName="h-16 w-16 text-slate-500"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Info */}
                        <div className="flex flex-col justify-center md:col-span-8">
                            {book.categories && book.categories.length > 0 && (
                                <div className="mb-3 flex flex-wrap gap-2">
                                    {book.categories.map((category) => (
                                        <button
                                            key={category}
                                            type="button"
                                            onClick={() => navigate(`/search?category=${encodeURIComponent(category)}`)}
                                            className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-white backdrop-blur transition-colors hover:bg-white/20"
                                        >
                                            <Tag className="h-3 w-3" aria-hidden="true" />
                                            {category}
                                        </button>
                                    ))}
                                </div>
                            )}

                            <h1 className="text-3xl font-extrabold leading-tight tracking-tight md:text-4xl lg:text-5xl">
                                {book.title}
                            </h1>
                            {book.subtitle && (
                                <p className="mt-2 text-lg text-amber-200/90">{book.subtitle}</p>
                            )}
                            <p className="mt-3 text-base text-slate-300">
                                {book.authors && book.authors.length > 0 ? (
                                    <>
                                        <span className="text-slate-400">Tác giả </span>
                                        {book.authors.map((author, index) => (
                                            <span key={author}>
                                                {index > 0 && ', '}
                                                <button
                                                    type="button"
                                                    onClick={() => navigate(`/search?q=${encodeURIComponent(author)}`)}
                                                    className="cursor-pointer font-semibold text-white hover:text-amber-200 hover:underline"
                                                >
                                                    {author}
                                                </button>
                                            </span>
                                        ))}
                                    </>
                                ) : 'Chưa rõ tác giả'}
                            </p>

                            {/* Meta chips */}
                            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-semibold">
                                {book.publishedYear && (
                                    <span className="rounded-md border border-white/25 px-2.5 py-1">{book.publishedYear}</span>
                                )}
                                {book.language && (
                                    <span className="rounded-md border border-white/25 px-2.5 py-1">{formatLanguage(book.language)}</span>
                                )}
                                {book.pageCount && (
                                    <span className="rounded-md border border-white/25 px-2.5 py-1">{book.pageCount} trang</span>
                                )}
                                <span className="inline-flex items-center gap-1.5 rounded-md border border-white/25 px-2.5 py-1">
                                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden="true" />
                                    {hasRating ? `${ratingValue.toFixed(1)} · ${book.ratingCount} lượt` : 'Chưa có đánh giá'}
                                </span>
                            </div>

                            {/* Availability + actions */}
                            <div className="mt-6 flex flex-wrap items-center gap-4">
                                {role === 'guest' ? (
                                    <Button
                                        onClick={() => navigate('/login')}
                                        className="h-12 rounded-full bg-gradient-to-r from-amber-200 to-amber-300 px-7 text-base font-bold text-slate-900 shadow-lg shadow-amber-500/20 hover:from-amber-300 hover:to-amber-400"
                                    >
                                        <BookOpen aria-hidden="true" />
                                        Đăng nhập để mượn
                                    </Button>
                                ) : (
                                    <Button
                                        disabled={!available}
                                        onClick={() => setConfirmBook(book)}
                                        className="h-12 rounded-full bg-gradient-to-r from-amber-200 to-amber-300 px-7 text-base font-bold text-slate-900 shadow-lg shadow-amber-500/20 hover:from-amber-300 hover:to-amber-400 disabled:from-slate-600 disabled:to-slate-600 disabled:text-slate-300 disabled:shadow-none"
                                    >
                                        <BookOpen aria-hidden="true" />
                                        {available ? 'Mượn ngay' : 'Sách đã hết'}
                                    </Button>
                                )}
                                <Button
                                    variant="outline"
                                    disabled={previewAvailable === false}
                                    onClick={() => setShowPreview(true)}
                                    onPointerEnter={preloadGoogleBooksApi}
                                    onFocus={preloadGoogleBooksApi}
                                    title={previewAvailable === false ? 'Google Books chưa cho đọc thử cuốn này' : undefined}
                                    className="h-12 rounded-full border-white/30 bg-white/10 px-6 text-white backdrop-blur hover:bg-white/20 hover:text-white disabled:opacity-60"
                                >
                                    {previewAvailable === null
                                        ? <LoaderCircle className="animate-spin" aria-hidden="true" />
                                        : <Eye aria-hidden="true" />}
                                    {previewAvailable === false ? 'Chưa có bản đọc thử' : 'Đọc thử'}
                                </Button>
                                <div className="text-sm">
                                    <div className="flex items-center gap-2 font-semibold">
                                        <span className={`h-2.5 w-2.5 rounded-full ${available ? 'bg-emerald-400' : 'bg-slate-400'}`} />
                                        {available ? 'Có sẵn để mượn' : 'Hiện đã hết sách'}
                                    </div>
                                    <p className="mt-0.5 text-xs text-slate-300">
                                        Còn <span className="font-semibold text-white">{book.availableCopies}</span> / {book.totalCopies} bản
                                    </p>
                                </div>
                            </div>
                            {book.totalCopies > 0 && (
                                <div
                                    className="mt-4 h-1.5 max-w-md overflow-hidden rounded-full bg-white/15"
                                    role="progressbar"
                                    aria-valuemin={0}
                                    aria-valuemax={book.totalCopies}
                                    aria-valuenow={book.availableCopies}
                                    aria-label="Số bản còn lại"
                                >
                                    <div
                                        className={`h-full rounded-full ${available ? 'bg-emerald-400' : 'bg-slate-500'}`}
                                        style={{ width: `${availablePercent}%` }}
                                    />
                                </div>
                            )}
                            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-300">
                                <span className="inline-flex items-center gap-1.5">
                                    <CalendarClock className="h-4 w-4 text-slate-400" aria-hidden="true" />
                                    Mượn trong 14 ngày
                                </span>
                                <span className="inline-flex items-center gap-1.5">
                                    <RefreshCw className="h-4 w-4 text-slate-400" aria-hidden="true" />
                                    Gia hạn 1 lần, thêm 14 ngày
                                </span>
                            </div>
                        </div>
                    </div>
                    </div>
                </section>

                <div className="mx-auto max-w-6xl px-4 pb-16 pt-10 md:px-8">
                {/* Description + borrowing steps | details */}
                <div className="grid items-start gap-8 lg:grid-cols-12">
                    <div className="space-y-8 lg:col-span-7">
                        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xs">
                            <h2 className="text-lg font-bold text-gray-900">Giới thiệu sách</h2>
                            {description ? (
                                <>
                                    <p className="mt-3 whitespace-pre-line text-[15px] leading-7 text-gray-600">
                                        {shownDescription}
                                    </p>
                                    {isLongDescription && (
                                        <button
                                            type="button"
                                            onClick={() => setExpanded(value => !value)}
                                            className="mt-2 cursor-pointer text-sm font-semibold text-[#e60023] hover:underline"
                                        >
                                            {expanded ? 'Thu gọn' : 'Xem thêm'}
                                        </button>
                                    )}
                                </>
                            ) : (
                                <p className="mt-3 text-sm text-gray-400">Sách này chưa có phần giới thiệu.</p>
                            )}
                        </section>

                        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xs">
                            <h2 className="text-lg font-bold text-gray-900">Cách mượn sách</h2>
                            <ol className="mt-4 grid gap-4 sm:grid-cols-3">
                                {BORROW_STEPS.map(({ icon: Icon, title, text }, index) => (
                                    <li key={title} className="relative rounded-xl bg-gray-50 p-4">
                                        <span className="absolute right-3 top-3 text-xs font-bold text-gray-300">0{index + 1}</span>
                                        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#e60023]/10 text-[#e60023]">
                                            <Icon className="h-5 w-5" aria-hidden="true" />
                                        </span>
                                        <p className="mt-3 text-sm font-semibold text-gray-900">{title}</p>
                                        <p className="mt-1 text-xs leading-5 text-gray-500">{text}</p>
                                    </li>
                                ))}
                            </ol>
                        </section>
                    </div>

                    <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xs lg:sticky lg:top-24 lg:col-span-5">
                        <h2 className="text-lg font-bold text-gray-900">Thông tin chi tiết</h2>
                        <dl className="mt-3 divide-y divide-gray-100">
                            {facts.map(({ icon: Icon, label, value }) => (
                                <div key={label} className="flex items-start justify-between gap-4 py-3">
                                    <dt className="flex shrink-0 items-center gap-2 text-sm text-gray-500">
                                        <Icon className="h-4 w-4 text-gray-400" aria-hidden="true" />
                                        {label}
                                    </dt>
                                    <dd className="break-words text-right text-sm font-semibold text-gray-900">{value}</dd>
                                </div>
                            ))}
                        </dl>
                    </section>
                </div>

                {/* Related books */}
                {related.length > 0 && relatedCategory && (
                    <section className="mt-14">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-gray-900">
                                Sách cùng thể loại
                                <span className="ml-2 text-sm font-medium text-gray-400">{relatedCategory}</span>
                            </h2>
                            <button
                                type="button"
                                onClick={() => navigate(`/search?category=${encodeURIComponent(relatedCategory)}`)}
                                className="cursor-pointer text-sm font-semibold text-[#e60023] hover:underline"
                            >
                                Xem tất cả
                            </button>
                        </div>
                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                            {related.map((item) => (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => navigate(`/books/${item.id}`)}
                                    className="group cursor-pointer overflow-hidden rounded-2xl border border-gray-100 bg-white text-left shadow-xs transition-all hover:-translate-y-0.5 hover:shadow-md"
                                >
                                    <div className="aspect-[3/4] overflow-hidden bg-gray-100">
                                        <BookCover
                                            imageUrl={item.coverImageUrl}
                                            title={item.title}
                                            imageClassName="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                            iconClassName="h-10 w-10 text-gray-300"
                                        />
                                    </div>
                                    <div className="p-3">
                                        <p className="line-clamp-2 text-sm font-semibold text-gray-900">{item.title}</p>
                                        <p className="mt-0.5 line-clamp-1 text-xs text-gray-500">
                                            {item.authors?.join(', ') || 'Chưa rõ tác giả'}
                                        </p>
                                        <p className={`mt-2 text-xs font-medium ${item.availableCopies > 0 ? 'text-emerald-600' : 'text-gray-400'}`}>
                                            {item.availableCopies > 0 ? `Còn ${item.availableCopies} cuốn` : 'Hết sách'}
                                        </p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </section>
                )}
            </div>

            <BorrowConfirmDialog
                book={confirmBook}
                onCancel={() => setConfirmBook(null)}
                onConfirm={handleBorrow}
            />
            {showPreview && (
                <BookPreviewDialog
                    title={book.title}
                    ggId={book.ggId}
                    isbn13={book.isbn13}
                    onClose={() => setShowPreview(false)}
                />
            )}
        </div>
    );
}
