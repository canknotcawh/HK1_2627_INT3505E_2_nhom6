-- Complete schema snapshot for a new database at the V4 boundary.
-- Existing databases with V1-V4 history ignore this baseline migration.

CREATE TABLE roles (
    name VARCHAR(20) PRIMARY KEY
);

INSERT INTO roles (name) VALUES ('ADMIN'), ('USER');

CREATE TABLE app_user (
    id UUID PRIMARY KEY,
    keycloak_subject VARCHAR(64) UNIQUE,
    google_subject VARCHAR(64) UNIQUE,
    password_hash VARCHAR(255),
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'USER',
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    bootstrap_admin_granted BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT app_user_role_check CHECK (role IN ('USER', 'ADMIN')),
    CONSTRAINT ck_app_user_status CHECK (status IN ('ACTIVE', 'SUSPENDED')),
    CONSTRAINT fk_app_user_role FOREIGN KEY (role) REFERENCES roles(name)
);

CREATE UNIQUE INDEX uq_app_user_email_lower ON app_user (lower(email));
CREATE INDEX idx_app_user_status_created_at ON app_user (status, created_at DESC);
CREATE INDEX idx_app_user_role_created_at ON app_user (role, created_at DESC);

CREATE TABLE book (
    id UUID PRIMARY KEY,
    available_copies INTEGER NOT NULL,
    cover_image_url VARCHAR(1000),
    created_at TIMESTAMPTZ NOT NULL,
    description TEXT,
    isbn13 VARCHAR(13) UNIQUE,
    language VARCHAR(10),
    page_count INTEGER,
    preview_url VARCHAR(1000),
    published_year INTEGER,
    reader_url VARCHAR(1000),
    status VARCHAR(20) NOT NULL,
    subtitle VARCHAR(500),
    title VARCHAR(500) NOT NULL,
    total_copies INTEGER NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT book_status_check CHECK (status IN ('ACTIVE', 'RETIRED'))
);

CREATE TABLE loan (
    id UUID PRIMARY KEY,
    borrowed_at TIMESTAMPTZ NOT NULL,
    due_at TIMESTAMPTZ NOT NULL,
    renewed_count INTEGER NOT NULL,
    returned_at TIMESTAMPTZ,
    status VARCHAR(20) NOT NULL,
    book_id UUID NOT NULL,
    user_id UUID NOT NULL,
    CONSTRAINT ck_loan_status CHECK (status IN ('ACTIVE', 'RETURNED', 'OVERDUE', 'LOST', 'PENDING_RETURN')),
    CONSTRAINT fk_loan_book FOREIGN KEY (book_id) REFERENCES book(id),
    CONSTRAINT fk_loan_user FOREIGN KEY (user_id) REFERENCES app_user(id)
);
