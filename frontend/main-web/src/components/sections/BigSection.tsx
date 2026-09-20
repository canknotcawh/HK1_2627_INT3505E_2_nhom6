import { useNavigate } from "react-router-dom"
import { Button } from "../../components/ui/button";
import logo from "../../assets/logo.png";

export default function BigSection() {
    // Section đầu + Logo
    const navigate = useNavigate();
    return (
        <section className="container mx-auto px-4 py-20 flex flex-col md:flex-row items-center justify-between min-h-[600px] gap-12">

            <div className="md:w-1/2">
                <p className="text-red-600 font-bold text-14px uppercase mb-2">
                    Hệ thống thư viện điện tử
                </p>

                <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 leading-[1.1] tracking-tight mb-6">
                    Kho sách của thư viện, mở ra cho tất cả mọi người.
                </h1>

                <p className="text-gray-600 text-lg leading-relaxed mb-8">
                    Tra cứu toàn bộ danh mục, kiểm tra sách còn hay hết theo thời
                    gian thực, mượn hoặc đặt trước chỉ với tài khoản cá nhân — không
                    cần đến tận nơi để biết sách có sẵn hay không.
                </p>

                <div className="flex flex-wrap items-center gap-4 pt-4">
                    <Button className="px-8 py-6 rounded-full bg-[#e60023] hover:bg-[#cc0020] text-white">
                        Khám phá danh mục
                    </Button>
                    <Button variant="outline" className="px-8 py-6 rounded-full" onClick={() => navigate("/login")}>
                        Đăng nhập
                    </Button>
                </div>
            </div>

            <div className="md:w-1/2 mt-12 md:mt-0 flex justify-center items-center">
                <img
                    src={logo}
                    className="w-full max-w-[550px] hover:scale-105 transition-transform duration-500"
                />
            </div>
        </section>
    );
}
