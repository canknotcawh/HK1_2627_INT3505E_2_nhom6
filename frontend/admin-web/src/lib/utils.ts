export { cn } from "cn"

export function getInitials(name: string, wordCount = 2): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(-wordCount)
    .map((w) => w[0]?.toUpperCase())
    .join('')
}