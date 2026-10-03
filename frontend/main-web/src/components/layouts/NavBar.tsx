import { useNavigate, useLocation } from "react-router-dom";
import { Search, Library, UserCircle, LogOut, Clock } from "lucide-react";
import { Button } from "../ui/button";
import { useAuth } from "../../contexts/AuthContext";

export default function NavBar() {
    const navigate = useNavigate();
    const location = useLocation();
    const { role, logout } = useAuth();

    return (
        <header className="sticky top-0 z-50 w-full border-b border-gray-100 bg-white/80 backdrop-blur-md">
            <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
                {/* Logo, Brand */}
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
                    <div className="bg-[#e60023] p-1.5 rounded-lg">
                        <Library className="w-5 h-5 text-white" />
                    </div>
                    <span className="font-bold text-xl tracking-tight hidden sm:block">
                        Thư viện j đó
                    </span>
                </div>

                {/* Search Bar */}
                <div className="flex-1 max-w-2xl mx-auto">
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-4 w-4 text-gray-400 group-focus-within:text-[#e60023]" />
                        </div>
                        <input
                            type="text"
                            className="block w-full pl-10 pr-4 py-2 border border-gray-200 rounded-full bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#e60023]/20 focus:border-[#e60023] transition-all text-sm"
                            placeholder="Tìm kiếm sách, tác giả, thể loại..."
                        />
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3">
                    <Button variant="outline" className="hidden md:flex rounded-full px-5">
                        Trợ giúp
                    </Button>

                    {role === 'user' ? (
                        <div className="flex items-center gap-2 md:gap-4 ml-2 border-l pl-4">
                            <Button variant="ghost" onClick={() => navigate("/user")} className="flex items-center gap-2 text-gray-700">
                                <UserCircle className="w-4 h-4" />
                                <span className="hidden md:inline">Tổng quan</span>
                            </Button>
                            <Button variant="ghost" onClick={() => navigate("/user/history")} className="flex items-center gap-2 text-gray-700">
                                <Clock className="w-4 h-4" />
                                <span className="hidden md:inline">Lịch sử mượn</span>
                            </Button>
                            <div className="flex items-center gap-2 ml-2">
                                <UserCircle className="w-8 h-8 text-gray-600" />
                                <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => {
                                        logout();
                                        navigate("/");
                                    }} 
                                    className="text-red-600 hover:bg-red-50 hover:text-red-700"
                                >
                                    <LogOut className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <Button
                            variant="brand"
                            onClick={() => navigate("/login")}
                            className="rounded-full px-6"
                        >
                            Đăng nhập
                        </Button>
                    )}
                </div>
            </div>
        </header>
    );
}
