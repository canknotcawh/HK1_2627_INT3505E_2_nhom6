import type { LucideIcon } from "lucide-react"
import { cn } from "../../lib/utils"

type MetricCardTone = "neutral" | "active" | "inactive"

const toneStyles: Record<MetricCardTone, string> = {
    neutral: "bg-neutral-100 text-neutral-700",
    active: "bg-emerald-50 text-emerald-700",
    inactive: "bg-red-50 text-red-700",
}

type MetricCardProps = {
    label: string
    value: number
    icon: LucideIcon
    tone?: MetricCardTone
}

export function MetricCard({ label, value, icon: Icon, tone = "neutral" }: MetricCardProps) {
    return (
        <div className="flex items-center gap-4 rounded-lg border bg-card px-5 py-4">
            <span className={cn("flex size-10 items-center justify-center rounded-lg", toneStyles[tone])}>
                <Icon className="size-5" />
            </span>

            <div className="flex flex-col">
                <span className="text-2xl leading-none font-semibold tabular-nums">{value}</span>
                <span className="mt-1 text-sm text-muted-foreground">{label}</span>
            </div>
        </div>
    )
}
