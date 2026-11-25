import { useEffect, useRef, useState } from "react";
import { LoaderCircle, Minus, Plus, RefreshCw, ShieldAlert, X } from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";
import type { PDFDocumentProxy } from "pdfjs-dist";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { readerFileUrl, sendReadingEvent } from "../../lib/reading";
import type { CanaryLink } from "../../lib/reading";

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

function minutesLeft(expiresAt: string) {
  const ms = new Date(expiresAt).getTime() - Date.now();
  return Math.max(0, Math.round(ms / 60000));
}

/**
 * Trình đọc PDF có canary watermark.
 *
 * PDF được tải về dưới dạng nhị phân rồi vẽ từng trang lên canvas bằng pdf.js, thay vì nhúng
 * trình xem PDF của trình duyệt: trình xem gốc luôn có nút tải/print và menu "Lưu thành PDF".
 * Ở đây không có thanh công cụ nào của trình xem, chuột phải / Ctrl+S / Ctrl+P bị chặn và
 * mọi hành vi đó được ghi lại thành sự kiện SUSPICIOUS để admin xem.
 */
export default function CanaryReaderDialog({
  link,
  title,
  onRefresh,
  onClose,
}: {
  link: CanaryLink;
  title: string;
  onRefresh: () => Promise<void> | void;
  onClose: () => void;
}) {
  const [refreshing, setRefreshing] = useState(false);
  const [left, setLeft] = useState(() => minutesLeft(link.expiresAt));
  const [document, setDocument] = useState<PDFDocumentProxy | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const surfaceRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setLeft(minutesLeft(link.expiresAt));
    const timer = window.setInterval(() => setLeft(minutesLeft(link.expiresAt)), 30_000);
    return () => window.clearInterval(timer);
  }, [link.expiresAt]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Tải nội dung PDF một lần cho mỗi token; đóng/tải lại được ghi nhận thành sự kiện.
  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    let loadingTask: ReturnType<typeof pdfjsLib.getDocument> | null = null;

    setStatus("loading");
    setError(null);
    setDocument(null);
    setPageCount(0);

    (async () => {
      try {
        const response = await fetch(readerFileUrl(link.url), {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const bytes = await response.arrayBuffer();
        if (cancelled) return;
        loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(bytes) });
        const pdf = await loadingTask.promise;
        if (cancelled) return;
        setDocument(pdf);
        setPageCount(pdf.numPages);
        setStatus("ready");
        sendReadingEvent(link.url, "OPEN", `${pdf.numPages} trang`);
      } catch (loadError) {
        if (cancelled || controller.signal.aborted) return;
        setStatus("error");
        setError(loadError instanceof Error ? loadError.message : "Không tải được bản đọc.");
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
      void loadingTask?.destroy();
      sendReadingEvent(link.url, "CLOSE");
    };
  }, [link.url]);

  // Vẽ các trang lên canvas; chiều rộng bám theo khung nên zoom chỉ cần vẽ lại.
  useEffect(() => {
    const surface = surfaceRef.current;
    if (!surface || !document) return;
    let cancelled = false;
    surface.replaceChildren();

    const draw = async () => {
      const baseWidth = Math.max(surface.clientWidth - 32, 240);
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
        const page = await document.getPage(pageNumber);
        if (cancelled) return;
        const natural = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: (baseWidth / natural.width) * zoom });
        const canvas = window.document.createElement("canvas");
        canvas.width = Math.floor(viewport.width * ratio);
        canvas.height = Math.floor(viewport.height * ratio);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;
        canvas.className = "mx-auto block rounded-md bg-white shadow-lg";
        const holder = window.document.createElement("div");
        holder.className = "flex flex-col items-center gap-1 py-2";
        holder.appendChild(canvas);
        const caption = window.document.createElement("span");
        caption.className = "text-[11px] text-white/50";
        caption.textContent = `Trang ${pageNumber} / ${document.numPages}`;
        holder.appendChild(caption);
        surface.appendChild(holder);

        const context = canvas.getContext("2d");
        if (!context) continue;
        await page.render({
          canvas,
          canvasContext: context,
          viewport,
          transform: ratio !== 1 ? [ratio, 0, 0, ratio, 0, 0] : undefined,
        }).promise;
      }
    };

    void draw();
    return () => {
      cancelled = true;
    };
  }, [document, zoom]);

  // Chặn và ghi nhận các đường tải/sao chép phổ biến ngay trên trình đọc.
  useEffect(() => {
    const flag = (reason: string) => sendReadingEvent(link.url, "SUSPICIOUS", reason);
    const onContextMenu = (event: MouseEvent) => {
      event.preventDefault();
      flag("right-click");
    };
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const withModifier = event.ctrlKey || event.metaKey;
      if (withModifier && (key === "s" || key === "p")) {
        event.preventDefault();
        flag(key === "s" ? "save-shortcut" : "print-shortcut");
        return;
      }
      if (event.key === "PrintScreen") {
        flag("screenshot-key");
        return;
      }
      if (withModifier && (key === "c" || key === "a")) {
        event.preventDefault();
        flag(key === "c" ? "copy-shortcut" : "select-all-shortcut");
      }
    };
    const onCopy = (event: ClipboardEvent) => {
      event.preventDefault();
      flag("copy");
    };
    const onDragStart = (event: DragEvent) => event.preventDefault();

    window.addEventListener("contextmenu", onContextMenu);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("copy", onCopy);
    window.addEventListener("dragstart", onDragStart);
    return () => {
      window.removeEventListener("contextmenu", onContextMenu);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("copy", onCopy);
      window.removeEventListener("dragstart", onDragStart);
    };
  }, [link.url]);

  const refresh = async () => {
    setRefreshing(true);
    sendReadingEvent(link.url, "RELOAD");
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  };

  const close = () => {
    sendReadingEvent(link.url, "CLOSE");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-slate-950/95">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3 text-white">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{title}</p>
          <p className="mt-0.5 text-xs text-amber-200">
            Bản đọc cá nhân hóa. Mã canary CNR-{link.tokenSuffix}. Không chia sẻ link.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${left > 0 ? "bg-emerald-500/15 text-emerald-300" : "bg-red-500/15 text-red-300"}`}>
            {left > 0 ? `Còn ${left} phút` : "Phiên đã hết hạn"}
          </span>
          <div className="flex items-center rounded-md border border-white/20">
            <button
              type="button"
              onClick={() => setZoom(value => Math.max(0.5, Math.round((value - 0.15) * 100) / 100))}
              aria-label="Thu nhỏ"
              className="p-1.5 text-white/80 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
              disabled={zoom <= 0.5}
            >
              <Minus className="size-3.5" />
            </button>
            <span className="min-w-11 text-center text-[11px] tabular-nums text-white/70">{Math.round(zoom * 100)}%</span>
            <button
              type="button"
              onClick={() => setZoom(value => Math.min(2.5, Math.round((value + 0.15) * 100) / 100))}
              aria-label="Phóng to"
              className="p-1.5 text-white/80 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
              disabled={zoom >= 2.5}
            >
              <Plus className="size-3.5" />
            </button>
          </div>
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-md border border-white/20 px-2.5 py-1.5 text-xs font-medium text-white transition hover:bg-white/10 disabled:opacity-50"
          >
            {refreshing ? <LoaderCircle className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
            Làm mới phiên đọc
          </button>
          <button
            type="button"
            onClick={close}
            aria-label="Đóng bản đọc"
            className="rounded-md p-1.5 text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            <X className="size-5" />
          </button>
        </div>
      </header>

      <div className="flex items-center gap-2 border-b border-white/10 bg-amber-500/10 px-4 py-2 text-xs text-amber-100">
        <ShieldAlert className="size-4 shrink-0" aria-hidden="true" />
        <span>{link.watermarkText} — bản đọc chỉ hiển thị trong trình duyệt, không có nút tải về.</span>
      </div>

      <div className="relative flex-1 overflow-hidden">
        <div
          ref={surfaceRef}
          className="h-full select-none overflow-auto px-4 pb-8 pt-2"
          style={{ userSelect: "none", WebkitUserSelect: "none" }}
        />
        {status === "loading" && (
          <p className="absolute inset-0 flex items-center justify-center gap-2 text-sm text-white/70">
            <LoaderCircle className="size-4 animate-spin" /> Đang mở bản đọc…
          </p>
        )}
        {status === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center text-sm text-red-200">
            <p>Không mở được bản đọc.</p>
            <p className="text-xs text-white/50">{error}</p>
            <button
              type="button"
              onClick={() => void refresh()}
              className="mt-2 rounded-md border border-white/20 px-3 py-1.5 text-xs text-white hover:bg-white/10"
            >
              Xin phiên đọc mới
            </button>
          </div>
        )}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 select-none overflow-hidden"
          style={{ opacity: 0.12 }}
        >
          {Array.from({ length: 40 }).map((_, index) => (
            <span
              key={index}
              className="absolute whitespace-nowrap text-[13px] font-semibold text-slate-900"
              style={{
                left: `${(index % 5) * 22 - 5}%`,
                top: `${Math.floor(index / 5) * 13}%`,
                transform: "rotate(-24deg)",
              }}
            >
              {link.watermarkText}
            </span>
          ))}
        </div>
      </div>

      <footer className="flex items-center justify-between border-t border-white/10 px-4 py-2 text-[11px] text-white/50">
        <span>Mọi thao tác mở, đóng, tải lại và hành vi tải/sao chép đều được ghi nhận.</span>
        <span>{pageCount > 0 ? `${pageCount} trang` : ""}</span>
      </footer>
    </div>
  );
}
