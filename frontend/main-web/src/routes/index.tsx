import { createBrowserRouter } from 'react-router-dom'

import AuthLayout from '../layouts/AuthLayout'
import PublicLayout from '../layouts/PublicLayout'
import UserLayout from '../layouts/UserLayout'
import authRoutes from './config.auth'
import publicRoutes from './config.public'
import userRoutes from './config.user'

const router = createBrowserRouter([
	{
		path: '/',
		element: <PublicLayout />,
		children: publicRoutes,
	},
	{
		path: '/login',
		element: <AuthLayout />,
		children: authRoutes,
	},
	{
		path: '/user/:userId',
		element: <UserLayout />,
		children: userRoutes,
	},
])

export default router