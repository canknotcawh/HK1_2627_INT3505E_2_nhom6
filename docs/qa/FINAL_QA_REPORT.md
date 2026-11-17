# Báo cáo QA tổng hợp — LMS

- **Ngày cập nhật:** 17/11/2026
- **Repo:** `HK1_2627_INT3505E_2_nhom6`
- **Phạm vi:** backend LMS, 56 API/12 controller, dữ liệu sách và chuẩn hóa thể loại.


## Kết luận điều hành

Đánh giá lại sau khi backend và Docker được bật xác nhận PostgreSQL 16 healthy, Flyway history đã chạy thành công tới V10, và API công khai trên cổng 8080 trả 200. CSDL đang chạy có **10.000 sách, 10 thể loại tên mẫu, 10.000 liên kết**; khác với bộ chuẩn trong tài liệu (**6.109 / 36 / 6.380**). Tất cả 10.000 sách đều có đúng một liên kết category, không phát hiện orphan. Dữ liệu có dấu hiệu là bộ synthetic/performance (tiêu đề “Sách hiệu năng số …”), nên cần xác nhận đây có phải DB đích dùng cho nghiệm thu danh mục chuẩn hay không.

Kiểm tra HTTP chỉ đọc xác nhận các endpoint danh sách sách, danh sách thể loại, tìm kiếm và phân trang đều trả 200. Đo thăm dò 12 lần/endpoint cho thấy p50/p95: categories 12/21,93 ms; trang sách 28,01/34,51 ms; lọc category 19,95/28,60 ms; tìm kiếm 98,86/145,20 ms; trang sâu 400 là 107,34/108,95 ms. Đây là mẫu nhỏ, chạy tuần tự trên một môi trường cục bộ, không có tải đồng thời hoặc SLA; không dùng làm benchmark phát hành.

Suite backend đã chạy lại sau khi cấp quyền môi trường cho JVM: **187 test, 185 pass, 1 fail, 0 error, 1 skip**. Failure duy nhất là `ControllersWebTest.publicSearchAndDetail`, do test stub overload `searchBooks(q, pageable)` trong khi controller gọi overload 4 tham số `searchBooks(q, category, availability, pageable)`; đây là mismatch trong test mock, chưa phải lỗi được tái hiện trên API live. API GET live tương ứng trả 200 và có nội dung. Các test còn lại vượt qua.

Kiểm tra checksum cho thấy **9.000/10.000 ISBN sai check digit**; kiểm tra quan hệ loan–tồn kho tìm thấy 1.474 sách có số loan ở trạng thái còn mở lớn hơn chênh lệch `total_copies - available_copies`. Đây có thể là đặc điểm của dữ liệu hiệu năng tổng hợp; nếu DB này được coi là dữ liệu catalog/loan nghiệm thu thì các kết quả là bất thường cần xử lý. Không có thao tác DB ghi dữ liệu nào được thực hiện.

Điểm tổng hợp hiện tại là **36/100 — NOT READY TO CERTIFY**. Điểm này phản ánh bằng chứng runtime mới, chênh lệch đáng kể so với dữ liệu chuẩn và việc chưa chạy đủ kiểm tra chức năng trên DB đích.

### Thông tin môi trường

| Thành phần | Quan sát |
|---|---|
| Commit rà soát hiện tại | `a53ef43` (các thay đổi source so với lần test trước không được xác nhận trong lượt này) |
| Java chạy test | OpenJDK `25.0.5.0.3+1-1-26.04.1-Ubuntu` |
| DB cấu hình mặc định | PostgreSQL; `application.yaml` dùng cổng 5433, user/database mặc định được cấu hình qua biến môi trường hoặc giá trị dev |
| Kết nối DB | PostgreSQL 16.15 tại cổng host 5433, database `lms`; container healthy |
| Flyway | History thành công từ baseline qua V10; V5/V8/V9/V10 đã ghi nhận trong schema history |
| Backend/API | Java listener trên 8080; GET public books/categories và OpenAPI trả 200 |
| Test suite | Chạy lại ngày 17/11: 187 test, 185 pass, 1 fail do stub mock lệch overload, 0 error, 1 skip |

## Kiểm kê API hiện tại

Đếm tĩnh các mapping annotation trong mã nguồn cho kết quả 56 mapping thuộc 12 controller:

| Controller | Số mapping |
|---|---:|
| `AdminBookController` | 6 |
| `AdminBookReviewController` | 4 |
| `AdminCategoryController` | 5 |
| `AdminLoanController` | 8 |
| `AdminStatsController` | 1 |
| `AdminUserController` | 6 |
| `AuthController` | 7 |
| `EmailVerificationController` | 2 |
| `UserController` | 6 |
| `PublicBookController` | 3 |
| `PublicBookReviewController` | 2 |
| `BookReviewController` | 6 |
| **Tổng** | **56** |

