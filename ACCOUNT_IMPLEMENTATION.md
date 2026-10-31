# Account / Identity – Phase 3 Implementation Notes

Implementation based on [`ACCOUNT_IMPLEMENTATION_PLAN.md`](ACCOUNT_IMPLEMENTATION_PLAN.md).

## Implemented

- Kept the existing self-signed JWT and Google Identity Services architecture.
- Added profile-aware JWT key validation. The local key is loaded only when `dev` is explicitly active (`run-dev.sh` sets it); a non-dev profile requires a configured key of at least 32 UTF-8 bytes and rejects the known development key.
- Added refresh-session persistence with SHA-256 token hashes, session families, atomic rotation, replay-family revocation, logout revocation, and user-wide revocation after password changes/resets. Old token rows and expired reset tokens are cleaned daily. Existing login/register response shape is unchanged. Refresh now returns both `accessToken` and `refreshToken`.
- Admin suspension revokes all refresh sessions for the suspended account.
- Added password change and forgot/reset password APIs. Reset links use a random one-time token, only its hash is stored, expiry is 30 minutes, requests have a 60-second per-account cooldown, and the public request response does not reveal whether the account exists. Google-only users cannot use password change/reset.
- Added Mailpit SMTP defaults and reset email link configuration.
- Added `PATCH /api/v1/users/me` that updates only the authenticated account's full name. A manually selected name is kept when the user signs in with Google again.
- Updated both frontend clients to persist rotated refresh tokens and call server logout while clearing local state immediately. Added forgot/reset password UI to main-web and a link from admin-web. Updated the profile UI to edit name and change password.
- Added V5 SQL describing additive user columns and auth session/reset-token tables.

## API added/updated

- `POST /api/v1/public/auth/refresh`: same request; response now includes `{accessToken,refreshToken}`.
- `POST /api/v1/public/auth/logout`: `{refreshToken}`; returns 204 and is idempotent.
- `POST /api/v1/public/auth/password-reset/request`: `{email}`; same generic success response for all account states.
- `POST /api/v1/public/auth/password-reset/confirm`: `{token,newPassword}`.
- `POST /api/v1/users/me/password`: `{currentPassword,newPassword}`.
- `PATCH /api/v1/users/me`: `{fullName}`.

## Live database check (2026-10-31)

- PostgreSQL 16.15 is reachable, and the running backend responds on port 8080 (the secured health endpoint returns HTTP 401 without a token).
- The `lms` database has two users and no case-insensitive duplicate emails.
- Flyway history is at V4. The running backend's Hibernate `ddl-auto: update` has created `profile_name_managed`, `password_reset_requested_at`, `auth_refresh_session`, and `password_reset_token`; the existing user rows remain present.
- The application does not currently include or enable Flyway. Therefore the DB schema is usable by the running app, but V5 is not recorded in Flyway history and the migration workflow is not yet complete. The repository also lacks the historical V2 migration source, so enabling Flyway without reconciling the old history would make validation unreliable. I did not alter Flyway metadata or run V5 directly against the live database.

## Tests and verification status

- Updated backend tests affected by constructor/API changes; added tests for JWT profile key validation, refresh-session rotation/replay, controller contracts, and Google name sync behavior.
- `./mvnw -q -DskipTests compile`: passed.
- `./mvnw -q -DskipTests test-compile`: passed after correcting a test setup compile error.
- `./mvnw -q test`: passed when run outside the sandbox (Mockito's inline mock maker could not attach its JDK 25 agent inside the sandbox).
- `npm run build` passed in both `frontend/admin-web` and `frontend/main-web`.
- No live password-reset email/browser flow was exercised. V5 has not been applied through Flyway; see the database limitation above.

## Required before production

1. Reconcile the deleted historical V2 migration and add a complete clean-database baseline before enabling Flyway; then rehearse V5 against a database copy and record it through Flyway.
2. Set a unique `JWT_SECRET`, SMTP credentials/host, and `MAIN_WEB_URL` for the deployed environment.
3. Exercise the reset email flow in Mailpit and perform the remaining browser walkthrough.

Email verification remains disabled by design to preserve current registration behavior. Existing refresh tokens from before session tracking have no session id; users with such a token will need to sign in again after deploying the new backend.
