# Account / Identity – Phase 2 Implementation Plan

This is a proposed implementation plan based on [`ACCOUNT_AUDIT.md`](ACCOUNT_AUDIT.md). No application code or schema has been changed. Per the requested workflow, implementation starts only after this plan is accepted.

## Recommended scope

The plan keeps the existing self-signed JWT and Google identity architecture. It does not replace auth with Keycloak, change the existing login/register routes, or touch Book/Loan behavior.

Included in the recommended first implementation:

1. Remove the known JWT secret fallback from non-test runtime and validate the configured key.
2. Establish safe schema migration handling without dropping or rewriting current user data.
3. Add server-side refresh session tracking, rotation, and logout/revocation.
4. Add password change and forgot/reset password, using Mailpit for local email testing.
5. Add self-service full-name update and correct profile copy for both Google and password accounts.
6. Add backend security/integration tests and frontend auth-flow tests where the project setup supports them.

**Email verification:** do not require it in this implementation unless the product explicitly requires verified email before account use. Google bootstrap-admin continues to require Google's `email_verified` claim. Password registration remains compatible with the current immediate-login flow. This avoids unexpectedly blocking existing users and is independent of password reset.

## Priority and delivery order

| Order | Work | Priority | Dependencies |
|---|---|---|---|
| 0 | Confirm live DB schema and migration history; take/verify backup before any schema rollout | P1 | Access to target DB |
| 1 | JWT configuration hardening and token tests | P1 | None |
| 2 | Migration strategy and additive auth tables/indexes | P1 | Step 0 |
| 3 | Refresh rotation/revocation and logout | P1 | Step 2 |
| 4 | Password change/reset and email sender | P1 | Step 2; SMTP config |
| 5 | Profile update and UI copy correction | P2 | None |
| 6 | Frontend session UX, tests, full verification | P1 | Steps 1–5 |

## Detailed work by area

### 0. Database preflight and migration decision

Before enabling Flyway, inspect the actual database used by the app: tables/columns, constraints/indexes, current Flyway history if any, duplicate case-folded emails, and whether `bootstrap_admin_granted` already exists. Take a restorable backup. This is a precondition because existing V3/V4 files assume `app_user` already exists and the current app uses Hibernate `ddl-auto: update`.

Recommended transition:

- Introduce Flyway with an explicit baseline matching the inspected existing schema; do not mark old migrations applied by guesswork.
- For a clean database, provide a complete initial schema migration. For an existing database, baseline at the verified schema version and add only forward migrations.
- Add auth session and reset-token tables in new forward migrations. Keep existing user rows and passwords intact.
- After the migration rollout is proven on an empty DB and a copy of the current DB, change Hibernate to `ddl-auto: validate` (or `none` if validation conflicts with intentional mappings).
- Do not remove V3/V4 until their effects are represented and confirmed in the selected migration history.

Likely files: `backend/src/lms/pom.xml`, `backend/src/lms/src/main/resources/application.yaml`, new/adjusted `db/migration/*.sql`, and test DB configuration. The exact baseline/version number is intentionally deferred until preflight.

### 1. JWT secret hardening

- Keep HS256 and existing token claims/TTLs.
- Make production-like profiles fail startup if `JWT_SECRET` is absent, known-default, or below the algorithm's minimum key strength.
- Keep a developer-friendly local setup through an explicit local profile or generated ignored `.env`; never silently use the public development key in production.
- Avoid logging the key. Document rotation as a session-invalidating operation unless a multi-key rotation window is deliberately designed.

Likely files: `application.yaml`, profile-specific config/example env, `SecurityConfig`, and `JwtService` tests.

### 2. Refresh session storage, rotation, logout

Proposed persistence: `auth_refresh_session` with UUID/session id, user id, hash of token (or a high-entropy `jti` plus hash), created/expiry timestamps, revoked timestamp, and replacement session reference. Store no raw refresh token.

Proposed behavior:

- Login/register/Google login create one refresh session.
- `POST /api/v1/public/auth/refresh` accepts the current refresh token, atomically consumes/revokes it, and returns a new access token **and** refresh token.
- Reuse of a consumed refresh token revokes its token family/session and returns 401.
- `POST /api/v1/public/auth/logout` revokes the presented refresh session and succeeds idempotently; frontend always clears local tokens.
- Suspended/missing users cannot refresh. Password change/reset revokes all of that user's sessions.
- A concurrent refresh has one winner; the second request is treated as token reuse. Frontends must prevent duplicate refresh calls (they already share an in-flight promise per app).

API compatibility: keep the existing refresh URL and request shape. Add `refreshToken` to its response while retaining `accessToken`; update both apps to replace both stored tokens. Add logout as an additive endpoint. Existing deployed clients that only read `accessToken` would continue to operate until the old refresh token's first-use policy is enforced, so rollout should deploy backend and both frontends together or provide a short compatibility window.

Likely files: new session entity/repository/service, `JwtService`, `AuthService`, `AuthController`, DTOs, security rules, both frontend `api-client.ts`, `auth-tokens.ts`, and `AuthContext.tsx`.

### 3. Password management

Proposed endpoints:

- `POST /api/v1/public/auth/password-reset/request` with `{email}`; always return the same generic success response whether the account exists, is Google-only, or is suspended. Send a one-time reset link only for eligible password accounts.
- `POST /api/v1/public/auth/password-reset/confirm` with `{token,newPassword}`; consume token once, enforce existing password length policy, BCrypt-hash the new password, and revoke existing refresh sessions.
- `POST /api/v1/users/me/password` with `{currentPassword,newPassword}`; only for password accounts, validate current password, then update hash and revoke other sessions. Google-only accounts receive a clear non-sensitive error and retain Google login.

