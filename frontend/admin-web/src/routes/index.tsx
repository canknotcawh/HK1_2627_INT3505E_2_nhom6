import { createBrowserRouter } from 'react-router-dom'

import AdminLayout from '../layouts/AdminLayout'
import appRoutes from './config'

const router = createBrowserRouter([
	{
		element: <AdminLayout />,
		children: appRoutes,
	},
])

export default router