> Đây là kiểm kê khai báo trong source, chưa đối chiếu OpenAPI/runtime và chưa chứng minh từng API có test HTTP. Scorecard cũ chỉ có ma trận 39 endpoint, vì vậy cần lập ma trận mới đủ 56 API.

## 5. Kết quả kiểm tra hiện hành

| Hạng mục | Kết quả | Bằng chứng / giới hạn |
|---|---|---|
| Trạng thái repo ban đầu | PASS có điều kiện | HEAD `a53ef43`; khi bắt đầu lượt này chỉ có `FINAL_QA_REPORT.md` đã sửa từ lần trước, không có thay đổi source/test khác. |
| Số controller/API | PASS (kiểm tra tĩnh) | 12 controller, 56 mapping. Chưa xác minh route runtime hoặc test coverage. |
| Kỳ vọng catalog | PASS (đối chiếu tài liệu) | `database/README.md`, `category-normalization.md` và header `database/books.sql` ghi 6.109 sách, 36 thể loại, 6.380 liên kết. Đây chưa phải số liệu đọc từ DB. |
| Kết nối DB | PASS | PostgreSQL 16.15 healthy trên cổng host 5433; truy vấn SELECT thành công. |
| Flyway hiện tại | PASS (history) | `flyway_schema_history` có các version thành công tới V10. Chưa chứng minh migrate từ DB trống hoặc bản sao pre-update. |
| Test backend | FAIL (1 test mock) | 187 test: 185 pass, 1 fail, 0 error, 1 skip. Failure `publicSearchAndDetail` do stub gọi sai overload; cần sửa test rồi chạy lại để khẳng định suite xanh. |
| API công khai | PASS (smoke) | GET books, categories, OpenAPI và các truy vấn dưới đây trả HTTP 200; chưa kiểm tra đủ 56 operation hoặc auth/contract chi tiết. |
| API và luồng mượn/trả đầy đủ | NOT TESTED | Chưa chạy workflow mượn/trả hoặc API có ghi dữ liệu. |
| Hiệu năng | PASS (thăm dò cục bộ) | 12 lần tuần tự cho 5 GET công khai; p50/p95 ghi ở mục 5.4. Không có concurrency, query plan hay SLA. |

### 5.1 Đối chiếu dữ liệu sách và thể loại

| Kiểm tra | Kỳ vọng | Quan sát được | Trạng thái |
|---|---|---|---|
| Tổng số sách | 6.109 sách nguồn chuẩn; có thể cộng dữ liệu riêng | **10.000** | FAIL so với bộ chuẩn; cần xác nhận đây có phải dataset hiệu năng riêng |
| Tổng thể loại | 36 tên thể loại chuẩn | **10**, tên “Thể loại 1” … “Thể loại 10” | FAIL so với bộ chuẩn |
| Liên kết sách–thể loại | 6.380 liên kết trong nguồn chuẩn | **10.000** | FAIL so với bộ chuẩn |
| Liên kết mồ côi | 0 | 0 orphan book, 0 orphan category | PASS |
| Cặp liên kết trùng | 0; PK ghép `(book_id, category_id)` | 0 theo constraint; query không báo duplicate | PASS |
| Sách không có thể loại | 0 | 0 | PASS |
| Sách có nhiều category | Bộ chuẩn có 6.380/6.109, tức một số sách đa thể loại | 0; cả 10.000 sách có đúng một category | FAIL so với bộ chuẩn |
| ISBN/UUID hợp lệ và duy nhất | ISBN-13 hợp lệ, duy nhất; UUID đúng kiểu | ISBN null 0, sai format 0, trùng ISBN 0; **9.000 ISBN sai check digit**. ID là UUID trong schema, không rà độc lập workbook mapping. | FAIL ISBN checksum; phần UUID mapping NOT TESTED |
| Số bản sách hợp lệ | `0 ≤ available_copies ≤ total_copies` | 0 dòng vi phạm; 2 sách có số bản đang mượn theo chênh lệch tồn kho | PASS cho constraint số bản |
| Loan mở so với tồn kho | Loan ACTIVE/OVERDUE/PENDING_RETURN phải tương thích số bản đang mượn | 15.886 loan mở; **1.474 sách** có loan mở vượt `total_copies - available_copies` | FAIL nếu xem là dữ liệu nghiệp vụ; nghi là fixture tổng hợp, cần xác nhận nguồn |
| Bảo toàn tài khoản/lịch sử mượn/tác giả/số bản/rating | Giữ nguyên dữ liệu ngoài thao tác chuẩn hóa | DB có 25 user, 21.202 loan, 20 author, 10.000 book-author link, 0 review; không có snapshot trước import để so sánh | NOT TESTED |
| Import lặp lại và giữ dữ liệu ngoài nguồn | Không tạo trùng/reset dữ liệu nghiệp vụ, giữ dữ liệu ngoài phạm vi | Không chạy script và chưa kiểm chứng độc lập | NOT TESTED |

