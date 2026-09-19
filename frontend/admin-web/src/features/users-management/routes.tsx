import type { RouteObject } from 'react-router-dom'

import UserPage from './pages/UserPage'

const userRoutes: RouteObject[] = [
	{
		path: '/user',
		element: <UserPage />,
	},
]

export default userRoutes