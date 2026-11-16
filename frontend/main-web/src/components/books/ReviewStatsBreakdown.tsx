import { Star } from "lucide-react";
import type { ReviewStatsResponse } from "../../lib/reviews";

interface ReviewStatsBreakdownProps {
  stats: ReviewStatsResponse | null;
  selectedRating: number | null;
  onSelectRating: (rating: number | null) => void;
}

export default function ReviewStatsBreakdown({
  stats,
  selectedRating,
  onSelectRating,
}: ReviewStatsBreakdownProps) {
  if (!stats) return null;

  const total = stats.totalReviews || 0;
  const avg = stats.averageRating ? Number(stats.averageRating).toFixed(1) : "0.0";
  const distribution = stats.ratingDistribution || {};

  return (
    <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 flex flex-col md:flex-row items-center gap-8">
      {/* Big Rating Summary */}
      <div className="flex flex-col items-center justify-center shrink-0 min-w-36 text-center">
        <span className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight">
          {avg}
        </span>
        <div className="flex items-center gap-1 my-2">
          {Array.from({ length: 5 }, (_, i) => (
            <Star
              key={i}
              className={`w-4 h-4 ${
                i < Math.round(Number(stats.averageRating || 0))
                  ? "text-amber-400 fill-amber-400"
                  : "text-gray-200 fill-gray-100"
              }`}
            />
          ))}
        </div>
        <span className="text-xs text-gray-500 font-medium">
          {total > 0 ? `${total} lượt đánh giá` : "Chưa có lượt đánh giá"}
        </span>
      </div>

      {/* Progress Bars for each star */}
      <div className="flex-1 w-full space-y-2">
        {[5, 4, 3, 2, 1].map((stars) => {
          const count = Number(distribution[stars] || distribution[String(stars)] || 0);
          const percent = total > 0 ? Math.round((count / total) * 100) : 0;
          const isSelected = selectedRating === stars;

          return (
            <button
              key={stars}
              type="button"
              onClick={() => onSelectRating(isSelected ? null : stars)}
              className={`w-full flex items-center gap-3 text-xs text-gray-600 hover:text-gray-900 transition-colors p-1 rounded-lg cursor-pointer ${
                isSelected ? "bg-amber-50 font-semibold" : ""
              }`}
            >
              <span className="w-12 text-left flex items-center gap-1 shrink-0 font-medium">
                {stars} <Star className="w-3 h-3 text-amber-400 fill-amber-400 inline" />
              </span>

              <div className="flex-1 h-2.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-400 rounded-full transition-all duration-300"
                  style={{ width: `${percent}%` }}
                />
              </div>

              <span className="w-10 text-right text-gray-400 font-normal shrink-0">
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

