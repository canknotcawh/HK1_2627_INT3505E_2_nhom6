import { useEffect, useRef, useState } from "react";
import apiClient from "../../lib/api-client";
import { LoaderCircle, X } from "lucide-react";
import type { GoogleBooksApi } from "../../lib/google-identity";

const GOOGLE_BOOKS_SCRIPT = "https://www.google.com/books/jsapi.js";
let googleBooksApiPromise: Promise<GoogleBooksApi> | undefined;

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

type BookPreviewDialogProps = {
  bookId: string;
  borrowAvailable: boolean;
  onBorrow: () => void;
  title: string;
  ggId: string | null;
  isbn13?: string | null;
  onClose: () => void;
};

type PreviewState = "loading" | "ready" | "unavailable" | "error" | "locked";

export default function BookPreviewDialog({ bookId, title, ggId, isbn13, borrowAvailable, onBorrow, onClose }: BookPreviewDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const viewerRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<PreviewState>(ggId || isbn13 ? "loading" : "unavailable");
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [visible, setVisible] = useState(!document.hidden);
  useEffect(() => {
    const update = () => setVisible(!document.hidden);
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => {
      if (dialog?.open) dialog.close();
    };
  }, []);

  useEffect(() => {
    const viewport = viewerRef.current;
    if (!viewport || !visible) return;
    // Isolate late Google callbacks and lease releases from a reopened dialog.
    const hex = Array.from(crypto.getRandomValues(new Uint8Array(16)), n => n.toString(16).padStart(2, "0")).join("");
    const tab = [hex.slice(0,8), hex.slice(8,12), hex.slice(12,16), hex.slice(16,20), hex.slice(20)].join("-");
    const container = document.createElement("div");
    container.className = "book-preview-dialog__viewer";
    viewport.replaceChildren(container);
    let stopped = false;
    let reading = false;
    let renew: number;
    let deadline: number;
    let display: number;
    const request = async (action: "STATUS" | "READ" | "PAUSE") => {
      const response = await apiClient.post<{
        state: "locked" | "preview" | "borrowed"; remainingMs: number; validMs: number;
      }>(`/api/v1/public/books/${bookId}/preview`, { tab, action }, { withCredentials: true, timeout: 8000 });
      return response.data;
    };
    const stop = (next?: PreviewState) => {
      if (stopped) return;
      stopped = true;
      window.clearTimeout(renew);
      window.clearTimeout(deadline);
      window.clearInterval(display);
      container.remove();
      if (reading && next !== "locked") void request("PAUSE").catch(() => {});
      if (next) setState(next);
    };
    const grant = async () => {
      const started = performance.now();
      reading = true;
      const access = await request("READ");
      if (stopped) return;
      window.clearTimeout(deadline);
      window.clearInterval(display);
      if (access.state === "locked") return stop("locked");
      const elapsed = () => performance.now() - started;
      const valid = access.validMs - elapsed();
      if (valid <= 0) return stop("error");
      const showTime = () => setSecondsLeft(access.state === "borrowed" ? null :
        Math.max(0, Math.ceil((access.remainingMs - elapsed()) / 1000)));
      showTime();
      display = window.setInterval(showTime, 250);
      setState("ready");
      const last = access.state === "preview" && access.remainingMs <= access.validMs;
      deadline = window.setTimeout(() => stop(last ? "locked" : "error"), valid);
      if (!last) renew = window.setTimeout(() => void grant().catch(() => stop("error")), valid / 2);
    };
    const open = async () => {
      setState("loading");
      const access = await request("STATUS");
      if (stopped) return;
      if (access.state === "locked") return stop("locked");
      const books = await loadGoogleBooksApi();
      for (const id of previewCandidates(ggId, isbn13)) {
        if (stopped) return;
        container.replaceChildren();
        if (await tryLoadViewer(books, container, id)) {
          if (!stopped) await grant();
          return;
        }
      }
      stop("unavailable");
    };
    deadline = window.setTimeout(() => stop("error"), 20000);
    void open().catch(() => stop("error"));
    return () => stop();
  }, [bookId, ggId, isbn13, visible]);

  const seconds = secondsLeft ?? 0;
  const clock = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

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
        {state === "ready" && secondsLeft !== null && (
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

      <div className="book-preview-dialog__canvas">
        <div className="book-preview-dialog__viewport" ref={viewerRef}
          style={{ visibility: visible && state === "ready" ? "visible" : "hidden" }} />
        {state === "locked" && (
          <div className="book-preview-dialog__message book-preview-dialog__message--overlay flex-col" role="status">
            <p>Đã hết thời gian đọc thử</p>
            <button type="button" className="rounded-full bg-amber-300 px-5 py-2 text-slate-900"
              disabled={!borrowAvailable} onClick={onBorrow}>
              {borrowAvailable ? "Mượn sách để đọc tiếp" : "Sách đã hết"}
            </button>
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
