CREATE TABLE app_user (
    id                UUID         PRIMARY KEY,
    keycloak_subject  VARCHAR(64)  NOT NULL UNIQUE,
    email             VARCHAR(255) NOT NULL UNIQUE,
    full_name         VARCHAR(255) NOT NULL,
    role              VARCHAR(20)  NOT NULL DEFAULT 'USER',
    status            VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE',
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT now()
);