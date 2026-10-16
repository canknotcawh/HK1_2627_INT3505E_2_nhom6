import React, { useState } from 'react';
import { Library, Loader2 } from 'lucide-react';
import type { BookResponse } from '@/lib/books-api';

interface SearchSuggestionsDropdownProps {
    isOpen: boolean;
    loading: boolean;
    suggestions: BookResponse[];
    query: string;
    onSelectBook: (bookId: string) => void;
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
    className = '',
}) => {
    if (!isOpen || !query.trim()) {
        return null;
    }

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
                    Không tìm thấy sách cho &quot;<span className="text-gray-600 font-medium">{query.trim()}</span>&quot;
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
