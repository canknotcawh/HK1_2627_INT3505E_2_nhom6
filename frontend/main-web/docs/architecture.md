# main-web — architecture

`main-web` is the user-facing application of the LMS (library management system): a public portal and a logged-in member area. It sits in the `frontend/` pnpm workspace alongside `admin-web` (staff console) and an (empty) `shared/` scaffold.

## Tech stack

- React 19 + `react-dom` 19, Vite 8 (`@vitejs/plugin-react`), TypeScript ~6.0.
- `react-router-dom` v7 with a **data/declarative router**: `createBrowserRouter` in `src/routes/index.tsx`, consumed via `<RouterProvider>` in `src/App.tsx` (bootstrapped in `src/main.tsx`).
- No UI kit, CSS framework, HTTP client, or state manager yet; pages are raw JSX.

## Entrypoint flow

```
index.html → src/main.tsx → <App /> (StrictMode) → RouterProvider(router)
  router (src/routes/index.tsx) = createBrowserRouter([
    { path: '/',            element: <PublicLayout/>, children: routesPublic }
    { path: '/login',       element: <AuthLayout/>,   children: routesAuth }
    { path: '/user/:userId',element: <UserLayout/>,   children: routesUser }
  ])
```

## Directory layout (feature-sliced)

```
src/
  main.tsx / App.tsx            bootstrap + router provider
  layouts/                      PublicLayout, AuthLayout, UserLayout (nav + <Outlet/>)
  routes/
    index.tsx                   createBrowserRouter with layout parents
    config.public.ts            route areas per layout context
    config.auth.ts
    config.user.tsx
    nav.ts                      NavItem + getNavItems() from route.handle.nav
  features/<feature>/
    index.ts                    re-exports (e.g. export { default as bookSearchRoutes } from './routes')
    routes.tsx                  RouteObject[] relative to the layout mount path
    pages/                      route components (SearchPage, BookDetailPage, …)
    components/ hooks/ services/   currently empty placeholders
  services/ hooks/ utils/ components/   empty app-wide placeholders
```

## Routing conventions

- Paths in a feature's `routes.tsx` are **relative** and resolve under the layout that mounts them (e.g. `book-search`’s `search` and `books/:bookId` exist under both `/` and `/user/:userId` because `config.public.ts` and `config.user.tsx` both spread `bookSearchRoutes`).
- `index.ts` of each feature is the only import surface for the rest of the app.
- `getNavItems()` in `nav.ts` derives nav from `route.handle.nav`, but layouts still hardcode `Link`s — the utility is wired for future use.
- Login is a mock (`identity/pages/LoginPage.tsx` navigates to `/user/demo`); there is no auth guard, session handling, or protected-route wrapper yet.

## Data flow (planned vs current)

- Nothing talks to the backend yet: no API proxy in `vite.config.ts`, no `fetch`/Axios wrapper, no `src/services` implementation.
- Backend API surface today is only `GET /api/v1/public/books/{bookId}` (Spring Boot `PublicBookController`). Loans, ranking, and identity endpoints are not implemented yet, so the frontend features are ahead of the API.
- Vite dev server runs at fixed port **1573** (`server.port`).

## Repo-specific style

- Tabs, single quotes, no semicolons, `import type` for types (`verbatimModuleSyntax`), no TS `enum`/`namespace` (`erasableSyntaxOnly`).
- README.md at the app root is the unmodified Vite template — ignore it.