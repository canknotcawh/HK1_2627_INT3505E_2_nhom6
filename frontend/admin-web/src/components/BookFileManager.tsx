import { useCallback, useEffect, useRef, useState } from "react";
import { isAxiosError } from "axios";
import { FileText, LoaderCircle, Trash2, Upload } from "lucide-react";
import apiClient from "../lib/api-client";
import { actionErrorMessage } from "../lib/http-errors";

type BookFileKind = "PREVIEW" | "FULL";

type BookFile = {
  id: string;
  kind: BookFileKind;
  originalName: string;
  contentType: string;
  sizeBytes: number;
  pageCount: number | null;
  status: "ACTIVE" | "ARCHIVED";
  createdAt: string;
  archivedAt: string | null;
};

const KINDS: { kind: BookFileKind; label: string; hint: string }[] = [
  { kind: "PREVIEW", label: "Bản xem trước", hint: "Người đọc xem thử, không cần mượn" },
  { kind: "FULL", label: "Bản đầy đủ", hint: "Chỉ người đang mượn sách đọc được" },
];

function formatSize(bytes: number) {
  return bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function uploadErrorMessage(error: unknown) {
  if (isAxiosError(error) && error.response) {
    switch (error.response.status) {
      case 413:
        return "Tệp vượt quá dung lượng cho phép (tối đa 50 MB).";
      case 415:
        return "Chỉ chấp nhận tệp PDF.";
      case 422:
        return "Tệp không phải PDF hợp lệ hoặc đã hỏng.";
      default:
        return actionErrorMessage(error, `Tải tệp thất bại (HTTP ${error.response.status}).`);
    }
  }
  return actionErrorMessage(error, "Không tải được tệp PDF.");
}

export default function BookFileManager({ bookId }: { bookId: string }) {
  const [files, setFiles] = useState<BookFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyKind, setBusyKind] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiClient.get<BookFile[]>(`/admin/books/${bookId}/files`);
      setFiles(response.data);
      setError(null);
    } catch (requestError) {
      setError(actionErrorMessage(requestError, "Không tải được danh sách tệp PDF."));
    } finally {
      setLoading(false);
    }
  }, [bookId]);

  useEffect(() => {
    void load();
  }, [load]);

  const upload = async (kind: BookFileKind, file: File) => {
    const data = new FormData();
    data.append("kind", kind);
    data.append("file", file);
    setBusyKind(kind);
    setError(null);
    setNotice(null);
    try {
      await apiClient.post(`/admin/books/${bookId}/files`, data);
      setNotice(`Đã tải lên ${KINDS.find(item => item.kind === kind)?.label.toLowerCase()} “${file.name}”.`);
      await load();
    } catch (requestError) {
      setError(uploadErrorMessage(requestError));
    } finally {
      setBusyKind(null);
      const input = inputs.current[kind];
      if (input) input.value = "";
    }
  };

  const archive = async (file: BookFile) => {
    if (!window.confirm(`Lưu trữ tệp “${file.originalName}”? Tệp vẫn được giữ để đối soát nhưng không còn phục vụ người đọc.`)) {
      return;
    }
    setBusyKind(file.kind);
    setError(null);
    setNotice(null);
    try {
      await apiClient.delete(`/admin/books/${bookId}/files/${file.id}`);
      setNotice(`Đã lưu trữ tệp “${file.originalName}”.`);
      await load();
    } catch (requestError) {
      setError(actionErrorMessage(requestError, "Không lưu trữ được tệp."));
    } finally {
      setBusyKind(null);
    }
  };

  return (
    <div className="md:col-span-2 space-y-3 rounded-xl border border-gray-100 bg-neutral-50/60 p-4">
      <div>
        <h3 className="text-sm font-semibold text-gray-800">Tệp PDF của sách</h3>
        <p className="mt-0.5 text-xs text-neutral-500">
          Tệp không bao giờ public: người đọc chỉ mở được qua link có canary token (P2). Tối đa 50 MB, chỉ định dạng PDF.
        </p>
      </div>

      {notice && <p role="status" className="rounded-lg bg-emerald-50 p-2.5 text-xs text-emerald-800">{notice}</p>}
      {error && <p role="alert" className="rounded-lg bg-red-50 p-2.5 text-xs text-red-800">{error}</p>}

      {loading ? (
        <p className="text-xs text-neutral-500"><LoaderCircle className="mr-1.5 inline size-3.5 animate-spin" />Đang tải tệp…</p>
      ) : (
        KINDS.map(({ kind, label, hint }) => {
          const active = files.find(file => file.kind === kind && file.status === "ACTIVE");
          const busy = busyKind === kind;
          return (
            <div key={kind} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2.5">
              <div className="min-w-48">
                <div className="flex items-center gap-1.5 text-sm font-medium text-gray-800">
                  <FileText className="size-4 text-neutral-400" />{label}
                </div>
                {active ? (
                  <div className="mt-0.5 text-xs text-neutral-600">
                    {active.originalName} · {formatSize(active.sizeBytes)}
                    {active.pageCount ? ` · ${active.pageCount} trang` : ""}
                    {" · "}{new Date(active.createdAt).toLocaleDateString("vi-VN")}
                  </div>
                ) : (
                  <div className="mt-0.5 text-xs text-neutral-500">{hint} — chưa có tệp</div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <input
                  ref={element => { inputs.current[kind] = element; }}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={event => {
                    const file = event.target.files?.[0];
                    if (file) void upload(kind, file);
                  }}
                />
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => inputs.current[kind]?.click()}
                  className="inline-flex min-h-8 items-center gap-1.5 rounded-md border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
                >
                  {busy ? <LoaderCircle className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
                  {active ? "Thay thế" : "Tải lên"}
                </button>
                {active && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void archive(active)}
                    className="inline-flex min-h-8 items-center gap-1.5 rounded-md border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-50"
                  >
                    <Trash2 className="size-3.5" />Lưu trữ
                  </button>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
