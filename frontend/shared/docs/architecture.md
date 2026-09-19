# shared — architecture (planned)

`frontend/shared/` is an **intentional placeholder**, not a working package. It was created to eventually hold code reused by `main-web` and `admin-web`, but as of the current state it contains no source files, no manifests, and is not linked into the pnpm workspace.

## Intended shape

```
shared/
  shared-types/   domain/model types shared with backend DTOs (Book, Loan, User, …)
  shared-api/     HTTP client(s) + endpoint contracts used by both apps
```

The rationale: `main-web` (portal/member) and `admin-web` (staff console) overlap on domain concepts and both talk to the same Spring Boot backend (`backend/src/lms`, package `com.soa.gr6.lms`). Duplicating types/transport in each app would drift, so a shared layer is the intended fix.

## Actual state (verified)

- `shared/shared-api/` and `shared/shared-types/` exist as empty directories.
- No `package.json` anywhere under `shared/`; no `tsconfig`; no `index`; no exports.
- `frontend/pnpm-workspace.yaml`:
  ```yaml
  packages:
    - "packages/*"   # does not exist
    - "main-web"
    - "admin-web"    # shared/* is NOT listed
  ```
  So workspace tooling and app imports cannot see `shared/` yet.
- Neither app imports from `shared/`; there is no HTTP client in either app (`src/services` is empty in both).

## Why it looks like this

The two apps were bootstrapped independently (different code styles: `main-web` = tabs/single-quotes/no-semicolons, `admin-web` = 4-space/double-quotes/semicolons). The shared layer is the next structural step; the workspace glob was prepared (`packages/*`) but never finished or pointed at `shared/*`.

## Target architecture (when activated)

- `shared-types`: pure TS types/interfaces mirroring backend DTOs (`com.soa.gr6.lms.dto`) — no runtime deps.
- `shared-api`: thin typed wrappers over `fetch` (or a small HTTP client) exposing e.g. `getBook(bookId)` against `/api/v1/...`; owns base-URL/config strategy instead of each app hardcoding ports.
- Consumed by both apps via pnpm workspace protocol (`workspace:*`), resolving TS source directly through package `exports` (Vite/`moduleResolution: bundler`).
- Must honor the shared tsconfig constraints of both apps: `verbatimModuleSyntax` (`import type`) and `erasableSyntaxOnly` (no `enum`/`namespace`).

See `AGENTS.md` in this directory for the activation checklist.