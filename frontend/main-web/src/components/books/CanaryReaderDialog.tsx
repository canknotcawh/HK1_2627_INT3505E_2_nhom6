import { useEffect, useState } from "react";
import { LoaderCircle, RefreshCw, ShieldAlert, X } from "lucide-react";
import type { CanaryLink } from "../../lib/reading";

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || `${window.location.protocol}//localhost:8080`).replace(/\/$/, "");

function absoluteUrl(url: string) {
  return url.startsWith("http") ? url : `${apiBaseUrl}${url}`;
}

function minutesLeft(expiresAt: string) {
  const ms = new Date(expiresAt).getTime() - Date.now();
  return Math.max(0, Math.round(ms / 60000));
}

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

  const refresh = async () => {
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
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
            onClick={onClose}
            aria-label="Đóng bản đọc"
            className="rounded-md p-1.5 text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            <X className="size-5" />
          </button>
        </div>
      </header>

      <div className="flex items-center gap-2 border-b border-white/10 bg-amber-500/10 px-4 py-2 text-xs text-amber-100">
        <ShieldAlert className="size-4 shrink-0" aria-hidden="true" />
        <span>{link.watermarkText} — dấu này xuất hiện cùng màn hình khi chụp ảnh.</span>
      </div>

      <div className="relative flex-1">
        <iframe
          key={link.url}
          src={absoluteUrl(link.url)}
          title={`Bản đọc ${title}`}
          className="h-full w-full border-0 bg-white"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 select-none overflow-hidden"
          style={{ opacity: 0.14 }}
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
    </div>
  );
}
