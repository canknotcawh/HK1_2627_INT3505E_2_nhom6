# admin-web — architecture

`admin-web` is the staff/admin console of the LMS (library management system). It is deliberately separate from the public/member app (`main-web`), sharing nothing today — even the code-style conventions differ between the two apps.

## Tech stack

- React 19 + `react-dom` 19, Vite 8 (`@vitejs/plugin-react`), TypeScript ~6.0, `react-router-dom` v7.
- Declarative router: `src/routes/index.tsx` → `createBrowserRouter` → `RouterProvider` in `src/App.tsx` (bootstrapped by `src/main.tsx`).
- No UI kit, CSS framework, HTTP client, or state management. Pages are raw JSX.

## Entrypoint flow

```
index.html → src/main.tsx → <App/> → RouterProvider(router)
  router = createBrowserRouter([
    { element: <AdminLayout/>, children: appRoutes }   // src/routes/config.ts
    appRoutes = [...userRoutes]                        // from features, currently only users-management
  ])
```

## Directory layout

```
src/
  main.tsx / App.tsx        bootstrap + RouterProvider
  layouts/AdminLayout.tsx   single layout (<main> + <Outlet/>)
  routes/
    index.tsx               router creation
    config.ts               spreads feature RouteObject[] into one flat list
  features/
    users-management/       ONLY implemented feature
      index.ts              export { default as userRoutes } from "./routes"
      routes.tsx            [{ path: '/user', element: <UserPage/> }]  ← absolute path
      pages/UserPage.tsx    placeholder
    book-search/ books-management/ loans-management/ profile/
    identity/  system/      empty scaffold dirs (components/hooks/pages/services)
  services/ hooks/ utils/ components/   empty app-wide placeholders
```

## Conventions & quirks

- The one wired route (`/user`) uses an **absolute** path because `config.ts` mounts it without a path prefix — there is no root layout path. `main-web` instead uses relative feature paths. Keep whatever a given feature established; don't mix silently.
- Code style is 4-space indent / double quotes / semicolons — the opposite of `main-web` (tabs / single quotes / no semicolons). The two apps are intentionally independent.
- There is no `routes/nav.ts` equivalent here, no `route.handle.nav` usage, and no auth guard.

## Data flow (planned vs current)

- No API proxy in `vite.config.ts`, no HTTP client, no `services/` code.
- The backend (`backend/src/lms`, Spring Boot) only exposes `GET /api/v1/public/books/{bookId}` today. No admin-side endpoints (books/loans/users management) exist yet, so data-driven admin screens cannot be built against real APIs.
- Dev server fixed at port **2573** (`server.port`).

## Repo-specific style

- `verbatimModuleSyntax` (use `import type`), `erasableSyntaxOnly` (no `enum`/`namespace`), `noUnusedLocals/Parameters`. Typecheck via `npm run build`.
- App README.md is the untouched Vite template — ignore it.