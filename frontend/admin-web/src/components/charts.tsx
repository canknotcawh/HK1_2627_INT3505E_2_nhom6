import { useState } from "react";

export type DailyPoint = { date: string; borrowed: number; returned: number };
export type NamedCount = { name: string; count: number };
export type Slice = { label: string; value: number; color: string };

const dayLabel = (iso: string) => {
  const [, month, day] = iso.split("-");
  return `${day}/${month}`;
};

/** Two-series line chart (borrowed vs returned) with a hover read-out. */
export function LoansLineChart({ data }: { data: DailyPoint[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const width = 640;
  const height = 230;
  const pad = { top: 14, right: 12, bottom: 26, left: 32 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const peak = Math.max(1, ...data.flatMap(point => [point.borrowed, point.returned]));
  const niceMax = peak <= 4 ? 4 : Math.ceil(peak / 4) * 4;
  const x = (index: number) => pad.left + (data.length <= 1 ? 0 : (index / (data.length - 1)) * innerW);
  const y = (value: number) => pad.top + innerH - (value / niceMax) * innerH;
  const path = (key: "borrowed" | "returned") => data.map((point, index) => `${index === 0 ? "M" : "L"}${x(index).toFixed(1)},${y(point[key]).toFixed(1)}`).join(" ");
  const area = `${path("borrowed")} L${x(data.length - 1).toFixed(1)},${y(0)} L${x(0).toFixed(1)},${y(0)} Z`;
  const ticks = [0, 1, 2, 3, 4].map(step => (niceMax / 4) * step);
  const labelEvery = Math.ceil(data.length / 8);

  const onMove = (event: React.MouseEvent<SVGSVGElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const svgX = ((event.clientX - box.left) / box.width) * width;
    const index = Math.round(((svgX - pad.left) / innerW) * (data.length - 1));
    setHover(Math.min(data.length - 1, Math.max(0, index)));
  };

  const active = hover === null ? null : data[hover];

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-4 text-xs text-neutral-600">
        <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-4 rounded bg-[#e60023]" />Lượt mượn</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-4 rounded bg-sky-500" />Lượt trả</span>
        <span className="ml-auto min-h-4 text-neutral-500">
          {active && `${dayLabel(active.date)}: ${active.borrowed} mượn, ${active.returned} trả`}
        </span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="Biểu đồ lượt mượn và trả sách 30 ngày gần nhất" onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
        {ticks.map(tick => (
          <g key={tick}>
            <line x1={pad.left} x2={width - pad.right} y1={y(tick)} y2={y(tick)} stroke="#e5e7eb" strokeDasharray={tick === 0 ? undefined : "3 4"} />
            <text x={pad.left - 6} y={y(tick) + 3.5} textAnchor="end" fontSize="10" fill="#9ca3af">{Number.isInteger(tick) ? tick : tick.toFixed(1)}</text>
          </g>
        ))}
        {data.map((point, index) => index % labelEvery === 0 && (
          <text key={point.date} x={x(index)} y={height - 8} textAnchor="middle" fontSize="10" fill="#9ca3af">{dayLabel(point.date)}</text>
        ))}
        <path d={area} fill="#e60023" opacity="0.08" />
        <path d={path("returned")} fill="none" stroke="#0ea5e9" strokeWidth="2" strokeLinejoin="round" />
        <path d={path("borrowed")} fill="none" stroke="#e60023" strokeWidth="2" strokeLinejoin="round" />
        {hover !== null && active && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={pad.top} y2={y(0)} stroke="#9ca3af" strokeDasharray="3 3" />
            <circle cx={x(hover)} cy={y(active.borrowed)} r="4" fill="#e60023" stroke="white" strokeWidth="1.5" />
            <circle cx={x(hover)} cy={y(active.returned)} r="4" fill="#0ea5e9" stroke="white" strokeWidth="1.5" />
          </g>
        )}
      </svg>
    </div>
  );
}

/** Donut with a centre total and a legend; zero slices are listed but not drawn. */
export function DonutChart({ slices, centerLabel }: { slices: Slice[]; centerLabel: string }) {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="flex flex-wrap items-center justify-center gap-6">
      <svg viewBox="0 0 140 140" className="size-40 shrink-0" role="img" aria-label={`${centerLabel}: ${total}`}>
        <circle cx="70" cy="70" r={radius} fill="none" stroke="#f3f4f6" strokeWidth="18" />
        {total > 0 && slices.filter(slice => slice.value > 0).map(slice => {
          const length = (slice.value / total) * circumference;
          const element = (
            <circle key={slice.label} cx="70" cy="70" r={radius} fill="none" stroke={slice.color} strokeWidth="18"
              strokeDasharray={`${length} ${circumference - length}`} strokeDashoffset={-offset} transform="rotate(-90 70 70)" />
          );
          offset += length;
          return element;
        })}
        <text x="70" y="68" textAnchor="middle" fontSize="22" fontWeight="700" fill="#111827">{total}</text>
        <text x="70" y="84" textAnchor="middle" fontSize="9" fill="#6b7280">{centerLabel}</text>
      </svg>
      <ul className="space-y-1.5 text-sm">
        {slices.map(slice => (
          <li key={slice.label} className="flex items-center gap-2">
            <span className="size-2.5 rounded-full" style={{ backgroundColor: slice.color }} />
            <span className="text-neutral-600">{slice.label}</span>
            <span className="ml-auto pl-4 font-semibold text-gray-900">{slice.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Horizontal bars, longest first, labels truncated with the full text in the tooltip. */
export function BarList({ items, color, emptyText }: { items: NamedCount[]; color: string; emptyText: string }) {
  const peak = Math.max(1, ...items.map(item => item.count));
  if (items.length === 0) return <p className="py-8 text-center text-sm text-neutral-500">{emptyText}</p>;
  return (
    <ul className="space-y-2.5">
      {items.map(item => (
        <li key={item.name} title={`${item.name}: ${item.count}`}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate text-gray-800">{item.name}</span>
            <span className="shrink-0 font-semibold text-gray-900">{item.count.toLocaleString("vi-VN")}</span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-100">
            <div className="h-full rounded-full" style={{ width: `${Math.max(3, (item.count / peak) * 100)}%`, backgroundColor: color }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
