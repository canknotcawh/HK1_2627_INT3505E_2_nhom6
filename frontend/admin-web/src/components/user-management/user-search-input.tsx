import { SearchIcon } from "lucide-react"
import { Input } from "../ui/input"

type UserSearchInputProps = {
    query: string
    onQueryChange: (query: string) => void
}

export function UserSearchInput({ query, onQueryChange }: UserSearchInputProps) {
    return (
        <div className="relative w-full sm:w-64">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />

            <Input
                value={query}
                onChange={(event) => onQueryChange(event.target.value)}
                placeholder="Search"
                aria-label="Tìm kiếm theo tên hoặc email"
                className="pl-8"
            />
        </div>
    )
}
