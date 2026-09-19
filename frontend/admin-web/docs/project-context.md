# admin-web — project context

## The system

`admin-web` is the staff/admin frontend of the LMS (**library management system**) for the course **HK1_2627_INT3505E_2** (group **nhom6**). It sits in the `frontend/` pnpm workspace alongside `main-web` (portal + member app) and an empty `shared/` scaffold:

```
frontend/
  main-web/       user-facing app (public portal, member profile/loans/search/ranking)
  admin-web/      this app — admin console
  shared/         planned shared-api / shared-types (empty, not in workspace yet)
backend/
  src/lms/        Spring Boot service (committed to git)
```

## Current state (verified)

- **`admin-web` is barely started.** Only `features/users-management/` has real files; every other feature directory (`book-search`, `books-management`, `loans-management`, `profile`, `identity`, `system`) is empty scaffolding, and the generated `components/hooks/pages/services` subfolders are placeholders.
- The only working screen is the users-management page at route `/user`, which renders static text (`"This is User Page Management"`).
- The entire `frontend/` tree is **untracked in git**; only `backend/` is committed. Git history and branch conventions are described in `main-web/docs/project-context.md` (shared repo).

## Intended admin scope (from scaffolding)

| Feature             | Purpose                                        |
| ------------------- | ---------------------------------------------- |
| `users-management`  | manage library users (started)                 |
| `books-management`  | manage books inventory                         |
| `loans-management`  | manage loans / returns / renewals              |
| `system`            | system/ops admin screens                       |
| `identity`          | admin login/auth                               |
| `book-search`       | staff search (reuse of the public lookup)      |
| `profile`           | staff profile                                  |

## Backend counterpart

- Single Maven module `lms` at `backend/src/lms` — Spring Boot **4.1.1**, Java **25**, `com.soa.gr6`.
- Packages: `controller/PublicController`, `domain`(+`enums`), `dto`, `exception`, `mapper`, `repository`, `service/{imple}`.
- Only endpoint so far: `GET /api/v1/public/books/{bookId}` (`PublicBookController` → `BookService#getBook`). Admin-facing CRUD/management endpoints do **not** exist yet — any admin screen that needs data will need backend work first (or a compatible contract to be agreed).
- Run from `backend/src/lms`: `./mvnw spring-boot:run`. Stack includes JPA/PostgreSQL, Elasticsearch, Redis (sessions/cache), Spring Security + OAuth2.

## Workflow notes

- No tests, no CI in `frontend/`. Verification = `npm run build` (typecheck) + `npm run lint`.
- Because the two web apps are independent SPA workspaces with different ports and different code styles, do not refactor one app while editing the other, and don't assume patterns from `main-web` apply here (e.g. absolute vs relative feature routes).