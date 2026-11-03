# Chính sách quản lý tài khoản (admin)

Tài liệu mô tả hành vi hiện có của hệ thống, không phải kế hoạch.

## Vòng đời tài khoản

- Tài khoản được tạo khi người dùng đăng ký bằng mật khẩu hoặc đăng nhập bằng Google lần đầu. Không có bước duyệt đăng ký.
- Tài khoản không bị xóa. Admin chỉ có thể khóa (`SUSPENDED`) hoặc mở khóa (`ACTIVE`).
- Chỉ tài khoản `ACTIVE` thỏa `UserStatus.canBorrow()`. Khi khóa tài khoản, mọi phiên làm mới (refresh session) của tài khoản đó bị thu hồi ngay.
- Admin đầu tiên được cấp qua cấu hình `app.bootstrap-admin-emails` và yêu cầu email Google đã xác minh.

## Quy tắc quyền admin

- Admin không thể tự khóa hoặc tự hạ quyền chính mình (`CANNOT_SUSPEND_SELF`, `CANNOT_DEMOTE_SELF`).
- Hệ thống luôn giữ ít nhất một admin đang hoạt động: không thể khóa hoặc hạ quyền admin hoạt động cuối cùng (`CANNOT_SUSPEND_LAST_ACTIVE_ADMIN`, `CANNOT_DEMOTE_LAST_ACTIVE_ADMIN`). Admin đã bị khóa không được tính. Các thao tác này khóa bản ghi các admin trong một transaction để hai thao tác đồng thời không cùng loại bỏ admin cuối.
- Mỗi request đều đọc lại tài khoản từ cơ sở dữ liệu (`AppJwtAuthenticationConverter`): tài khoản bị khóa bị từ chối ngay cả khi access token chưa hết hạn, và quyền admin lấy từ cơ sở dữ liệu chứ không từ token nên việc hạ quyền có hiệu lực ngay.
- Quy tắc được áp dụng ở backend; giao diện chỉ vô hiệu hóa nút và hiển thị thông báo tương ứng.

## Chưa có / việc còn mở

- Chưa có nhật ký thao tác (ai khóa/đổi quyền, lúc nào, lý do). Cần bảng audit và migration mới.
- Chưa hiển thị lịch sử mượn sách trong trang chi tiết tài khoản.
