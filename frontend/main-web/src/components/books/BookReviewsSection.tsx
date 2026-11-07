import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { PenLine, Info, LogIn } from "lucide-react";
import ReviewStatsBreakdown from "./ReviewStatsBreakdown";
import ReviewList from "./ReviewList";
import ReviewFormModal from "./ReviewFormModal";
import DeleteReviewModal from "./DeleteReviewModal";
import Toast from "../ui/Toast";
import { Button } from "../ui/button";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../hooks/useToast";
import {
  getBookReviews,
  getBookReviewStats,
  getMyReview,
  checkReviewEligibility,
  createReview,
  updateReview,
  deleteReview,
  type ReviewResponse,
  type ReviewStatsResponse,
  type ReviewEligibilityResponse,
} from "../../lib/reviews";

interface BookReviewsSectionProps {
  bookId: string;
  bookTitle: string;
  onReviewChanged?: () => void;
}

export default function BookReviewsSection({
  bookId,
  bookTitle,
  onReviewChanged,
}: BookReviewsSectionProps) {
  const { role } = useAuth();
  const navigate = useNavigate();
  const { toast, showToast } = useToast();

  const [reviews, setReviews] = useState<ReviewResponse[]>([]);
  const [stats, setStats] = useState<ReviewStatsResponse | null>(null);
  const [myReview, setMyReview] = useState<ReviewResponse | null>(null);
  const [eligibility, setEligibility] = useState<ReviewEligibilityResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [selectedRating, setSelectedRating] = useState<number | null>(null);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const fetchReviewsAndStats = useCallback(
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

  const fetchUserStatus = useCallback(async () => {
    if (role === "guest") {
      setMyReview(null);
      setEligibility(null);
      return;
    }
    try {
      const [userReview, userEligibility] = await Promise.all([
        getMyReview(bookId),
        checkReviewEligibility(bookId),
      ]);
      setMyReview(userReview);
      setEligibility(userEligibility);
    } catch (err) {
      console.error("Lỗi khi kiểm tra điều kiện đánh giá của bạn đọc:", err);
    }
  }, [bookId, role]);

  useEffect(() => {
    fetchReviewsAndStats(0);
    fetchUserStatus();
  }, [fetchReviewsAndStats, fetchUserStatus]);

  const handleFormSubmit = async (rating: number, comment?: string) => {
    if (myReview) {
      await updateReview(myReview.id, { rating, comment });
      showToast("Cập nhật đánh giá thành công!", "success");
    } else {
      await createReview(bookId, { rating, comment });
      showToast("Gửi đánh giá thành công! Cảm ơn bạn đã đóng góp ý kiến.", "success");
    }
    await Promise.all([fetchReviewsAndStats(currentPage), fetchUserStatus()]);
    onReviewChanged?.();
  };

  const handleConfirmDelete = async () => {
    if (!myReview) return;
    try {
      await deleteReview(myReview.id);
      showToast("Đã xóa đánh giá của bạn.", "success");
      setMyReview(null);
      await Promise.all([fetchReviewsAndStats(0), fetchUserStatus()]);
      onReviewChanged?.();
    } catch (err) {
      console.error("Lỗi khi xóa đánh giá:", err);
      showToast("Không thể xóa đánh giá. Vui lòng thử lại.", "error");
    }
  };

  return (
    <section
      id="reviews"
      className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 md:p-8 mt-6 relative scroll-mt-8"
    >
      <Toast toast={toast} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Đánh giá</h2>
        </div>

        {/* Action Button */}
        <div>
          {role === "guest" ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => navigate("/login")}
              className="rounded-xl text-xs gap-1.5 cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              Đăng nhập để đánh giá
            </Button>
          ) : !myReview && eligibility?.eligible ? (
            <Button
              type="button"
              variant="brand"
              size="sm"
              onClick={() => setIsFormOpen(true)}
              className="rounded-xl text-xs gap-1.5 cursor-pointer"
            >
              <PenLine className="w-3.5 h-3.5" />
              Viết đánh giá
            </Button>
          ) : null}
        </div>
      </div>

      {/* Ineligibility banner */}
      {role !== "guest" && !myReview && eligibility && !eligibility.eligible && (
        <div className="flex items-start gap-2.5 p-3.5 bg-blue-50/60 border border-blue-100 rounded-xl text-xs text-blue-700 mb-6">
          <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
          <span>
            {eligibility.reason ||
              "Bạn cần mượn và hoàn thành trả cuốn sách này trước khi có thể gửi đánh giá."}
          </span>
        </div>
      )}

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
          myReview={myReview}
          loading={loading}
          currentPage={currentPage}
          totalPages={totalPages}
          selectedRating={selectedRating}
          onSelectRating={setSelectedRating}
          onPageChange={(page) => fetchReviewsAndStats(page)}
          onEditMyReview={() => setIsFormOpen(true)}
          onDeleteMyReview={() => setIsDeleteOpen(true)}
        />
      </div>

      {/* Modals */}
      <ReviewFormModal
        isOpen={isFormOpen}
        bookTitle={bookTitle}
        initialReview={myReview}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleFormSubmit}
      />

      <DeleteReviewModal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleConfirmDelete}
      />
    </section>
  );
}
