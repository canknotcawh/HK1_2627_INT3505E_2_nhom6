import type { RouteObject } from 'react-router-dom'

import { userRoutes } from '../features/users-management'

const appRoutes: RouteObject[] = [
    ...userRoutes
]

export default appRoutes