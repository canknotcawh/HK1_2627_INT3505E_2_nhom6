import { Moon, Sun } from "lucide-react";
import { useTheme } from "../../hooks/useTheme";

type ThemeToggleProps = {
    floating?: boolean;
};

export default function ThemeToggle({ floating = false }: ThemeToggleProps) {
    const { isDark, toggle } = useTheme();
    const label = isDark ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối";

    return (
        <button
            type="button"
            onClick={toggle}
            aria-label={label}
            title={label}
            className={`flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100 hover:text-[#e60023] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e60023] ${
                floating ? "fixed right-4 top-4 z-50 border border-gray-200 bg-white shadow-sm" : ""
            }`}
        >
            {isDark ? <Sun className="h-5 w-5" aria-hidden="true" /> : <Moon className="h-5 w-5" aria-hidden="true" />}
        </button>
    );
}
