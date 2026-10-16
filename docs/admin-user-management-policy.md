# Quy tắc quản lý tài khoản

## Vòng đời tài khoản

- Người dùng được tạo hoặc đồng bộ vào `app_user` khi backend nhận token Keycloak hợp lệ lần đầu.
- Keycloak quản lý thông tin xác thực. Ứng dụng lưu hồ sơ, quyền `USER`/`ADMIN` và trạng thái `ACTIVE`/`SUSPENDED` trong PostgreSQL.
- Không xóa vật lý tài khoản vì hồ sơ mượn sách cần giữ liên kết và lịch sử. Tạm khóa tài khoản để chặn sử dụng.
- Hiện không có quy trình duyệt đăng ký; tài khoản được cấp qua Keycloak và tự đồng bộ khi đăng nhập.

## Quyền quản trị

- Admin không thể tự khóa hoặc tự hạ quyền.
- Luôn phải còn ít nhất một admin đang hoạt động. Backend từ chối khóa hoặc hạ quyền admin đang hoạt động cuối cùng.
- Các thao tác thay đổi quyền/trạng thái khóa các bản ghi admin trong transaction để tránh hai thao tác đồng thời cùng loại bỏ admin hoạt động cuối cùng.
- Cấp quyền admin và mở khóa được ghi nhận trong PostgreSQL; các API admin vẫn được bảo vệ bằng role `ADMIN`.

## Trạng thái khóa

- Tài khoản `SUSPENDED` không được dùng API cần xác thực; backend kiểm tra trạng thái tài khoản khi xử lý token.
- Tài khoản có thể được mở khóa bởi admin. Trạng thái khóa không xóa lịch sử mượn.

## Chưa nằm trong phạm vi

- Admin sửa email/tên, xóa tài khoản, duyệt đăng ký, ghi lý do khóa và nhật ký ai đã thay đổi tài khoản chưa được hỗ trợ.
