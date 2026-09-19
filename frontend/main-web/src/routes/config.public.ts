import type { RouteObject } from 'react-router-dom'

import { bookSearchRoutes } from '../features/book-search'
import { portalHomeRoute } from '../features/portal'

const publicRoutes: RouteObject[] = [portalHomeRoute, ...bookSearchRoutes]

export default publicRoutes