Tài liệu mô tả script có transaction, bảng staging, khóa bảng và ánh xạ dữ liệu. Đây là bằng chứng thiết kế, chưa chứng minh script an toàn hoặc idempotent trên DB hiện hành. Không chạy lại import trong đợt QA này.

### 5.2 Kiểm tra test

Lệnh: `bash ./mvnw test` từ `backend/src/lms`.

Lệnh `bash ./mvnw test` chạy ngày 17/11 với quyền cho phép JVM nạp agent. Kết quả: 187 test, 185 pass, 1 fail, 0 error, 1 skip (`LmsApplicationTests`). Failure `ControllersWebTest.publicSearchAndDetail` tại dòng 130: test cấu hình mock cho overload 2 tham số, còn controller gọi overload 4 tham số; mock không trả Page đã cấu hình nên assertion `$.content[0].title` thất bại. Đây là test lỗi/stale stub; không tự sửa trong lần QA này. Suite cần được chạy xanh sau khi chủ dự án sửa test. Test profile không thay thế kiểm chứng Flyway trên database sạch/production.

### 5.3 Migration, API và truy vấn sách

- Cấu hình `application.yaml` bật Flyway và đặt Hibernate ở `ddl-auto: validate`.
- DB history có baseline và migration thành công tới V10, bao gồm V5 account sessions, V8 book metadata, V9 catalog schema, V10 book review. Lỗi trùng version V5 ngày 09/11 không tái hiện trong DB hiện tại; **DF-07 được đóng cho trạng thái DB đang chạy**, nhưng vẫn cần migration test trên schema trống/bản sao để xác nhận đường nâng cấp.
- Cổng `8080` trả HTTP 200 cho `GET /api/v1/public/books`, `/categories` và `/v3/api-docs`. Tìm kiếm `q=Lịch sử`, lọc `category=Thể loại 1`, trang đầu và trang 400 đều trả 200 và page metadata hợp lệ.
- OpenAPI công bố **51 path / 57 operation**, trong khi static mapping count là **56**. Cần lập diff theo HTTP method/path để giải thích operation thừa hoặc route khác biệt.
- `BookRepository` dùng tìm kiếm full-text/trigram và lọc category qua `book_category`; `init_search.sql` khai báo hàm/index tìm kiếm. Chưa biết các index có tồn tại và được planner sử dụng trên DB người dùng hay không.
- `CategoryRepository` có truy vấn đếm và gộp category; chưa test API gộp/đổi tên/xóa hoặc đối chiếu số lượng trên dữ liệu thật.
- Hướng dẫn chạy có khác biệt cổng DB so với cấu hình hiện tại: cấu hình ứng dụng mặc định 5433, một số hướng dẫn cũ ghi 5432. Cần thống nhất hướng dẫn trước lần xác nhận môi trường tiếp theo.

### 5.4 Đo latency thăm dò

Mỗi URL GET được gọi tuần tự 12 lần từ cùng môi trường. Chỉ số là mili giây; p95/p99 với mẫu nhỏ này là gần với giá trị cực đại, không đại diện tải thật.

| GET | HTTP | p50 | p95 | min–max | Ghi chú |
|---|---:|---:|---:|---:|---|
| `/api/v1/public/books/categories` | 200 | 12,00 | 21,93 | 8,88–48,42 | Trả 10 category |
| `/api/v1/public/books?page=0&size=20` | 200 | 28,01 | 34,51 | 22,07–34,94 | 10.000 kết quả, 500 trang |
| `/api/v1/public/books?category=Thể loại 1&page=0&size=20` | 200 | 19,95 | 28,60 | 16,43–30,00 | 1.000 kết quả, 50 trang |
| `/api/v1/public/books?q=Lịch sử&page=0&size=20` | 200 | 98,86 | 145,20 | 87,32–150,86 | 1.667 kết quả, 84 trang |
| `/api/v1/public/books?page=400&size=20` | 200 | 107,34 | 108,95 | 103,77–115,18 | Trang sâu |

