import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    ArrowUpRight,
    Baby,
    BookOpenText,
    Brain,
    Briefcase,
    Clapperboard,
    Cpu,
    Drama,
    FlaskConical,
    Feather,
    Fingerprint,
    Flame,
    Ghost,
    GraduationCap,
    Heart,
    HeartPulse,
    Landmark,
    Laugh,
    Library,
    LoaderCircle,
    Palette,
    Rocket,
    Scale,
    Search,
    Siren,
    Sparkles,
    Sprout,
    Sun,
    UserRound,
    Users,
    Wand2,
    X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { fetchCategories, searchBooks } from "@/lib/books";

type SortMode = "popular" | "alpha";

const CATEGORY_META: Record<string, { icon: LucideIcon; label?: string }> = {
    "Fiction": { icon: BookOpenText, label: "Tiểu thuyết & truyện" },
    "Children's Books": { icon: Baby, label: "Sách thiếu nhi" },
    "Biography & Memoir": { icon: UserRound, label: "Tiểu sử & hồi ký" },
    "History": { icon: Landmark, label: "Lịch sử" },
    "Science & Nature": { icon: FlaskConical, label: "Khoa học & thiên nhiên" },
    "Philosophy": { icon: Sparkles, label: "Triết học" },
    "Psychology": { icon: Brain, label: "Tâm lý học" },
    "Self-Help": { icon: Sprout, label: "Phát triển bản thân" },
    "Fantasy": { icon: Wand2, label: "Kỳ ảo" },
    "Horror": { icon: Ghost, label: "Kinh dị" },
    "Romance": { icon: Heart, label: "Lãng mạn" },
    "Poetry": { icon: Feather, label: "Thơ ca" },
    "Drama": { icon: Drama, label: "Kịch" },
    "Humor": { icon: Laugh, label: "Hài hước" },
    "Comics & Graphic Novels": { icon: Clapperboard, label: "Truyện tranh" },
    "Health & Medicine": { icon: HeartPulse, label: "Sức khỏe & y học" },
    "Business & Economics": { icon: Briefcase, label: "Kinh doanh & kinh tế" },
    "Social Sciences & Law": { icon: Scale, label: "Khoa học xã hội & luật" },
    "Education & Reference": { icon: GraduationCap, label: "Giáo dục & tham khảo" },
    "Technology & Computing": { icon: Cpu, label: "Công nghệ & máy tính" },
    "Arts & Entertainment": { icon: Palette, label: "Nghệ thuật & giải trí" },
    "Mystery & Crime": { icon: Fingerprint, label: "Trinh thám & tội phạm" },
    "Science Fiction": { icon: Rocket, label: "Khoa học viễn tưởng" },
    "Thriller & Suspense": { icon: Siren, label: "Giật gân & hồi hộp" },
    "Lifestyle & Leisure": { icon: Sun, label: "Phong cách sống" },
    "Young Adult": { icon: Flame, label: "Tuổi mới lớn" },
    "Religion & Spirituality": { icon: Sparkles, label: "Tôn giáo & tâm linh" },
    "Literary Studies": { icon: BookOpenText, label: "Nghiên cứu văn học" },
    "Historical Fiction": { icon: Landmark, label: "Tiểu thuyết lịch sử" },
    "Family & Relationships": { icon: Users, label: "Gia đình & các mối quan hệ" },
    "Unclassified": { icon: Library, label: "Chưa phân loại" },
};

// [gradient, text/bar color] pairs; written out in full so Tailwind can see every class.
const ACCENTS: Array<[string, string, string]> = [
    ["from-rose-500/20 to-orange-400/10", "text-rose-500", "bg-rose-500"],
    ["from-sky-500/20 to-cyan-400/10", "text-sky-500", "bg-sky-500"],
    ["from-violet-500/20 to-fuchsia-400/10", "text-violet-500", "bg-violet-500"],
    ["from-amber-500/20 to-yellow-400/10", "text-amber-500", "bg-amber-500"],
    ["from-emerald-500/20 to-teal-400/10", "text-emerald-500", "bg-emerald-500"],
    ["from-indigo-500/20 to-blue-400/10", "text-indigo-500", "bg-indigo-500"],
    ["from-pink-500/20 to-rose-400/10", "text-pink-500", "bg-pink-500"],
    ["from-orange-500/20 to-amber-400/10", "text-orange-500", "bg-orange-500"],
];

function accentFor(name: string) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
    return ACCENTS[hash % ACCENTS.length];
}

