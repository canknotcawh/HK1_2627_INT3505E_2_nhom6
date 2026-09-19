import type { RouteObject } from 'react-router-dom'

import LoansPage from './pages/LoansPage'

const loansRoutes: RouteObject[] = [
	{
		path: 'loans',
		element: <LoansPage />,
	},
]

export default loansRoutes