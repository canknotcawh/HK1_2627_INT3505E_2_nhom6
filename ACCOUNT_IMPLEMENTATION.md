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
- Added V5 (additive, idempotent: user columns, `auth_refresh_session`, `password_reset_token`) and V6 (normalizes the objects Hibernate had already created, see Migration status).

## API added/updated

- `POST /api/v1/public/auth/refresh`: same request; response now includes `{accessToken,refreshToken}`.
- `POST /api/v1/public/auth/logout`: `{refreshToken}`; returns 204 and is idempotent.
- `POST /api/v1/public/auth/password-reset/request`: `{email}`; same generic success response for all account states.
- `POST /api/v1/public/auth/password-reset/confirm`: `{token,newPassword}`.
- `POST /api/v1/users/me/password`: `{currentPassword,newPassword}`.
- `PATCH /api/v1/users/me`: `{fullName}`.

## Migration status

Starting point (database check on 2026-10-31):

- The `lms` database had two users and no case-insensitive duplicate emails.
- `flyway_schema_history` held a baseline row for V1 followed by V2, V3 and V4 (V2 checksum `1166829414`); V5 was not recorded.
- The application did not include Flyway. Hibernate `ddl-auto: update` had created `profile_name_managed`, `password_reset_requested_at`, `auth_refresh_session` and `password_reset_token`, so the schema worked but V5 was never recorded.
- The V2 source had been removed from the repository, and the old V1-V4 chain could not build an empty database (it never created `roles`, `book` or `loan`).

Changes made to the migration setup:

- Flyway is enabled through `spring-boot-starter-flyway` and `flyway-database-postgresql`. `application.yaml` sets `spring.flyway.enabled: true` and `spring.jpa.hibernate.ddl-auto: validate`. `baseline-on-migrate` is not used.
- V1 and V2 were restored unchanged from Git commit `5b34b93`. The restored V2 checksum equals the checksum recorded in the database. V3, V4 and V5 are unchanged.
- `B4__complete_schema_after_v4.sql` is a baseline migration that describes the full schema (`roles`, `app_user`, `book`, `loan`) at the V4 boundary. It is intended for new databases only; a database that already has V1-V4 history ignores it.
- `V6__reconcile_account_phase3_schema.sql` makes `app_user.keycloak_subject` nullable, replaces the Hibernate-named foreign keys on the two Phase 3 tables with named `ON DELETE CASCADE` keys, adds the missing session/reset indexes, recreates `ck_loan_status` with all `LoanStatus` values, and sets the `role`, `status`, `created_at` and `updated_at` column defaults on `app_user` that the Hibernate-created table lacked. It does not delete or rewrite data.
- Flyway metadata was never edited by hand and neither `repair` nor `baseline` was run. A custom-format backup of the database was taken before any change.

Verification status:

All of the following were executed on the developer machine (PostgreSQL 16 in Docker) on 2026-10-31 and passed:

- Rehearsal on a copy of the live database taken while its history was V1-V4: the backend started with Flyway enabled and `ddl-auto: validate`; history became V1-V6, all successful; the 2 users and the session and reset-token tables were unchanged.
- Empty database built only from the committed migration files: the backend started with Flyway and `validate`; history is B4 (baseline, version 4), V5, V6.
- The schema of the migrated copy and of the empty database is identical when compared through catalog queries that ignore constraint names. The only leftover difference is a redundant duplicate `status` CHECK on the migrated copy (one from V3, one created earlier by Hibernate); it is harmless and was collapsed in the comparison.
- `./mvnw -q test` passed after the migration changes.
- Live `lms` database: `flyway_schema_history` shows V1-V6 all successful and the backend starts against it with Flyway enabled and `ddl-auto: validate`, which also confirms that the V6 file in the repository matches the recorded checksum. The 2 users remain, with 0 session and 0 reset-token rows as before. V5 and V6 were applied by Flyway at backend startup, never by hand. They were already recorded when the final verification run began, so the before/after comparison for the live database relies on the earlier rehearsal (taken from a V1-V4 dump) and on the row counts recorded before the migration.
- Backups taken before the migration are in `/tmp` (`lms-before-flyway-20261031.dump` and `lms-before-apply-20261031-102153.dump`); copy them somewhere permanent if they are still needed.

Not tested: a live registration, login, refresh and password-reset flow against the migrated database, and other developers' local databases.

## Tests and verification status

- Updated backend tests affected by constructor/API changes; added tests for JWT profile key validation, refresh-session rotation/replay, controller contracts, and Google name sync behavior.
- `./mvnw -q -DskipTests test-compile`: passed after correcting a test setup compile error.
- `./mvnw -q test`: passed when run outside the sandbox (Mockito's inline mock maker could not attach its JDK 25 agent inside the sandbox). Re-run on the developer machine after the migration changes: passed (the Mockito self-attach warning under JDK 25 is expected).
- `npm run build` passed in both `frontend/admin-web` and `frontend/main-web`.
- No live password-reset email/browser flow was exercised.

## Required before production

1. For every other environment (staging, production): take a backup, rehearse on a copy of the data and on an empty database as was done locally, then let Flyway apply V5 and V6 and confirm both are recorded as successful. Do not edit V5 or V6 once they have been applied anywhere.
2. Set a unique `JWT_SECRET`, SMTP credentials/host, and `MAIN_WEB_URL` for the deployed environment.
3. Exercise the reset email flow in Mailpit and perform the remaining browser walkthrough.
4. Other developers with an existing local database: starting the new backend will apply V5 and V6 to it. Databases whose Flyway history differs from V1-V4 (for example created from an older branch) should be recreated from the new baseline.

Email verification remains disabled by design to preserve current registration behavior. Existing refresh tokens from before session tracking have no session id; users with such a token will need to sign in again after deploying the new backend.