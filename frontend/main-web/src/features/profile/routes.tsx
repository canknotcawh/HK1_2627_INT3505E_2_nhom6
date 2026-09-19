import type { RouteObject } from 'react-router-dom'

import ProfilePage from './pages/ProfilePage'

const profileRoutes: RouteObject[] = [
	{
		path: 'profile',
		element: <ProfilePage />,
	},
]

export default profileRoutes