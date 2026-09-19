import { Navigate } from 'react-router-dom'
import type { RouteObject } from 'react-router-dom'

import { bookSearchRoutes } from '../features/book-search'
import { rankingRoutes } from '../features/comments-ranking'
import { loansRoutes } from '../features/loans'
import { profileRoutes } from '../features/profile'

const userRoutes: RouteObject[] = [
	{
		index: true,
		element: <Navigate to="profile" replace />,
	},
	...profileRoutes,
	...loansRoutes,
	...rankingRoutes,
	...bookSearchRoutes,
]

export default userRoutes