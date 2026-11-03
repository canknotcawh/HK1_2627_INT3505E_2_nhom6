import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import type { BookDto } from "../../lib/books";
import BookCover from "./BookCover";
import { Trophy, Star } from "lucide-react";

export type TopTimeRange = 'day' | 'week' | 'month';

interface Top10LeaderboardProps {
    books: BookDto[];
    className?: string;
}

export default function Top10Leaderboard({ books, className = '' }: Top10LeaderboardProps) {
    const navigate = useNavigate();
    const [period, setPeriod] = useState<TopTimeRange>('day');

    // Hàm tính top 10 sách theo ngày, tuần, tháng
    // In future: tạo /api/v1/public/books/top?period=..., thay thế hàm này thành API
    const top10 = useMemo(() => {
        if (!books.length) return [];

        const list = [...books];
        if (period === 'day') {
            // Day: rating cao nhất và available
            return list
                .sort((a, b) => (b.ratingCount ?? 0) - (a.ratingCount ?? 0) || Number(b.ratingAvg ?? 0) - Number(a.ratingAvg ?? 0))
                .slice(0, 10);
        } else if (period === 'week') {
            // Week: rating trung bình cao nhất
            return list
                .sort((a, b) => Number(b.ratingAvg ?? 0) - Number(a.ratingAvg ?? 0) || (b.ratingCount ?? 0) - (a.ratingCount ?? 0))
                .slice(0, 10);
        } else {
            // Month: năm phát hành và rating cao nhất
            return list
                .sort((a, b) => (b.publishedYear ?? 0) - (a.publishedYear ?? 0) || (b.ratingCount ?? 0) - (a.ratingCount ?? 0))
                .slice(0, 10);
        }
    }, [books, period]);

    const getRankBadgeClass = (rank: number) => {
        switch (rank) {
            case 1:
                return "bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-xs font-bold";
            case 2:
                return "bg-gradient-to-br from-slate-400 to-slate-600 text-white shadow-xs font-bold";
            case 3:
                return "bg-gradient-to-br from-amber-700 to-amber-900 text-white shadow-xs font-bold";
            default:
                return "bg-gray-100 text-gray-500 font-semibold";
        }
    };

    return (
        <aside className={`bg-white rounded-2xl border border-gray-100 shadow-xs p-5 ${className}`}>
            <div className="flex items-center justify-between gap-2 mb-4">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
                        <Trophy className="w-4 h-4" />
                    </div>
                    <h2 className="font-bold text-base text-gray-900 tracking-tight">
                        Top 10 Sách Hay
                    </h2>
                </div>
            </div>

            <div className="flex bg-gray-100/80 p-1 rounded-xl mb-4 gap-1">
                <button
                    type="button"
                    onClick={() => setPeriod('day')}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${period === 'day'
                        ? 'bg-white text-gray-900 shadow-xs font-semibold'
                        : 'text-gray-500 hover:text-gray-800'
                        }`}
                >
                    Hôm nay
                </button>
                <button
                    type="button"
                    onClick={() => setPeriod('week')}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${period === 'week'
                        ? 'bg-white text-gray-900 shadow-xs font-semibold'
                        : 'text-gray-500 hover:text-gray-800'
                        }`}
                >
                    Tuần này
                </button>
                <button
                    type="button"
                    onClick={() => setPeriod('month')}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${period === 'month'
                        ? 'bg-white text-gray-900 shadow-xs font-semibold'
                        : 'text-gray-500 hover:text-gray-800'
                        }`}
                >
                    Tháng này
                </button>
            </div>

            {/*Danh sách xếp hạng */}
            <div className="divide-y divide-gray-50">
                {top10.map((book, idx) => {
                    const rank = idx + 1;
                    const rating = Number(book.ratingAvg ?? 0);

                    return (
                        <div
                            key={book.id}
                            onClick={() => navigate(`/books/${book.id}`)}
                            className="group flex items-center gap-3 py-2.5 px-1.5 rounded-xl hover:bg-gray-50/80 cursor-pointer transition-colors"
                        >
                            {/* huy hiệu */}
                            <span
                                className={`w-6 h-6 rounded-md flex items-center justify-center text-xs shrink-0 ${getRankBadgeClass(
                                    rank
                                )}`}
                            >
                                {rank < 10 ? `0${rank}` : rank}
                            </span>

                            {/* ảnh bìa sách */}
                            <div className="w-10 aspect-2/3 bg-gray-100 rounded-md overflow-hidden shrink-0 shadow-2xs">
                                <BookCover
                                    imageUrl={book.coverImageUrl}
                                    title={book.title}
                                    imageClassName="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                    iconClassName="w-4 h-4 text-gray-300"
                                />
                            </div>

                            {/* Book info */}
                            <div className="flex-1 min-w-0">
                                <h3 className="text-xs font-semibold text-gray-800 truncate group-hover:text-[#e60023] transition-colors" title={book.title}>
                                    {book.title}
                                </h3>
                                <p className="text-[11px] text-gray-400 truncate mt-0.5">
                                    {book.authors?.join(', ') || 'Nhiều tác giả'}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                    {rating > 0 && (
                                        <div className="flex items-center gap-0.5 text-[10px] text-amber-500">
                                            <Star className="w-2.5 h-2.5 fill-amber-400 stroke-amber-400" />
                                            <span className="font-semibold">{rating.toFixed(1)}</span>
                                        </div>
                                    )}
                                    <span className="text-[10px] text-gray-400">
                                        {book.publishedYear ? `Năm ${book.publishedYear}` : ''}
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </aside>
    );
}

