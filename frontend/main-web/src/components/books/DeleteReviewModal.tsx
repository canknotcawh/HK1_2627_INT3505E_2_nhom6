import { useState } from "react";
import { AlertTriangle, LoaderCircle } from "lucide-react";
import { Button } from "../ui/button";

interface DeleteReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export default function DeleteReviewModal({
  isOpen,
  onClose,
  onConfirm,
}: DeleteReviewModalProps) {
  const [deleting, setDeleting] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setDeleting(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Xóa đánh giá?</h3>
            <p className="text-sm text-gray-500 mt-1 leading-relaxed">
              Bạn có chắc chắn muốn xóa đánh giá của mình không? Điểm đánh giá và bình luận này sẽ bị loại bỏ khỏi cuốn sách.
            </p>
          </div>
        </div>

        <div className="flex gap-2 justify-end mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={deleting}
            className="rounded-xl"
          >
            Hủy
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={deleting}
            className="rounded-xl bg-red-600 hover:bg-red-700 text-white"
          >
            {deleting ? (
              <>
                <LoaderCircle className="w-4 h-4 animate-spin mr-1.5" />
                Đang xóa...
              </>
            ) : (
              "Xóa đánh giá"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

