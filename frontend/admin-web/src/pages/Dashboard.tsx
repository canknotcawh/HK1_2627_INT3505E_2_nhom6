import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { AlertTriangle, BookOpen, Clock, Library, LoaderCircle, Shield, Users } from "lucide-react";
import apiClient from "../lib/api-client";
import { listErrorMessage } from "../lib/http-errors";
import { BarList, DonutChart, LoansLineChart } from "../components/charts";
import type { DailyPoint, NamedCount } from "../components/charts";

type Stats = {
    totalUsers: number;
    totalAdmins: number;
    activeBooks: number;
    totalCopies: number;
    availableCopies: number;
    loansByStatus: Record<string, number>;
    loansPerDay: DailyPoint[];
    topCategories: NamedCount[];
    topBooks: NamedCount[];
};

const STATUS_SLICES = [
    { key: "ACTIVE", label: "Đang mượn", color: "#3b82f6" },
    { key: "PENDING_RETURN", label: "Chờ xác nhận trả", color: "#f59e0b" },
    { key: "OVERDUE", label: "Quá hạn", color: "#e60023" },
    { key: "RETURNED", label: "Đã trả", color: "#10b981" },
    { key: "LOST", label: "Mất sách", color: "#6b7280" },
];

function Kpi({ icon, tone, label, value, hint }: { icon: ReactNode; tone: string; label: string; value: ReactNode; hint?: string }) {
    return (
        <div className="rounded-xl border bg-white p-5">
            <div className={`mb-2 flex size-9 items-center justify-center rounded-lg ${tone}`}>{icon}</div>
            <p className="text-xs text-neutral-500">{label}</p>
            <h3 className="mt-0.5 text-2xl font-bold text-neutral-900">{value}</h3>
            {hint && <p className="mt-0.5 text-xs text-neutral-500">{hint}</p>}
        </div>
    );
}

function Card({ title, subtitle, children, className = "" }: { title: string; subtitle?: string; children: ReactNode; className?: string }) {
    return (
        <div className={`rounded-xl border bg-white p-5 ${className}`}>
            <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
            {subtitle && <p className="mb-4 mt-0.5 text-xs text-neutral-500">{subtitle}</p>}
            {!subtitle && <div className="mb-4" />}
            {children}
        </div>
    );
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
                const response = await apiClient.get<Stats>("/admin/stats/overview");
                if (!cancelled) setStats(response.data);
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

    const loans = stats?.loansByStatus ?? {};
    const onLoan = stats ? stats.totalCopies - stats.availableCopies : 0;
    const availablePct = stats && stats.totalCopies > 0 ? Math.round((stats.availableCopies / stats.totalCopies) * 100) : 0;
    const windowBorrowed = stats?.loansPerDay.reduce((sum, point) => sum + point.borrowed, 0) ?? 0;
    const windowReturned = stats?.loansPerDay.reduce((sum, point) => sum + point.returned, 0) ?? 0;

    return (
        <section className="space-y-5">
            <p className="text-sm text-neutral-500">Tổng quan hệ thống thư viện.</p>

            {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}

            {loading ? (
                <div className="flex items-center justify-center gap-2 py-16 text-sm text-neutral-500" role="status">
                    <LoaderCircle className="size-5 animate-spin" /> Đang tải...
                </div>
            ) : stats && (
                <>
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
                        <Kpi icon={<Users className="size-4.5" />} tone="bg-neutral-100 text-neutral-700" label="Tổng người dùng" value={stats.totalUsers} />
                        <Kpi icon={<Shield className="size-4.5" />} tone="bg-violet-50 text-violet-700" label="Quản trị viên" value={stats.totalAdmins} />
                        <Kpi icon={<Library className="size-4.5" />} tone="bg-emerald-50 text-emerald-700" label="Đầu sách lưu hành" value={stats.activeBooks.toLocaleString("vi-VN")} />
                        <Kpi icon={<BookOpen className="size-4.5" />} tone="bg-blue-50 text-blue-700" label="Đang mượn" value={(loans.ACTIVE ?? 0) + (loans.OVERDUE ?? 0) + (loans.PENDING_RETURN ?? 0)} hint="gồm quá hạn và chờ trả" />
                        <Kpi icon={<Clock className="size-4.5" />} tone="bg-amber-50 text-amber-700" label="Chờ xác nhận trả" value={loans.PENDING_RETURN ?? 0} />
                        <Kpi icon={<AlertTriangle className="size-4.5" />} tone="bg-red-50 text-red-700" label="Quá hạn" value={loans.OVERDUE ?? 0} />
                    </div>

                    <div className="grid gap-4 lg:grid-cols-3">
                        <Card className="lg:col-span-2" title="Lượt mượn và trả" subtitle={`30 ngày gần nhất: ${windowBorrowed} lượt mượn, ${windowReturned} lượt trả`}>
                            <LoansLineChart data={stats.loansPerDay} />
                        </Card>
                        <Card title="Trạng thái phiếu mượn" subtitle="Toàn bộ phiếu từ trước đến nay">
                            <DonutChart centerLabel="phiếu mượn" slices={STATUS_SLICES.map(slice => ({ label: slice.label, color: slice.color, value: loans[slice.key] ?? 0 }))} />
                        </Card>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-3">
                        <Card title="Tình trạng kho sách" subtitle={`${stats.totalCopies.toLocaleString("vi-VN")} bản của các sách đang lưu hành`}>
                            <div className="flex items-end justify-between">
                                <span className="text-3xl font-bold text-gray-900">{availablePct}%</span>
                                <span className="text-xs text-neutral-500">còn sẵn trên kệ</span>
                            </div>
                            <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-blue-100" role="img" aria-label={`${availablePct}% bản sách còn sẵn`}>
                                <div className="h-full bg-emerald-500" style={{ width: `${availablePct}%` }} />
                            </div>
                            <div className="mt-3 flex justify-between text-xs text-neutral-600">
                                <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-emerald-500" />Còn sẵn {stats.availableCopies.toLocaleString("vi-VN")}</span>
                                <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-blue-200" />Đang ngoài kệ {onLoan.toLocaleString("vi-VN")}</span>
                            </div>
                        </Card>
                        <Card title="Thể loại nhiều sách nhất" subtitle="Top 8 theo số đầu sách">
                            <BarList items={stats.topCategories} color="#e60023" emptyText="Chưa có thể loại." />
                        </Card>
                        <Card title="Sách được mượn nhiều nhất" subtitle="Top 8 theo số phiếu mượn">
                            <BarList items={stats.topBooks} color="#3b82f6" emptyText="Chưa có lượt mượn nào." />
                        </Card>
                    </div>
                </>
            )}
        </section>
    );
}
