import { useEffect, useRef, useState } from "react";
import { LoaderCircle, ShieldAlert, X } from "lucide-react";
import type { GoogleBooksApi } from "../../lib/google-identity";
import { useAuth } from "../../contexts/AuthContext";

const GOOGLE_BOOKS_SCRIPT = "https://www.google.com/books/jsapi.js";
const PREVIEW_DURATION_SECONDS = 180;
const PREVIEW_EXPIRY_PREFIX = "book-preview-expiry:";
let googleBooksApiPromise: Promise<GoogleBooksApi> | undefined;

function getPreviewSecondsLeft(ggId: string): number {
  const expiresAt = Number(window.sessionStorage.getItem(`${PREVIEW_EXPIRY_PREFIX}${ggId}`));
  return expiresAt > 0
    ? Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000))
    : PREVIEW_DURATION_SECONDS;
}

function loadGoogleBooksApi(): Promise<GoogleBooksApi> {
  const readyBooks = window.google?.books;
  if (readyBooks && readyBooks.DefaultViewer) return Promise.resolve(readyBooks);
  if (googleBooksApiPromise) return googleBooksApiPromise;

  googleBooksApiPromise = new Promise<GoogleBooksApi>((resolve, reject) => {
    const initialize = () => {
      const books = window.google?.books;
      if (!books) {
        reject(new Error("Google Books API did not initialize."));
        return;
      }

      if (books.DefaultViewer) {
        resolve(books);
        return;
      }

      try {
        books.load({ language: "vi" });
        let settled = false;
        let intervalId: number | undefined;
        let timeoutId: number | undefined;
        const checkReady = () => {
          const ready = window.google?.books;
          if (!ready?.DefaultViewer || settled) return;
          settled = true;
          if (intervalId !== undefined) window.clearInterval(intervalId);
          if (timeoutId !== undefined) window.clearTimeout(timeoutId);
          resolve(ready);
        };

        books.setOnLoadCallback(checkReady);
        if (!settled) intervalId = window.setInterval(checkReady, 100);
        if (!settled) timeoutId = window.setTimeout(() => {
          window.clearInterval(intervalId);
          reject(new Error("Google Books viewer did not become ready."));
        }, 15000);
        checkReady();
      } catch (error) {
        reject(error);
      }
    };

    if (readyBooks?.load) {
      initialize();
    } else {
      let script = document.querySelector<HTMLScriptElement>(`script[src="${GOOGLE_BOOKS_SCRIPT}"]`);
      if (!script) {
        script = document.createElement("script");
        script.src = GOOGLE_BOOKS_SCRIPT;
        script.async = true;
        script.onerror = () => {
          script?.remove();
          reject(new Error("Could not load Google Books API."));
        };
        script.addEventListener("load", initialize, { once: true });
        document.head.appendChild(script);
      } else {
        script.addEventListener("load", initialize, { once: true });
      }
    }
  }).catch((error: unknown) => {
    googleBooksApiPromise = undefined;
    throw error;
  });

  return googleBooksApiPromise!;
}

function previewCandidates(ggId: string | null, isbn13?: string | null): string[] {
  const candidates: string[] = [];
  if (ggId) candidates.push(ggId);
  if (isbn13) candidates.push(`ISBN:${isbn13}`);
  return candidates;
}

function tryLoadViewer(books: GoogleBooksApi, container: HTMLElement, id: string): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    try {
      const viewer = new books.DefaultViewer(container);
      viewer.load(id, () => resolve(false), () => resolve(true));
    } catch {
      resolve(false);
    }
  });
}

const previewProbeCache = new Map<string, Promise<boolean>>();

/** Quietly checks whether Google Books can embed a preview, so the button can say so up front. */
export function probePreviewAvailable(ggId: string | null, isbn13?: string | null): Promise<boolean> {
  const candidates = previewCandidates(ggId, isbn13);
  if (candidates.length === 0) return Promise.resolve(false);
  const key = candidates.join("|");
  const cached = previewProbeCache.get(key);
  if (cached) return cached;

  const probe = loadGoogleBooksApi()
    .then(async (books) => {
      const holder = document.createElement("div");
      holder.setAttribute("aria-hidden", "true");
      holder.style.cssText = "position:fixed;left:-9999px;top:0;width:320px;height:240px;overflow:hidden";
      document.body.appendChild(holder);
      try {
        for (const id of candidates) {
          if (await tryLoadViewer(books, holder, id)) return true;
          holder.innerHTML = "";
        }
        return false;
      } finally {
        holder.remove();
      }
    })
    .catch(() => {
      previewProbeCache.delete(key);
      return true;
    });
  previewProbeCache.set(key, probe);
  return probe;
}

