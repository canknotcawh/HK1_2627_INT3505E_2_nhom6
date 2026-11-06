-- Keep the role catalogue in sync with UserRole and enforce app_user.role values.
CREATE TABLE IF NOT EXISTS roles (
    name VARCHAR(20) PRIMARY KEY
);

INSERT INTO roles (name)
VALUES ('ADMIN'), ('USER')
ON CONFLICT (name) DO NOTHING;

ALTER TABLE app_user
    ADD CONSTRAINT fk_app_user_role
    FOREIGN KEY (role) REFERENCES roles (name);
