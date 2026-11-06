import React, { useState, useRef, useEffect } from 'react';
import { Tag, ChevronDown, Check } from 'lucide-react';

interface CategoryDropdownProps {
    category: string;
    setCategory: (value: string) => void;
    categories: string[];
    className?: string;
}

export const CategoryDropdown: React.FC<CategoryDropdownProps> = ({
    category,
    setCategory,
    categories,
    className = '',
}) => {
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const currentLabel = category || 'Tất cả thể loại';

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const allOptions = [
        { value: '', label: 'Tất cả thể loại' },
        ...categories.map((cat) => ({ value: cat, label: cat })),
    ];

    return (
        <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setIsOpen((prev) => !prev)}
                className="group flex items-center gap-2 bg-gray-100 hover:bg-gray-200/80 rounded-xl px-3.5 h-10 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors cursor-pointer select-none"
                aria-haspopup="listbox"
                aria-expanded={isOpen}
            >
                <Tag className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors shrink-0" />
                <span className="max-w-[130px] truncate">{currentLabel}</span>
                <ChevronDown
                    className={`w-4 h-4 text-gray-500 group-hover:text-gray-700 transition-transform duration-200 shrink-0 ${
                        isOpen ? 'rotate-180' : ''
                    }`}
                />
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-56 max-h-64 overflow-y-auto bg-white rounded-xl shadow-lg border border-gray-100 py-1.5 z-50 focus:outline-none">
                    {allOptions.map((option) => {
                        const isSelected = category === option.value;
                        return (
                            <button
                                key={option.value || '__all__'}
                                type="button"
                                onClick={() => {
                                    setCategory(option.value);
                                    setIsOpen(false);
                                }}
                                className={`w-full flex items-center justify-between px-3.5 py-2 text-sm text-left transition-colors cursor-pointer ${
                                    isSelected
                                        ? 'bg-red-50/80 text-red-600 font-medium'
                                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                                }`}
                            >
                                <span className="truncate">{option.label}</span>
                                {isSelected && <Check className="w-4 h-4 text-red-600 shrink-0 ml-2" />}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default CategoryDropdown;