Đây là smoke đo tuần tự trên một lần chạy; không đo concurrency, CPU/RAM, pool, query count hoặc `EXPLAIN ANALYZE`. Không có SLA để kết luận đạt/không đạt hiệu năng.

## 6. Scorecard hiện tại

Giữ nguyên trọng số của scorecard ngày 09/11: 10/20/15/15/15/10/10/5. Điểm ngày 17/11 là điểm tạm dựa trên bằng chứng hiện có; các vùng bị chặn không được mặc định là đạt.

| Trục | Trọng số | Điểm / 10 | Điểm trọng số | Căn cứ và độ tin cậy |
|---|---:|---:|---:|---|
| Kiểm kê API | 10 | 7 | 7,0 | 56 mapping source; OpenAPI có 57 operation/51 path, cần đối chiếu chênh lệch. Tin cậy trung bình. |
| Độ phủ kiểm thử chức năng | 20 | 4 | 8,0 | 185 test pass; 1 test web fail do stub mock lệch overload; smoke GET catalog/search trả 200, nhưng luồng ghi và loan chưa test. Tin cậy thấp. |
| Tuân thủ hợp đồng response | 15 | 4 | 6,0 | Một số response GET/page đã kiểm; error contract và auth contract chưa được kiểm tra đầy đủ, findings cũ chưa xác minh. Tin cậy thấp. |
| Nhất quán dữ liệu | 15 | 2 | 3,0 | Orphan/thiếu category không có; nhưng dữ liệu lệch chuẩn 6.109/36/6.380, 9.000 ISBN sai checksum và loan–tồn kho bất thường. Tin cậy trung bình cho snapshot hiện tại. |
| Xác thực / phân quyền | 15 | 4 | 6,0 | Có findings lịch sử; suite chạy được nhưng chưa tái kiểm từng kịch bản bảo mật. Tin cậy thấp. |
| E2E | 10 | 2 | 2,0 | Chưa chạy workflow trên DB/API hiện tại. Tin cậy thấp. |
| Hiệu năng | 10 | 3 | 3,0 | Smoke 12 request/endpoint có latency p50/p95; chưa có tải đồng thời, plan hay SLA. Tin cậy thấp. |
| Độ tin cậy | 5 | 2 | 1,0 | Chưa chạy kiểm tra outage/startup/fault injection hiện tại. Tin cậy thấp. |
| **Tổng** | **100** |  | **36/100** | **NOT READY TO CERTIFY** |

> Điểm 36 phản ánh bằng chứng hiện hành: có smoke runtime nhưng catalog thực tế lệch bộ chuẩn và nhiều kiểm tra quan trọng chưa thực hiện. Không so sánh như phép đo hồi quy trực tiếp với điểm 64 ngày 09/11.

## 7. Trạng thái phát hiện từ QA ngày 09/11

Các trạng thái dưới đây được cập nhật bằng bằng chứng runtime ngày 17/11; phần chưa chạy tiếp tục được đánh dấu chưa xác minh. Không kết luận đã sửa chỉ dựa trên việc mã nguồn hoặc migration đổi tên.

| Finding cũ | Trạng thái ngày 17/11 | Căn cứ |
|---|---|---|
| DF-07 — hai migration version V5 | Đã đóng cho DB đang chạy; còn cần kiểm tra đường migrate sạch/nâng cấp | Flyway history hiện tại thành công tới V10, chỉ một V5; chưa chạy trên DB trống hoặc bản sao schema cũ. |
| CV-03 — response lỗi không thống nhất | Chưa xác minh | Không chạy API lỗi hiện tại. |
| CV-02/04/05/07 — dữ liệu sách/contract | Chưa xác minh | Chưa kiểm thử riêng các payload lỗi hoặc đối chiếu dữ liệu API với DB. |
| DF-01/02/05/06 — transaction và tồn kho | Chưa xác minh | Không chạy test DB/concurrency hiện hành. |
| AC-01/02/03/04 — token, Swagger, rate limit | Chưa xác minh | Suite đã chạy, nhưng test bảo mật không được đánh giá riêng và các finding này chưa được tái kiểm tra theo từng kịch bản. |
| PB-01…PB-04 — tìm kiếm, N+1, phân trang sâu, pool | Chưa xác minh đầy đủ | Có smoke latency mới; chưa có query plan, query count, pool metrics hay tải đồng thời. |
| Timeout DB/SMTP và độ tin cậy | Chưa xác minh | Không chạy fault injection. |

### Bằng chứng lịch sử ngày 09/11 (không tái kiểm chứng)

