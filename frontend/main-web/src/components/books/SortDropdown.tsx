import React, { useState, useRef, useEffect } from 'react';
import { ArrowUpDown, ChevronDown, Check } from 'lucide-react';

export interface SortOption {
    value: string;
    label?: string;
}

interface SortDropdownProps {
    sortBy: string;
    setSortBy: (value: string) => void;
    searchQuery?: string;
    options?: SortOption[];
}

export const SortDropdown: React.FC<SortDropdownProps> = ({
    sortBy,
    setSortBy,
    searchQuery = '',
    options,
}) => {
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const defaultOptions: SortOption[] = [
        { value: '', label: searchQuery ? 'Phù hợp nhất' : 'Mặc định' },
        { value: 'title,asc', label: 'Tên sách (A → Z)' },
        { value: 'title,desc', label: 'Tên sách (Z → A)' },
        { value: 'ratingAvg,desc', label: 'Đánh giá (Cao nhất)' },
        { value: 'ratingCount,desc', label: 'Lượt đánh giá (Nhiều nhất)' },
        { value: 'publishedYear,desc', label: 'Năm phát hành (Mới nhất)' },
        { value: 'publishedYear,asc', label: 'Năm phát hành (Cũ nhất)' },
    ];

    const sortOptions = options || defaultOptions;

    const currentLabel =
        sortOptions.find((opt) => opt.value === sortBy)?.label || sortOptions[0]?.label || '';

    useEffect(() => {
        const handleClickEvent = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickEvent);
        return () => {
            document.removeEventListener('mousedown', handleClickEvent);
        };
    }, []);

    return (
        <div className="relative inline-block text-left" ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setIsOpen((prev) => !prev)}
                className="group flex items-center gap-2 bg-gray-100 hover:bg-gray-200/80 rounded-xl px-3.5 h-10 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors cursor-pointer select-none"
            >
                <ArrowUpDown className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors shrink-0" />
                <span className="max-w-[130px] truncate">{currentLabel}</span>
                <ChevronDown
                    className={`w-4 h-4 text-gray-500 group-hover:text-gray-700 transition-transform duration-200 shrink-0 ${
                        isOpen ? 'rotate-180' : ''
                    }`}
                />
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-60 bg-white rounded-xl shadow-lg border border-gray-100 py-1.5 z-50 focus:outline-none">
                    {sortOptions.map((option) => {
                        const isSelected = sortBy === option.value;
                        return (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => {
                                    setSortBy(option.value);
                                    setIsOpen(false);
                                }}
                                className={`w-full flex items-center justify-between px-3.5 py-2 text-sm text-left transition-colors cursor-pointer ${
                                    isSelected
                                        ? 'bg-red-50/80 text-red-600 font-medium'
                                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                                }`}
                            >
                                <span>{option.label}</span>
                                {isSelected && <Check className="w-4 h-4 text-red-600 shrink-0 ml-2" />}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default SortDropdown;
