# Import sách từ CSV

## 1. Chuẩn bị file
- Đặt tên file là **`books.csv`** và đặt trong cùng thư mục với `import_books.sql`.
- Test bằng dữ liệu mẫu: `cp books.sample.csv books.csv` (ISBN và rating là giá trị giả để test).

| Cột | Bắt buộc | Ghi chú |
|---|---|---|
| `isbn13` | có | 13 chữ số |
| `title` | có | |
| `subtitle`, `description`, `cover_image_url`, `language` | không | `language` tối đa 10 ký tự (vd `vi`, `en`) |
| `authors` | không | nhiều tác giả ngăn cách bằng `;` |
| `categories` | không | nhiều thể loại ngăn cách bằng `;` |
| `published_year`, `page_count` | không | giá trị sai/không phải số → để trống |
| `rating_avg` | không | 0–5, sai → 0 |
| `rating_count` | không | sai → 0 |
| `total_copies` | không | để trống → 3 |

Dòng sai sẽ bị bỏ qua.

## 2. Chạy (sau khi app đã chạy ít nhất 1 lần để Flyway tạo bảng)
**Dùng Docker** (từ thư mục `backend/src/lms`):
```
docker compose cp data/books.csv postgres:/tmp/books.csv
docker compose cp data/import_books.sql postgres:/tmp/import_books.sql
docker compose exec -w /tmp postgres psql -U lms -d lms -f import_books.sql
```
**Dùng psql:**
```
cd data
psql -h localhost -U lms -d lms -f import_books.sql
```

## Chạy lại nhiều lần có an toàn không?
Có. Sách đã tồn tại (cùng `isbn13`) được cập nhật thông tin và rating, nhưng **không** đụng tới `total_copies`, `available_copies`, `borrow_count`, nên không làm sai dữ liệu mượn/trả đang test.
