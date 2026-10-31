# Account / Identity – Phase 1 Audit

**Phạm vi:** chỉ đọc tài liệu, cấu hình, mã nguồn và test hiện có. Không sửa code, không chạy test/build. Báo cáo phản ánh checkout tại ngày 2026-10-31.

## 1. Tóm tắt

Repo hiện dùng JWT do backend ký, Google Identity Services và đăng nhập email/mật khẩu; Keycloak không còn nằm trong luồng chạy được mô tả. Hai frontend gọi chung backend và database, nhưng lưu token ở các khóa `localStorage` riêng. Backend xác định quyền từ user trong database khi xác thực mỗi request; frontend không phải nguồn quyết định quyền.

Các luồng đăng ký/đăng nhập/refresh và quản lý admin đã có. Các vấn đề ưu tiên cao nhất là secret JWT mặc định có thể bị dùng ngoài môi trường dev, refresh token không thể thu hồi phía server, và nhiều luồng phục hồi tài khoản chưa được triển khai. Migration SQL hiện có nhưng Flyway không được bật; schema dựa vào Hibernate `ddl-auto: update`.

## 2. Chức năng đã có

### Backend

- `POST /api/v1/public/auth/register`: chuẩn hóa email về chữ thường, validate email/password/name, BCrypt hash, phát access và refresh token ngay sau khi đăng ký.
- `POST /api/v1/public/auth/login`: đăng nhập bằng password; phân biệt account Google-only, tài khoản bị khóa và thông tin đăng nhập sai.
- `POST /api/v1/public/auth/google`: backend verify Google ID token qua verifier có audience; dùng Google subject làm định danh; không tự nối Google vào account password chỉ vì trùng email. Bootstrap admin yêu cầu email Google đã xác minh.
- `POST /api/v1/public/auth/refresh`: chỉ chấp nhận token có `typ=refresh`; kiểm tra user tồn tại và còn hoạt động; phát access token mới.
- `GET /api/v1/users/me`: trả hồ sơ hiện tại; các API vay/trả/gia hạn lấy user id từ principal, và kiểm tra quyền sở hữu loan khi trả/gia hạn.
- `GET /api/v1/admin/users` và `GET /{userId}` cùng suspend/reactivate/promote/demote. Danh sách có lọc/tìm kiếm và giới hạn page size. Ngăn admin tự suspend/demote và ngăn vô hiệu hóa/hạ quyền admin hoạt động cuối cùng; khóa các hàng admin khi xử lý thay đổi quyền.
- `SecurityConfig` yêu cầu `ROLE_ADMIN` cho `/api/v1/admin/**`; converter tra user hiện tại từ DB, lấy role/status từ DB và từ chối tài khoản suspended. Access/refresh token có phân biệt type.
- `UserResponse` không chứa password hash. `User` lưu Google subject hoặc password hash, role/status và timestamps.

### Frontend

- `main-web`: Google login, email/password login, đăng ký, khôi phục session qua `/users/me`, tự refresh một lần sau 401, protected routes, logout phía client và trang hồ sơ chỉ đọc.
- `admin-web`: email/password login, xác minh hồ sơ/role sau login, protected routes và giao diện tìm/lọc/quản lý người dùng.
- Token key khác nhau giữa hai app (`lms.*` và `lms-admin.*`), nên session local của app này không ghi đè session app kia trên cùng origin.

## 3. API contract hiện tại

| Method / path | Quyền | Request | Response / hành vi |
|---|---|---|---|
| `POST /api/v1/public/auth/register` | Public | `{email,password,fullName}` | `{accessToken,refreshToken,user}`; đăng nhập ngay sau khi tạo |
| `POST /api/v1/public/auth/login` | Public | `{email,password}` | `{accessToken,refreshToken,user}` |
| `POST /api/v1/public/auth/google` | Public | `{idToken}` | `{accessToken,refreshToken,user}` |
| `POST /api/v1/public/auth/refresh` | Public | `{refreshToken}` | `{accessToken}`; refresh token cũ vẫn dùng được |
| `GET /api/v1/users/me` | Authenticated | Bearer access token | `{id,fullName,email,role}` |
| `GET /api/v1/admin/users` | Admin | query `q,status,role,page,size,sort` | Spring `Page<AdminUserResponse>` |
| `GET /api/v1/admin/users/{userId}` | Admin | UUID path | Hồ sơ quản trị |
| `POST /api/v1/admin/users/{userId}/{suspend\|reactivate\|promote\|demote}` | Admin | UUID path | Hồ sơ sau thay đổi |

