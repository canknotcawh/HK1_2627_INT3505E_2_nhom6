# main-web — project context

## The system

`main-web` is one of three frontend targets of the LMS (**library management system**) built for the university course **HK1_2627_INT3505E_2** (group **nhom6**). The repo root `HK1_2627_INT3505E_2_nhom6/` holds:

- `frontend/` — pnpm workspace:
  - `main-web` (this app) — public portal + member area.
  - `admin-web` — staff/admin console (barely started).
  - `shared/` — empty, planned cross-app code (`shared-api`, `shared-types`); not wired into the workspace yet.
- `backend/` — Spring Boot service (see below). `README.md` at the repo root is a stub; the app-level READMEs are the unmodified Vite template.

## Current state (verified)

- The whole `frontend/` tree is **untracked in git** — nothing frontend has been committed yet; only `backend/` is committed.
- `main-web` is scaffolded but early: every feature works as placeholder pages, routing is wired end-to-end, but there is no data layer (no HTTP client, no proxy, no auth, no shared components).
- Login is a mock: `identity/pages/LoginPage.tsx` hardcodes `MOCK_USER_ID = 'demo'` and just navigates to `/user/demo`. UI text mixes English and Vietnamese.

## Intended feature scope (from the feature-sliced layout)

| Feature              | Purpose                                         |
| -------------------- | ----------------------------------------------- |
| `portal`             | public home page (`/`)                          |
| `identity`           | login/auth flow (`/login`)                      |
| `book-search`        | public + member book search / detail (`search`, `books/:bookId`) |
| `comments-ranking`   | comment + book ranking (`ranking`)              |
| `loans`              | member loans (`loans`)                          |
| `profile`            | member profile (`profile`, index redirect)      |

## Backend counterpart

- Single Maven module `lms` at `backend/src/lms` — Spring Boot **4.1.1**, Java **25**, `com.soa.gr6`.
- Stacks: JPA/PostgreSQL, Elasticsearch, reactive Redis + Redis-backed sessions, Spring Security + OAuth2 client, Spring AI vector store, mail; `application.yaml` is nearly empty.
- Layered/DDD-ish packages: `controller/PublicController`, `domain` (+`enums`), `dto`, `exception` (domain exceptions), `mapper`, `repository`, `service/{,imple}`.
- Exposed today: `GET /api/v1/public/books/{bookId}` via `PublicBookController` → `BookService#getBook`. Loans/users controllers don't exist yet.
- Run from `backend/src/lms` with the wrapper: `./mvnw spring-boot:run`.

## Git / workflow

- Default branch `main`; feature branches are committed per area (e.g. `origin/identity`, `origin/tan-branch`) and merged via pull requests into `main`.
- History: `first commit` → backend codebase (`springboot`) → domain entities + value objects → exceptions → public book lookup flow, then a frontend workspace was scaffolded locally (uncommitted).

## Development log / next steps

- No tests, no CI. Verification for `main-web` is `npm run build` (typecheck included) and `npm run lint`.
- Natural next steps: introduce an HTTP client + Vite proxy to `/api/v1`, implement `search`/`listing` pages against the backend, and decide where `shared/` types come in.