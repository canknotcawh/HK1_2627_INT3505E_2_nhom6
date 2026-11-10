import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import BookCover from "@/components/books/BookCover";
import type { BookDto } from "@/lib/books";

type BigSectionProps = {
    books: BookDto[];
    loading: boolean;
    bookCount: number | null;
};

const QUICK_CATEGORIES = ["Fiction", "History", "Science & Nature", "Philosophy", "Self-Help"];

// Fixed poses for the cover collage: [rotation deg, x%, y%, width%, z-index, float delay s]
const COLLAGE_POSES: Array<[number, number, number, number, number, number]> = [
    [-9, 2, 14, 40, 10, 0],
    [7, 54, 6, 42, 20, 0.8],
    [-3, 28, 38, 44, 30, 1.6],
    [11, 62, 52, 34, 15, 2.4],
    [-14, -2, 58, 32, 12, 3.2],
];

export default function BigSection({ books, loading, bookCount }: BigSectionProps) {
    const navigate = useNavigate();
    const [query, setQuery] = useState("");

    const handleSearch = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const trimmed = query.trim();
        navigate(trimmed ? `/search?q=${encodeURIComponent(trimmed)}` : "/search");
    };

    const collage = books.slice(0, COLLAGE_POSES.length);

    return (
        <section className="relative isolate overflow-hidden">
            {/* Ambient glow */}
            <div aria-hidden="true" className="pointer-events-none absolute -left-32 -top-24 -z-10 h-96 w-96 rounded-full bg-[#e60023]/15 blur-3xl dark:bg-amber-300/10" />
            <div aria-hidden="true" className="pointer-events-none absolute -right-24 top-24 -z-10 h-[28rem] w-[28rem] rounded-full bg-orange-300/20 blur-3xl dark:bg-indigo-400/15" />

            <div className="container mx-auto grid items-center gap-12 px-4 py-14 md:py-20 lg:grid-cols-12">
                <div className="lg:col-span-6">
                    <span className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white/70 px-3.5 py-1.5 text-xs font-semibold text-gray-700 backdrop-blur">
                        <Sparkles className="h-3.5 w-3.5 text-[#e60023]" aria-hidden="true" />
                        {bookCount !== null ? `${bookCount.toLocaleString("vi-VN")} đầu sách đang chờ bạn` : "Kho sách đang chờ bạn"}
                    </span>

                    <h1 className="mt-5 text-4xl font-extrabold leading-[1.08] tracking-tight text-gray-900 md:text-6xl">
                        Mỗi cuốn sách là
                        <span className="block bg-gradient-to-r from-[#e60023] via-rose-500 to-orange-500 bg-clip-text text-transparent dark:from-amber-200 dark:via-amber-300 dark:to-orange-400">
                            một cánh cửa mới.
                        </span>
                    </h1>

                    <p className="mt-5 max-w-xl text-lg leading-relaxed text-gray-600">
                        Tìm sách theo tên, tác giả hay thể loại, xem ngay còn bản hay hết, rồi mượn trực tuyến chỉ với vài lần bấm.
                    </p>

                    <form onSubmit={handleSearch} className="mt-7 flex max-w-xl items-center gap-2 rounded-full border border-gray-200 bg-white p-1.5 shadow-lg shadow-gray-900/5 focus-within:border-[#e60023] focus-within:ring-4 focus-within:ring-[#e60023]/15">
                        <Search className="ml-3 h-5 w-5 shrink-0 text-gray-400" aria-hidden="true" />
                        <input
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="Tìm theo tên sách hoặc tác giả…"
                            aria-label="Tìm sách"
                            className="min-w-0 flex-1 bg-transparent px-1 py-2.5 text-[15px] text-gray-900 outline-none placeholder:text-gray-400"
                        />
                        <Button type="submit" variant="brand" className="h-11 rounded-full px-6">
                            Tìm sách
                        </Button>
                    </form>

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                        <span className="text-xs font-medium text-gray-400">Gợi ý:</span>
                        {QUICK_CATEGORIES.map((category) => (
                            <button
                                key={category}
                                type="button"
                                onClick={() => navigate(`/search?category=${encodeURIComponent(category)}`)}
                                className="cursor-pointer rounded-full border border-gray-200 bg-white/60 px-3 py-1 text-xs font-medium text-gray-700 backdrop-blur transition-colors hover:border-[#e60023] hover:text-[#e60023]"
                            >
                                {category}
                            </button>
                        ))}
                    </div>

                    <div className="mt-8 flex flex-wrap items-center gap-3">
                        <Button variant="outline" className="h-12 rounded-full px-7" onClick={() => navigate("/login")}>
                            Đăng nhập để mượn sách
                            <ArrowRight className="h-4 w-4" aria-hidden="true" />
                        </Button>
                        <button
                            type="button"
                            onClick={() => navigate("/search")}
                            className="cursor-pointer text-sm font-semibold text-gray-600 underline-offset-4 hover:text-[#e60023] hover:underline"
                        >
                            Xem toàn bộ danh mục
                        </button>
                    </div>
                </div>

                {/* Cover collage */}
                <div className="lg:col-span-6">
                    <div className="relative mx-auto aspect-[1/1.02] w-full max-w-[540px]" aria-hidden={collage.length === 0}>
                        {COLLAGE_POSES.map(([rotate, x, y, width, z, delay], index) => {
                            const book = collage[index];
                            return (
                                <button
                                    key={index}
                                    type="button"
                                    disabled={!book}
                                    onClick={() => book && navigate(`/books/${book.id}`)}
                                    aria-label={book ? `Xem sách ${book.title}` : undefined}
                                    tabIndex={book ? 0 : -1}
                                    className="landing-float absolute cursor-pointer disabled:cursor-default"
                                    style={{
                                        left: `${x}%`,
                                        top: `${y}%`,
                                        width: `${width}%`,
                                        zIndex: z,
                                        animationDelay: `${delay}s`,
                                        ["--rotate" as string]: `${rotate}deg`,
                                    }}
                                >
                                    <div className="aspect-[2/3] overflow-hidden rounded-xl bg-gray-200 shadow-2xl shadow-black/30 ring-1 ring-black/10 transition-transform duration-300 hover:scale-105">
                                        {book ? (
                                            <BookCover imageUrl={book.coverImageUrl} title={book.title} iconClassName="h-10 w-10 text-gray-400" />
                                        ) : (
                                            <div className={`h-full w-full bg-gradient-to-br from-gray-100 to-gray-300 ${loading ? "animate-pulse" : ""}`} />
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        </section>
    );
}
