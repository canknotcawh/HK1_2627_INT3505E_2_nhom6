import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Eye, EyeOff, LoaderCircle, MessageSquare, RefreshCw, Star, Trash2, UserRound } from "lucide-react";
import apiClient from "../lib/api-client";
import { actionErrorMessage, listErrorMessage } from "../lib/http-errors";
import { deleteReview, hideReview, listAdminReviews, restoreReview, type AdminReview, type ReviewStatus } from "../lib/reviews";

const PAGE_SIZE = 10;

function StarScore({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5" title={`${rating}/5 sao`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`size-3.5 ${star <= rating
            ? "fill-amber-400 text-amber-400"
            : "fill-neutral-200 text-neutral-200"
            }`}
        />
      ))}
      <span className="ml-1 text-xs font-semibold text-neutral-600">{rating}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: ReviewStatus }) {
  if (status === "VISIBLE") {
    return (
      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 border border-emerald-200">
        Công khai
      </span>
    );
  }
  if (status === "HIDDEN_BY_ADMIN") {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800 border border-amber-200">
        Đã ẩn bởi admin
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-600 border border-neutral-200">
      {status}
    </span>
  );
}

export default function ReviewManagement() {
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [bookTitles, setBookTitles] = useState<Record<string, string>>({});
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [workingReviewIds, setWorkingReviewIds] = useState<Set<string>>(() => new Set());
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const loadReviews = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listAdminReviews(page, PAGE_SIZE);
      setReviews(data.content);
      setTotalPages(data.totalPages);
      setTotalElements(data.totalElements);
    } catch (err) {
      console.error("Không thể tải danh sách đánh giá:", err);
      setError(listErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    void loadReviews();
  }, [loadReviews]);

  // Lazy-resolve book titles for any books not already in cache
  useEffect(() => {
    const missingBookIds = reviews
      .map((r) => r.bookId)
      .filter((id) => !bookTitles[id]);

    if (missingBookIds.length === 0) return;

    const uniqueIds = Array.from(new Set(missingBookIds));
    let isCancelled = false;

    Promise.allSettled(
      uniqueIds.map((bookId) =>
        apiClient.get<{ title: string }>(`/public/books/${bookId}`)
      )
    ).then((results) => {
      if (isCancelled) return;
      setBookTitles((prev) => {
        const next = { ...prev };
        results.forEach((res, index) => {
          if (res.status === "fulfilled" && res.value.data?.title) {
            next[uniqueIds[index]] = res.value.data.title;
          }
        });
        return next;
      });
    });

    return () => {
      isCancelled = true;
    };
  }, [reviews, bookTitles]);

  const handleHide = async (review: AdminReview) => {
    if (!window.confirm(`Xác nhận ẩn đánh giá của "${review.userName}"?`)) {
      return;
    }

    setWorkingReviewIds((prev) => new Set(prev).add(review.id));
    setError(null);
    setNotice(null);

    try {
      await hideReview(review.id);
      setNotice(`Đã ẩn đánh giá của ${review.userName}.`);
      await loadReviews();
    } catch (err) {
      console.error("Không thể ẩn đánh giá:", err);
      setError(actionErrorMessage(err, "Không thể ẩn đánh giá. Vui lòng thử lại."));
    } finally {
      setWorkingReviewIds((prev) => {
        const next = new Set(prev);
        next.delete(review.id);
        return next;
      });
    }
  };

  const handleRestore = async (review: AdminReview) => {
    if (!window.confirm(`Xác nhận khôi phục lại đánh giá của "${review.userName}"?`)) {
      return;
    }

    setWorkingReviewIds((prev) => new Set(prev).add(review.id));
    setError(null);
    setNotice(null);

    try {
      await restoreReview(review.id);
      setNotice(`Đã khôi phục hiển thị đánh giá của ${review.userName}.`);
      await loadReviews();
    } catch (err) {
      console.error("Không thể khôi phục đánh giá:", err);
      setError(actionErrorMessage(err, "Không thể khôi phục đánh giá. Vui lòng thử lại."));
    } finally {
      setWorkingReviewIds((prev) => {
        const next = new Set(prev);
        next.delete(review.id);
        return next;
      });
    }
  };

  const handleDelete = async (review: AdminReview) => {
    if (!window.confirm(`Xác nhận xóa vĩnh viễn đánh giá của "${review.userName}"? Hành động này không thể hoàn tác.`)) {
      return;
    }

    setWorkingReviewIds((prev) => new Set(prev).add(review.id));
    setError(null);
    setNotice(null);

    try {
      await deleteReview(review.id);
      setNotice(`Đã xóa vĩnh viễn đánh giá của ${review.userName}.`);
      await loadReviews();
    } catch (err) {
      console.error("Không thể xóa đánh giá:", err);
      setError(actionErrorMessage(err, "Không thể xóa đánh giá. Vui lòng thử lại."));
    } finally {
      setWorkingReviewIds((prev) => {
        const next = new Set(prev);
        next.delete(review.id);
        return next;
      });
    }
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  };

  const filteredReviews = statusFilter === "ALL"
    ? reviews
    : reviews.filter((r) => r.status === statusFilter);

  const actionButtonClass =
    "inline-flex min-h-8 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border px-2.5 py-1.5 text-xs transition-colors hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-45";

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-neutral-900">Quản lý đánh giá</h1>
          <p className="text-sm text-neutral-500">
            Kiểm duyệt, ẩn hoặc xóa các đánh giá và phản hồi của người dùng.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-neutral-100 px-3 py-1 text-sm text-neutral-600">
            {totalElements} đánh giá
          </span>
          <button
            type="button"
            disabled={loading}
            onClick={() => void loadReviews()}
            className="inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm hover:bg-neutral-100 disabled:opacity-50"
            title="Tải lại danh sách"
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            Làm mới
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-white p-4">
        <label className="text-sm font-medium text-neutral-700">Lọc theo trạng thái:</label>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Lọc theo trạng thái"
          className="h-10 rounded-lg border bg-white px-3 text-sm"
        >
          <option value="ALL">Tất cả ({reviews.length})</option>
          <option value="VISIBLE">Công khai</option>
          <option value="HIDDEN_BY_ADMIN">Đã ẩn bởi admin</option>
        </select>
      </div>

      {notice && (
        <p role="status" className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-800">
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-800">
          {error}
        </p>
      )}

      <div className="overflow-hidden rounded-xl border bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-4 py-3 font-medium">Người đánh giá</th>
                <th className="px-4 py-3 font-medium">Sách</th>
                <th className="px-4 py-3 font-medium">Đánh giá</th>
                <th className="px-4 py-3 font-medium min-w-[220px]">Nhận xét</th>
                <th className="px-4 py-3 font-medium">Thời gian</th>
                <th className="px-4 py-3 font-medium">Trạng thái</th>
                <th className="px-4 py-3 text-right font-medium">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-neutral-500">
                    <LoaderCircle className="mr-2 inline size-4 animate-spin" />
                    Đang tải đánh giá…
                  </td>
                </tr>
              ) : filteredReviews.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-neutral-500">
                    <MessageSquare className="mx-auto mb-2 size-6 text-neutral-400" />
                    Không có đánh giá nào phù hợp.
                  </td>
                </tr>
              ) : (
                filteredReviews.map((review) => {
                  const isWorking = workingReviewIds.has(review.id);
                  const bookTitle = bookTitles[review.bookId];

                  return (
                    <tr key={review.id} className="hover:bg-neutral-50/70">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-neutral-200 text-neutral-700">
                            <UserRound className="size-4" />
                          </div>
                          <div>
                            <div className="font-medium text-neutral-900">{review.userName}</div>
                            <div className="text-[11px] font-mono text-neutral-400">
                              {review.userId.slice(0, 8)}...
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="max-w-[200px]">
                          <div className="truncate font-medium text-neutral-900" title={bookTitle || review.bookId}>
                            {bookTitle ?? "Đang tải tên sách..."}
                          </div>
                          <div className="text-[11px] font-mono text-neutral-400 truncate" title={review.bookId}>
                            ID: {review.bookId.slice(0, 8)}...
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <StarScore rating={review.rating} />
                      </td>

                      <td className="px-4 py-3">
                        {review.comment ? (
                          <p className="line-clamp-3 text-neutral-700 whitespace-pre-line text-xs">
                            {review.comment}
                          </p>
                        ) : (
                          <span className="italic text-xs text-neutral-400">
                            (Không có nhận xét)
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-xs text-neutral-600 whitespace-nowrap">
                        <div>{formatDate(review.createdAt)}</div>
                        {review.updatedAt && review.updatedAt !== review.createdAt && (
                          <div className="text-[10px] text-neutral-400 italic">Đã sửa</div>
                        )}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        <StatusBadge status={review.status} />
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          {review.status === "VISIBLE" && (
                            <button
                              type="button"
                              disabled={isWorking}
                              onClick={() => void handleHide(review)}
                              className={`${actionButtonClass} text-amber-700 hover:bg-amber-50 hover:border-amber-300`}
                              title="Ẩn đánh giá này khỏi người dùng"
                            >
                              {isWorking ? (
                                <LoaderCircle className="size-3.5 animate-spin" />
                              ) : (
                                <EyeOff className="size-3.5" />
                              )}
                              Ẩn
                            </button>
                          )}

                          {review.status === "HIDDEN_BY_ADMIN" && (
                            <button
                              type="button"
                              disabled={isWorking}
                              onClick={() => void handleRestore(review)}
                              className={`${actionButtonClass} text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300`}
                              title="Khôi phục và hiển thị lại đánh giá này công khai"
                            >
                              {isWorking ? (
                                <LoaderCircle className="size-3.5 animate-spin" />
                              ) : (
                                <Eye className="size-3.5" />
                              )}
                              Khôi phục
                            </button>
                          )}

                          <button
                            type="button"
                            disabled={isWorking}
                            onClick={() => void handleDelete(review)}
                            className={`${actionButtonClass} text-red-600 hover:bg-red-50 hover:border-red-300`}
                            title="Xóa vĩnh viễn đánh giá này"
                          >
                            {isWorking ? (
                              <LoaderCircle className="size-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="size-3.5" />
                            )}
                            Xóa
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-neutral-500">
          <span>
            Trang {totalPages === 0 ? 0 : page + 1} / {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              disabled={page <= 0 || loading}
              onClick={() => setPage((value) => Math.max(0, value - 1))}
              aria-label="Trang trước"
              className="rounded-md border p-2 disabled:opacity-40 hover:bg-neutral-50"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              disabled={page + 1 >= totalPages || loading}
              onClick={() => setPage((value) => value + 1)}
              aria-label="Trang sau"
              className="rounded-md border p-2 disabled:opacity-40 hover:bg-neutral-50"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

