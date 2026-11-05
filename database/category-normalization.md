# Quy trình chuẩn hóa category

## Nguồn dữ liệu

File `final_books_categories_normalized.xlsx` gồm ba sheet:

- `books`: danh sách sách, có `id` và `isbn13`.
- `caterogy`: danh mục thể loại chuẩn, có `id` và `name`.
- `book_category`: các cặp `bookId`, `categoryId` xác định thể loại của từng sách.

## Cách chuẩn hóa

1. Dùng danh mục và liên kết đã chuẩn hóa trong Excel làm nguồn chính.
   Không tách lại thể loại từ chuỗi cũ trong `book_source.categories`.
2. Chuẩn hóa tên về Unicode NFC, bỏ khoảng trắng hai đầu; kiểm tra tên trùng,
   ID trùng, cặp liên kết trùng và khóa tham chiếu không tồn tại.
3. Đối chiếu sách theo ISBN, thể loại theo tên để giữ UUID đã có trong DB.
   Thể loại mới dùng UUID v5 ổn định theo tên chuẩn hóa.
4. Ánh xạ ID Excel sang UUID thực tế rồi ghi `book_category`.
   Bảng nối dùng khóa chính ghép `(book_id, category_id)` và hai khóa ngoại.
5. Thay liên kết thể loại của sách thuộc Excel; chỉ xóa thể loại cũ vừa bị thay
   nếu không còn được dùng và không thuộc danh mục chuẩn. Giữ dữ liệu ngoài nguồn.

File Excel đã cung cấp kết quả phân loại; không có bảng đối chiếu từng tên cũ
sang tên mới để suy ra quy tắc gom nhóm chi tiết.

## Kết quả

| Dữ liệu | Trước cập nhật | Sau cập nhật |
| --- | ---: | ---: |
| Sách | 6.109 | 6.109 |
| Thể loại | 486 | 36 |
| Liên kết sách–thể loại | 6.109 | 6.380 |

Đã kiểm tra không có liên kết mồ côi, cặp trùng hoặc sách thiếu thể loại.
UUID sách, tài khoản, lịch sử mượn/trả, tác giả, số bản và rating cũ được giữ nguyên.

Dữ liệu và quy tắc cập nhật nằm trong [books.sql](books.sql).
Cách backup và import từ database cũ: [README.md](README.md).