Báo cáo QA Phase 0–7 ghi nhận 338 test, 27 workflow E2E, 42 ca dữ liệu, 39/39 API có test HTTP và điểm **64/100 — NOT READY**. Các vấn đề được nêu gồm response lỗi chưa thống nhất, một số dữ liệu sách không được lưu, lỗi transaction/tồn kho, rủi ro auth, tìm kiếm chậm/N+1 và timeout. Đây là kết quả của revision/môi trường lúc đó; phải xem là lịch sử cho đến khi được chạy lại.

## 8. Hạng mục chưa kiểm tra hoặc bị chặn

1. Xác nhận DB 10.000 sách/10 category tên mẫu là fixture hiệu năng hay DB đích; chưa có đối chiếu nguồn gốc dataset.
2. Kiểm tra độc lập UUID và đối chiếu bản ghi với workbook nguồn; chưa có snapshot trước/sau để chứng minh bảo toàn tài khoản, loan, tác giả, số bản và rating.
3. Chạy Flyway trên schema trống và bản sao schema cũ; lần hiện tại chỉ xác nhận history của DB đang chạy đến V10.
4. Sửa stub lỗi trong `ControllersWebTest.publicSearchAndDetail` và chạy lại suite xanh.
5. Kiểm tra đủ 56 mapping về HTTP/auth/contract; đối chiếu chênh lệch OpenAPI (57 operations/51 paths).
6. Chạy E2E catalog và mượn/trả; truy vấn hiện tại phát hiện chênh lệch 1.474 sách giữa loan mở và tồn kho.
7. Đo query plan, query count, connection pool và benchmark tải đồng thời theo SLA; latency hiện có chỉ là smoke tuần tự.
8. UI trình duyệt, Google token thật, Tomcat/HTTP connector thật, SMTP auth/TLS, DAST/pentest và business rules Q1–Q12 vẫn chưa được kiểm chứng/chốt.

## 9. Việc cần làm trước khi chấm/release lại

1. Xác nhận với chủ dữ liệu liệu DB đang chạy là fixture hiệu năng hay DB nghiệm thu. Nếu là DB nghiệm thu catalog, đối chiếu và nạp đúng bộ chuẩn sau backup và phê duyệt vận hành; không dùng dataset hiện tại làm bằng chứng bộ chuẩn.
2. Điều tra 9.000 ISBN sai check digit và chênh lệch loan–tồn kho; xác định lỗi dữ liệu hay đặc tính fixture tổng hợp.
3. Thu thập snapshot trước/sau để chứng minh việc giữ nguyên dữ liệu nghiệp vụ khi cập nhật catalog.
4. Chạy migration trên DB thử nghiệm trống và bản sao schema cũ; kiểm tra khởi động production profile.
5. Sửa stub trong `ControllersWebTest.publicSearchAndDetail`, rerun toàn bộ test, rồi bổ sung route-to-test matrix đủ 56 API và đối chiếu operation OpenAPI thứ 57.
6. Chạy regression mượn/trả và mở rộng benchmark hiệu năng theo SLA được chốt.
7. Hoàn tất các kiểm tra UI, Google thật, Tomcat/HTTP, SMTP và bảo mật nếu thuộc tiêu chí phát hành; chốt Q1–Q12 với owner.

## 10. Chỉ mục tài liệu và giới hạn

| Tài liệu / bằng chứng | Ghi chú |
|---|---|
| `docs/qa/API_QUALITY_SCORECARD.md` | Scorecard cũ ngày 09/11, 39 API; chưa được cập nhật thành ma trận 56 API. |
| `docs/qa/FINAL_QA_REPORT.md` | Báo cáo tổng hợp hiện hành, ngày 17/11/2026. |
| `database/README.md`, `database/category-normalization.md`, `database/books.sql` | Quy trình và số liệu kỳ vọng; không thay thế truy vấn DB thực tế. |
| `docs/qa/RAG_DATA_QUALITY_RESEARCH.md` | Nghiên cứu riêng về chất lượng dữ liệu cho RAG, không phải kết quả QA API hiện tại. |
| `backend/src/lms/src/main/resources/db/migration/` | DB hiện tại đã chạy thành công tới V10; chưa kiểm tra migrate sạch hoặc nâng cấp schema cũ. |

**Giới hạn:** đánh giá này chưa chứng nhận khả năng phát hành. DB/API đã được kiểm tra chỉ đọc; suite còn một test fail do mock lệch overload. Chưa kiểm tra đủ 56 mapping, loan workflow, query plan, tải đồng thời hoặc snapshot trước/sau. Các trục chưa chạy đầy đủ có độ tin cậy thấp.
