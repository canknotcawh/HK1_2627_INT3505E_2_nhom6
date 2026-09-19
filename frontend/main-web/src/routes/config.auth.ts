import type { RouteObject } from 'react-router-dom'

import { loginRoutes } from '../features/identity'

const authRoutes: RouteObject[] = [...loginRoutes]

export default authRoutes