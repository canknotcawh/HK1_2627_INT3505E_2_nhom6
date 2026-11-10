import { useNavigate } from "react-router-dom";
import { ArrowUpRight, Baby, BookOpenText, Brain, FlaskConical, Landmark, Lightbulb, Sparkles, UserRound } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type LandingGenre = {
    name: string;
    label: string;
    icon: LucideIcon;
    accent: string;
};

export const LANDING_GENRES: LandingGenre[] = [
    { name: "Fiction", label: "Tiểu thuyết & truyện", icon: BookOpenText, accent: "from-rose-500/20 to-orange-400/10 text-rose-500" },
    { name: "Children's Books", label: "Sách thiếu nhi", icon: Baby, accent: "from-sky-500/20 to-cyan-400/10 text-sky-500" },
    { name: "Biography & Memoir", label: "Tiểu sử & hồi ký", icon: UserRound, accent: "from-violet-500/20 to-fuchsia-400/10 text-violet-500" },
    { name: "History", label: "Lịch sử", icon: Landmark, accent: "from-amber-500/20 to-yellow-400/10 text-amber-500" },
    { name: "Science & Nature", label: "Khoa học & thiên nhiên", icon: FlaskConical, accent: "from-emerald-500/20 to-teal-400/10 text-emerald-500" },
    { name: "Philosophy", label: "Triết học", icon: Sparkles, accent: "from-indigo-500/20 to-blue-400/10 text-indigo-500" },
    { name: "Psychology", label: "Tâm lý học", icon: Brain, accent: "from-pink-500/20 to-rose-400/10 text-pink-500" },
    { name: "Self-Help", label: "Phát triển bản thân", icon: Lightbulb, accent: "from-orange-500/20 to-amber-400/10 text-orange-500" },
];

type GenresSectionProps = {
    counts: Record<string, number>;
};

export default function GenresSection({ counts }: GenresSectionProps) {
    const navigate = useNavigate();

    return (
        <section className="container mx-auto px-4 py-16 md:py-20">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h2 className="text-3xl font-extrabold tracking-tight text-gray-900 md:text-4xl">Khám phá theo thể loại</h2>
                    <p className="mt-2 text-gray-500">Chọn một chủ đề để bắt đầu, mỗi lần ghé thăm sẽ có điều mới.</p>
                </div>
                <button
                    type="button"
                    onClick={() => navigate("/categories")}
                    className="inline-flex cursor-pointer items-center gap-1 text-sm font-semibold text-[#e60023] hover:underline"
                >
                    Tất cả thể loại <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                </button>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
                {LANDING_GENRES.map(({ name, label, icon: Icon, accent }) => (
                    <button
                        key={name}
                        type="button"
                        onClick={() => navigate(`/search?category=${encodeURIComponent(name)}`)}
                        className="group relative cursor-pointer overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 text-left transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-gray-900/10"
                    >
                        <div className={`absolute inset-0 bg-gradient-to-br opacity-70 transition-opacity group-hover:opacity-100 ${accent.split(" text-")[0]}`} aria-hidden="true" />
                        <div className="relative">
                            <span className={`flex h-11 w-11 items-center justify-center rounded-xl bg-white/80 shadow-sm ${accent.split(" ").find((c) => c.startsWith("text-"))}`}>
                                <Icon className="h-6 w-6" aria-hidden="true" />
                            </span>
                            <p className="mt-4 text-base font-bold text-gray-900">{name}</p>
                            <p className="text-xs text-gray-500">{label}</p>
                            <p className="mt-3 text-xs font-semibold text-gray-700">
                                {counts[name] !== undefined ? `${counts[name].toLocaleString("vi-VN")} cuốn` : "—"}
                            </p>
                        </div>
                    </button>
                ))}
            </div>
        </section>
    );
}
