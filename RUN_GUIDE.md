# Hướng Dẫn Chạy Dự Án LMS

Tài liệu hướng dẫn cài đặt và khởi chạy dự án, bao gồm 2 phần: **Backend** (Spring Boot) và **Frontend** (React / npm).

---

## 1. Backend

### Công nghệ sử dụng
- **Ngôn ngữ & Nền tảng**: Java 25
- **Framework**: Spring Boot 4.1.1
- **Cơ sở dữ liệu & Migration**: PostgreSQL 16, Flyway Migration
- **Caching & Session**: Redis 7
- **Xác thực & Phân quyền (IAM)**: Keycloak 26.7.0
- **Tài liệu API**: SpringDoc OpenAPI / Swagger UI
- **Công cụ build**: Apache Maven
- **Ảo hóa & Môi trường**: Docker & Docker Compose

### Các command để chạy Backend

1. **Di chuyển vào thư mục backend:**
   ```bash
   cd backend/src/lms
   ```

2. **Khởi động các image Docker:**
   ```bash
   docker compose up -d
   ```

3. **Cài đặt dependencies và build dự án:**
   - Trên **Windows**:
     ```cmd
     .\mvnw.cmd clean install -DskipTests
     ```
   - Trên **Linux / macOS**:
     ```bash
     ./mvnw clean install -DskipTests
     ```

4. **Khởi chạy Spring Boot:**
   - Trên **Windows**:
     ```cmd
     .\mvnw.cmd spring-boot:run
     ```
   - Trên **Linux / macOS**:
     ```bash
     ./mvnw spring-boot:run
     ```

> **Địa chỉ dịch vụ:**
> - Backend API: `http://localhost:8080`
> - Swagger UI: `http://localhost:8080/swagger-ui.html`
> - Keycloak: `http://localhost:8081`

---

## 2. Frontend

Dự án Frontend gồm 2 phân hệ: **`main-web`** (dành cho người dùng/học viên) và **`admin-web`** (dành cho quản trị viên).

### Công nghệ sử dụng
- **Nền tảng & Quản lý gói**: Node.js, npm
- **Thư viện giao diện & Ngôn ngữ**: React 19, TypeScript
- **Công cụ build & Dev Server**: Vite 8
- **Styling**: Tailwind CSS v4, tw-animate-css
- **UI Components & Icons**: shadcn UI, Base UI, Lucide React
- **Điều hướng (Routing)**: React Router DOM v7
- **Xác thực (Authentication)**: Keycloak JS
- **HTTP Client**: Axios

---

### Các command để chạy Frontend

#### A. Chạy `main-web` (Giao diện chính)

1. **Di chuyển vào thư mục `main-web`:**
   ```bash
   cd frontend/main-web
   ```

2. **Cài dependencies:**
   ```bash
   npm install
   ```

3. **Khởi chạy:**
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

2. **Cài đặt dependencies:**
   ```bash
   npm install
   ```

3. **Khởi chạy:**
   ```bash
   npm run dev
   ```
   *(Truy cập tại: `http://localhost:5174`)*
