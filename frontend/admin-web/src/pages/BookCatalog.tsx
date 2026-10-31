import { useCallback, useEffect, useState } from "react";
import { Archive, ChevronLeft, ChevronRight, LoaderCircle, Pencil, Plus, RotateCcw, Search, X } from "lucide-react";
import apiClient from "../lib/api-client";
import type { Page } from "../lib/page";
import { actionErrorMessage, listErrorMessage } from "../lib/http-errors";

const PAGE_SIZE = 10;

type Book = {
  id: string;
  isbn13: string | null;
  title: string;
  subtitle: string | null;
  description: string | null;
  language: string | null;
  publishedYear: number | null;
  pageCount: number | null;
  coverImageUrl: string | null;
  previewUrl: string | null;
  readerUrl: string | null;
  totalCopies: number;
  availableCopies: number;
  status: "ACTIVE" | "RETIRED";
  authors: string[];
  categories: string[];
};

type BookForm = {
  title: string;
  isbn13: string;
  subtitle: string;
  description: string;
  language: string;
  publishedYear: string;
  pageCount: string;
  coverImageUrl: string;
  previewUrl: string;
  readerUrl: string;
  totalCopies: string;
  availableCopies: string;
};

const emptyForm = (): BookForm => ({
  title: "",
  isbn13: "",
  subtitle: "",
  description: "",
  language: "",
  publishedYear: "",
  pageCount: "",
  coverImageUrl: "",
  previewUrl: "",
  readerUrl: "",
  totalCopies: "1",
  availableCopies: "1",
});

const toForm = (book: Book): BookForm => ({
  title: book.title,
  isbn13: book.isbn13 ?? "",
  subtitle: book.subtitle ?? "",
  description: book.description ?? "",
  language: book.language ?? "",
  publishedYear: book.publishedYear?.toString() ?? "",
  pageCount: book.pageCount?.toString() ?? "",
  coverImageUrl: book.coverImageUrl ?? "",
  previewUrl: book.previewUrl ?? "",
  readerUrl: book.readerUrl ?? "",
  totalCopies: book.totalCopies.toString(),
  availableCopies: book.availableCopies.toString(),
});

const optionalText = (value: string) => value.trim() || null;
const optionalNumber = (value: string) => value.trim() ? Number(value) : null;

