import { useNavigate } from "react-router-dom";
import { ArrowRight, Library } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CtaSection() {
    const navigate = useNavigate();

    return (
        <section className="container mx-auto px-4 pb-20">
            <div className="relative isolate overflow-hidden rounded-3xl bg-slate-900 px-6 py-14 text-center text-white md:px-16 md:py-20">
                <div aria-hidden="true" className="absolute -left-20 -top-20 -z-10 h-72 w-72 rounded-full bg-[#e60023]/40 blur-3xl" />
                <div aria-hidden="true" className="absolute -bottom-24 -right-16 -z-10 h-80 w-80 rounded-full bg-amber-400/30 blur-3xl" />

                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20 backdrop-blur">
                    <Library className="h-7 w-7" aria-hidden="true" />
                </span>
                <h2 className="mx-auto mt-6 max-w-2xl text-3xl font-extrabold tracking-tight md:text-5xl">
                    Cuốn sách tiếp theo của bạn đang ở đây.
                </h2>
                <p className="mx-auto mt-4 max-w-xl text-lg text-slate-300">
                    Tạo tài khoản miễn phí, mượn sách ngay hôm nay và theo dõi mọi khoản mượn ở một nơi.
                </p>
                <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                    <Button
                        onClick={() => navigate("/login")}
                        className="h-12 rounded-full bg-gradient-to-r from-amber-200 to-amber-300 px-8 text-base font-bold text-slate-900 shadow-lg shadow-amber-500/20 hover:from-amber-300 hover:to-amber-400"
                    >
                        Bắt đầu ngay
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => navigate("/search")}
                        className="h-12 rounded-full border-white/30 bg-white/10 px-7 text-white backdrop-blur hover:bg-white/20 hover:text-white"
                    >
                        Duyệt danh mục
                    </Button>
                </div>
            </div>
        </section>
    );
}
