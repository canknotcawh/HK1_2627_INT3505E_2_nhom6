# Quy trình xử lý dữ liệu sách

Từ file dữ liệu ban đầu, danh sách sách được xử lý theo thứ tự:

1. **Loại sách trùng ISBN:** Giữ một bản ghi cho mỗi ISBN, bỏ các bản ghi trùng.
2. **Loại bản ghi thiếu thông tin:** Bỏ sách không có `published_year` hoặc `page_count`.
3. **Bổ sung `gg_id`:** Gắn mã sách Google Books cho các bản ghi còn lại để dùng cho tính năng xem trước.
4. **Xuất dữ liệu:** Lưu danh sách đã xử lý để tạo `database/books.sql`.

**Kết quả đã kiểm tra:** File `books_clean_dedup_out_text.xlsx` có 6.109 sách; ISBN không trùng và các cột `published_year`, `page_count`, `gg_id` đều có giá trị. File dữ liệu ban đầu không có trong các file đã khảo sát, nên chưa xác minh được số bản ghi bị loại ở từng bước hoặc cách chọn bản ghi khi ISBN trùng.
