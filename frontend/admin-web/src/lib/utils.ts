export { cn } from "cn"

export function getInitials(name: string, wordCount = 2): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(-wordCount)
    .map((w) => w[0]?.toUpperCase())
    .join('')
}

const dateTimeFormat = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
})

export function formatDateTime(value: string): string {
  return dateTimeFormat.format(new Date(value))
}