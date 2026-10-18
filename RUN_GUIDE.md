# Hướng Dẫn Chạy Dự Án LMS

Tài liệu hướng dẫn cài đặt và khởi chạy dự án, bao gồm 2 phần: **Backend** (Spring Boot) và **Frontend** (React / npm).

---

## 0. Chuẩn bị: Google OAuth Client ID (chỉ cần cho `main-web`)

Hệ thống có **2 cách đăng nhập** ở `main-web` (bạn đọc): email/mật khẩu (tự đăng ký ngay
trên trang) và Google OAuth2. `admin-web` (quản trị) **chỉ đăng nhập bằng email/mật khẩu**,
không có nút Google. JWT do backend tự ký (không dùng Keycloak nữa).

Email đăng ký bằng mật khẩu và email đăng nhập Google **không tự gộp tài khoản** — nếu 1
email đã dùng cách này, thử cách khác với cùng email sẽ bị báo lỗi rõ ràng (vd: "email này
đăng nhập bằng Google").

Để đăng nhập Google ở `main-web` cần một Google OAuth2 Client ID:

1. Vào [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
2. Tạo **OAuth client ID** → loại **Web application**.
3. Thêm vào **Authorized JavaScript origins**: `http://localhost:5173`.
4. Copy **Client ID** (dạng `xxxx.apps.googleusercontent.com`) — dùng cho backend và
   `main-web` ở dưới (không cần cho `admin-web`).

Không có Client ID vẫn chạy được toàn bộ hệ thống — chỉ cần dùng đăng ký/đăng nhập bằng
email/mật khẩu, không cần nút Google.

---

## 0.1 Tài khoản test có sẵn (môi trường dev local)

Đã tạo sẵn 2 tài khoản bằng mật khẩu trong database dev local để thử ngay, không cần Google:

| Vai trò | Email | Mật khẩu |
|---|---|---|
| **Admin** | `admin.test@lms.local` | `Admin@12345` |
| **User thường** | `user.test@lms.local` | `User@12345` |

Và 6 cuốn sách mẫu đã nạp vào danh mục (qua `POST /api/v1/admin/books`): *Clean Code*,
*Design Patterns*, *Sapiens: Lược sử loài người*, *Đắc Nhân Tâm*, *Nhà Giả Kim*, *Python
Crash Course*.

> Lưu ý: tài khoản/sách này chỉ tồn tại trong volume Postgres local hiện tại
> (`backend/src/lms`, container `lms-postgres-1`). Nếu bạn `docker compose down -v` (xóa
> volume) thì mất hết, cần đăng ký lại qua `/api/v1/public/auth/register` và thêm sách lại
> qua `/api/v1/admin/books` (cần token admin — xem mục 3 bên dưới để biết cách cấp quyền admin
> cho tài khoản mật khẩu, vì đăng ký bằng mật khẩu không được tự cấp admin).

---

## 1. Backend

### Công nghệ sử dụng
- **Ngôn ngữ & Nền tảng**: Java 25
- **Framework**: Spring Boot 4.1.1
- **Cơ sở dữ liệu**: PostgreSQL 16 (schema tự tạo bằng Hibernate `ddl-auto: update`, không còn Flyway)
- **Xác thực**: JWT tự ký (HMAC) ở backend + Google OAuth2 (không còn Keycloak, không còn Redis)
- **Tài liệu API**: SpringDoc OpenAPI / Swagger UI
- **Công cụ build**: Apache Maven
- **Ảo hóa & Môi trường**: Docker & Docker Compose (chỉ còn Postgres + Mailpit)

### Các command để chạy Backend

1. **Di chuyển vào thư mục backend:**
   ```bash
   cd backend/src/lms
   ```

2. **Tạo file `.env` từ mẫu và điền giá trị:**
   ```bash
   cp .env.example .env
   ```
   Mở `.env` và điền `GOOGLE_CLIENT_ID` (Client ID ở bước 0), chỉnh `APP_BOOTSTRAP_ADMIN_EMAILS`
   thành email Google bạn sẽ dùng để đăng nhập admin lần đầu.

3. **Khởi động Postgres + Mailpit:**
   ```bash
   docker compose up -d
   ```

4. **Build dự án (bỏ qua test cho nhanh):**
   - Trên **Windows**:
     ```cmd
     .\mvnw.cmd clean install -DskipTests
     ```
   - Trên **Linux / macOS**:
     ```bash
     ./mvnw clean install -DskipTests
     ```

5. **Khởi chạy Spring Boot:**
   - Trên **Windows**:
     ```cmd
     .\mvnw.cmd spring-boot:run
     ```
   - Trên **Linux / macOS** (tự đọc `.env` nếu có):
     ```bash
     ./run-dev.sh
     ```

> **Địa chỉ dịch vụ:**
> - Backend API: `http://localhost:8080`
> - Swagger UI: `http://localhost:8080/swagger-ui.html`
> - Mailpit (xem email test): `http://localhost:8025`

---

## 2. Frontend

Dự án Frontend gồm 2 phân hệ: **`main-web`** (dành cho bạn đọc) và **`admin-web`** (dành cho quản trị viên).

### Công nghệ sử dụng
- **Nền tảng & Quản lý gói**: Node.js, npm
- **Thư viện giao diện & Ngôn ngữ**: React 19, TypeScript
- **Công cụ build & Dev Server**: Vite 8
- **Styling**: Tailwind CSS v4, tw-animate-css
- **UI Components & Icons**: shadcn UI, Base UI, Lucide React
- **Điều hướng (Routing)**: React Router DOM v7
- **Xác thực**: JWT nhận từ backend, lưu trong `localStorage` (không còn Keycloak JS). `main-web` có thêm Google Identity Services (nút "Sign in with Google"); `admin-web` chỉ đăng nhập email/mật khẩu.
- **HTTP Client**: Axios

---

### Các command để chạy Frontend

#### A. Chạy `main-web` (Giao diện bạn đọc)

1. **Di chuyển vào thư mục `main-web`:**
   ```bash
   cd frontend/main-web
   ```

2. **Tạo file `.env` từ mẫu và điền `VITE_GOOGLE_CLIENT_ID`:**
   ```bash
   cp .env.example .env
   ```

3. **Cài dependencies:**
   ```bash
   npm install
   ```

4. **Khởi chạy:**
   ```bash
   npm run dev
   ```
   *(Truy cập tại: `http://localhost:5173`)*

---

#### B. Chạy `admin-web` (Giao diện quản trị)

1. **Di chuyển vào thư mục `admin-web`:**
   ```bash
   cd frontend/admin-web
   ```

2. **Tạo file `.env` từ mẫu** (không cần Google Client ID — `admin-web` chỉ đăng nhập email/mật khẩu):
   ```bash
   cp .env.example .env
   ```

3. **Cài đặt dependencies:**
   ```bash
   npm install
   ```

4. **Khởi chạy:**
   ```bash
   npm run dev
   ```
   *(Truy cập tại: `http://localhost:5175`)*

---

## 3. Thử luồng đầy đủ

Cách nhanh nhất: dùng luôn 2 tài khoản dựng sẵn ở mục 0.1 qua form email/mật khẩu (nút
"hoặc" dưới nút Google) — không cần Google Client ID.

1. Mở `http://localhost:5173` → đăng nhập bằng `user.test@lms.local` / `User@12345` → vào
   **Danh mục sách** (đã có 6 cuốn sẵn) → mượn 1 cuốn → vào **Lịch sử mượn** → **Trả sách**
   (chuyển trạng thái "Đang chờ xác nhận").
2. Mở `http://localhost:5175` → đăng nhập bằng `admin.test@lms.local` / `Admin@12345` →
   **Yêu cầu trả sách** → **Xác nhận** khoản mượn vừa trả → quay lại `main-web`, tải lại
   **Lịch sử mượn** sẽ thấy trạng thái "Đã trả".
3. Ở `admin-web` → **Quản lý mượn/trả** để xem/đánh dấu quá hạn, báo mất, thu hồi sách; ở
   **Quản lý người dùng** để khóa/mở khóa, cấp/hạ quyền admin.

**Muốn thử bằng Google** (cần Client ID ở mục 0): bấm "Đăng nhập" → nút Google → đăng nhập
bằng email có trong `APP_BOOTSTRAP_ADMIN_EMAILS` để được cấp admin tự động (được tự động đẩy
sang `admin-web` nếu role là ADMIN).

**Muốn tạo thêm tài khoản mật khẩu mới**: bấm "Chưa có tài khoản? Đăng ký" ở `main-web`
(không được cấp admin tự động — chỉ email đăng nhập Google trong `APP_BOOTSTRAP_ADMIN_EMAILS`
mới được cấp). Muốn tài khoản đó có quyền admin thì đăng nhập `admin-web` bằng
`admin.test@lms.local` rồi vào **Quản lý người dùng** → **Cấp admin**.

**Muốn thêm sách mới** (cần token admin):
```bash
TOKEN=$(curl -s -X POST http://localhost:8080/api/v1/public/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin.test@lms.local","password":"Admin@12345"}' \
  | python3 -c "import json,sys; print(json.load(sys.stdin)['accessToken'])")

curl -X POST http://localhost:8080/api/v1/admin/books \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"title":"Tên sách","totalCopies":3}'
```

## 4. Chạy test backend

```bash
cd backend/src/lms
./mvnw clean test              # unit + integration test, không cần Postgres chạy
./mvnw clean verify            # thêm báo cáo coverage: target/site/jacoco/index.html
```
