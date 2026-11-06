import { CheckCircle2, MessageSquare, ChevronLeft, ChevronRight } from "lucide-react";
import StarRating from "./StarRating";
import type { ReviewResponse } from "../../lib/reviews";

interface ReviewListProps {
  reviews: ReviewResponse[];
  loading: boolean;
  currentPage: number;
  totalPages: number;
  selectedRating: number | null;
  onSelectRating: (rating: number | null) => void;
  onPageChange: (page: number) => void;
}

function formatDate(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  } catch {
    return isoString;
  }
}

export default function ReviewList({
  reviews,
  loading,
  currentPage,
  totalPages,
  selectedRating,
  onSelectRating,
  onPageChange,
}: ReviewListProps) {
  // Filter reviews client-side if a specific star rating is selected
  const filteredReviews = selectedRating
    ? reviews.filter((r) => r.rating === selectedRating)
    : reviews;

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 pt-2 border-b border-gray-100 pb-3">
        <span className="text-xs text-gray-400 font-medium mr-1">Lọc theo:</span>
        <button
          type="button"
          onClick={() => onSelectRating(null)}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
            selectedRating === null
              ? "bg-gray-900 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          Tất cả
        </button>
        {[5, 4, 3, 2, 1].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onSelectRating(selectedRating === star ? null : star)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
              selectedRating === star
                ? "bg-amber-400 text-gray-900 font-semibold"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {star} ★
          </button>
        ))}
      </div>

      {/* Review items */}
      {loading ? (
        <div className="py-12 text-center text-sm text-gray-400">
          Đang tải danh sách đánh giá...
        </div>
      ) : filteredReviews.length === 0 ? (
        <div className="py-12 text-center text-gray-400">
          <MessageSquare className="w-10 h-10 mx-auto text-gray-200 mb-2" />
          <p className="text-sm">
            {selectedRating
              ? `Chưa có đánh giá nào ${selectedRating} sao.`
              : "Chưa có đánh giá nào cho cuốn sách này."}
          </p>
        </div>
      ) : (
        <div className="space-y-4 divide-y divide-gray-100">
          {filteredReviews.map((review) => {
            const isEdited =
              review.updatedAt &&
              new Date(review.updatedAt).getTime() -
                new Date(review.createdAt).getTime() >
                5000;

            const initial = review.userName
              ? review.userName.charAt(0).toUpperCase()
              : "U";

            return (
              <div key={review.id} className="pt-4 first:pt-0">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-red-100 text-[#e60023] font-bold text-xs flex items-center justify-center shrink-0">
                      {initial}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-800">
                          {review.userName}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/50">
                          <CheckCircle2 className="w-3 h-3" />
                          Đã mượn sách
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <StarRating rating={review.rating} size="sm" />
                        <span className="text-xs text-gray-400">
                          {formatDate(review.createdAt)}
                        </span>
                        {isEdited && (
                          <span className="text-[11px] text-gray-400 italic">
                            (Đã chỉnh sửa)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {review.comment ? (
                  <p className="text-sm text-gray-700 leading-relaxed pl-11">
                    {review.comment}
                  </p>
                ) : (
                  <p className="text-xs text-gray-400 italic pl-11">
                    (Người dùng chỉ để lại đánh giá sao)
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-6">
          <button
            type="button"
            disabled={currentPage <= 0}
            onClick={() => onPageChange(currentPage - 1)}
            className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            title="Trang trước"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs text-gray-500 font-medium px-2">
            Trang {currentPage + 1} / {totalPages}
          </span>
          <button
            type="button"
            disabled={currentPage >= totalPages - 1}
            onClick={() => onPageChange(currentPage + 1)}
            className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            title="Trang sau"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

