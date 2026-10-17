ALTER TABLE app_user
    ADD COLUMN bootstrap_admin_granted BOOLEAN NOT NULL DEFAULT FALSE;