Password registration yêu cầu độ dài 8–100 ký tự; `fullName` tối đa 255. Không thấy endpoint đổi mật khẩu, quên/đặt lại mật khẩu, xác minh email hay cập nhật hồ sơ.

## 4. Findings theo mức độ

### P0 – cần xử lý trước khi dùng production

Hiện chưa xác nhận được lỗi P0 chắc chắn từ source tĩnh. Các rủi ro P1 có thể trở thành nghiêm trọng nếu đưa cấu hình dev hoặc secret mặc định lên môi trường thật.

### P1 – bảo mật / chức năng quan trọng

#### P1.1 Secret ký JWT có fallback mặc định đã biết

- **Bằng chứng:** `backend/src/lms/src/main/resources/application.yaml:20-23` đặt `JWT_SECRET` fallback thành chuỗi dev công khai; `SecurityConfig` dùng secret này để tạo HS256 decoder, `JwtService` dùng cùng secret để ký token.
- **Tác động / tái hiện:** nếu môi trường chạy không set `JWT_SECRET`, bất kỳ ai biết giá trị trong repo có thể tự ký access token với subject của admin. Backend còn tải user/role từ DB, nhưng token giả có thể truy cập admin API nếu subject trỏ tới admin đang tồn tại.
- **Hướng xử lý:** fail-fast khi chạy profile không phải dev/test nếu thiếu secret đủ mạnh; không cấp fallback chung cho môi trường thật; quản lý secret ngoài repo và có kế hoạch thay khóa/thu hồi phiên khi rotate.

#### P1.2 Refresh token không có revoke, rotation hoặc logout phía server

- **Bằng chứng:** `JwtService` tạo refresh JWT stateless (`.../security/jwt/JwtService.java`); `AuthService.refresh()` chỉ parse token rồi phát access token mới, không thay refresh token; không thấy bảng/session repository. Hai frontend `logout()` chỉ gọi `clearTokens()`.
- **Tác động / tái hiện:** token bị đánh cắp vẫn refresh được đến hết TTL 7 ngày, kể cả sau khi người dùng bấm logout. Suspend user có chặn refresh/API, nhưng không thu hồi session cho tài khoản đang active.
- **Hướng xử lý:** quyết định mức session cần cho hệ thống. Nếu cần logout/revoke, lưu hash refresh token hoặc session id, rotate mỗi lần refresh, phát hiện reuse và thu hồi theo user/session; đồng bộ contract hai frontend. Nếu chưa làm, ghi rõ đây là giới hạn chấp nhận được.

#### P1.3 Không có luồng phục hồi mật khẩu / đổi mật khẩu / xác minh email

- **Bằng chứng:** chỉ có bốn route auth trong `AuthController`; DTO hiện có chỉ cho Google, register, login, refresh. Không có service/repository lưu reset token, email sender hay API change password. `RUN_GUIDE.md` đề cập Mailpit nhưng source identity không gọi mail.
- **Tác động / tái hiện:** người dùng quên mật khẩu không thể tự phục hồi; đăng ký password được cấp session ngay với email chưa xác minh. Không khẳng định đây là bug nếu nghiệp vụ chấp nhận email không xác minh; đây là thiếu tính năng nếu yêu cầu cần phục hồi tài khoản/đảm bảo địa chỉ email.
- **Hướng xử lý:** xác nhận chính sách nghiệp vụ. Nếu cần, triển khai reset token ngẫu nhiên, chỉ lưu hash, có hạn và dùng một lần; phản hồi quên mật khẩu không tiết lộ email tồn tại; thêm change password yêu cầu mật khẩu hiện tại; chỉ bật email verification nếu có yêu cầu.

