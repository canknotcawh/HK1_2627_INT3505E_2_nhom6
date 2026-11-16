import { BookOpen, CalendarClock, Clock3, Layers } from "lucide-react";

type StatsSectionProps = {
    bookCount: number | null;
    categoryCount: number | null;
};

const LOAN_PERIOD_DAYS = 14;

export default function StatsSection({ bookCount, categoryCount }: StatsSectionProps) {
    const formatCount = (value: number | null) =>
        value === null ? "—" : value.toLocaleString("vi-VN");

    const stats = [
        { icon: BookOpen, value: formatCount(bookCount), label: "Đầu sách trong kho" },
        { icon: Layers, value: formatCount(categoryCount), label: "Thể loại sách" },
        { icon: CalendarClock, value: `${LOAN_PERIOD_DAYS} ngày`, label: "Thời hạn mỗi lần mượn" },
        { icon: Clock3, value: "24/7", label: "Tra cứu mọi lúc" },
    ];

    return (
        <section className="container mx-auto px-4">
            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-3xl border border-gray-100 bg-gray-100 shadow-xl shadow-gray-900/5 md:grid-cols-4">
                {stats.map(({ icon: Icon, value, label }) => (
                    <div key={label} className="flex items-center gap-4 bg-white p-6 md:p-7">
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#e60023]/10 text-[#e60023]">
                            <Icon className="h-6 w-6" aria-hidden="true" />
                        </span>
                        <div>
                            <p className="text-2xl font-extrabold tracking-tight text-gray-900 md:text-3xl">{value}</p>
                            <p className="text-sm text-gray-500">{label}</p>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}
