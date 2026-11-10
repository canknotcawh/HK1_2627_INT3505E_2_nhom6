import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import { searchBooks, fetchCategories, type BookDto } from "../lib/books";
import { borrowBook as borrowBookApi } from "../lib/loans";
import BookCover from "../components/books/BookCover";
import { Button } from "../components/ui/button";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Search as SearchIcon, BookOpen, Star, LoaderCircle, ChevronLeft, ChevronRight, Tag, Clock } from "lucide-react";
import SortDropdown from "../components/books/SortDropdown";
import CategoryDropdown from "../components/books/CategoryDropdown";
import {
    getRecentSearches,
    clearRecentSearches,
} from "../lib/search-history";
import { useToast } from "../hooks/useToast";
import Toast from "../components/ui/Toast";

type FilterStatus = 'all' | 'available' | 'unavailable';

const PAGE_SIZE = 18;
const POPULAR_SUGGESTIONS = [
    'Science',
    'Technology',
    'Fiction',
    'History',
    'Philosophy',
    'Psychology',
    'Business',
    'Self-Help'
];

export default function Search() {
    const { role, user } = useAuth();
    const userId = user?.id;
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const { toast, showToast } = useToast();

    // Query & Filter states from URL
    const appliedQuery = searchParams.get('q') || '';
    const [filterStatus, setFilterStatus] = useState<FilterStatus>(
        (searchParams.get('availability') as FilterStatus) || 'all'
    );
    const [categoryFilter, setCategoryFilter] = useState(searchParams.get('category') || '');
    const [sortBy, setSortBy] = useState<string>(searchParams.get('sort') || '');

    // Pagination states
    const initialPage = Math.max(0, parseInt(searchParams.get('page') || '1', 10) - 1);
    const [page, setPage] = useState<number>(isNaN(initialPage) ? 0 : initialPage);
    const [totalPages, setTotalPages] = useState<number>(0);

    // Results states
    const [books, setBooks] = useState<BookDto[]>([]);
    const [categories, setCategories] = useState<string[]>([]);
    const [totalElements, setTotalElements] = useState<number>(0);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>("");

    // Borrow states
    const [borrowingId, setBorrowingId] = useState<string | null>(null);
    const [recentSearches, setRecentSearches] = useState<string[]>(() => getRecentSearches(userId));

    const requestIdRef = useRef(0);

    // Synchronize states with URL params
    useEffect(() => {
        setFilterStatus((searchParams.get('availability') as FilterStatus) || 'all');
        setCategoryFilter(searchParams.get('category') || '');
        setSortBy(searchParams.get('sort') || '');
        const p = Math.max(0, parseInt(searchParams.get('page') || '1', 10) - 1);
        setPage(isNaN(p) ? 0 : p);
    }, [searchParams]);

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

    // Refresh recent searches when user changes
    useEffect(() => {
        setRecentSearches(getRecentSearches(userId));
    }, [userId, role, appliedQuery]);

    // Execute search when there is a keyword or a category filter
    const executeSearch = useCallback(async (
        q: string,
        category: string,
        availability: FilterStatus,
        sort: string,
        pageIndex: number
    ) => {
        const trimmed = q.trim();
        if (!trimmed && !category) {
            setBooks([]);
            setTotalElements(0);
            setTotalPages(0);
            setLoading(false);
            return;
        }

        const curId = ++requestIdRef.current;
        setLoading(true);
        setError("");

        try {
            const pageData = await searchBooks({
                q: trimmed || undefined,
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
                setError("Có lỗi xảy ra khi tìm kiếm sách. Vui lòng thử lại sau.");
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

    useEffect(() => {
        void executeSearch(appliedQuery, categoryFilter, filterStatus, sortBy, page);
    }, [appliedQuery, categoryFilter, filterStatus, sortBy, page, executeSearch]);

    const updateUrlParams = (updates: Record<string, string>) => {
        const next = new URLSearchParams(searchParams);
        Object.entries(updates).forEach(([key, val]) => {
            if (val) {
                next.set(key, val);
            } else {
                next.delete(key);
            }
        });
        setSearchParams(next);
    };

    const handleBorrow = async (book: BookDto) => {
        if (role !== 'user' && role !== 'admin') {
            navigate('/login');
            return;
        }

        setBorrowingId(book.id);
        try {
            await borrowBookApi(book.id);
            showToast(`Mượn cuốn "${book.title}" thành công!`, 'success');
            void executeSearch(appliedQuery, categoryFilter, filterStatus, sortBy, page);
        } catch (err) {
            console.error("Không thể mượn sách:", err);
            showToast("Không thể mượn sách. Vui lòng thử lại sau.", 'error');
        } finally {
            setBorrowingId(null);
        }
    };

    const handleSelectTag = (tag: string) => {
        updateUrlParams({ q: tag, page: '' });
    };

    const hasQuery = Boolean(appliedQuery.trim() || categoryFilter);
    const searchTitle = appliedQuery.trim() || categoryFilter;

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            <Toast toast={toast} />

            {/* When NO query: Display clean guidance & popular topics */}
            {!hasQuery ? (
                <div className="py-12 md:py-20 flex flex-col items-center text-center max-w-2xl mx-auto">
                    <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center text-[#e60023] mb-6 shadow-sm">
                        <SearchIcon className="w-8 h-8" />
                    </div>
                    <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">
                        Tìm kiếm tài liệu & sách
                    </h1>
                    <p className="text-gray-500 text-sm md:text-base mt-3 leading-relaxed">
                        Nhập từ khóa tên sách, tác giả hoặc chủ đề vào thanh tìm kiếm phía trên để bắt đầu tra cứu.
                    </p>

                    {/* Popular search tags */}
                    <div className="mt-8 w-full">
                        <div className="flex items-center justify-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
                            <Tag className="w-3.5 h-3.5" /> Gợi ý chủ đề phổ biến
                        </div>
                        <div className="flex flex-wrap justify-center gap-2">
                            {POPULAR_SUGGESTIONS.map((tag) => (
                                <button
                                    key={tag}
                                    type="button"
                                    onClick={() => handleSelectTag(tag)}
                                    className="px-3.5 py-1.5 rounded-full text-xs font-medium bg-gray-100 hover:bg-red-50 hover:text-[#e60023] text-gray-700 transition-colors"
                                >
                                    {tag}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Recent search history */}
                    {recentSearches.length > 0 && (
                        <div className="mt-8 w-full pt-6 border-t border-gray-100">
                            <div className="flex items-center justify-between text-xs text-gray-400 mb-3 px-2">
                                <span className="flex items-center gap-1 font-semibold uppercase tracking-wider">
                                    <Clock className="w-3.5 h-3.5" /> Lịch sử tìm kiếm gần đây
                                </span>
                                <button
                                    type="button"
                                    onClick={() => {
                                        clearRecentSearches(userId);
                                        setRecentSearches([]);
                                    }}
                                    className="hover:text-red-600 transition-colors"
                                >
                                    Xóa tất cả
                                </button>
                            </div>
                            <div className="flex flex-wrap justify-center gap-2">
                                {recentSearches.map((term) => (
                                    <button
                                        key={term}
                                        type="button"
                                        onClick={() => handleSelectTag(term)}
                                        className="px-3 py-1 rounded-lg text-xs bg-white border border-gray-200 text-gray-600 hover:border-[#e60023] hover:text-[#e60023] transition-colors"
                                    >
                                        {term}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                /* When HAS query: Show search results & compact Filter/Sort bar */
                <div>
                    {/* Header: Result summary */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-gray-100">
                        <div>
                            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#e60023]">
                                <SearchIcon className="w-3.5 h-3.5" /> Kết quả tìm kiếm
                            </div>
                            <h1 className="text-2xl font-bold text-gray-900 mt-1">
                                &ldquo;{searchTitle}&rdquo;
                            </h1>
                            <p className="text-gray-500 text-xs mt-0.5">
                                Tìm thấy <span className="font-semibold text-gray-800">{totalElements}</span> cuốn sách phù hợp
                            </p>
                        </div>

                        {/* Horizontal Filter & Sort Toolbar */}
                        <div className="flex items-center gap-2.5 flex-wrap">
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

                    {/* Error message */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm mb-6">
                            {error}
                        </div>
                    )}

                    {/* Loading State */}
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-24 text-gray-400 gap-3" role="status">
                            <LoaderCircle className="w-8 h-8 animate-spin text-[#e60023]" />
                            <p className="text-sm">Đang tìm kiếm sách...</p>
                        </div>
                    ) : books.length === 0 ? (
                        /* No Results State */
                        <div className="text-center py-16 bg-gray-50 rounded-2xl border border-gray-100 p-8 my-6">
                            <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <h3 className="text-base font-semibold text-gray-800">Không tìm thấy sách phù hợp</h3>
                            <p className="text-gray-500 text-sm mt-1 max-w-md mx-auto">
                                Không có kết quả nào cho &ldquo;{searchTitle}&rdquo;. Hãy thử kiểm tra lại chính tả hoặc dùng từ khóa tổng quát hơn.
                            </p>
                        </div>
                    ) : (
                        /* Results Grid */
                        <div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-6">
                                {books.map((book) => {
                                    const isAvailable = book.availableCopies > 0;
                                    const rating = Number(book.ratingAvg ?? 0);
                                    const isBorrowing = borrowingId === book.id;

                                    return (
                                        <div
                                            key={book.id}
                                            className="group flex flex-col bg-white rounded-2xl border border-gray-100 shadow-xs hover:shadow-md transition-all duration-300 overflow-hidden"
                                        >
                                            {/* Cover thumbnail */}
                                            <div
                                                onClick={() => navigate(`/books/${book.id}`)}
                                                className="cursor-pointer relative aspect-2/3 bg-gray-100 overflow-hidden"
                                            >
                                                <BookCover
                                                    imageUrl={book.coverImageUrl}
                                                    title={book.title}
                                                    imageClassName="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                />
                                                <span className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-semibold backdrop-blur-md ${
                                                    isAvailable
                                                        ? 'bg-emerald-500/90 text-white'
                                                        : 'bg-gray-700/85 text-white'
                                                }`}>
                                                    {isAvailable ? `Còn ${book.availableCopies}` : 'Hết sách'}
                                                </span>
                                            </div>

                                            {/* Info */}
                                            <div className="p-3 flex-1 flex flex-col justify-between">
                                                <div>
                                                    <h3
                                                        onClick={() => navigate(`/books/${book.id}`)}
                                                        className="font-semibold text-xs text-gray-900 line-clamp-2 hover:text-[#e60023] cursor-pointer transition-colors"
                                                        title={book.title}
                                                    >
                                                        {book.title}
                                                    </h3>
                                                    <p className="text-[11px] text-gray-500 line-clamp-1 mt-0.5">
                                                        {book.authors?.join(', ') || 'Nhiều tác giả'}
                                                    </p>
                                                    {rating > 0 && (
                                                        <div className="flex items-center gap-1 mt-1 text-[11px] text-amber-500">
                                                            <Star className="w-3 h-3 fill-amber-400 stroke-amber-400" />
                                                            <span className="font-semibold">{rating.toFixed(1)}</span>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="mt-3 pt-2 border-t border-gray-50">
                                                    <Button
                                                        variant={isAvailable ? "brand" : "outline"}
                                                        size="sm"
                                                        disabled={!isAvailable || isBorrowing}
                                                        onClick={() => void handleBorrow(book)}
                                                        className="w-full text-xs h-8 rounded-lg"
                                                    >
                                                        {isBorrowing ? (
                                                            <LoaderCircle className="w-3.5 h-3.5 animate-spin" />
                                                        ) : isAvailable ? (
                                                            "Mượn sách"
                                                        ) : (
                                                            "Hết sách"
                                                        )}
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="mt-10 flex items-center justify-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={page <= 0 || loading}
                                        onClick={() => updateUrlParams({ page: String(page) })}
                                        className="gap-1 rounded-lg"
                                    >
                                        <ChevronLeft className="w-4 h-4" /> Trước
                                    </Button>
                                    <span className="text-xs font-medium text-gray-600 px-3">
                                        Trang {page + 1} / {totalPages}
                                    </span>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={page + 1 >= totalPages || loading}
                                        onClick={() => updateUrlParams({ page: String(page + 2) })}
                                        className="gap-1 rounded-lg"
                                    >
                                        Sau <ChevronRight className="w-4 h-4" />
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

