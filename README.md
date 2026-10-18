# HK1_2627_INT3505E_2_nhom6 — Hệ thống thư viện điện tử (LMS)

w4 hw: [GitHub](https://github.com/canknotcawh/nhom6_btvn)

Spring Boot 4 (Java 25) + PostgreSQL · React 19 (Vite) × 2 (độc giả / quản trị). Xác thực:
JWT tự ký ở backend + đăng nhập Google OAuth2 (xem ADR-0006).

## Chạy nhanh
```powershell
cd backend/src/lms
docker compose up -d                      # postgres, mailpit, redis
$env:APP_BOOTSTRAP_ADMIN_EMAILS = "admin@lms.local"
$env:GOOGLE_CLIENT_ID = "<google-oauth-client-id>"
./mvnw spring-boot:run                    # API :8080  (Swagger: /swagger-ui.html)
cd ../../../frontend/main-web  ; npm i ; npm run dev    # :5173
cd ../admin-web                ; npm i ; npm run dev    # :5175
```
Đăng nhập bằng tài khoản Google có email trong `APP_BOOTSTRAP_ADMIN_EMAILS` để được cấp quyền admin · Mailpit: http://localhost:8025.

## Tài liệu (`doc/`)
| File | Nội dung |
|---|---|
| [00-system-context](doc/00-system-context.md) | Kiến trúc, API, mô hình dữ liệu, hiện trạng, lỗi đã sửa |
| [01-business-analysis](doc/01-business-analysis.md) | Nghiệp vụ, phạm vi V1, backlog, định hướng Phase 2 |
| [02-keycloak-guide](doc/02-keycloak-guide.md) | Keycloak từ cơ bản đến áp dụng vào dự án |
| [03-security-review](doc/03-security-review.md) | Rà soát an toàn thông tin (identity + toàn hệ thống) |
| [04-frontend-review](doc/04-frontend-review.md) | "Sạn" frontend & đề xuất đồng bộ 2 web |
| [05-testing](doc/05-testing.md) | Test backend, coverage 89 % (yêu cầu ≥ 50 %) |
| [06-eda-excel-and-local-db](doc/06-eda-excel-and-local-db.md) | EDA khi Excel không khớp domain + DB local bằng Docker Compose |

Test backend: `cd backend/src/lms && ./mvnw clean verify` (báo cáo: `target/site/jacoco/index.html`).
