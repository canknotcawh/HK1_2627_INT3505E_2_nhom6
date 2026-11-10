import { useCallback, useEffect, useState } from 'react'
import BigSection from '../components/landing/BigSection'
import StatsSection from '../components/landing/StatsSection'
import GenresSection, { LANDING_GENRES } from '../components/landing/GenresSection'
import ShelfSection from '../components/landing/ShelfSection'
import StepsSection from '../components/landing/StepsSection'
import CtaSection from '../components/landing/CtaSection'
import { fetchCategories, fetchRandomBooks, searchBooks } from '../lib/books'
import type { BookDto } from '../lib/books'

const HERO_BOOKS = 5
const SHELF_BOOKS = 10

export default function HomePage() {
    const [heroBooks, setHeroBooks] = useState<BookDto[]>([])
    const [shelfBooks, setShelfBooks] = useState<BookDto[]>([])
    const [loading, setLoading] = useState(true)
    const [shuffling, setShuffling] = useState(false)
    const [bookCount, setBookCount] = useState<number | null>(null)
    const [categoryCount, setCategoryCount] = useState<number | null>(null)
    const [genreCounts, setGenreCounts] = useState<Record<string, number>>({})

    useEffect(() => {
        let cancelled = false

        fetchRandomBooks(HERO_BOOKS + SHELF_BOOKS)
            .then((picked) => {
                if (cancelled) return
                setHeroBooks(picked.slice(0, HERO_BOOKS))
                setShelfBooks(picked.slice(HERO_BOOKS))
            })
            .catch(() => undefined)
            .finally(() => { if (!cancelled) setLoading(false) })

        searchBooks({ size: 1 })
            .then((page) => { if (!cancelled) setBookCount(page.totalElements) })
            .catch(() => undefined)

        fetchCategories()
            .then((categories) => { if (!cancelled) setCategoryCount(categories.length) })
            .catch(() => undefined)

        Promise.all(
            LANDING_GENRES.map((genre) =>
                searchBooks({ category: genre.name, size: 1 })
                    .then((page) => [genre.name, page.totalElements] as const)
                    .catch(() => null),
            ),
        ).then((entries) => {
            if (cancelled) return
            setGenreCounts(Object.fromEntries(entries.filter((entry): entry is readonly [string, number] => entry !== null)))
        })

        return () => { cancelled = true }
    }, [])

    const shuffleShelf = useCallback(async () => {
        setShuffling(true)
        try {
            setShelfBooks(await fetchRandomBooks(SHELF_BOOKS))
        } catch {
            // Keep the current shelf if the request fails.
        } finally {
            setShuffling(false)
        }
    }, [])

    return (
        <>
            <BigSection books={heroBooks} loading={loading} bookCount={bookCount} />
            <StatsSection bookCount={bookCount} categoryCount={categoryCount} />
            <GenresSection counts={genreCounts} />
            <ShelfSection books={shelfBooks} loading={loading} shuffling={shuffling} onShuffle={shuffleShelf} />
            <StepsSection />
            <CtaSection />
        </>
    )
}
