import { useEffect, useState, useCallback } from "react";
import ReviewStatsBreakdown from "./ReviewStatsBreakdown";
import ReviewList from "./ReviewList";
import {
  getBookReviews,
  getBookReviewStats,
  type ReviewResponse,
  type ReviewStatsResponse,
} from "../../lib/reviews";

interface BookReviewsSectionProps {
  bookId: string;
}

export default function BookReviewsSection({ bookId }: BookReviewsSectionProps) {
  const [reviews, setReviews] = useState<ReviewResponse[]>([]);
  const [stats, setStats] = useState<ReviewStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [selectedRating, setSelectedRating] = useState<number | null>(null);

  const fetchReviews = useCallback(
    async (page: number) => {
      setLoading(true);
      try {
        const [reviewsPage, statsData] = await Promise.all([
          getBookReviews(bookId, page, 10),
          getBookReviewStats(bookId),
        ]);
        setReviews(reviewsPage.content || []);
        setTotalPages(reviewsPage.totalPages || 0);
        setCurrentPage(reviewsPage.number || 0);
        setStats(statsData);
      } catch (err) {
        console.error("Lỗi khi tải đánh giá sách:", err);
      } finally {
        setLoading(false);
      }
    },
    [bookId]
  );

  useEffect(() => {
    fetchReviews(0);
  }, [fetchReviews]);

  return (
    <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 md:p-8 mt-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Đánh giá từ độc giả</h2>
          <p className="text-xs text-gray-500 mt-1">
            Tổng hợp nhận xét và đánh giá thực tế từ bạn đọc đã mượn sách
          </p>
        </div>
      </div>

      {/* Rating Breakdown */}
      <ReviewStatsBreakdown
        stats={stats}
        selectedRating={selectedRating}
        onSelectRating={setSelectedRating}
      />

      {/* Review List */}
      <div className="mt-8">
        <ReviewList
          reviews={reviews}
          loading={loading}
          currentPage={currentPage}
          totalPages={totalPages}
          selectedRating={selectedRating}
          onSelectRating={setSelectedRating}
          onPageChange={(page) => fetchReviews(page)}
        />
      </div>
    </section>
  );
}