#### P1.4 Migration SQL không được áp dụng tự động

- **Bằng chứng:** `application.yaml:11-14` bật Hibernate `ddl-auto: update`; không có cấu hình Flyway và dependency Flyway trong module theo inventory source/resources; tuy vậy `src/main/resources/db/migration` có `V3__harden_user_storage.sql` và `V4__track_bootstrap_admin_grant.sql`. `RUN_GUIDE.md` cũng nói “không còn Flyway”.
- **Tác động / tái hiện:** các CHECK/index trong V3 sẽ không được tạo bởi Hibernate; đặc biệt unique index trên `lower(email)` không bảo vệ dữ liệu ghi trực tiếp hoặc dữ liệu cũ khác casing. Cột entity có thể được Hibernate tự thêm, nhưng đó không tương đương chạy đầy đủ migration.
- **Hướng xử lý:** chọn một nguồn quản lý schema. Ưu tiên bật Flyway với baseline/migration đầy đủ sau khi kiểm tra schema thực tế; hoặc bỏ các migration không còn dùng và chuyển ràng buộc cần thiết sang migration được quản lý. Không bật Flyway mù trên DB hiện hữu khi chưa xác định baseline.

### P2 – nhất quán / khả năng bảo trì

#### P2.1 Hồ sơ chỉ đọc và nội dung UI không khớp với account password

- **Bằng chứng:** `UserController` chỉ có `GET /me`; `Profile.tsx` không có form cập nhật. UI ghi thông tin “đồng bộ từ Google” dù người dùng đăng ký bằng email/password cũng có thể vào trang này.
- **Tác động:** profile/password account hiển thị thông điệp sai; người dùng không thể sửa tên. Chỉ là thiếu tính năng nếu sản phẩm không yêu cầu chỉnh sửa.
- **Hướng xử lý:** sửa nội dung theo provider hoặc bổ sung `PATCH /users/me` chỉ nhận `fullName`, lấy id từ principal; email/role/status không nhận từ client.

#### P2.2 Lỗi API được ánh xạ chung ở frontend

- **Bằng chứng:** `main-web/src/pages/Login.tsx` và `admin-web/src/pages/Login.tsx` chỉ ánh xạ một vài error code; các lỗi validation, 403 và 5xx còn lại thường thành thông báo chung. `admin-web` không tự điều hướng login sau khi refresh hết hạn; main-web có redirect.
- **Tác động:** khó chẩn đoán cho người dùng; hai app có hành vi session hết hạn khác nhau. Không ảnh hưởng quyền truy cập backend.
- **Hướng xử lý:** chuẩn hóa mapping theo error envelope, phân biệt offline/401/403/validation/5xx; thống nhất hành vi hết phiên giữa hai app.

#### P2.3 Tài liệu architecture được liệt kê nhưng thiếu trong checkout

- **Bằng chứng:** README liên kết `doc/00-system-context.md`, `doc/03-security-review.md` và các tài liệu khác; `doc/` không tồn tại trong checkout.
- **Tác động:** người phát triển không thể dùng tài liệu kiến trúc/security mà README chỉ dẫn; các quyết định cũ khó đối chiếu.
- **Hướng xử lý:** khôi phục tài liệu đúng hoặc cập nhật README để chỉ liên kết nội dung còn tồn tại.

## 5. Frontend/backend và quyền

