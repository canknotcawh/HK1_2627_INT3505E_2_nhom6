import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Shuffle } from "lucide-react";
import BookCover from "@/components/books/BookCover";
import type { BookDto } from "@/lib/books";

type ShelfSectionProps = {
    books: BookDto[];
    loading: boolean;
    shuffling: boolean;
    onShuffle: () => void;
};

export default function ShelfSection({ books, loading, shuffling, onShuffle }: ShelfSectionProps) {
    const navigate = useNavigate();
    const trackRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    const updateArrows = useCallback(() => {
        const track = trackRef.current;
        if (!track) return;
        setCanScrollLeft(track.scrollLeft > 8);
        setCanScrollRight(track.scrollLeft + track.clientWidth < track.scrollWidth - 8);
    }, []);

    useEffect(() => {
        updateArrows();
        const track = trackRef.current;
        if (!track) return;
        track.scrollTo({ left: 0 });
        const observer = new ResizeObserver(updateArrows);
        observer.observe(track);
        return () => observer.disconnect();
    }, [books, updateArrows]);

    const scrollByPage = (direction: 1 | -1) => {
        const track = trackRef.current;
        if (!track) return;
        track.scrollBy({ left: direction * track.clientWidth * 0.8, behavior: "smooth" });
    };

    if (!loading && books.length === 0) return null;
    const items: Array<BookDto | undefined> = loading && books.length === 0 ? Array.from({ length: 7 }) : books;

    return (
        <section className="container mx-auto px-4 py-6 md:py-10">
            <div className="relative overflow-hidden rounded-3xl border border-gray-100 bg-gradient-to-br from-gray-50 via-white to-gray-50 px-5 py-8 md:px-10 md:py-12">
                <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#e60023]/10 blur-3xl dark:bg-amber-300/10" />

                <div className="relative flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#e60023]">Kệ sách hôm nay</p>
                        <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-gray-900 md:text-4xl">Gợi ý cho bạn</h2>
                        <p className="mt-2 text-gray-500">Mười cuốn được chọn ngẫu nhiên từ kho sách.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onShuffle}
                            disabled={shuffling}
                            className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-full border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 transition-colors hover:border-[#e60023] hover:text-[#e60023] disabled:cursor-wait disabled:opacity-60"
                        >
                            <Shuffle className={`h-4 w-4 ${shuffling ? "animate-spin" : ""}`} aria-hidden="true" />
                            Đổi kệ khác
                        </button>
                        <button
                            type="button"
                            onClick={() => scrollByPage(-1)}
                            disabled={!canScrollLeft}
                            aria-label="Cuộn sang trái"
                            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 transition-colors hover:border-[#e60023] hover:text-[#e60023] disabled:cursor-default disabled:opacity-35 disabled:hover:border-gray-200 disabled:hover:text-gray-700"
                        >
                            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                        </button>
                        <button
                            type="button"
                            onClick={() => scrollByPage(1)}
                            disabled={!canScrollRight}
                            aria-label="Cuộn sang phải"
                            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 transition-colors hover:border-[#e60023] hover:text-[#e60023] disabled:cursor-default disabled:opacity-35 disabled:hover:border-gray-200 disabled:hover:text-gray-700"
                        >
                            <ChevronRight className="h-5 w-5" aria-hidden="true" />
                        </button>
                    </div>
                </div>

                <div className="relative mt-8">
                    <div
                        ref={trackRef}
                        onScroll={updateArrows}
                        className={`-mx-2 flex snap-x snap-mandatory gap-5 overflow-x-auto px-2 pb-2 pt-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${shuffling ? "opacity-50" : ""} transition-opacity`}
                    >
                        {items.map((book, index) => (
                            <button
                                key={book?.id ?? index}
                                type="button"
                                disabled={!book}
                                onClick={() => book && navigate(`/books/${book.id}`)}
                                className="group w-36 shrink-0 cursor-pointer snap-start text-left sm:w-40 disabled:cursor-default"
                            >
                                <div className="relative aspect-[2/3] overflow-hidden rounded-2xl bg-gray-200 shadow-lg shadow-gray-900/15 ring-1 ring-black/10 transition-all duration-300 group-hover:-translate-y-2 group-hover:shadow-2xl group-hover:shadow-gray-900/30">
                                    {book ? (
                                        <>
                                            <BookCover
                                                imageUrl={book.coverImageUrl}
                                                title={book.title}
                                                imageClassName="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                                                iconClassName="h-10 w-10 text-gray-400"
                                            />
                                            <span className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-bold backdrop-blur ${
                                                book.availableCopies > 0 ? "bg-emerald-500/90 text-white" : "bg-slate-800/80 text-slate-200"
                                            }`}>
                                                {book.availableCopies > 0 ? `Còn ${book.availableCopies}` : "Hết sách"}
                                            </span>
                                        </>
                                    ) : (
                                        <div className="h-full w-full animate-pulse bg-gray-200" />
                                    )}
                                </div>
                                {book && (
                                    <div className="px-0.5 pt-3">
                                        <p className="line-clamp-2 min-h-10 text-sm font-semibold leading-5 text-gray-900 group-hover:text-[#e60023]">{book.title}</p>
                                        <p className="mt-1 line-clamp-1 text-xs text-gray-500">{book.authors?.join(", ") || "Chưa rõ tác giả"}</p>
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                    {canScrollRight && (
                        <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-white/90 to-transparent dark:from-[var(--surface)]" />
                    )}
                </div>
            </div>
        </section>
    );
}
