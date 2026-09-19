import type { RouteObject } from 'react-router-dom'

import PortalHomePage from './pages/PortalHomePage'

const portalHomeRoute: RouteObject = {
	index: true,
	element: <PortalHomePage />,
}

export default portalHomeRoute