export default function BookCatalog() {
  const [books, setBooks] = useState<Book[]>([]);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [workingBookId, setWorkingBookId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<BookForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const loadBooks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get<Page<Book>>("/admin/books", {
        params: { page, size: PAGE_SIZE, ...(query.trim() ? { q: query.trim() } : {}) },
      });
      setBooks(response.data.content);
      setTotalPages(response.data.totalPages);
      setTotalElements(response.data.totalElements);
      if (response.data.totalPages > 0 && page >= response.data.totalPages) {
        setPage(response.data.totalPages - 1);
      }
    } catch (requestError) {
      setError(listErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [page, query]);

  useEffect(() => {
    void loadBooks();
  }, [loadBooks]);

  const openCreate = () => {
    setEditingBook(null);
    setForm(emptyForm());
    setError(null);
    setFormOpen(true);
  };

  const openEdit = (book: Book) => {
    setEditingBook(book);
    setForm(toForm(book));
    setError(null);
    setFormOpen(true);
  };

  const closeForm = () => {
    if (!saving) setFormOpen(false);
  };

  const updateField = (field: keyof BookForm, value: string) => {
    setForm(current => ({ ...current, [field]: value }));
  };

  const saveBook = async (event: React.FormEvent) => {
    event.preventDefault();
    const totalCopies = Number(form.totalCopies);
    const availableCopies = editingBook ? Number(form.availableCopies) : totalCopies;
    if (!form.title.trim()) {
      setError("Tên sách không được để trống.");
      return;
    }
    if (!Number.isInteger(totalCopies) || !Number.isInteger(availableCopies) || totalCopies < 0 || availableCopies < 0 || availableCopies > totalCopies) {
      setError("Số bản có sẵn phải từ 0 đến tổng số bản.");
      return;
    }

    const payload = {
      isbn13: optionalText(form.isbn13),
      title: form.title.trim(),
      subtitle: optionalText(form.subtitle),
      description: optionalText(form.description),
      language: optionalText(form.language),
      publishedYear: optionalNumber(form.publishedYear),
      pageCount: optionalNumber(form.pageCount),
      coverImageUrl: optionalText(form.coverImageUrl),
      previewUrl: optionalText(form.previewUrl),
      readerUrl: optionalText(form.readerUrl),
      totalCopies,
    };

    setSaving(true);
    setError(null);
    try {
      if (editingBook) {
        await apiClient.put(`/admin/books/${editingBook.id}`, payload);
        if (editingBook.totalCopies !== totalCopies || editingBook.availableCopies !== availableCopies) {
          await apiClient.patch(`/admin/books/${editingBook.id}/copies`, { totalCopies, availableCopies });
        }
        setNotice(`Đã cập nhật sách “${payload.title}”.`);
      } else {
        await apiClient.post("/admin/books", payload);
        setNotice(`Đã thêm sách “${payload.title}”.`);
      }
      setFormOpen(false);
      await loadBooks();
    } catch (requestError) {
      setError(actionErrorMessage(requestError, "Không lưu được thông tin sách."));
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (book: Book) => {
    const nextAction = book.status === "ACTIVE" ? "retire" : "activate";
    const message = book.status === "ACTIVE"
      ? `Ngừng lưu hành “${book.title}”? Sách sẽ không còn xuất hiện với bạn đọc.`
      : `Khôi phục lưu hành “${book.title}”?`;
    if (!window.confirm(message)) return;

    setWorkingBookId(book.id);
    setError(null);
    setNotice(null);
    try {
      await apiClient.post(`/admin/books/${book.id}/${nextAction}`);
      setNotice(book.status === "ACTIVE" ? `Đã ngừng lưu hành “${book.title}”.` : `Đã khôi phục “${book.title}”.`);
      await loadBooks();
    } catch (requestError) {
      setError(actionErrorMessage(requestError, "Không cập nhật được trạng thái sách."));
    } finally {
      setWorkingBookId(null);
    }
  };

  const inputClass = "mt-1 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none transition focus:border-[#e60023] focus:ring-2 focus:ring-[#e60023]/15";

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="text-sm text-neutral-500">Thêm, cập nhật số lượng và quản lý trạng thái lưu hành của sách.</p>
        <button type="button" onClick={openCreate} className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-[#e60023] px-3.5 text-sm font-semibold text-white transition hover:bg-[#c7001e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e60023]/30">
          <Plus className="size-4" /> Thêm sách
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-100 bg-white p-4">
        <label className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
          <input value={query} onChange={(event) => { setPage(0); setQuery(event.target.value); }} placeholder="Tìm theo tên sách hoặc ISBN" className="h-10 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-[#e60023] focus:ring-2 focus:ring-[#e60023]/15" />
        </label>
        <span className="rounded-full bg-red-50 px-3 py-1 text-sm font-medium text-[#c7001e]">{totalElements} đầu sách</span>
      </div>

      {notice && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}

      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-4 py-3 font-medium">Sách</th>
                <th className="px-4 py-3 font-medium">ISBN</th>
                <th className="px-4 py-3 font-medium">Thể loại</th>
                <th className="px-4 py-3 font-medium">Kho</th>
                <th className="px-4 py-3 font-medium">Trạng thái</th>
                <th className="px-4 py-3 text-right font-medium">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-neutral-500"><LoaderCircle className="mr-2 inline size-4 animate-spin" />Đang tải…</td></tr>
              ) : books.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-neutral-500">Không tìm thấy sách phù hợp.</td></tr>
              ) : books.map(book => {
                const working = workingBookId === book.id;
                return (
                  <tr key={book.id} className="hover:bg-neutral-50/70">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{book.title}</div>
                      <div className="mt-0.5 text-xs text-neutral-500">{book.authors?.length ? book.authors.join(", ") : "Chưa có tác giả"}</div>
                    </td>
                    <td className="px-4 py-3 text-neutral-600">{book.isbn13 || "—"}</td>
                    <td className="px-4 py-3 text-neutral-600">{book.categories?.length ? book.categories.join(", ") : "—"}</td>
                    <td className="px-4 py-3"><span className="font-medium text-gray-800">{book.availableCopies}/{book.totalCopies}</span><span className="ml-1 text-xs text-neutral-500">còn</span></td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${book.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700" : "bg-neutral-100 text-neutral-600"}`}>
                        {book.status === "ACTIVE" ? "Đang lưu hành" : "Ngừng lưu hành"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => openEdit(book)} className="inline-flex min-h-8 items-center gap-1.5 rounded-md border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50"><Pencil className="size-3.5" />Sửa</button>
                        <button type="button" disabled={working} onClick={() => void changeStatus(book)} className="inline-flex min-h-8 items-center gap-1.5 rounded-md border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50">
                          {working ? <LoaderCircle className="size-3.5 animate-spin" /> : book.status === "ACTIVE" ? <Archive className="size-3.5" /> : <RotateCcw className="size-3.5" />}
                          {book.status === "ACTIVE" ? "Ngừng lưu hành" : "Khôi phục"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3 text-sm text-neutral-500">
          <span>Trang {totalPages === 0 ? 0 : page + 1} / {totalPages}</span>
          <div className="flex gap-2">
            <button type="button" disabled={page <= 0 || loading} onClick={() => setPage(value => Math.max(0, value - 1))} className="rounded-md border border-gray-200 p-2 transition hover:bg-gray-50 disabled:opacity-40" aria-label="Trang trước"><ChevronLeft className="size-4" /></button>
            <button type="button" disabled={page + 1 >= totalPages || loading} onClick={() => setPage(value => value + 1)} className="rounded-md border border-gray-200 p-2 transition hover:bg-gray-50 disabled:opacity-40" aria-label="Trang sau"><ChevronRight className="size-4" /></button>
          </div>
        </div>
      </div>

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/30 p-4" role="dialog" aria-modal="true" aria-label={editingBook ? "Sửa sách" : "Thêm sách"}>
          <form onSubmit={saveBook} className="max-h-[90dvh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">{editingBook ? "Cập nhật sách" : "Thêm sách mới"}</h2>
                <p className="mt-0.5 text-sm text-neutral-500">Các trường có dấu * là bắt buộc.</p>
              </div>
              <button type="button" onClick={closeForm} disabled={saving} className="rounded-md p-2 text-neutral-500 transition hover:bg-gray-100 hover:text-[#e60023]" aria-label="Đóng biểu mẫu"><X className="size-5" /></button>
            </div>
            <div className="grid gap-4 p-6 md:grid-cols-2">
              <label className="md:col-span-2 text-sm font-medium text-gray-700">Tên sách *<input value={form.title} onChange={event => updateField("title", event.target.value)} className={inputClass} maxLength={500} autoFocus /></label>
              <label className="text-sm font-medium text-gray-700">ISBN-13<input value={form.isbn13} onChange={event => updateField("isbn13", event.target.value)} className={inputClass} maxLength={13} placeholder="Ví dụ: 9786041234567" /></label>
              <label className="text-sm font-medium text-gray-700">Ngôn ngữ<input value={form.language} onChange={event => updateField("language", event.target.value)} className={inputClass} maxLength={10} placeholder="vi hoặc en" /></label>
              <label className="md:col-span-2 text-sm font-medium text-gray-700">Phụ đề<input value={form.subtitle} onChange={event => updateField("subtitle", event.target.value)} className={inputClass} maxLength={500} /></label>
              <label className="text-sm font-medium text-gray-700">Năm xuất bản<input type="number" min="1000" value={form.publishedYear} onChange={event => updateField("publishedYear", event.target.value)} className={inputClass} /></label>
              <label className="text-sm font-medium text-gray-700">Số trang<input type="number" min="0" value={form.pageCount} onChange={event => updateField("pageCount", event.target.value)} className={inputClass} /></label>
              <label className="text-sm font-medium text-gray-700">Tổng số bản *<input type="number" min="0" value={form.totalCopies} onChange={event => updateField("totalCopies", event.target.value)} className={inputClass} /></label>
              <label className="text-sm font-medium text-gray-700">Số bản có sẵn *<input type="number" min="0" value={editingBook ? form.availableCopies : form.totalCopies} onChange={event => updateField("availableCopies", event.target.value)} className={inputClass} disabled={!editingBook} /></label>
              <label className="md:col-span-2 text-sm font-medium text-gray-700">Ảnh bìa<input type="url" value={form.coverImageUrl} onChange={event => updateField("coverImageUrl", event.target.value)} className={inputClass} placeholder="https://..." /></label>
              <label className="md:col-span-2 text-sm font-medium text-gray-700">Mô tả<textarea value={form.description} onChange={event => updateField("description", event.target.value)} className="mt-1 min-h-24 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-[#e60023] focus:ring-2 focus:ring-[#e60023]/15" /></label>
            </div>
            {error && <p role="alert" className="mx-6 mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
            <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-4">
              <button type="button" onClick={closeForm} disabled={saving} className="h-10 rounded-lg border border-gray-200 px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50">Hủy</button>
              <button type="submit" disabled={saving} className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#e60023] px-4 text-sm font-semibold text-white transition hover:bg-[#c7001e] disabled:opacity-50">{saving && <LoaderCircle className="size-4 animate-spin" />}{editingBook ? "Lưu thay đổi" : "Thêm sách"}</button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
