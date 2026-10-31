import { useEffect, useRef, useState } from "react";
import { LoaderCircle, X } from "lucide-react";
import type { GoogleBooksApi } from "../lib/google-identity";

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

export function preloadGoogleBooksApi() {
  void loadGoogleBooksApi().catch(() => undefined);
}

type BookPreviewDialogProps = {
  title: string;
  ggId: string | null;
  onClose: () => void;
};

type PreviewState = "loading" | "ready" | "unavailable" | "error";

export default function BookPreviewDialog({ title, ggId, onClose }: BookPreviewDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const viewerRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<PreviewState>(ggId ? "loading" : "unavailable");
  const [secondsLeft, setSecondsLeft] = useState(() => ggId ? getPreviewSecondsLeft(ggId) : PREVIEW_DURATION_SECONDS);
  const expired = state === "ready" && secondsLeft === 0;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => {
      if (dialog?.open) dialog.close();
    };
  }, []);

  useEffect(() => {
    if (!ggId || !viewerRef.current) return;

    let active = true;
    let timedOut = false;
    let timeoutId: number | undefined;
    const clearLoadTimeout = () => {
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    };

    timeoutId = window.setTimeout(() => {
      timedOut = true;
      if (active) setState("error");
    }, 20000);

    loadGoogleBooksApi()
      .then((books) => {
        if (!active || timedOut || !viewerRef.current) return;

        const viewer = new books.DefaultViewer(viewerRef.current);
        viewer.load(
          ggId,
          () => {
            clearLoadTimeout();
            if (active) setState("unavailable");
          },
          () => {
            clearLoadTimeout();
            if (active) setState("ready");
          },
        );
      })
      .catch(() => {
        clearLoadTimeout();
        if (active) setState("error");
      });

    return () => {
      active = false;
      clearLoadTimeout();
    };
  }, [ggId]);

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

      <div className={`book-preview-dialog__canvas${expired ? " book-preview-dialog__canvas--expired" : ""}`}>
        <div className="book-preview-dialog__viewport" ref={viewerRef} />
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
