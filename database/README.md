# Chuẩn hóa thể loại và cập nhật database

## Chuẩn hóa thế nào?

Dùng file `final_books_categories_normalized.xlsx` gồm ba sheet `books`,
`caterogy` và `book_category` làm nguồn cho [books.sql](books.sql):

- Giữ **6.109 sách**, thay danh mục **486 thể loại cũ bằng 36 thể loại chuẩn**.
- Gán thể loại theo sheet `book_category`, tạo **6.380 liên kết** nhiều–nhiều.
- Đối chiếu sách theo ISBN, thể loại theo tên và giữ UUID đã có trong DB.
  Bảng nối dùng đúng UUID của hai bảng, không tạo ID riêng cho liên kết.
- Thay liên kết thể loại cũ của sách thuộc nguồn Excel; chỉ xóa thể loại cũ
  không còn được dùng sau khi thay thế. Giữ dữ liệu ngoài phạm vi nguồn.
- Giữ tài khoản, lịch sử mượn/trả, tác giả, số bản và rating của sách đã có.

Chi tiết: [Quy trình chuẩn hóa category](category-normalization.md).

## Cập nhật từ database cũ

Dừng backend trước khi nhập. Trong WSL, tại `backend/src/lms`, chạy:

```bash
docker compose up -d postgres

# Backup trước khi cập nhật; sao chép ra ngoài container.
mkdir -p ../../../outputs/database-backups
backup_name="lms-before-normalization-$(date +%Y%m%d-%H%M%S).dump"
docker compose exec -T postgres pg_dump -U lms -d lms -Fc -f "/tmp/$backup_name"
docker compose cp "postgres:/tmp/$backup_name" "../../../outputs/database-backups/$backup_name"

# Chỉ import khi backup thành công.
docker compose exec -T postgres psql -U lms -d lms -X -v ON_ERROR_STOP=1 -f /docker-entrypoint-initdb.d/10-books.sql

# Kiểm tra kết quả.
docker compose exec -T postgres psql -U lms -d lms -X -c "SELECT (SELECT count(*) FROM book) AS books, (SELECT count(*) FROM category) AS categories, (SELECT count(*) FROM book_category) AS links;"
```

Kết quả mong đợi với bộ dữ liệu hiện tại: **6.109 sách, 36 thể loại, 6.380 liên kết**.
Nếu DB có thêm dữ liệu riêng, tổng có thể lớn hơn. Sau khi kiểm tra thành công,
chạy lại backend và main-web như bình thường.

Không dùng `docker compose down -v` vì sẽ xóa dữ liệu.
Khởi động lại Docker không tự nhập seed vào volume cũ; chỉ cần import thủ công
một lần cho đợt cập nhật này. Có thể chạy lại seed mà không tạo trùng hoặc reset
số liệu nghiệp vụ.
