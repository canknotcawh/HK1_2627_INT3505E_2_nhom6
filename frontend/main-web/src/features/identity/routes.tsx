import type { RouteObject } from 'react-router-dom'

import LoginPage from './pages/LoginPage'

const loginRoutes: RouteObject[] = [
	{
		index: true,
		element: <LoginPage />,
	},
]

export default loginRoutes