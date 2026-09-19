import type { RouteObject } from 'react-router-dom'

import BookDetailPage from './pages/BookDetailPage'
import SearchPage from './pages/SearchPage'

const bookSearchRoutes: RouteObject[] = [
	{
		path: 'search',
		element: <SearchPage />,
	},
	{
		path: 'books/:bookId',
		element: <BookDetailPage />,
	},
]

export default bookSearchRoutes