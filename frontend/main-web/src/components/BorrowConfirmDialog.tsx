import { Button } from "./ui/button";
import type { BookDto } from "../lib/books";

export default function BorrowConfirmDialog({
  book,
  onCancel,
  onConfirm,
}: {
  book: BookDto | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!book) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold text-gray-800 mb-2">Xác nhận mượn sách</h2>
        <p className="text-gray-500 mb-6">
          Bạn muốn mượn cuốn <strong className="text-gray-800">"{book.title}"</strong>?
          <br />
          <span className="text-sm mt-2 block text-gray-400">
            Thời hạn mượn: 14 ngày kể từ hôm nay.
          </span>
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={onCancel}>
            Hủy
          </Button>
          <Button variant="brand" onClick={onConfirm}>
            Xác nhận mượn
          </Button>
        </div>
      </div>
    </div>
  );
}
