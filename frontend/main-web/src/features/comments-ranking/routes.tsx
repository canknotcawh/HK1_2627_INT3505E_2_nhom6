import type { RouteObject } from 'react-router-dom'

import RankingPage from './pages/RankingPage'

const rankingRoutes: RouteObject[] = [
	{
		path: 'ranking',
		element: <RankingPage />,
	},
]

export default rankingRoutes