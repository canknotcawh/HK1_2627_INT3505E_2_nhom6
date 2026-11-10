import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, GitMerge, LoaderCircle, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import apiClient from "../lib/api-client";
import { actionErrorMessage, listErrorMessage } from "../lib/http-errors";

type Category = { id: string; name: string; bookCount: number };

const inputClass = "h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none transition focus:border-[#e60023] focus:ring-2 focus:ring-[#e60023]/15";

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [mergeSource, setMergeSource] = useState<Category | null>(null);
  const [mergeTarget, setMergeTarget] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiClient.get<Category[]>("/admin/categories");
      setCategories(response.data);
      setError(null);
    } catch (requestError) {
      setError(listErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(() => {
    const keyword = filter.trim().toLowerCase();
    return keyword ? categories.filter(category => category.name.toLowerCase().includes(keyword)) : categories;
  }, [categories, filter]);

  const run = async (id: string | null, action: () => Promise<void>, fallback: string) => {
    setWorkingId(id);
    setError(null);
    setNotice(null);
    try {
      await action();
      await load();
    } catch (requestError) {
      setError(actionErrorMessage(requestError, fallback));
    } finally {
      setWorkingId(null);
    }
  };

  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    await run(null, async () => {
      await apiClient.post("/admin/categories", { name });
      setNewName("");
      setNotice(`Đã thêm thể loại “${name}”.`);
    }, "Không thêm được thể loại.");
    setCreating(false);
  };

  const startEdit = (category: Category) => {
    setEditingId(category.id);
    setEditingName(category.name);
  };

  const saveRename = (category: Category) => {
    const name = editingName.trim();
    if (!name || name === category.name) {
      setEditingId(null);
      return;
    }
    void run(category.id, async () => {
      await apiClient.put(`/admin/categories/${category.id}`, { name });
      setEditingId(null);
      setNotice(`Đã đổi tên thành “${name}”.`);
    }, "Không đổi được tên thể loại.");
  };

  const remove = (category: Category) => {
    if (!window.confirm(`Xóa thể loại “${category.name}”?`)) return;
    void run(category.id, async () => {
      await apiClient.delete(`/admin/categories/${category.id}`);
      setNotice(`Đã xóa thể loại “${category.name}”.`);
    }, "Không xóa được thể loại.");
  };

  const openMerge = (category: Category) => {
    setMergeSource(category);
    setMergeTarget("");
  };

  const confirmMerge = () => {
    if (!mergeSource || !mergeTarget) return;
    const source = mergeSource;
    const target = categories.find(category => category.id === mergeTarget);
    void run(source.id, async () => {
      await apiClient.post(`/admin/categories/${source.id}/merge`, { targetId: mergeTarget });
      setMergeSource(null);
      setNotice(`Đã gộp “${source.name}” vào “${target?.name ?? ""}”.`);
    }, "Không gộp được thể loại.");
  };

  const totalBooks = categories.reduce((sum, category) => sum + category.bookCount, 0);

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-2xl text-sm text-neutral-500">
          Thêm, đổi tên, gộp hoặc xóa thể loại. Thể loại còn sách không xóa trực tiếp được: hãy gộp sang thể loại khác để sách giữ nguyên nhóm.
        </p>
        <form onSubmit={create} className="flex gap-2">
          <input value={newName} onChange={event => setNewName(event.target.value)} maxLength={100} placeholder="Tên thể loại mới" className={`${inputClass} w-56`} />
          <button type="submit" disabled={creating || !newName.trim()} className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-[#e60023] px-3.5 text-sm font-semibold text-white transition hover:bg-[#c7001e] disabled:opacity-50">
            {creating ? <LoaderCircle className="size-4 animate-spin" /> : <Plus className="size-4" />} Thêm
          </button>
        </form>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-100 bg-white p-4">
        <label className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
          <input value={filter} onChange={event => setFilter(event.target.value)} placeholder="Lọc theo tên thể loại" className={`${inputClass} w-full pl-9`} />
        </label>
        <span className="rounded-full bg-red-50 px-3 py-1 text-sm font-medium text-[#c7001e]">{categories.length} thể loại</span>
        <span className="rounded-full bg-neutral-100 px-3 py-1 text-sm font-medium text-neutral-600">{totalBooks} lượt gán</span>
      </div>

      {notice && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}

      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-4 py-3 font-medium">Thể loại</th>
              <th className="px-4 py-3 font-medium">Số sách</th>
              <th className="px-4 py-3 text-right font-medium">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={3} className="px-4 py-12 text-center text-neutral-500"><LoaderCircle className="mr-2 inline size-4 animate-spin" />Đang tải…</td></tr>
            ) : visible.length === 0 ? (
              <tr><td colSpan={3} className="px-4 py-12 text-center text-neutral-500">Không có thể loại phù hợp.</td></tr>
            ) : visible.map(category => {
              const working = workingId === category.id;
              const editing = editingId === category.id;
              return (
                <tr key={category.id} className="hover:bg-neutral-50/70">
                  <td className="px-4 py-3">
                    {editing ? (
                      <div className="flex items-center gap-2">
                        <input autoFocus value={editingName} maxLength={100} onChange={event => setEditingName(event.target.value)} onKeyDown={event => { if (event.key === "Enter") saveRename(category); if (event.key === "Escape") setEditingId(null); }} className={`${inputClass} h-9 w-64`} />
                        <button type="button" onClick={() => saveRename(category)} className="rounded-md p-1.5 text-emerald-700 hover:bg-emerald-50" aria-label="Lưu tên"><Check className="size-4" /></button>
                        <button type="button" onClick={() => setEditingId(null)} className="rounded-md p-1.5 text-neutral-500 hover:bg-gray-100" aria-label="Hủy"><X className="size-4" /></button>
                      </div>
                    ) : (
                      <span className="font-medium text-gray-900">{category.name}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-neutral-600">{category.bookCount.toLocaleString("vi-VN")}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button type="button" disabled={working} onClick={() => startEdit(category)} className="inline-flex min-h-8 items-center gap-1.5 rounded-md border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"><Pencil className="size-3.5" />Đổi tên</button>
                      <button type="button" disabled={working || categories.length < 2} onClick={() => openMerge(category)} className="inline-flex min-h-8 items-center gap-1.5 rounded-md border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"><GitMerge className="size-3.5" />Gộp</button>
                      <button type="button" disabled={working || category.bookCount > 0} title={category.bookCount > 0 ? "Còn sách, hãy gộp sang thể loại khác" : "Xóa thể loại"} onClick={() => remove(category)} className="inline-flex min-h-8 items-center gap-1.5 rounded-md border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-40">
                        {working ? <LoaderCircle className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {mergeSource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/30 p-4" role="dialog" aria-modal="true" aria-label="Gộp thể loại">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-gray-900">Gộp thể loại</h2>
            <p className="mt-1 text-sm text-neutral-500">
              Toàn bộ {mergeSource.bookCount} sách của “{mergeSource.name}” sẽ chuyển sang thể loại đích, sau đó “{mergeSource.name}” bị xóa. Không hoàn tác được.
            </p>
            <label className="mt-4 block text-sm font-medium text-gray-700">
              Gộp vào
              <select value={mergeTarget} onChange={event => setMergeTarget(event.target.value)} className={`${inputClass} mt-1 w-full`}>
                <option value="">Chọn thể loại đích…</option>
                {categories.filter(category => category.id !== mergeSource.id).map(category => (
                  <option key={category.id} value={category.id}>{category.name} ({category.bookCount})</option>
                ))}
              </select>
            </label>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setMergeSource(null)} className="h-10 rounded-lg border border-gray-200 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50">Hủy</button>
              <button type="button" disabled={!mergeTarget || workingId === mergeSource.id} onClick={confirmMerge} className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#e60023] px-4 text-sm font-semibold text-white hover:bg-[#c7001e] disabled:opacity-50">
                {workingId === mergeSource.id && <LoaderCircle className="size-4 animate-spin" />}Gộp
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