export default function Categories() {
    const navigate = useNavigate();
    const [names, setNames] = useState<string[]>([]);
    const [counts, setCounts] = useState<Record<string, number>>({});
    const [totalBooks, setTotalBooks] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [query, setQuery] = useState("");
    const [sort, setSort] = useState<SortMode>("popular");

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            try {
                const [categories, all] = await Promise.all([fetchCategories(), searchBooks({ size: 1 })]);
                if (cancelled) return;
                setNames(categories);
                setTotalBooks(all.totalElements);
                const entries = await Promise.all(
                    categories.map((name) =>
                        searchBooks({ category: name, size: 1 })
                            .then((page) => [name, page.totalElements] as const)
                            .catch(() => [name, 0] as const),
                    ),
                );
                if (!cancelled) setCounts(Object.fromEntries(entries));
            } catch {
                if (!cancelled) setError(true);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        void load();
        return () => { cancelled = true; };
    }, []);

    const maxCount = useMemo(() => Math.max(1, ...Object.values(counts)), [counts]);

    const visible = useMemo(() => {
        const needle = query.trim().toLowerCase();
        const filtered = names.filter((name) => {
            if (!needle) return true;
            const label = CATEGORY_META[name]?.label ?? "";
            return name.toLowerCase().includes(needle) || label.toLowerCase().includes(needle);
        });
        return [...filtered].sort((a, b) =>
            sort === "alpha"
                ? a.localeCompare(b)
                : (counts[b] ?? 0) - (counts[a] ?? 0) || a.localeCompare(b),
        );
    }, [names, counts, query, sort]);

    const countsReady = Object.keys(counts).length > 0;

    return (
        <div className="mx-auto max-w-6xl">
            {/* Header */}
            <section className="relative isolate overflow-hidden rounded-3xl border border-gray-100 bg-gradient-to-br from-gray-50 via-white to-gray-50 px-6 py-10 md:px-10 md:py-12">
                <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-24 -z-10 h-72 w-72 rounded-full bg-[#e60023]/15 blur-3xl dark:bg-amber-300/10" />
                <div aria-hidden="true" className="pointer-events-none absolute -bottom-28 left-1/3 -z-10 h-64 w-64 rounded-full bg-indigo-400/15 blur-3xl" />

                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#e60023]">Danh mục</p>
                <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-gray-900 md:text-5xl">Tất cả thể loại</h1>
                <p className="mt-3 max-w-xl text-gray-500">
                    Chọn một thể loại để xem toàn bộ sách thuộc thể loại đó. Một cuốn sách có thể thuộc nhiều thể loại.
                </p>

                <div className="mt-6 flex flex-wrap items-center gap-3 text-sm">
                    <span className="rounded-full border border-gray-200 bg-white px-4 py-1.5 font-semibold text-gray-800">
                        {loading ? "…" : names.length} thể loại
                    </span>
                    <span className="rounded-full border border-gray-200 bg-white px-4 py-1.5 font-semibold text-gray-800">
                        {totalBooks === null ? "…" : totalBooks.toLocaleString("vi-VN")} đầu sách
                    </span>
                </div>
            </section>

            {/* Controls */}
            <div className="mt-6 flex flex-wrap items-center gap-3">
                <div className="relative min-w-[240px] flex-1">
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
                    <input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Lọc thể loại theo tên…"
                        aria-label="Lọc thể loại"
                        className="h-11 w-full rounded-full border border-gray-200 bg-white pl-11 pr-10 text-sm text-gray-900 outline-none transition focus:border-[#e60023] focus:ring-2 focus:ring-[#e60023]/20"
                    />
                    {query && (
                        <button
                            type="button"
                            onClick={() => setQuery("")}
                            aria-label="Xóa bộ lọc"
                            className="absolute right-3 top-1/2 flex h-6 w-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                        >
                            <X className="h-4 w-4" aria-hidden="true" />
                        </button>
                    )}
                </div>
                <div className="flex rounded-full border border-gray-200 bg-white p-1" role="group" aria-label="Sắp xếp">
                    {([
                        ["popular", "Nhiều sách nhất"],
                        ["alpha", "A – Z"],
                    ] as Array<[SortMode, string]>).map(([mode, label]) => (
                        <button
                            key={mode}
                            type="button"
                            onClick={() => setSort(mode)}
                            aria-pressed={sort === mode}
                            className={`cursor-pointer rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                                sort === mode ? "bg-gray-100 text-gray-900" : "text-gray-500 hover:text-gray-800"
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Grid */}
            {loading ? (
                <div className="flex items-center justify-center gap-2 py-24 text-sm text-gray-500" role="status">
                    <LoaderCircle className="h-5 w-5 animate-spin" /> Đang tải thể loại...
                </div>
            ) : error ? (
                <p role="alert" className="py-24 text-center text-sm text-red-600">Không tải được danh sách thể loại. Vui lòng thử lại sau.</p>
            ) : visible.length === 0 ? (
                <div className="py-24 text-center">
                    <p className="text-base font-semibold text-gray-800">Không có thể loại nào khớp “{query}”.</p>
                    <button type="button" onClick={() => setQuery("")} className="mt-3 cursor-pointer text-sm font-semibold text-[#e60023] hover:underline">
                        Xóa bộ lọc
                    </button>
                </div>
            ) : (
                <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {visible.map((name) => {
                        const meta = CATEGORY_META[name];
                        const Icon = meta?.icon ?? Library;
                        const [gradient, text, bar] = accentFor(name);
                        const count = counts[name];
                        return (
                            <button
                                key={name}
                                type="button"
                                onClick={() => navigate(`/search?category=${encodeURIComponent(name)}`)}
                                className="group relative cursor-pointer overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 text-left transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-gray-900/10"
                            >
                                <div className={`absolute inset-0 bg-gradient-to-br opacity-60 transition-opacity group-hover:opacity-100 ${gradient}`} aria-hidden="true" />
                                <div className="relative">
                                    <div className="flex items-start justify-between">
                                        <span className={`flex h-11 w-11 items-center justify-center rounded-xl bg-white/80 shadow-sm ${text}`}>
                                            <Icon className="h-6 w-6" aria-hidden="true" />
                                        </span>
                                        <ArrowUpRight className="h-5 w-5 text-gray-300 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-gray-700" aria-hidden="true" />
                                    </div>
                                    <p className="mt-4 text-base font-bold leading-snug text-gray-900">{name}</p>
                                    <p className="mt-0.5 min-h-4 text-xs text-gray-500">{meta?.label ?? ""}</p>
                                    <div className="mt-4 flex items-center justify-between text-xs font-semibold text-gray-700">
                                        <span>{countsReady && count !== undefined ? `${count.toLocaleString("vi-VN")} cuốn` : "—"}</span>
                                    </div>
                                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-200/70" aria-hidden="true">
                                        <div
                                            className={`h-full rounded-full ${bar}`}
                                            style={{ width: `${countsReady && count ? Math.max(4, Math.round((count / maxCount) * 100)) : 0}%` }}
                                        />
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
