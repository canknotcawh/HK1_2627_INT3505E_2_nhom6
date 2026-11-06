-- Hibernate had created these objects before Flyway was enabled. Normalize
-- them to the constraints and indexes expected by the Account Phase 3 schema.

ALTER TABLE app_user
    ALTER COLUMN keycloak_subject DROP NOT NULL;

DO $$
DECLARE
    fk_name TEXT;
BEGIN
    FOR fk_name IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'public.auth_refresh_session'::regclass
          AND confrelid = 'public.app_user'::regclass
          AND contype = 'f'
    LOOP
        EXECUTE format('ALTER TABLE public.auth_refresh_session DROP CONSTRAINT %I', fk_name);
    END LOOP;

    ALTER TABLE public.auth_refresh_session
        ADD CONSTRAINT fk_auth_refresh_session_user
        FOREIGN KEY (user_id) REFERENCES public.app_user(id) ON DELETE CASCADE;

    FOR fk_name IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'public.password_reset_token'::regclass
          AND confrelid = 'public.app_user'::regclass
          AND contype = 'f'
    LOOP
        EXECUTE format('ALTER TABLE public.password_reset_token DROP CONSTRAINT %I', fk_name);
    END LOOP;

    ALTER TABLE public.password_reset_token
        ADD CONSTRAINT fk_password_reset_token_user
        FOREIGN KEY (user_id) REFERENCES public.app_user(id) ON DELETE CASCADE;
END $$;

CREATE INDEX IF NOT EXISTS idx_auth_refresh_session_user_active
    ON auth_refresh_session(user_id, expires_at)
    WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_auth_refresh_session_family
    ON auth_refresh_session(family_id);

CREATE INDEX IF NOT EXISTS idx_password_reset_token_user
    ON password_reset_token(user_id);

ALTER TABLE loan
    DROP CONSTRAINT IF EXISTS loan_status_check,
    DROP CONSTRAINT IF EXISTS ck_loan_status;

ALTER TABLE loan
    ADD CONSTRAINT ck_loan_status
    CHECK (status IN ('ACTIVE', 'RETURNED', 'OVERDUE', 'LOST', 'PENDING_RETURN'));

-- Tables created by Hibernate before Flyway have no column defaults; align them with
-- the schema from V1/B4 so existing and new databases behave the same for non-JPA writers.
ALTER TABLE app_user
    ALTER COLUMN role SET DEFAULT 'USER',
    ALTER COLUMN status SET DEFAULT 'ACTIVE',
    ALTER COLUMN created_at SET DEFAULT now(),
    ALTER COLUMN updated_at SET DEFAULT now();
