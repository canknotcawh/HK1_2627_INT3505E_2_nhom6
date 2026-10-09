import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Library, UserCircle, LogOut, Clock, LayoutDashboard } from "lucide-react";
import { Button } from "../ui/button";
import { useAuth } from "../../contexts/AuthContext";
import keycloak from "../../lib/keycloak";

export default function NavBar() {
    const navigate = useNavigate();
    const { role, logout } = useAuth();
    const [searchValue, setSearchValue] = useState('');
    const [avatarFailed, setAvatarFailed] = useState(false);
    const avatarUrl = typeof keycloak.tokenParsed?.picture === "string" ? keycloak.tokenParsed.picture : "";

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchValue.trim()) {
            navigate(`/books?q=${encodeURIComponent(searchValue.trim())}`);
        } else {
            navigate('/books');
        }
    };

    return (
        <header className="sticky top-0 z-50 w-full border-b border-gray-100 bg-white/80 backdrop-blur-md">
            <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
                {/* Logo, Brand */}
                <div className="flex items-center gap-2 cursor-pointer shrink-0" onClick={() => navigate("/")}>
                    <div className="bg-[#e60023] p-1.5 rounded-lg">
                        <Library className="w-5 h-5 text-white" />
                    </div>
                    <span className="font-bold text-xl tracking-tight hidden sm:block">
                        Thư viện j đó
                    </span>
                </div>

                {/* Search Bar */}
                <form onSubmit={handleSearch} className="flex-1 max-w-2xl mx-auto">
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-4 w-4 text-gray-400 group-focus-within:text-[#e60023]" />
                        </div>
                        <input
                            type="text"
                            value={searchValue}
                            onChange={e => setSearchValue(e.target.value)}
                            className="block w-full pl-10 pr-4 py-2 border border-gray-200 rounded-full bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#e60023]/20 focus:border-[#e60023] transition-all text-sm"
                            placeholder="Tìm kiếm sách, tác giả..."
                            aria-label="Tìm kiếm sách"
                        />
                    </div>
                </form>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                    {role === 'user' ? (
                        <div className="flex items-center gap-1 md:gap-2">
                            <Button variant="ghost" size="sm" onClick={() => navigate("/user")} className="flex items-center gap-1.5 text-gray-700">
                                <LayoutDashboard className="w-4 h-4" />
                                <span className="hidden md:inline">Tổng quan</span>
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => navigate("/user/history")} className="flex items-center gap-1.5 text-gray-700">
                                <Clock className="w-4 h-4" />
                                <span className="hidden md:inline">Lịch sử</span>
                            </Button>
                            <div className="flex items-center gap-1 ml-1 pl-2 border-l border-gray-200">
                                <button
                                    type="button"
                                    onClick={() => navigate("/user/profile")}
                                    className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full p-0.5 text-gray-400 transition hover:bg-gray-100 hover:text-[#e60023] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e60023]"
                                    aria-label="Mở hồ sơ cá nhân"
                                    title="Hồ sơ cá nhân"
                                >
                                    {avatarUrl && !avatarFailed ? (
                                        <img
                                            src={avatarUrl}
                                            alt=""
                                            className="h-full w-full rounded-full object-cover"
                                            onError={() => setAvatarFailed(true)}
                                        />
                                    ) : (
                                        <UserCircle className="h-7 w-7" />
                                    )}
                                </button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        logout();
                                        navigate("/");
                                    }}
                                    className="text-red-600 hover:bg-red-50 hover:text-red-700"
                                    aria-label="Đăng xuất"
                                >
                                    <LogOut className="w-4 h-4" />
                                    <span className="hidden md:inline ml-1">Đăng xuất</span>
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <Button
                            variant="brand"
                            onClick={() => navigate("/login")}
                            className="rounded-full px-5"
                        >
                            Đăng nhập
                        </Button>
                    )}
                </div>
            </div>
        </header>
    );
}
