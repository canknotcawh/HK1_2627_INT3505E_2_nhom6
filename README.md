# HK1_2627_INT3505E_2_nhom6 — Hệ thống thư viện điện tử (LMS)

Hệ thống quản lý thư viện: bạn đọc tra cứu, mượn, trả, gia hạn sách; quản trị viên duyệt trả
sách và quản lý người dùng.

| Thành phần | Công nghệ | Cổng |
|---|---|---|
| Backend `backend/src/lms` | Spring Boot 4.1, Java 25, Flyway, PostgreSQL 16 | 8080 |
| Bạn đọc `frontend/main-web` | React 19, Vite, Tailwind v4 (giao diện tối/sáng, mặc định tối) | 5173 |
| Quản trị `frontend/admin-web` | React 19, Vite, Tailwind | 5175 |
| Hạ tầng dev (`docker compose`) | PostgreSQL, Mailpit (SMTP 1025, giao diện thư 8025) | 5432 / 8025 |

Xác thực: JWT tự ký ở backend (access 15 phút, refresh 7 ngày), đăng ký bằng email kèm mã OTP
6 số gửi qua email, đăng nhập Google (tuỳ chọn, chỉ ở trang bạn đọc). Trang quản trị chỉ đăng
nhập bằng email và mật khẩu của tài khoản có vai trò ADMIN. Xem thêm ADR-0006.

## Chạy nhanh

Hướng dẫn chi tiết, tài khoản thử và cách xử lý lỗi: [RUN_GUIDE.md](RUN_GUIDE.md).

**1. Backend**
```powershell
cd backend/src/lms
copy .env.example .env      # điền GOOGLE_CLIENT_ID nếu muốn đăng nhập Google; sửa APP_BOOTSTRAP_ADMIN_EMAILS nếu cần
docker compose up -d        # postgres, mailpit
./run-dev.sh                # hoặc: SPRING_PROFILES_ACTIVE=dev ./mvnw spring-boot:run
```
Schema do Flyway tạo (V1 đến V9), Hibernate chỉ kiểm tra (`ddl-auto: validate`). Dữ liệu sách
mẫu nạp từ `database/` (xem [database/README.md](database/README.md)).

**2. Bạn đọc** (cổng 5173)
```powershell
cd frontend/main-web
copy .env.example .env      # VITE_GOOGLE_CLIENT_ID chỉ cần khi dùng đăng nhập Google
npm install
npm run dev
```

**3. Quản trị** (cổng 5175)
```powershell
cd frontend/admin-web
copy .env.example .env
npm install
npm run dev
```

Mã xác thực email xem tại Mailpit: http://localhost:8025. Email có trong
`APP_BOOTSTRAP_ADMIN_EMAILS` được cấp quyền admin khi đăng ký. Môi trường thật: dùng profile
khác `dev` và đặt `JWT_SECRET` riêng, tối thiểu 32 byte.

## Chức năng hiện có

- **Bạn đọc:** đăng ký/đăng nhập, quên mật khẩu, xác thực email bằng OTP; trang chủ, khám phá,
  tìm kiếm (từ khoá, thể loại, tình trạng còn sách), tất cả thể loại, chi tiết sách, đọc thử;
  mượn, trả, gia hạn; trang cá nhân; chế độ sáng/tối.
- **Quản trị:** bảng điều khiển (số người dùng, quản trị viên, lượt đang mượn, chờ xác nhận
  trả), yêu cầu trả sách, quản lý mượn/trả, quản lý người dùng (khoá, mở khoá, nâng/hạ quyền).
  Quản lý sách (thêm/sửa, số bản, ngừng lưu hành, gán thể loại) và quản lý danh mục (thêm, đổi
  tên, gộp, xoá thể loại rỗng).
- **Chưa làm ở trang quản trị:** nhật ký (mục menu đã có, trang còn trống, backend chưa có API).