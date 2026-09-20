import { useNavigate, useLocation } from "react-router-dom";
import { Search, Library } from "lucide-react";
import { Button } from "../ui/button";

export default function NavBar() {
    const navigate = useNavigate();
    const location = useLocation();

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
                    {!location.pathname.startsWith("/user") && (
                        <Button
                            onClick={() => navigate("/login")}
                            className="bg-[#e60023] hover:bg-[#cc0020] text-white rounded-full px-6"
                        >
                            Đăng nhập
                        </Button>
                    )}
                </div>
            </div>
        </header>
    );
}
