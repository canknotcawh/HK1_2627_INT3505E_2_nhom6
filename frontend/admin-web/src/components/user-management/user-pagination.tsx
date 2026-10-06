import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { Button } from "../ui/button"

type UserPaginationProps = {
    currentPage: number
    pageCount: number
    onPageChange: (page: number) => void
}

export function UserPagination({ currentPage, pageCount, onPageChange }: UserPaginationProps) {
    const pages = Array.from({ length: pageCount }, (_, index) => index + 1)

    return (
        <div className="flex items-center gap-1">
            <Button
                variant="outline"
                size="icon"
                disabled={currentPage <= 1}
                onClick={() => onPageChange(currentPage - 1)}
                aria-label="Trang trước"
            >
                <ChevronLeftIcon />
            </Button>

            {pages.map((pageNumber) => (
                <Button
                    key={pageNumber}
                    variant={pageNumber === currentPage ? "outline" : "ghost"}
                    size="icon"
                    aria-current={pageNumber === currentPage ? "page" : undefined}
                    onClick={() => onPageChange(pageNumber)}
                >
                    {pageNumber}
                </Button>
            ))}

            <Button
                variant="outline"
                size="icon"
                disabled={currentPage >= pageCount}
                onClick={() => onPageChange(currentPage + 1)}
                aria-label="Trang sau"
            >
                <ChevronRightIcon />
            </Button>
        </div>
    )
}
