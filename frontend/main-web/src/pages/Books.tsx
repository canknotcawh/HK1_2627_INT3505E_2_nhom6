import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import { fetchBooks, fetchCategories, type BookResponse } from "../lib/books-api";
import { Button } from "../components/ui/button";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Library, Search, X, CheckCircle, AlertCircle, BookOpen, Loader2, Star } from "lucide-react";

import SortDropdown from "@/components/layouts/SortDropdown";
import SearchSuggestionsDropdown from "@/components/layouts/SearchSuggestionsDropdown";

type FilterStatus = 'all' | 'available' | 'unavailable';
type ToastType = { message: string; type: 'success' | 'error' } | null;

export default function Books() {
    const { role, borrowBook } = useAuth();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    // User input states
    const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
    const [appliedQuery, setAppliedQuery] = useState(searchParams.get('q') || '');
    const appliedQueryRef = useRef(appliedQuery);
    const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
    const [categoryFilter, setCategoryFilter] = useState(searchParams.get('category') || '');
    const [sortBy, setSortBy] = useState<string>(searchParams.get('sort') || '');

    // Search suggestions states
    const [suggestions, setSuggestions] = useState<BookResponse[]>([]);
    const [suggestionsLoading, setSuggestionsLoading] = useState(false);
    const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
    const searchContainerRef = useRef<HTMLDivElement>(null);
    const suggestionReqIdRef = useRef(0);

    // Backend results states
    const [books, setBooks] = useState<BookResponse[]>([]);
    const [categories, setCategories] = useState<string[]>([]);
    const [totalElements, setTotalElements] = useState<number>(0);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // Dialog & toast states
    const [confirmBook, setConfirmBook] = useState<BookResponse | null>(null);
    const [toast, setToast] = useState<ToastType>(null);
    const [borrowing, setBorrowing] = useState(false);

    // Track active request to prevent race conditions
    const requestIdRef = useRef(0);
    const isFirstRender = useRef(true);

    // Keep appliedQueryRef in sync
    useEffect(() => {
        appliedQueryRef.current = appliedQuery;
    }, [appliedQuery]);

    // Close suggestions dropdown on outside click or Escape key
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
                setIsSuggestionsOpen(false);
            }
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsSuggestionsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    // Fetch categories from backend on mount
    useEffect(() => {
        let mounted = true;
        fetchCategories()
            .then(cats => {
                if (mounted) setCategories(cats);
            })
            .catch(err => {
                console.error("Failed to fetch categories:", err);
            });
        return () => {
            mounted = false;
        };
    }, []);

    // Live search suggestions as user types
    useEffect(() => {
        const query = searchQuery.trim();
        const reqId = ++suggestionReqIdRef.current;

        const timer = setTimeout(async () => {
            if (!query) {
                setSuggestions([]);
                setSuggestionsLoading(false);
                return;
            }

            setSuggestionsLoading(true);
            try {
                const res = await fetchBooks({
                    q: query,
                    size: 8,
                });
                if (reqId === suggestionReqIdRef.current) {
                    setSuggestions(res.content);
                }
            } catch (err) {
                if (reqId === suggestionReqIdRef.current) {
                    console.error("Failed to fetch suggestions:", err);
                    setSuggestions([]);
                }
            } finally {
                if (reqId === suggestionReqIdRef.current) {
                    setSuggestionsLoading(false);
                }
            }
        }, query ? 250 : 0);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Query backend API
    const executeSearch = useCallback(async (q: string, category: string, availability: FilterStatus, sort: string) => {
        const curId = ++requestIdRef.current;
        setLoading(true);
        setError(null);

        try {
            const pageData = await fetchBooks({
                q: q.trim() || undefined,
                category: category || undefined,
                availability: availability !== 'all' ? availability : undefined,
                sort: sort || undefined,
                size: 60,
            });

            if (curId === requestIdRef.current) {
                setBooks(pageData.content);
                setTotalElements(pageData.totalElements);
            }
        } catch (err) {
            if (curId === requestIdRef.current) {
                console.error("Failed to search books:", err);
                setError("Không thể tải danh sách sách từ máy chủ. Vui lòng thử lại.");
            }
        } finally {
            if (curId === requestIdRef.current) {
                setLoading(false);
            }
        }
    }, []);

    // Sync input & applied states if URL params change externally
    useEffect(() => {
        const qParam = searchParams.get('q') || '';
        const catParam = searchParams.get('category') || '';
        const sortParam = searchParams.get('sort') || '';

        const timer = setTimeout(() => {
            const qChanged = appliedQueryRef.current !== qParam;
            if (qChanged) {
                appliedQueryRef.current = qParam;
                setAppliedQuery(qParam);
                setSearchQuery(qParam);
            }
            setCategoryFilter(prev => (prev !== catParam ? catParam : prev));
            setSortBy(prev => (prev !== sortParam ? sortParam : prev));

            if (qChanged && !isFirstRender.current) {
                executeSearch(qParam, catParam, filterStatus, sortParam);
            }
        }, 0);

        return () => clearTimeout(timer);
    }, [searchParams, filterStatus, executeSearch]);

    // Debounce for filter and sort changes
    useEffect(() => {
        const delay = isFirstRender.current ? 0 : 360;
        isFirstRender.current = false;

        const timer = setTimeout(() => {
            const currentQ = appliedQueryRef.current;
            executeSearch(currentQ, categoryFilter, filterStatus, sortBy);

            const newParams = new URLSearchParams();
            if (currentQ.trim()) newParams.set('q', currentQ.trim());
            if (categoryFilter) newParams.set('category', categoryFilter);
            if (sortBy) newParams.set('sort', sortBy);
            setSearchParams(newParams, { replace: true });
        }, delay);

        return () => clearTimeout(timer);
    }, [categoryFilter, filterStatus, sortBy, executeSearch, setSearchParams]);

    // Form submit when user presses Enter
    const handleSearchSubmit = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setIsSuggestionsOpen(false);
        const trimmed = searchQuery.trim();
        appliedQueryRef.current = trimmed;
        setAppliedQuery(trimmed);

        const newParams = new URLSearchParams();
        if (trimmed) newParams.set('q', trimmed);
        if (categoryFilter) newParams.set('category', categoryFilter);
        if (sortBy) newParams.set('sort', sortBy);
        setSearchParams(newParams, { replace: true });

        executeSearch(trimmed, categoryFilter, filterStatus, sortBy);
    };

    const handleClearSearch = () => {
        setSearchQuery('');
        appliedQueryRef.current = '';
        setAppliedQuery('');
        setIsSuggestionsOpen(false);
        setSuggestions([]);

        const newParams = new URLSearchParams();
        if (categoryFilter) newParams.set('category', categoryFilter);
        if (sortBy) newParams.set('sort', sortBy);
        setSearchParams(newParams, { replace: true });

        executeSearch('', categoryFilter, filterStatus, sortBy);
    };

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
        if (result.success === true) {
            showToast(`Mượn "${confirmBook.title}" thành công!`, 'success');
            executeSearch(appliedQuery, categoryFilter, filterStatus, sortBy);
        } else {
            showToast(result.message, 'error');
        }
    };

    return (
        <div className="container mx-auto p-4 md:p-8">
            {/* Toast notification */}
            {toast && (
                <div
                    role="status"
                    aria-live="polite"
                    className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-5 py-3 rounded-xl shadow-lg text-sm font-medium transition-all animate-in fade-in slide-in-from-top-2 ${toast.type === 'success'
                        ? 'bg-green-50 text-green-800 border border-green-200'
                        : 'bg-red-50 text-red-800 border border-red-200'
                        }`}
                >
                    {toast.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                    {toast.message}
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <h1 className="text-3xl font-bold flex items-center gap-2">
                    <Library className="w-8 h-8 text-[#e60023]" />
                    Danh mục sách
                </h1>
                <div className="flex items-center gap-3">
                    {loading && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-400">
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#e60023]" />
                            <span>Đang tìm kiếm...</span>
                        </div>
                    )}
                    <p className="text-gray-500 text-sm">{totalElements} cuốn</p>
                </div>
            </div>

            {/* Search, Filter & Sort Bar */}
            <div className="flex flex-col lg:flex-row gap-3 mb-6">
                <div className="relative flex-1" ref={searchContainerRef}>
                    <form onSubmit={handleSearchSubmit} className="relative w-full">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-4 w-4 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => {
                                setSearchQuery(e.target.value);
                                setIsSuggestionsOpen(true);
                            }}
                            onFocus={() => {
                                if (searchQuery.trim()) {
                                    setIsSuggestionsOpen(true);
                                }
                            }}
                            className="block w-full pl-10 pr-10 py-2.5 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#e60023]/20 focus:border-[#e60023] transition-all text-sm"
                            placeholder="Tìm kiếm theo tên sách hoặc tác giả..."
                            aria-label="Tìm kiếm sách"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={handleClearSearch}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                                aria-label="Xóa tìm kiếm"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </form>

                    {/* Suggestions dropdown */}
                    <SearchSuggestionsDropdown
                        isOpen={isSuggestionsOpen}
                        loading={suggestionsLoading}
                        suggestions={suggestions}
                        query={searchQuery}
                        onSelectBook={(bookId) => {
                            setIsSuggestionsOpen(false);
                            navigate(`/books/${bookId}`);
                        }}
                    />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex gap-1.5">
                        {([
                            ['all', 'Tất cả'],
                            ['available', 'Còn sách'],
                            ['unavailable', 'Hết sách'],
                        ] as const).map(([value, label]) => (
                            <button
                                key={value}
                                onClick={() => setFilterStatus(value)}
                                className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-colors ${filterStatus === value
                                    ? 'bg-[#e60023] text-white shadow-sm'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>

                    <div className="group relative flex items-center bg-gray-100 hover:bg-gray-200/80 rounded-xl transition-colors duration-200 cursor-pointer">
                        <SortDropdown
                            sortBy={sortBy}
                            setSortBy={setSortBy}
                            searchQuery={appliedQuery}
                        />
                    </div>
                </div>
            </div>

            {/* Category filter */}
            {categories.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                    <button
                        onClick={() => setCategoryFilter('')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${categoryFilter === '' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                    >
                        Tất cả thể loại
                    </button>
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setCategoryFilter(cat)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${categoryFilter === cat ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            )}

            {/* Error state */}
            {error ? (
                <div className="text-center py-16">
                    <AlertCircle className="w-16 h-16 text-red-200 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-600 mb-2">Lỗi tải dữ liệu</h3>
                    <p className="text-gray-400 text-sm mb-4">{error}</p>
                    <Button variant="outline" onClick={() => executeSearch(appliedQuery, categoryFilter, filterStatus, sortBy)}>
                        Thử lại
                    </Button>
                </div>
            ) : loading && books.length === 0 ? (
                <div className="flex items-center justify-center py-32">
                    <Loader2 className="w-8 h-8 animate-spin text-[#e60023]" />
                    <span className="ml-3 text-gray-500">Đang tìm kiếm sách...</span>
                </div>
            ) : books.length === 0 ? (
                <div className="text-center py-16">
                    <BookOpen className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-600 mb-2">Không tìm thấy sách</h3>
                    <p className="text-gray-400 text-sm mb-4">
                        {appliedQuery
                            ? `Không có kết quả cho "${appliedQuery}"`
                            : 'Không có sách nào phù hợp với bộ lọc.'}
                    </p>
                    <Button
                        variant="outline"
                        onClick={() => {
                            setSearchQuery('');
                            appliedQueryRef.current = '';
                            setAppliedQuery('');
                            setIsSuggestionsOpen(false);
                            setSuggestions([]);
                            setFilterStatus('all');
                            setCategoryFilter('');
                            setSortBy('');
                            setSearchParams(new URLSearchParams(), { replace: true });
                            executeSearch('', '', 'all', '');
                        }}
                    >
                        Xóa bộ lọc
                    </Button>
                </div>
            ) : (
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
                                        <p className="text-gray-500 text-sm mt-1">
                                            {book.authors?.length > 0 ? book.authors.join(', ') : 'Không rõ tác giả'}
                                        </p>
                                    </div>
                                    <span
                                        className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium ${book.availableCopies > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                                            }`}
                                    >
                                        {book.availableCopies > 0 ? `Còn ${book.availableCopies}` : 'Hết sách'}
                                    </span>
                                </div>

                                {/* Cover placeholder */}
                                <div
                                    className="w-full h-36 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg mb-4 flex items-center justify-center border border-gray-100 cursor-pointer hover:from-gray-100 hover:to-gray-150 transition-colors"
                                    onClick={() => navigate(`/books/${book.id}`)}
                                >
                                    {book.coverImageUrl ? (
                                        <img src={book.coverImageUrl} alt={book.title} className="w-full h-full object-cover rounded-lg" />
                                    ) : (
                                        <Library className="w-10 h-10 text-gray-300" />
                                    )}
                                </div>

                                {/* Meta info */}
                                <div className="flex flex-wrap gap-2 mb-4">
                                    {book.categories?.length > 0 && book.categories.map(cat => (
                                        <span key={cat} className="text-xs bg-gray-50 text-gray-500 px-2 py-1 rounded-md">
                                            {cat}
                                        </span>
                                    ))}
                                    {book.publishedYear && (
                                        <span className="text-xs bg-gray-50 text-gray-600 px-2 py-1 rounded-md font-medium">
                                            {book.publishedYear}
                                        </span>
                                    )}
                                    {((book.ratingAvg != null && Number(book.ratingAvg) > 0) || (book.ratingCount != null && book.ratingCount > 0)) && (
                                        <span
                                            className="text-xs bg-amber-50 text-amber-700 px-2.5 py-1 rounded-md flex items-center gap-1.5 font-medium border border-amber-200/60"
                                            title={`${book.ratingCount || 0} lượt đánh giá`}
                                        >
                                            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
                                            <span>{Number(book.ratingAvg || 0).toFixed(1)}</span>
                                            <span className="text-amber-600/70 text-[11px]">({book.ratingCount || 0})</span>
                                        </span>
                                    )}
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
            )}

            {/* Borrow Confirmation */}
            {confirmBook && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
                    onClick={() => setConfirmBook(null)}
                >
                    <div
                        className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95"
                        onClick={e => e.stopPropagation()}
                    >
                        <h2 className="text-xl font-bold text-gray-800 mb-2">Xác nhận mượn sách</h2>
                        <p className="text-gray-500 mb-6">
                            Bạn muốn mượn cuốn <strong className="text-gray-800">"{confirmBook.title}"</strong> của {confirmBook.authors?.length > 0 ? confirmBook.authors.join(', ') : 'tác giả'}?
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