- Không phát hiện frontend gửi role/status để backend cấp quyền. `AppJwtAuthenticationConverter` lấy user và role/status từ DB; `/admin/**` còn được chặn ở Spring Security.
- Cả hai frontend dùng API auth contract giống nhau và chung backend/database. Tài khoản tạo từ bất kỳ client nào sẽ xuất hiện cùng DB nếu client gọi cùng backend; một database local trên từng máy thì không tự đồng bộ qua mạng. Đồng bộ đa máy cần cùng backend/API và database có thể truy cập.
- Token lưu trong `localStorage` tăng tác động của XSS vì JavaScript cùng origin có thể đọc token. Cân nhắc HttpOnly Secure cookie/BFF nếu threat model yêu cầu; chuyển đổi ảnh hưởng CORS/CSRF và cần thiết kế riêng.
- Access token hết hạn sau 15 phút, refresh token sau 7 ngày. Frontend chỉ refresh sau phản hồi 401; trạng thái offline không được coi là logout trong main-web, còn admin giữ token và báo lỗi để người dùng thử lại.
- `admin-web` nhận response login thành công trước rồi mới xác minh `/users/me`; nếu profile request lỗi, UI giữ phiên token và hiển thị nút thử lại. Đây là xử lý có chủ đích để phân biệt lỗi kết nối với sai quyền.

## 6. Test hiện có và khoảng trống

**Không chạy test/build trong Phase 1.** Có test backend cho `AuthService`, `UserService`, `AdminUserServiceImpl`, `AppJwtAuthenticationConverter`, security handlers và web/controller; có test domain/DTO. Test hiện có đã đề cập đăng nhập sai, Google-only, duplicate email, bootstrap admin và bảo vệ admin cuối cùng theo tên test.

Khoảng trống cần xác nhận/bổ sung ở giai đoạn sau:

- Integration test với PostgreSQL thật cho concurrent register cùng email, constraint/index và concurrent promote/demote/suspend admin cuối cùng.
- Test `JwtService`/resource server cho signature sai, expiry, refresh token dùng vào API, access token gửi vào refresh, JWT secret misconfiguration và suspended-user behavior end-to-end.
- Test endpoint authorization USER/ADMIN và endpoint user chỉ thao tác dữ liệu của chính mình; controller test tồn tại nhưng cần rà assertion theo từng route trước khi kết luận coverage đủ.
- Test frontend AuthContext/login/refresh/logout/expiry/error mapping; inventory hiện không thấy test frontend.
- Nếu chọn password recovery/profile update/refresh rotation, cần test success, invalid/expired/reused token, enumeration, concurrent refresh và đồng bộ hai app.

## 7. Kế hoạch triển khai đề xuất (Phase 2)

1. **Chốt policy và môi trường (P1):** yêu cầu email verification không; phạm vi recovery/change password; thời hạn và cách logout/revoke session; production/dev profile và quản lý JWT secret.
2. **Khóa cấu hình JWT (P1):** fail-fast ngoài dev/test khi secret yếu/thiếu; bổ sung test cấu hình và test token.
3. **Chọn quản lý schema (P1):** kiểm tra schema/database hiện tại, quyết định Flyway; nếu bật, tạo baseline và migration tiến về phía trước cho constraint/index/session table; không xóa dữ liệu người dùng.
4. **Hoàn thiện account recovery (nếu được chốt):** reset token hash/expiry/one-time, mail sender tận dụng cấu hình Mailpit ở dev; change password, invalidation strategy và generic response.
5. **Session hardening (nếu được chốt):** refresh rotation/reuse detection/revoke; sau đó cập nhật hai API clients và logout.
6. **Profile (nếu được chốt):** `PATCH /api/v1/users/me` chỉ cập nhật field cho phép; cập nhật AuthContext/UI, sửa thông điệp provider.
7. **Verification:** backend integration/security tests, frontend tests/build/lint và rà API contract của cả hai app. Chưa thực hiện trong Phase 1.

## 8. Giới hạn kết luận

Đây là audit tĩnh theo source và tài liệu trong checkout; không xác minh trạng thái database đang chạy, cấu hình `.env` thật, email thực tế, hành vi runtime, coverage report hoặc build/test. Các hạng mục password recovery, verification và profile update được phân loại là nhu cầu cần chốt, không mặc định là lỗi nghiệp vụ.
