import React, { useState } from 'react';
import { Library, Loader2, Clock, X } from 'lucide-react';
import type { BookResponse } from '@/lib/books-api';

interface SearchSuggestionsDropdownProps {
    isOpen: boolean;
    loading: boolean;
    suggestions: BookResponse[];
    query: string;
    onSelectBook: (bookId: string) => void;
    recentSearches?: string[];
    onSelectRecentSearch?: (query: string) => void;
    onRemoveRecentSearch?: (query: string) => void;
    onClearRecentSearches?: () => void;
    className?: string;
}

const SuggestionItem: React.FC<{
    book: BookResponse;
    onSelect: (id: string) => void;
}> = ({ book, onSelect }) => {
    const [imgError, setImgError] = useState(false);

    return (
        <div
            onMouseDown={(e) => {
                // Prevent input blur before click registers
                e.preventDefault();
                onSelect(book.id);
            }}
            className="flex items-center gap-3.5 px-4 py-2.5 hover:bg-gray-50/90 cursor-pointer transition-colors group"
        >
            <div className="w-10 h-14 rounded-md overflow-hidden bg-gray-100 shrink-0 border border-gray-200/60 flex items-center justify-center">
                {book.coverImageUrl && !imgError ? (
                    <img
                        src={book.coverImageUrl}
                        alt={book.title}
                        className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-200"
                        onError={() => setImgError(true)}
                    />
                ) : (
                    <Library className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                )}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 line-clamp-2 group-hover:text-[#e60023] transition-colors">
                    {book.title}
                </p>
            </div>
        </div>
    );
};

export const SearchSuggestionsDropdown: React.FC<SearchSuggestionsDropdownProps> = ({
    isOpen,
    loading,
    suggestions,
    query,
    onSelectBook,
    recentSearches = [],
    onSelectRecentSearch,
    onRemoveRecentSearch,
    onClearRecentSearches,
    className = '',
}) => {
    if (!isOpen) {
        return null;
    }

    const trimmedQuery = query.trim();

    // If query is empty, show recent searches
    if (!trimmedQuery) {
        if (recentSearches.length === 0) {
            return null;
        }

        return (
            <div
                className={`absolute left-0 right-0 top-full mt-2 z-50 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150 ${className}`}
            >
                <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50/70 border-b border-gray-100 text-xs text-gray-500 font-medium">
                    <span className="flex items-center gap-1.5 font-semibold text-gray-600">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        Tìm kiếm gần đây
                    </span>
                    {onClearRecentSearches && (
                        <button
                            type="button"
                            onMouseDown={(e) => {
                                e.preventDefault();
                                onClearRecentSearches();
                            }}
                            className="text-[11px] text-gray-400 hover:text-red-600 transition-colors cursor-pointer"
                        >
                            Xóa tất cả
                        </button>
                    )}
                </div>
                <div className="py-1">
                    {recentSearches.map((term) => (
                        <div
                            key={term}
                            onMouseDown={(e) => {
                                e.preventDefault();
                                onSelectRecentSearch?.(term);
                            }}
                            className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50/80 cursor-pointer transition-colors group"
                        >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                <Clock className="w-4 h-4 text-gray-400 group-hover:text-[#e60023] transition-colors shrink-0" />
                                <span className="text-sm text-gray-700 group-hover:text-gray-900 truncate">
                                    {term}
                                </span>
                            </div>
                            {onRemoveRecentSearch && (
                                <button
                                    type="button"
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        onRemoveRecentSearch(term);
                                    }}
                                    className="p-1 text-gray-300 hover:text-gray-600 rounded-md hover:bg-gray-100 transition-colors ml-2"
                                    title="Xóa tìm kiếm này"
                                    aria-label={`Xóa "${term}" khỏi lịch sử`}
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // If query is present, show matching book suggestions
    return (
        <div
            className={`absolute left-0 right-0 top-full mt-2 z-50 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150 ${className}`}
        >
            {loading && suggestions.length === 0 ? (
                <div className="flex items-center justify-center gap-2 py-6 text-sm text-gray-400">
                    <Loader2 className="w-4 h-4 animate-spin text-[#e60023]" />
                    <span>Đang tìm kiếm sách...</span>
                </div>
            ) : suggestions.length === 0 ? (
                <div className="py-6 px-4 text-center text-sm text-gray-400">
                    Không tìm thấy sách cho &quot;<span className="text-gray-600 font-medium">{trimmedQuery}</span>&quot;
                </div>
            ) : (
                <div>
                    <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
                        {suggestions.map((book) => (
                            <SuggestionItem key={book.id} book={book} onSelect={onSelectBook} />
                        ))}
                    </div>
                    <div className="px-4 py-2 bg-gray-50/80 border-t border-gray-100 text-[11px] text-gray-400 text-center flex items-center justify-center gap-1.5">
                        <span>Nhấn</span>
                        <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-[10px] text-gray-600 font-mono shadow-xs">
                            Enter
                        </kbd>
                        <span>để xem tất cả kết quả</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SearchSuggestionsDropdown;
