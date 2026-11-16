import { useState, useEffect } from "react";
import { Star, X, LoaderCircle } from "lucide-react";
import { Button } from "../ui/button";
import type { ReviewResponse } from "../../lib/reviews";

interface ReviewFormModalProps {
  isOpen: boolean;
  bookTitle: string;
  initialReview?: ReviewResponse | null;
  onClose: () => void;
  onSubmit: (rating: number, comment?: string) => Promise<void>;
}

const RATING_LABELS: Record<number, string> = {
  1: "Rất tệ",
  2: "Tệ",
  3: "Bình thường",
  4: "Hài lòng",
  5: "Tuyệt vời",
};

export default function ReviewFormModal({
  isOpen,
  bookTitle,
  initialReview,
  onClose,
  onSubmit,
}: ReviewFormModalProps) {
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [comment, setComment] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialReview) {
      setRating(initialReview.rating);
      setComment(initialReview.comment || "");
    } else {
      setRating(5);
      setComment("");
    }
    setError(null);
  }, [initialReview, isOpen]);

  if (!isOpen) return null;

  const activeRating = hoverRating ?? rating;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedComment = comment.trim();
    if (trimmedComment.length > 0 && trimmedComment.length < 10) {
      setError("Nhận xét cần có độ dài tối thiểu 10 ký tự.");
      return;
    }
    if (trimmedComment.length > 1000) {
      setError("Nhận xét không được vượt quá 1000 ký tự.");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(rating, trimmedComment.length > 0 ? trimmedComment : undefined);
      onClose();
    } catch (err: any) {
      const serverMessage =
        err?.response?.data?.message ||
        err?.response?.data?.detail ||
        "Có lỗi xảy ra khi lưu đánh giá. Vui lòng thử lại.";
      setError(serverMessage);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 animate-in fade-in zoom-in-95 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-xl font-bold text-gray-900">
          {initialReview ? "Chỉnh sửa đánh giá" : "Đánh giá sách"}
        </h2>
        <p className="text-xs text-gray-500 mt-0.5 line-clamp-1 font-medium">
          {bookTitle}
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Star selector */}
          <div className="flex flex-col items-center justify-center py-3 bg-gray-50 rounded-xl border border-gray-100">
            <span className="text-xs text-gray-500 mb-2 font-medium">
              Bạn đánh giá cuốn sách này thế nào?
            </span>
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(null)}
                  onClick={() => setRating(star)}
                  className="p-1 rounded hover:scale-115 transition-transform cursor-pointer focus:outline-none"
                  title={`${star} sao`}
                >
                  <Star
                    className={`w-7 h-7 transition-colors ${star <= activeRating
                      ? "text-amber-400 fill-amber-400"
                      : "text-gray-200 fill-gray-100"
                      }`}
                  />
                </button>
              ))}
            </div>
            <span className="text-xs font-semibold text-amber-600 mt-2 min-h-4">
              {RATING_LABELS[activeRating]} ({activeRating} sao)
            </span>
          </div>

          {/* Comment text area */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label htmlFor="review-comment" className="text-xs font-semibold text-gray-700">
                Nhận xét chi tiết <span className="text-gray-400 font-normal">(không bắt buộc)</span>
              </label>
              <span
                className={`text-[11px] ${comment.length > 1000 ? "text-red-500 font-semibold" : "text-gray-400"
                  }`}
              >
                {comment.length} / 1000
              </span>
            </div>
            <textarea
              id="review-comment"
              rows={4}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Chia sẻ cảm nhận của bạn sau khi đọc..."
              className="w-full text-sm rounded-xl border border-gray-200 p-3 focus:outline-none focus:ring-2 focus:ring-[#e60023]/20 focus:border-[#e60023] transition-colors resize-none placeholder:text-gray-400"
            />
          </div>

          {/* Error display */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-xs text-red-600 rounded-xl">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={submitting}
              className="rounded-xl"
            >
              Hủy
            </Button>
            <Button
              type="submit"
              variant="brand"
              disabled={submitting}
              className="rounded-xl min-w-28"
            >
              {submitting ? (
                <>
                  <LoaderCircle className="w-4 h-4 animate-spin mr-1.5" />
                  Đang lưu...
                </>
              ) : initialReview ? (
                "Lưu thay đổi"
              ) : (
                "Gửi đánh giá"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

