# shared — project context

## Where this sits

`frontend/shared/` is part of the LMS (**library management system**) monorepo for course **HK1_2627_INT3505E_2**, group **nhom6** (`HK1_2627_INT3505E_2_nhom6/`).

```
frontend/                 pnpm workspace (workspace root)
  main-web/               public portal + member app      (port 1573)
  admin-web/              staff/admin console             (port 2573)
  shared/                 ← this dir: shared-api + shared-types (EMPTY, not wired)
backend/                  Spring Boot service (Maven module `lms`, committed)
```

## Status

- `shared/` is pure scaffolding: two empty directories (`shared-api`, `shared-types`), no `package.json`, no exports, not referenced by `frontend/pnpm-workspace.yaml`, and not imported by either app. Treat it as "reserved", not as a dependency.
- **The entire `frontend/` tree is untracked in git** (only `backend/` is committed). Anything created under `shared/` is invisible to `git status` by default.
- No tests or CI exist in the frontend workspace.

## Why it exists (the problem it will solve)

Both frontends talk to the same backend and model the same domain. Today:

- `main-web` and `admin-web` were generated separately and have **different code styles** and **different route conventions**, so sharing by copy/paste is fragile.
- Neither app has an HTTP client or API types; the backend DTOs live only in Java (`com.soa.gr6.lms.dto`, e.g. `BookResponse`).
- The backend currently exposes just `GET /api/v1/public/books/{bookId}`, so the first likely shared artifact is the book lookup type + call.

Activating `shared/` (see `AGENTS.md` for the checklist) turns this into the single place for cross-app types and API access, avoiding drift as both apps grow.

## Full repo context

Detailed system + backend context, git/branch conventions, and the current feature map live in the sibling docs:

- `main-web/docs/project-context.md` — the authoritative repo-wide context.
- `main-web/docs/architecture.md`, `admin-web/docs/architecture.md` — per-app wiring.

## Conventions to preserve

- TS constraints shared by both apps: `verbatimModuleSyntax` (import types with `import type`) and `erasableSyntaxOnly` (no `enum`, `namespace`, or parameter properties).
- Match the eventual shared package style to neither app's file style blindly — pick one (likely the newer `admin-web` style: double quotes + semicolons) and document it here once a package actually exists.