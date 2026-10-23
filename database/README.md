# Hướng Dẫn Nạp Dữ Liệu Sách

File `books.sql` chứa 6.109 sách từ `books_clean_dedup_out_text.xlsx`. Script tạo bảng `book` trước khi nhập sách, nên PostgreSQL có thể nạp dữ liệu trước khi Spring Boot chạy. Bảng `book_source` tham chiếu đến `book` và lưu các trường gốc không có trong Entity: `source_row_id`, `row_status`, `authors`, `categories`.

## 1. Xử lý số lượng sách

Hai cột `total_copies` và `available_copies` trong Excel chứa công thức `=RANDBETWEEN(0,20)`. Giá trị cache của Excel có thể khiến `available_copies > total_copies`, trái với quy tắc của ứng dụng.

Vì vậy, mỗi sách được gán một số cố định từ 0 đến 20 dựa trên ISBN; lúc nhập, `total_copies` và `available_copies` bằng nhau. `book_source` vẫn giữ nguyên công thức và giá trị cache gốc để đối chiếu. Khi chạy lại SQL, sách có ISBN hoặc dòng nguồn đã tồn tại sẽ được bỏ qua, không bị cập nhật.

## 2. Tự động nạp khi tạo database mới

Docker Compose mount `books.sql` vào `/docker-entrypoint-initdb.d/`. PostgreSQL chỉ chạy script khi volume `pgdata` còn trống:

```powershell
cd backend/src/lms
docker compose up -d
```

## 3. Nạp vào database đang có

**Không xóa volume `pgdata` và không dùng `docker compose down -v` để nhập sách.** Từ thư mục `backend/src/lms`, chạy:

```powershell
docker compose up -d
docker compose exec -T postgres psql -U lms -d lms -v ON_ERROR_STOP=1 -f /docker-entrypoint-initdb.d/10-books.sql
docker compose exec -T postgres psql -U lms -d lms -c "SELECT count(*) FROM public.book_source;"
```

Nếu container hiện tại chưa có mount mới, `docker compose up -d` sẽ tạo lại container nhưng giữ nguyên `pgdata`. Script khởi tạo tự động sẽ không chạy lại trên volume đã có dữ liệu; lệnh `psql` ở trên thực hiện việc nhập thủ công.
