import type { RouteObject } from 'react-router-dom'

export type NavItem = {
	label: string
	path: string
}

type RouteHandle = {
	nav?: {
		label: string
		path?: string
	}
}

export function getNavItems(routes: RouteObject[]): NavItem[] {
	const items: NavItem[] = []

	for (const route of routes) {
		const nav = (route.handle ?? {}) as RouteHandle
		if (nav.nav) {
			const path = typeof route.path === 'string' ? route.path : nav.nav.path
			if (typeof path === 'string') {
				items.push({ label: nav.nav.label, path })
			}
		}
	}

	return items
}