Reset persistence: high-entropy random token generated with a cryptographic RNG, only token hash stored, expiry (recommend 30 minutes), consumed timestamp, and user association. Limit issuance/attempts to reduce mail abuse. Do not reveal whether an email exists in the HTTP response.

Email: add the Spring mail integration only if required by the existing stack (currently `pom.xml` has no mail starter). Configure SMTP via environment; local Mailpit host/port documented for backend container vs host execution. Do not commit SMTP credentials. If delivery fails, keep the generic public response and log a safe operational error without token/PII.

Likely files: auth DTOs/controller/service, password-reset entity/repository, exception/error mapping, `pom.xml`, `application.yaml`, `.env.example`, Docker/dev docs, and backend tests.

### 4. Profile update

- Add `PATCH /api/v1/users/me` with only `{fullName}`. Derive user id from `AuthenticatedUser`; ignore/reject client-supplied id, role, status, or email.
- Validate nonblank name and max 255; return the normal `UserResponse`.
- Update main-web AuthContext state and add an editable name field/save/error/loading state to Profile.
- Change profile copy so it does not claim all data is synchronized from Google. Keep email read-only; Google name sync behavior should be decided so later Google login does not silently overwrite a manually edited name.

Likely files: `UserController`, `UserService`, request DTO, service/controller tests, main-web `Profile.tsx` and `AuthContext.tsx`.

### 5. Frontend consistency and tests

- Keep separate localStorage namespaces for the two apps in this iteration; move to HttpOnly cookies only as a separately designed architecture change because it changes CSRF/CORS/deployment requirements.
- Update refresh handling to atomically replace access and refresh token. Add explicit logout call, but clear local state even if backend is unavailable.
- On 401 after failed refresh, clear tokens and redirect consistently; on network/5xx errors retain tokens and show retry/offline state. A 403 should not trigger refresh.
- Map known error codes for duplicate email, Google-only/password-only account, suspended account, invalid reset token, password mismatch, validation, unauthorized, forbidden and service unavailable.
- Add frontend tests only if the repo's current frontend test setup is configured; otherwise include setup as a deliberate dependency decision, not an unbounded testing framework migration.

Likely files: both apps' `api-client.ts`, token helper, auth context, login page; main-web profile form; tests and package scripts if needed.

## Test and verification matrix

Backend additions:

- JWT: wrong signature, expiry, access-vs-refresh token type, missing/weak production secret.
- Session: refresh success rotates both tokens; old token fails; reuse revokes; logout idempotency; suspended user denied; parallel refresh has exactly one valid successor.
- Password: generic reset response for existing/non-existing/Google-only email; expired/used/invalid token; successful reset hashes password and revokes sessions; incorrect current password; Google-only change-password rejection.
- Profile: only own full name can change; role/status/email cannot be mutated.
- Authorization: USER cannot invoke admin APIs; only ADMIN can; self/last-admin protection remains.
- Persistence: migration on empty schema and upgrade from a snapshot of the current schema, preserving users/loans and constraints.

Frontend additions:

- Register/login success and surfaced server errors.
- Refresh rotation stores both returned values; concurrent 401s share one refresh.
- Logout clears local state if API call fails.
- Expired session redirects; temporary backend outage preserves session and offers retry.
- Password reset request always displays the same confirmation; reset validation and profile update states.

Verification commands after implementation: `./mvnw clean verify` in `backend/src/lms`; `npm run build`, `npm run lint`, and configured frontend tests in both apps. Also test against a disposable PostgreSQL DB and verify migration upgrade against a database copy. These commands are not run during Phase 2 planning.

## Risks and rollback

- **Migration risk:** Flyway can reject or misinterpret an existing untracked schema. Mitigation: preflight + backup + baseline per environment; rehearse against a DB copy. Rollback restores DB backup or uses forward corrective migrations; never delete user data as rollback.
- **Refresh contract change:** rotation invalidates old tokens and requires both frontend deployments. Mitigation: coordinated release, temporary compatibility window if deployment is staggered, and user re-login notice if needed.
- **Mail delivery:** Mailpit proves local delivery only, not production deliverability. Configure real SMTP separately and monitor failures without exposing reset tokens.
- **Security-secret change:** replacing a known JWT key invalidates all access/refresh tokens signed by it. Plan a one-time re-login and avoid exposing secrets in logs/docs.
- **Profile vs Google sync:** a later Google sign-in may overwrite a user-edited name under current behavior. Choose explicit precedence before implementing profile edits.

## Explicitly out of scope

- Keycloak migration, account linking by email, email verification enforcement, avatar upload, changing role/status through profile, Book/Loan refactors, and replacing JWT with cookie/BFF architecture.

## Decisions needed before Phase 3

The plan recommends defaults above, but these product/deployment details need confirmation before implementation because they affect user-visible behavior or production safety:

1. Should password accounts be allowed to use the system before email verification? **Recommendation: yes for now**, to preserve current registration behavior; implement reset email only.
2. Is one-time logout/session revocation worth invalidating current sessions during rollout? **Recommendation: yes**, coordinated deploy and users re-login once if necessary.
3. Which database is the target for migration preflight, and can we take a backup/copy before enabling Flyway? This cannot be inferred from repository files.
4. For Google accounts, should manually edited full name persist across later Google login? **Recommendation: manual edit persists**; Google login updates the name only for accounts that have never chosen an app-managed name (requires a small persistence flag or explicit policy).
