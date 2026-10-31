import { Outlet, useMatches } from "react-router-dom"
import { Sidebar } from "./Sidebar"
import { Header } from "./Header"


export default function AdminLayout() {
    const matches = useMatches()
    const title = (matches.at(-1)?.handle as { title?: string })?.title ?? 'Nothing'

    return (
        <div className="flex h-dvh min-w-0 overflow-hidden bg-neutral-50">
            <Sidebar />
            <div className="flex min-w-0 flex-1 flex-col">
                <Header title={title} />
                <main className="min-w-0 flex-1 overflow-y-auto px-6 pb-6 pt-3">
                    <Outlet />
                </main>
            </div>
        </div>
    )
}
