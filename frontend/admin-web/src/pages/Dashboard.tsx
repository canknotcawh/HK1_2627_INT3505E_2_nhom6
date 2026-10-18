import { useEffect, useState } from "react";
import { Users, BookOpen, Clock, LoaderCircle, Shield } from "lucide-react";
import apiClient from "../lib/api-client";
import type { Page } from "../lib/page";
import { listErrorMessage } from "../lib/http-errors";

type Stats = {
    totalUsers: number;
    totalAdmins: number;
    activeLoans: number;
    pendingReturns: number;
};

async function countOf(path: string, params: Record<string, string>): Promise<number> {
    const response = await apiClient.get<Page<unknown>>(path, { params: { ...params, page: 0, size: 1 } });
    return response.data.totalElements;
}

export default function Dashboard() {
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            setLoading(true);
            setError(null);
            try {
                const [totalUsers, totalAdmins, activeLoans, pendingReturns] = await Promise.all([
                    countOf("/admin/users", {}),
                    countOf("/admin/users", { role: "ADMIN" }),
                    countOf("/admin/loans", { status: "ACTIVE" }),
                    countOf("/admin/loans", { status: "PENDING_RETURN" }),
                ]);
                if (!cancelled) {
                    setStats({ totalUsers, totalAdmins, activeLoans, pendingReturns });
                }
            } catch (requestError) {
                console.error("Không tải được số liệu tổng quan:", requestError);
                if (!cancelled) setError(listErrorMessage(requestError));
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        void load();
        return () => { cancelled = true; };
    }, []);

    return (
        <section className="space-y-5">
            <div>
                <h2 className="text-xl font-semibold">Bảng điều khiển</h2>
                <p className="mt-1 text-sm text-neutral-500">Tổng quan hệ thống thư viện.</p>
            </div>

            {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}

            {loading ? (
                <div className="flex items-center justify-center gap-2 py-16 text-sm text-neutral-500" role="status">
                    <LoaderCircle className="size-5 animate-spin" /> Đang tải...
                </div>
            ) : stats && (
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                    <div className="rounded-xl border bg-white p-5">
                        <div className="mb-2 flex size-9 items-center justify-center rounded-lg bg-neutral-100 text-neutral-700">
                            <Users className="size-4.5" />
                        </div>
                        <p className="text-xs text-neutral-500">Tổng người dùng</p>
                        <h3 className="mt-0.5 text-2xl font-bold text-neutral-900">{stats.totalUsers}</h3>
                    </div>
                    <div className="rounded-xl border bg-white p-5">
                        <div className="mb-2 flex size-9 items-center justify-center rounded-lg bg-violet-50 text-violet-700">
                            <Shield className="size-4.5" />
                        </div>
                        <p className="text-xs text-neutral-500">Quản trị viên</p>
                        <h3 className="mt-0.5 text-2xl font-bold text-neutral-900">{stats.totalAdmins}</h3>
                    </div>
                    <div className="rounded-xl border bg-white p-5">
                        <div className="mb-2 flex size-9 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                            <BookOpen className="size-4.5" />
                        </div>
                        <p className="text-xs text-neutral-500">Đang mượn</p>
                        <h3 className="mt-0.5 text-2xl font-bold text-neutral-900">{stats.activeLoans}</h3>
                    </div>
                    <div className="rounded-xl border bg-white p-5">
                        <div className="mb-2 flex size-9 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
                            <Clock className="size-4.5" />
                        </div>
                        <p className="text-xs text-neutral-500">Chờ xác nhận trả</p>
                        <h3 className="mt-0.5 text-2xl font-bold text-neutral-900">{stats.pendingReturns}</h3>
                    </div>
                </div>
            )}
        </section>
    );
}
