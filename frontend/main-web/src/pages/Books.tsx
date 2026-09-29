import { useCallback, useEffect, useState, startTransition } from "react";
import { apiClient, ApiClientError } from "../lib/api-client";
import { Button } from "../components/ui/button";
import { Search } from "lucide-react";

type BookResponse = {
    id: string;
    title: string;
    subtitle: string | null;
    totalCopies: number;
    availableCopies: number;
};

type PageResponse<T> = { content: T[]; totalElements: number; totalPages: number; number: number };

export default function Books() {
    const [query, setQuery] = useState("");
    const [page, setPage] = useState(0);
    const [data, setData] = useState<PageResponse<BookResponse> | null>(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
    const [borrowingId, setBorrowingId] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const result = await apiClient.get<PageResponse<BookResponse>>("/api/v1/public/books", {
                q: query || undefined,
                page,
                size: 12,
            });
            setData(result);
        } catch (err) {
            setMessage({ type: "error", text: err instanceof ApiClientError ? err.message : "Không tải được danh sách sách" });
        } finally {
            setLoading(false);
        }
    }, [query, page]);

    useEffect(() => {
        startTransition(() => {
            load();
        });
    }, [load]);

    async function handleBorrow(bookId: string) {
        setBorrowingId(bookId);
        setMessage(null);
        try {
            await apiClient.post("/api/v1/users/me/loans", { bookId });
            setMessage({ type: "success", text: "Mượn sách thành công! Kiểm tra mục Sách đang mượn." });
            await load();
        } catch (err) {
            setMessage({ type: "error", text: err instanceof ApiClientError ? err.message : "Mượn sách thất bại" });
        } finally {
            setBorrowingId(null);
        }
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="flex gap-2">
                <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (setPage(0), load())}
                    placeholder="Tìm sách theo tên..."
                    className="flex-1 rounded-md border px-3 py-2 text-sm outline-none focus:border-neutral-400"
                />
                <Button variant="outline" onClick={() => { setPage(0); load(); }}>
                    <Search className="size-4" />
                    Tìm
                </Button>
            </div>

            {message && (
                <div className={`rounded-md border px-4 py-2 text-sm ${message.type === "error" ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
                    {message.text}
                </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {loading && !data && <div className="col-span-full py-8 text-center text-neutral-400">Đang tải...</div>}
                {data?.content.length === 0 && <div className="col-span-full py-8 text-center text-neutral-400">Không tìm thấy sách nào</div>}
                {data?.content.map((book) => (
                    <div key={book.id} className="flex flex-col gap-2 rounded-lg border bg-white p-4">
                        <div className="font-medium">{book.title}</div>
                        {book.subtitle && <div className="text-sm text-neutral-500">{book.subtitle}</div>}
                        <div className="text-xs text-neutral-400">Còn {book.availableCopies}/{book.totalCopies} bản</div>
                        <Button size="sm" disabled={book.availableCopies === 0 || borrowingId === book.id} onClick={() => handleBorrow(book.id)}>
                            {book.availableCopies === 0 ? "Hết sách" : "Mượn sách"}
                        </Button>
                    </div>
                ))}
            </div>

            {data && data.totalPages > 1 && (
                <div className="flex items-center justify-end gap-2 text-sm">
                    <Button variant="outline" size="xs" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Trước</Button>
                    <span className="text-neutral-500">Trang {data.number + 1} / {data.totalPages}</span>
                    <Button variant="outline" size="xs" disabled={page >= data.totalPages - 1} onClick={() => setPage((p) => p + 1)}>Sau</Button>
                </div>
            )}
        </div>
    );
}