export function preloadGoogleBooksApi() {
  void loadGoogleBooksApi().catch(() => undefined);
}

type BookPreviewDialogProps = {
  title: string;
  ggId: string | null;
  isbn13?: string | null;
  onClose: () => void;
};

type PreviewState = "loading" | "ready" | "unavailable" | "error";

export default function BookPreviewDialog({ title, ggId, isbn13, onClose }: BookPreviewDialogProps) {
  const { user } = useAuth();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const viewerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const watermarkRef = useRef<HTMLDivElement>(null);

  const [state, setState] = useState<PreviewState>(ggId || isbn13 ? "loading" : "unavailable");
  const [secondsLeft, setSecondsLeft] = useState(() => ggId ? getPreviewSecondsLeft(ggId) : PREVIEW_DURATION_SECONDS);
  const [isTampered, setIsTampered] = useState(false);

  const expired = state === "ready" && secondsLeft === 0;

  // MutationObserver to protect the watermark overlay from being hidden or deleted
  useEffect(() => {
    const canvasEl = canvasRef.current;
    const watermarkEl = watermarkRef.current;
    if (!canvasEl || !watermarkEl) return;

    let unmounted = false;

    const verifyWatermark = () => {
      if (unmounted) return true;
      if (!canvasEl.contains(watermarkEl)) {
        setIsTampered(true);
        return false;
      }
      const style = window.getComputedStyle(watermarkEl);
      if (
        style.display === "none" ||
        style.visibility === "hidden" ||
        parseFloat(style.opacity || "1") < 0.05
      ) {
        setIsTampered(true);
        return false;
      }
      return true;
    };

    const canvasObserver = new MutationObserver((mutations) => {
      if (unmounted) return;
      for (const m of mutations) {
        if (m.type === "childList") {
          for (const node of Array.from(m.removedNodes)) {
            if (node === watermarkEl) {
              setIsTampered(true);
              return;
            }
          }
        }
      }
      verifyWatermark();
    });

    const watermarkObserver = new MutationObserver(() => {
      if (unmounted) return;
      verifyWatermark();
    });

    canvasObserver.observe(canvasEl, { childList: true });
    watermarkObserver.observe(watermarkEl, {
      attributes: true,
      attributeFilter: ["style", "class", "hidden", "aria-hidden"],
    });

    const intervalId = window.setInterval(verifyWatermark, 1000);

    return () => {
      unmounted = true;
      canvasObserver.disconnect();
      watermarkObserver.disconnect();
      window.clearInterval(intervalId);
    };
  }, [state]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => {
      if (dialog?.open) dialog.close();
    };
  }, []);

  useEffect(() => {
    if ((!ggId && !isbn13) || !viewerRef.current) return;

    let active = true;
    let timedOut = false;
    const timeoutId = window.setTimeout(() => {
      timedOut = true;
      if (active) setState("error");
    }, 20000);
    const clearLoadTimeout = () => {
      window.clearTimeout(timeoutId);
    };

    loadGoogleBooksApi()
      .then(async (books) => {
        if (!active || timedOut || !viewerRef.current) return;

        for (const id of previewCandidates(ggId, isbn13)) {
          if (!active || timedOut || !viewerRef.current) return;
          viewerRef.current.innerHTML = "";
          if (await tryLoadViewer(books, viewerRef.current, id)) {
            clearLoadTimeout();
            if (active) setState("ready");
            return;
          }
        }
        clearLoadTimeout();
        if (active) setState("unavailable");
      })
      .catch(() => {
        clearLoadTimeout();
        if (active) setState("error");
      });

    return () => {
      active = false;
      clearLoadTimeout();
    };
  }, [ggId, isbn13]);

  useEffect(() => {
    if (state !== "ready" || !ggId) return;

    const storageKey = `${PREVIEW_EXPIRY_PREFIX}${ggId}`;
    let expiresAt = Number(window.sessionStorage.getItem(storageKey));
    if (expiresAt <= 0) {
      expiresAt = Date.now() + PREVIEW_DURATION_SECONDS * 1000;
      window.sessionStorage.setItem(storageKey, String(expiresAt));
    }

    const tick = () => {
      const remaining = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining === 0) window.clearInterval(intervalId);
    };
    const intervalId = window.setInterval(tick, 250);
    tick();
    return () => window.clearInterval(intervalId);
  }, [ggId, state]);

  const clock = `${String(Math.floor(secondsLeft / 60)).padStart(2, "0")}:${String(secondsLeft % 60).padStart(2, "0")}`;
  const userIdentifier = user?.email || (user?.fullName ? `${user.fullName} (${user.id.slice(0, 8)})` : "Khách (Guest)");
  const timestampStr = new Date().toLocaleDateString("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return (
    <dialog
      ref={dialogRef}
      className="book-preview-dialog"
      aria-labelledby="book-preview-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <header className="book-preview-dialog__header">
        <h2 id="book-preview-title" className="truncate text-sm font-semibold text-gray-800 sm:text-base">
          Preview: {title}
        </h2>
        {state === "ready" && (
          <span className="book-preview-dialog__timer" role="timer" aria-label={`Thời gian xem trước còn lại ${clock}`}>
            {clock}
          </span>
        )}
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng preview"
          className="ml-3 inline-flex size-9 shrink-0 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e60023]"
        >
          <X className="size-5" aria-hidden="true" />
        </button>
      </header>

      <div
        ref={canvasRef}
        className={`book-preview-dialog__canvas${expired ? " book-preview-dialog__canvas--expired" : ""}`}
      >
        <div className="book-preview-dialog__viewport" ref={viewerRef} />

        {/* Dynamic Watermark Overlay */}
        {!isTampered && (
          <div
            ref={watermarkRef}
            id="preview-watermark-overlay"
            className="book-preview-dialog__watermark"
            aria-hidden="true"
          >
            <svg className="h-full w-full opacity-15" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern
                  id="preview-watermark-pattern"
                  width="260"
                  height="150"
                  patternUnits="userSpaceOnUse"
                  patternTransform="rotate(-25)"
                >
                  <text
                    x="15"
                    y="45"
                    fill="currentColor"
                    fontSize="12"
                    fontWeight="600"
                    className="fill-gray-900 dark:fill-gray-100"
                  >
                    {userIdentifier}
                  </text>
                  <text
                    x="15"
                    y="70"
                    fill="currentColor"
                    fontSize="10"
                    fontWeight="500"
                    className="fill-gray-700 dark:fill-gray-300"
                  >
                    {timestampStr} • UET LMS
                  </text>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#preview-watermark-pattern)" />
            </svg>
          </div>
        )}

        {/* Tamper Warning Overlay */}
        {isTampered && (
          <div className="book-preview-dialog__tampered" role="alert">
            <ShieldAlert className="size-12 text-red-500 mb-3" aria-hidden="true" />
            <p className="text-base font-bold text-red-500">CẢNH BÁO AN TOÀN NỘI DUNG</p>
            <p className="mt-2 text-sm text-gray-200 max-w-sm">
              Phát hiện can thiệp vào các thành phần bảo vệ bản quyền. Bản xem trước đã bị tạm khóa.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
            >
              Đóng xem trước
            </button>
          </div>
        )}

        {expired && (
          <div className="book-preview-dialog__expired" role="status">
            <span>Mượn sách để xem tiếp nội dung</span>
          </div>
        )}
        {state === "loading" && (
          <div className="book-preview-dialog__message book-preview-dialog__message--overlay" role="status">
            <LoaderCircle className="size-6 animate-spin" aria-hidden="true" />
            <span>Đang tải bản xem trước…</span>
          </div>
        )}
        {state === "unavailable" && (
          <p className="book-preview-dialog__message book-preview-dialog__message--overlay" role="status">Không có bản xem trước</p>
        )}
        {state === "error" && (
          <p className="book-preview-dialog__message book-preview-dialog__message--overlay" role="alert">
            Không thể tải bản xem trước. Vui lòng thử lại.
          </p>
        )}
      </div>
    </dialog>
  );
}
