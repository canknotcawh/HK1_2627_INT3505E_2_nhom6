import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import { searchBooks, fetchCategories, type BookDto } from "../lib/books";
import { borrowBook as borrowBookApi } from "../lib/loans";
import { Button } from "../components/ui/button";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Library, Search, X, BookOpen, Star, LoaderCircle, ChevronLeft, ChevronRight } from "lucide-react";
import SortDropdown from "../components/layouts/SortDropdown";
import CategoryDropdown from "../components/layouts/CategoryDropdown";
import SearchSuggestionsDropdown from "../components/layouts/SearchSuggestionsDropdown";
import {
    getRecentSearches,
    saveRecentSearch,
    removeRecentSearch,
    clearRecentSearches,
} from "../lib/search-history";
import { useToast } from "../hooks/useToast";
import Toast from "../components/Toast";

type FilterStatus = 'all' | 'available' | 'unavailable';

const PAGE_SIZE = 18;

export default function Books() {
    const { role, user } = useAuth();
    const userId = user?.id;
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const { toast, showToast } = useToast();

    // Query & Filter states
    const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
    const [appliedQuery, setAppliedQuery] = useState(searchParams.get('q') || '');
    const appliedQueryRef = useRef(appliedQuery);
    const [filterStatus, setFilterStatus] = useState<FilterStatus>(
        (searchParams.get('availability') as FilterStatus) || 'all'
    );
    const [categoryFilter, setCategoryFilter] = useState(searchParams.get('category') || '');
    const [sortBy, setSortBy] = useState<string>(searchParams.get('sort') || '');

    // Pagination states
    const initialPage = Math.max(0, parseInt(searchParams.get('page') || '1', 10) - 1);
    const [page, setPage] = useState<number>(isNaN(initialPage) ? 0 : initialPage);
    const [totalPages, setTotalPages] = useState<number>(0);

    // Suggestions & history states
    const [suggestions, setSuggestions] = useState<BookDto[]>([]);
    const [suggestionsLoading, setSuggestionsLoading] = useState(false);
    const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
    const [recentSearches, setRecentSearches] = useState<string[]>(() => getRecentSearches(userId));
    const searchContainerRef = useRef<HTMLDivElement>(null);
    const suggestionReqIdRef = useRef(0);

    // Results states
    const [books, setBooks] = useState<BookDto[]>([]);
    const [categories, setCategories] = useState<string[]>([]);
    const [totalElements, setTotalElements] = useState<number>(0);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>("");

    // Dialog & borrow states
    const [confirmBook, setConfirmBook] = useState<BookDto | null>(null);
    const [borrowing, setBorrowing] = useState(false);

    const requestIdRef = useRef(0);

    // Synchronize appliedQueryRef
    useEffect(() => {
        appliedQueryRef.current = appliedQuery;
    }, [appliedQuery]);

    // Refresh recent searches when user changes
    useEffect(() => {
        const timer = setTimeout(() => {
            setRecentSearches(getRecentSearches(userId));
        }, 0);
        return () => clearTimeout(timer);
    }, [userId, role]);

    // Close suggestions on outside click or Escape
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

    // Load available categories once
    useEffect(() => {
        let mounted = true;
        fetchCategories()
            .then(cats => {
                if (mounted) setCategories(cats);
            })
            .catch(err => {
                console.error("Không tải được danh mục:", err);
            });
        return () => {
            mounted = false;
        };
    }, []);

    // Debounce live suggestions
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
                const res = await searchBooks({ q: query, size: 8 });
                if (reqId === suggestionReqIdRef.current) {
                    setSuggestions(res.content);
                }
            } catch (err) {
                if (reqId === suggestionReqIdRef.current) {
                    console.error("Không tải được gợi ý:", err);
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

    // Backend search execution
    const executeSearch = useCallback(async (
        q: string,
        category: string,
        availability: FilterStatus,
        sort: string,
        pageIndex: number
    ) => {
        const curId = ++requestIdRef.current;
        setLoading(true);
        setError("");

        try {
            const pageData = await searchBooks({
                q: q.trim() || undefined,
                category: category || undefined,
                availability: availability !== 'all' ? availability : undefined,
                sort: sort || undefined,
                page: pageIndex,
                size: PAGE_SIZE,
            });

            if (curId === requestIdRef.current) {
                setBooks(pageData.content);
                setTotalElements(pageData.totalElements);
                setTotalPages(pageData.totalPages);
            }
        } catch (err) {
            if (curId === requestIdRef.current) {
                console.error("Lỗi tìm kiếm sách:", err);
                setError("Không thể tải danh sách sách. Vui lòng thử lại sau.");
                setBooks([]);
                setTotalElements(0);
                setTotalPages(0);
            }
        } finally {
            if (curId === requestIdRef.current) {
                setLoading(false);
            }
        }
    }, []);

    // Trigger search when applied filters/sort/page change
    useEffect(() => {
        executeSearch(appliedQuery, categoryFilter, filterStatus, sortBy, page);
    }, [appliedQuery, categoryFilter, filterStatus, sortBy, page, executeSearch]);

    // Update URL params when filters change
    const updateUrlParams = (newParams: Record<string, string>) => {
        const params = new URLSearchParams(searchParams);
        Object.entries(newParams).forEach(([key, val]) => {
            if (val) {
                params.set(key, val);
            } else {
                params.delete(key);
            }
        });
        setSearchParams(params, { replace: true });
    };

    // Keep state in sync if URL q param changes externally (e.g. from NavBar)
    useEffect(() => {
        const urlQ = searchParams.get('q') || '';
        if (urlQ !== appliedQueryRef.current) {
            setSearchQuery(urlQ);
            setAppliedQuery(urlQ);
            setPage(0);
        }
    }, [searchParams]);

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSuggestionsOpen(false);
        const trimmed = searchQuery.trim();
        setAppliedQuery(trimmed);
        setPage(0);
        updateUrlParams({ q: trimmed, page: '' });
        if (trimmed) {
            const updated = saveRecentSearch(trimmed, userId);
            setRecentSearches(updated);
        }
    };

    const handleSelectSuggestion = (bookId: string) => {
        setIsSuggestionsOpen(false);
        navigate(`/books/${bookId}`);
    };

    const handleSelectRecentSearch = (term: string) => {
        setSearchQuery(term);
        setAppliedQuery(term);
        setPage(0);
        setIsSuggestionsOpen(false);
        updateUrlParams({ q: term, page: '' });
        const updated = saveRecentSearch(term, userId);
        setRecentSearches(updated);
    };

    const handleRemoveRecentSearch = (term: string) => {
        const updated = removeRecentSearch(term, userId);
        setRecentSearches(updated);
    };

    const handleClearRecentSearches = () => {
        clearRecentSearches(userId);
        setRecentSearches([]);
    };

    const handleClearSearch = () => {
        setSearchQuery('');
        setAppliedQuery('');
        setPage(0);
        setIsSuggestionsOpen(false);
        setSuggestions([]);
        updateUrlParams({ q: '', page: '' });
    };

    const handlePageChange = (newPage: number) => {
        setPage(newPage);
        updateUrlParams({ page: newPage > 0 ? String(newPage + 1) : '' });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleBorrow = async () => {
        if (!confirmBook) return;
        const book = confirmBook;
        setBorrowing(true);
        try {
            await borrowBookApi(book.id);
            showToast(`Mượn cuốn "${book.title}" thành công!`, 'success');
            setConfirmBook(null);
            executeSearch(appliedQuery, categoryFilter, filterStatus, sortBy, page);
        } catch (err) {
            console.error("Lỗi mượn sách:", err);
            showToast("Không thể mượn sách. Vui lòng thử lại sau.", 'error');
        } finally {
            setBorrowing(false);
        }
    };

    return (
        <div className="container mx-auto p-4 md:p-8">
            <Toast toast={toast} />

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2 text-gray-900">
                        <Library className="w-8 h-8 text-[#e60023]" />
                        Danh mục sách
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">Khám phá và mượn sách trực tuyến</p>
                </div>
                <span className="text-sm font-medium bg-gray-100 text-gray-700 px-3 py-1.5 rounded-full">
                    {totalElements} cuốn sách
                </span>
            </div>

            {/* Unified Search, Filter and Sort Toolbar */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 mb-8">
                {/* Search Bar with live suggestions (stretches to fill available space) */}
                <div ref={searchContainerRef} className="relative flex-1 min-w-[280px]">
                    <form onSubmit={handleFormSubmit}>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                <Search className="h-4 w-4 text-gray-400 group-focus-within:text-[#e60023] transition-colors" />
                            </div>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    setIsSuggestionsOpen(true);
                                }}
                                onFocus={() => {
                                    setRecentSearches(getRecentSearches(userId));
                                    setIsSuggestionsOpen(true);
                                }}
                                className="block w-full h-10 pl-10 pr-10 border border-gray-200 rounded-xl bg-white shadow-xs focus:outline-none focus:ring-2 focus:ring-[#e60023]/20 focus:border-[#e60023] transition-all text-sm"
                                placeholder="Tìm theo tên sách hoặc tác giả..."
                                aria-label="Tìm kiếm sách"
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={handleClearSearch}
                                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                                    aria-label="Xóa từ khóa tìm kiếm"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                    </form>

                    <SearchSuggestionsDropdown
                        isOpen={isSuggestionsOpen}
                        loading={suggestionsLoading}
                        suggestions={suggestions}
                        query={searchQuery}
                        onSelectBook={handleSelectSuggestion}
                        recentSearches={recentSearches}
                        onSelectRecentSearch={handleSelectRecentSearch}
                        onRemoveRecentSearch={handleRemoveRecentSearch}
                        onClearRecentSearches={handleClearRecentSearches}
                    />
                </div>

                {/* Right side group: Availability Tabs + Category Dropdown + Sort Dropdown */}
                <div className="flex items-center gap-2.5 shrink-0 flex-wrap sm:flex-nowrap">
                    {/* Availability Filter Tabs */}
                    <div className="flex bg-gray-100/80 p-1 rounded-xl gap-1 shrink-0 h-10 items-center">
                        <button
                            type="button"
                            onClick={() => {
                                setFilterStatus('all');
                                setPage(0);
                                updateUrlParams({ availability: '', page: '' });
                            }}
                            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                                filterStatus === 'all'
                                    ? 'bg-white text-gray-900 shadow-xs'
                                    : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            Tất cả
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setFilterStatus('available');
                                setPage(0);
                                updateUrlParams({ availability: 'available', page: '' });
                            }}
                            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                                filterStatus === 'available'
                                    ? 'bg-white text-gray-900 shadow-xs'
                                    : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            Có sẵn
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setFilterStatus('unavailable');
                                setPage(0);
                                updateUrlParams({ availability: 'unavailable', page: '' });
                            }}
                            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                                filterStatus === 'unavailable'
                                    ? 'bg-white text-gray-900 shadow-xs'
                                    : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            Đã hết
                        </button>
                    </div>

                    {/* Category Dropdown */}
                    {categories.length > 0 && (
                        <CategoryDropdown
                            category={categoryFilter}
                            setCategory={(newCat) => {
                                setCategoryFilter(newCat);
                                setPage(0);
                                updateUrlParams({ category: newCat, page: '' });
                            }}
                            categories={categories}
                        />
                    )}

                    {/* Sort Dropdown */}
                    <SortDropdown
                        sortBy={sortBy}
                        setSortBy={(newSort) => {
                            setSortBy(newSort);
                            setPage(0);
                            updateUrlParams({ sort: newSort, page: '' });
                        }}
                        searchQuery={appliedQuery}
                    />
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm mb-6">
                    {error}
                </div>
            )}

            {/* Books Grid */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-3">
                    <LoaderCircle className="w-8 h-8 animate-spin text-[#e60023]" />
                    <p className="text-sm">Đang tải danh sách sách...</p>
                </div>
            ) : books.length === 0 ? (
                <div className="text-center py-16 bg-gray-50 rounded-2xl border border-gray-100 p-8">
                    <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <h3 className="text-base font-semibold text-gray-700">Không tìm thấy sách nào</h3>
                    <p className="text-sm text-gray-400 mt-1 max-w-md mx-auto">
                        Thử điều chỉnh từ khóa tìm kiếm, thể loại hoặc xóa các bộ lọc để xem nhiều kết quả hơn.
                    </p>
                    {(appliedQuery || categoryFilter || filterStatus !== 'all' || sortBy) && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="mt-4 rounded-xl"
                            onClick={() => {
                                setSearchQuery('');
                                setAppliedQuery('');
                                setCategoryFilter('');
                                setFilterStatus('all');
                                setSortBy('');
                                setPage(0);
                                setSearchParams(new URLSearchParams(), { replace: true });
                            }}
                        >
                            Xóa bộ lọc
                        </Button>
                    )}
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {books.map((book) => (
                            <div
                                key={book.id}
                                className="bg-white rounded-2xl border border-gray-100 shadow-xs hover:shadow-md transition-shadow p-5 flex flex-col justify-between group"
                            >
                                <div>
                                    <div className="flex justify-between items-start gap-2 mb-3">
                                        <div className="flex-1 min-w-0">
                                            <h3
                                                className="text-base font-bold text-gray-900 line-clamp-2 group-hover:text-[#e60023] cursor-pointer transition-colors"
                                                onClick={() => navigate(`/books/${book.id}`)}
                                            >
                                                {book.title}
                                            </h3>
                                            <p className="text-xs text-gray-500 mt-1 truncate">
                                                {book.authors && book.authors.length > 0
                                                    ? book.authors.join(', ')
                                                    : 'Chưa rõ tác giả'}
                                            </p>
                                        </div>
                                        <span
                                            className={`shrink-0 text-xs px-2.5 py-1 rounded-full font-medium ${
                                                book.availableCopies > 0
                                                    ? 'bg-green-50 text-green-700'
                                                    : 'bg-gray-100 text-gray-500'
                                            }`}
                                        >
                                            {book.availableCopies > 0 ? `Còn ${book.availableCopies}` : 'Hết sách'}
                                        </span>
                                    </div>

                                    {/* Cover image */}
                                    <div
                                        className="w-full h-40 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl mb-4 flex items-center justify-center border border-gray-100 cursor-pointer overflow-hidden"
                                        onClick={() => navigate(`/books/${book.id}`)}
                                    >
                                        {book.coverImageUrl ? (
                                            <img
                                                src={book.coverImageUrl}
                                                alt={book.title}
                                                className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-200"
                                            />
                                        ) : (
                                            <Library className="w-10 h-10 text-gray-300" />
                                        )}
                                    </div>

                                    {/* Meta tags */}
                                    <div className="flex flex-wrap items-center gap-1.5 mb-4">
                                        {book.categories && book.categories.length > 0 && (
                                            <span className="text-[11px] bg-gray-50 text-gray-600 px-2 py-0.5 rounded-md font-medium border border-gray-100">
                                                {book.categories[0]}
                                            </span>
                                        )}
                                        {book.publishedYear && (
                                            <span className="text-[11px] bg-gray-50 text-gray-500 px-2 py-0.5 rounded-md border border-gray-100">
                                                {book.publishedYear}
                                            </span>
                                        )}
                                        {book.ratingAvg != null && Number(book.ratingAvg) > 0 && (
                                            <span className="text-[11px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-md flex items-center gap-1 font-medium border border-amber-200/50">
                                                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                                {Number(book.ratingAvg).toFixed(1)}
                                                {book.ratingCount ? (
                                                    <span className="text-amber-600/70">({book.ratingCount})</span>
                                                ) : null}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-2">
                                    {role === 'guest' ? (
                                        <Button
                                            variant="outline"
                                            className="w-full rounded-xl"
                                            onClick={() => navigate('/login')}
                                        >
                                            Đăng nhập để mượn
                                        </Button>
                                    ) : (
                                        <Button
                                            variant="brand"
                                            className="w-full rounded-xl"
                                            disabled={book.availableCopies <= 0}
                                            onClick={() => setConfirmBook(book)}
                                        >
                                            {book.availableCopies > 0 ? 'Mượn sách' : 'Tạm hết sách'}
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-10 pt-6 border-t border-gray-100">
                            <p className="text-sm text-gray-500">
                                Hiển thị <span className="font-semibold text-gray-800">{page * PAGE_SIZE + 1}</span> - <span className="font-semibold text-gray-800">{Math.min((page + 1) * PAGE_SIZE, totalElements)}</span> trong tổng số <span className="font-semibold text-gray-800">{totalElements}</span> cuốn
                            </p>

                            <div className="flex items-center gap-1.5">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={page <= 0 || loading}
                                    onClick={() => handlePageChange(page - 1)}
                                    className="rounded-xl flex items-center gap-1 cursor-pointer"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                    <span className="hidden sm:inline">Trang trước</span>
                                </Button>

                                <div className="flex items-center gap-1 mx-1">
                                    {Array.from({ length: totalPages }, (_, i) => i)
                                        .filter(i => i === 0 || i === totalPages - 1 || Math.abs(i - page) <= 1)
                                        .map((i, idx, arr) => {
                                            const prev = arr[idx - 1];
                                            const showEllipsis = prev !== undefined && i - prev > 1;
                                            return (
                                                <div key={i} className="flex items-center">
                                                    {showEllipsis && (
                                                        <span className="px-2 text-gray-400 select-none text-xs">...</span>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={() => handlePageChange(i)}
                                                        className={`min-w-8 h-8 px-2.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                                                            i === page
                                                                ? 'bg-[#e60023] text-white shadow-xs'
                                                                : 'text-gray-600 hover:bg-gray-100'
                                                        }`}
                                                    >
                                                        {i + 1}
                                                    </button>
                                                </div>
                                            );
                                        })}
                                </div>

                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={page >= totalPages - 1 || loading}
                                    onClick={() => handlePageChange(page + 1)}
                                    className="rounded-xl flex items-center gap-1 cursor-pointer"
                                >
                                    <span className="hidden sm:inline">Trang sau</span>
                                    <ChevronRight className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Borrow Confirmation Modal */}
            {confirmBook && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4"
                    onClick={() => setConfirmBook(null)}
                >
                    <div
                        className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h2 className="text-xl font-bold text-gray-900 mb-2">Xác nhận mượn sách</h2>
                        <p className="text-gray-500 text-sm mb-6 leading-relaxed">
                            Bạn muốn mượn cuốn <strong className="text-gray-900 font-semibold">&quot;{confirmBook.title}&quot;</strong> của {confirmBook.authors && confirmBook.authors.length > 0 ? confirmBook.authors.join(', ') : 'tác giả'}?
                            <br />
                            <span className="text-xs text-gray-400 mt-2 block">
                                Thời hạn mượn mặc định: 14 ngày kể từ hôm nay.
                            </span>
                        </p>
                        <div className="flex gap-3 justify-end">
                            <Button
                                variant="outline"
                                onClick={() => setConfirmBook(null)}
                                disabled={borrowing}
                                className="rounded-xl"
                            >
                                Hủy
                            </Button>
                            <Button
                                variant="brand"
                                onClick={handleBorrow}
                                disabled={borrowing}
                                className="rounded-xl"
                            >
                                {borrowing ? 'Đang xử lý...' : 'Xác nhận mượn'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
