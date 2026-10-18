-- Keep values aligned with the application's UserStatus enum.
ALTER TABLE app_user
    ADD CONSTRAINT ck_app_user_status
    CHECK (status IN ('ACTIVE', 'SUSPENDED'));

-- Emails are normalized by UserService. This also protects the invariant if a
-- different writer inserts an address with different casing.
CREATE UNIQUE INDEX uq_app_user_email_lower
    ON app_user (lower(email));

-- Support the admin list's filters and newest-first ordering.
CREATE INDEX idx_app_user_status_created_at
    ON app_user (status, created_at DESC);

CREATE INDEX idx_app_user_role_created_at
    ON app_user (role, created_at DESC);
