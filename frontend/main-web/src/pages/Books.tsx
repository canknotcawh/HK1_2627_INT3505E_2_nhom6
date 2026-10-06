import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import type { Book } from "../contexts/AuthContext";
import { Button } from "../components/ui/button";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Library, Search, X, CheckCircle, AlertCircle, BookOpen } from "lucide-react";

type FilterStatus = 'all' | 'available' | 'unavailable';
type ToastType = { message: string; type: 'success' | 'error' } | null;

export default function Books() {
    const { books, role, borrowBook } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
    const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
    const [categoryFilter, setCategoryFilter] = useState(searchParams.get('category') || '');
    const [confirmBook, setConfirmBook] = useState<Book | null>(null);
    const [toast, setToast] = useState<ToastType>(null);

    const allCategories = [...new Set(books.map(b => b.category))];

    // Filter and search logic
    const filteredBooks = books.filter(book => {
        const matchesSearch = searchQuery.trim() === '' ||
            book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            book.author.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesFilter =
            filterStatus === 'all' ||
            (filterStatus === 'available' && book.quantity > 0) ||
            (filterStatus === 'unavailable' && book.quantity <= 0);

        const matchesCategory = categoryFilter === '' || book.category === categoryFilter;

        return matchesSearch && matchesFilter && matchesCategory;
    });

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
            showToast(result.success === false ? result.message : 'Có lỗi xảy ra.', 'error');
        }
    };


    return (
        <div className="container mx-auto p-4 md:p-8">
            {/* Toast notification */}
            {toast && (
                <div
                    role="status"
                    aria-live="polite"
                    className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-5 py-3 rounded-xl shadow-lg text-sm font-medium transition-all animate-in fade-in slide-in-from-top-2 ${
                        toast.type === 'success'
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
                <p className="text-gray-500 text-sm">{filteredBooks.length} / {books.length} cuốn</p>
            </div>

            {/* Search & Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-3 mb-8">
                <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="block w-full pl-10 pr-10 py-2.5 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#e60023]/20 focus:border-[#e60023] transition-all text-sm"
                        placeholder="Tìm kiếm theo tên sách hoặc tác giả..."
                        aria-label="Tìm kiếm sách"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                            aria-label="Xóa tìm kiếm"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>
                <div className="flex gap-2">
                    {([
                        ['all', 'Tất cả'],
                        ['available', 'Còn sách'],
                        ['unavailable', 'Hết sách'],
                    ] as const).map(([value, label]) => (
                        <button
                            key={value}
                            onClick={() => setFilterStatus(value)}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                                filterStatus === value
                                    ? 'bg-[#e60023] text-white'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Category filter */}
            {allCategories.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                    <button
                        onClick={() => setCategoryFilter('')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${categoryFilter === '' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                    >
                        Tất cả thể loại
                    </button>
                    {allCategories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setCategoryFilter(cat)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${categoryFilter === cat ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            )}

            {/* Empty state */}
            {filteredBooks.length === 0 ? (
                <div className="text-center py-16">
                    <BookOpen className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-600 mb-2">Không tìm thấy sách</h3>
                    <p className="text-gray-400 text-sm mb-4">
                        {searchQuery
                            ? `Không có kết quả cho "${searchQuery}"`
                            : 'Không có sách nào phù hợp với bộ lọc.'}
                    </p>
                    <Button variant="outline" onClick={() => { setSearchQuery(''); setFilterStatus('all'); setCategoryFilter(''); }}>
                        Xóa bộ lọc
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredBooks.map(book => (
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
                                        <p className="text-gray-500 text-sm mt-1">{book.author}</p>
                                    </div>
                                    <span className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium ${
                                        book.quantity > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                                    }`}>
                                        {book.quantity > 0 ? `Còn ${book.quantity}` : 'Hết sách'}
                                    </span>
                                </div>

                                {/* Cover placeholder */}
                                <div
                                    className="w-full h-36 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg mb-4 flex items-center justify-center border border-gray-100 cursor-pointer hover:from-gray-100 hover:to-gray-150 transition-colors"
                                    onClick={() => navigate(`/books/${book.id}`)}
                                >
                                    <Library className="w-10 h-10 text-gray-300" />
                                </div>

                                {/* Meta info */}
                                <div className="flex flex-wrap gap-2 mb-4">
                                    <span className="text-xs bg-gray-50 text-gray-500 px-2 py-1 rounded-md">{book.category}</span>
                                    <span className="text-xs bg-gray-50 text-gray-500 px-2 py-1 rounded-md">{book.publishYear}</span>
                                    <span className="text-xs bg-amber-50 text-amber-600 px-2 py-1 rounded-md">★ {book.rating}</span>
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
                                        disabled={book.quantity <= 0}
                                        onClick={() => setConfirmBook(book)}
                                    >
                                        {book.quantity > 0 ? 'Mượn sách' : 'Không khả dụng'}
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
