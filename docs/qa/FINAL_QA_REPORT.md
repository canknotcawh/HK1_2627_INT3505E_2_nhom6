# Báo cáo QA tổng hợp — LMS

- **Ngày cập nhật:** 17/11/2026 (Asia/Bangkok)
- **Repo:** `HK1_2627_INT3505E_2_nhom6`
- **Nhánh / commit được rà soát:** `feature/account-manager` / `2cab5c9`
- **Phạm vi:** backend LMS, 56 API/12 controller, dữ liệu sách và chuẩn hóa thể loại, bằng chứng QA cũ và các kiểm tra có thể thực hiện ngày 17/11.
- **Kết luận hiện tại:** **NOT READY TO CERTIFY** — chưa đủ bằng chứng để xác nhận chất lượng bản đang có hoặc chấp thuận phát hành.
- **Nguyên tắc:** không chạy seed/import, không ghi hay reset DB, không sửa source hoặc test. Các kết quả ngày 09/11 được giữ lại như bằng chứng lịch sử, không xem là kiểm chứng trạng thái hiện tại.

## 1. Kết luận điều hành

Đánh giá ngày 17/11 xác nhận tĩnh có **12 controller và 56 mapping API**. Tài liệu dữ liệu mô tả bộ chuẩn gồm **6.109 sách, 36 thể loại, 6.380 liên kết sách–thể loại**. Tuy nhiên, PostgreSQL không truy cập được tại hai cổng local đã kiểm tra (5433 và 5432), nên chưa đối chiếu được dữ liệu thực tế, tính toàn vẹn liên kết, dữ liệu nghiệp vụ được bảo toàn, API trên DB mới hoặc hiệu năng.

Suite backend được gọi lại nhưng bị chặn bởi lỗi môi trường Mockito/Byte Buddy: **187 test được phát hiện, 130 lỗi khởi tạo test, 0 assertion failure, 1 test bị skip**. Đây không phải bằng chứng 130 lỗi sản phẩm. Vì vậy các kết quả test ngày 09/11 không được tính là đã chạy lại trên commit hiện tại.

Điểm tổng hợp hiện tại là **34,5/100**, thể hiện mức sẵn sàng bằng chứng thấp; không nên hiểu là sản phẩm đã giảm từ 64 điểm. Phần lớn trục chưa thể được kiểm chứng lại. Không có thao tác DB ghi dữ liệu nào được thực hiện.

## 2. Hai mốc QA và cách diễn giải

| Mốc | Phạm vi và kết quả | Cách sử dụng trong báo cáo này |
|---|---|---|
| **09/11/2026 — QA Phase 0–7** | Báo cáo cũ ghi 39 API/6 controller, 338 test (337 pass, 1 skip), 64/100, NOT READY; nêu các lỗi DF/CV/AC/PB và vấn đề độ tin cậy. | Bằng chứng lịch sử của revision lúc đó. Không được suy ra các lỗi đã sửa hoặc còn tái hiện trên commit hiện tại nếu chưa kiểm tra. |
| **17/11/2026 — rà soát lại** | Xác nhận tĩnh 56 mapping/12 controller; DB không truy cập được; test bị chặn do Mockito agent; không có phép đo API, dữ liệu hoặc hiệu năng trên DB mới. | Đây là trạng thái hiện hành và căn cứ cho kết luận NOT READY TO CERTIFY. |

Điểm 64/100 cũ và 34,5/100 hiện tại dùng cùng trọng số nhưng khác tập bằng chứng. Điểm mới phản ánh mức độ chưa xác minh được, không phải phép đo hồi quy trực tiếp.

## 3. Phạm vi và phương pháp ngày 17/11

- Đọc README, hướng dẫn chạy, cấu hình DB, migration, seed SQL, repository tìm kiếm, scorecard và báo cáo QA cũ.
- Kiểm tra `git status`, commit hiện tại và khai báo route trong 12 controller.
- Kiểm tra khả năng kết nối PostgreSQL tại `localhost:5433` và `localhost:5432`; không khởi động Docker/DB vì việc đó làm thay đổi trạng thái môi trường.
- Chạy `bash ./mvnw test` trong `backend/src/lms`; không thay source/test.
- Không chạy SQL, không gửi request có thể ghi dữ liệu, không import lại seed và không xóa volume.

### Thông tin môi trường

| Thành phần | Quan sát |
|---|---|
| Commit | `2cab5c9` |
| Java chạy test | OpenJDK `25.0.5.0.3+1-1-26.04.1-Ubuntu` |
| DB cấu hình mặc định | PostgreSQL; `application.yaml` dùng cổng 5433, user/database mặc định được cấu hình qua biến môi trường hoặc giá trị dev |
| Kết nối DB | Không phản hồi tại cổng 5433 và 5432; không có container đang chạy |
| Flyway | Được bật trong `application.yaml`; chưa chạy migration trong lần rà soát này |
| Test suite | Mockito inline mock maker không tự gắn được agent trong môi trường hiện tại |

## 4. Kiểm kê API hiện tại

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
| Trạng thái repo ban đầu | PASS | Working tree sạch trước khi tạo báo cáo; commit `2cab5c9`. |
| Số controller/API | PASS (kiểm tra tĩnh) | 12 controller, 56 mapping. Chưa xác minh route runtime hoặc test coverage. |
| Kỳ vọng catalog | PASS (đối chiếu tài liệu) | `database/README.md`, `category-normalization.md` và header `database/books.sql` ghi 6.109 sách, 36 thể loại, 6.380 liên kết. Đây chưa phải số liệu đọc từ DB. |
| Kết nối DB | BLOCKED | `pg_isready` không nhận phản hồi ở cổng 5433 và 5432. Không truy vấn được DB đã cập nhật. |
| Test backend | BLOCKED | 187 test phát hiện; 130 error do Mockito/Byte Buddy không gắn được agent; 0 assertion failure; 1 skip. Không coi 130 error là lỗi nghiệp vụ. |
| Migration / khởi động ứng dụng | NOT TESTED | Không chạy Flyway hoặc profile production trên DB trống/bản sao. |
| API và luồng mượn/trả trên DB mới | NOT TESTED | Không có DB/API runtime để kiểm tra. |
| Hiệu năng DB mới | NOT TESTED | Không đo query plan, p50/p95/p99 hoặc tải đồng thời. |

### 5.1 Đối chiếu dữ liệu sách và thể loại

| Kiểm tra | Kỳ vọng | Quan sát được | Trạng thái |
|---|---|---|---|
| Tổng số sách | 6.109 sách từ bộ nguồn; DB có thể có thêm dữ liệu riêng | Tài liệu/header seed ghi 6.109; không truy vấn được DB | BLOCKED |
| Tổng thể loại | 36 thể loại chuẩn; có thể có danh mục riêng ngoài nguồn | Tài liệu/header seed ghi 36; không truy vấn được DB | BLOCKED |
| Liên kết sách–thể loại | 6.380 liên kết trong nguồn chuẩn | Tài liệu/header seed ghi 6.380; không truy vấn được DB | BLOCKED |
| Liên kết mồ côi | 0 | Chưa chạy truy vấn | NOT TESTED |
| Cặp liên kết trùng | 0; schema khai báo khóa ghép | Chưa kiểm tra dữ liệu thực tế | NOT TESTED |
| Sách không có thể loại | 0 trong bộ nguồn chuẩn | Chưa truy vấn | NOT TESTED |
| ISBN/UUID hợp lệ và duy nhất | Theo constraint/domain, ISBN dùng đối chiếu sách | Chưa đối chiếu record thực tế hoặc workbook nguồn | NOT TESTED |
| Bảo toàn tài khoản/lịch sử mượn/tác giả/số bản/rating | Giữ nguyên dữ liệu ngoài thao tác chuẩn hóa | Không có snapshot trước/sau | NOT TESTED |
| Import lặp lại và giữ dữ liệu ngoài nguồn | Không tạo trùng/reset dữ liệu nghiệp vụ, giữ dữ liệu ngoài phạm vi | Không chạy script và chưa kiểm chứng độc lập | NOT TESTED |

Tài liệu mô tả script có transaction, bảng staging, khóa bảng và ánh xạ dữ liệu. Đây là bằng chứng thiết kế, chưa chứng minh script an toàn hoặc idempotent trên DB hiện hành. Không chạy lại import trong đợt QA này.

### 5.2 Kiểm tra test

Lệnh: `bash ./mvnw test` từ `backend/src/lms`.

Maven nhận diện 187 test. Có 130 lỗi khởi tạo Mockito, 0 assertion failure và 1 test bị skip. Lỗi lặp lại cho biết không thể khởi tạo Mockito inline mock maker do JVM không hỗ trợ cơ chế self-attach trong môi trường chạy. Suite vì vậy **BLOCKED**, không PASS/FAIL về chất lượng chức năng. Profile test này cũng không chứng minh Flyway chạy được trên DB production.

### 5.3 Migration và truy vấn sách

- Cấu hình `application.yaml` bật Flyway và đặt Hibernate ở `ddl-auto: validate`.
- Thư mục migration hiện có `V1`–`V10`, trong đó metadata sách nằm ở `V8__update_book_metadata.sql`; chỉ thấy một migration `V5` trong cây hiện tại. Lỗi trùng version V5 được nêu ngày 09/11 không tái hiện qua kiểm tra tĩnh, nhưng chưa thể đánh dấu đã đóng khi chưa chạy Flyway.
- `BookRepository` dùng tìm kiếm full-text/trigram và lọc category qua `book_category`; `init_search.sql` khai báo hàm/index tìm kiếm. Chưa biết các index có tồn tại và được planner sử dụng trên DB người dùng hay không.
- `CategoryRepository` có truy vấn đếm và gộp category; chưa test API gộp/đổi tên/xóa hoặc đối chiếu số lượng trên dữ liệu thật.
- Hướng dẫn chạy có khác biệt cổng DB so với cấu hình hiện tại: cấu hình ứng dụng mặc định 5433, một số hướng dẫn cũ ghi 5432. Cần thống nhất hướng dẫn trước lần xác nhận môi trường tiếp theo.

## 6. Scorecard hiện tại

Giữ nguyên trọng số của scorecard ngày 09/11: 10/20/15/15/15/10/10/5. Điểm ngày 17/11 là điểm tạm dựa trên bằng chứng hiện có; các vùng bị chặn không được mặc định là đạt.

| Trục | Trọng số | Điểm / 10 | Điểm trọng số | Căn cứ và độ tin cậy |
|---|---:|---:|---:|---|
| Kiểm kê API | 10 | 7 | 7,0 | 56 mapping/12 controller xác nhận tĩnh; chưa đối chiếu runtime/OpenAPI/test. Tin cậy trung bình. |
| Độ phủ kiểm thử chức năng | 20 | 3 | 6,0 | Có 187 test được phát hiện nhưng suite bị chặn; không có bằng chứng DB hiện hành. Tin cậy thấp. |
| Tuân thủ hợp đồng response | 15 | 4 | 6,0 | Báo cáo cũ ghi nhận lỗi; source đã thay đổi và chưa kiểm tra contract lại. Tin cậy thấp. |
| Nhất quán dữ liệu | 15 | 3 | 4,5 | Có kỳ vọng dữ liệu trong tài liệu; DB, quan hệ và bảo toàn dữ liệu chưa kiểm tra. Tin cậy thấp. |
| Xác thực / phân quyền | 15 | 4 | 6,0 | Có findings lịch sử; test bảo mật hiện hành chưa chạy được. Tin cậy thấp. |
| E2E | 10 | 2 | 2,0 | Chưa chạy workflow trên DB/API hiện tại. Tin cậy thấp. |
| Hiệu năng | 10 | 2 | 2,0 | Có số đo cũ nhưng chưa đo dataset mới hoặc query plan hiện tại. Tin cậy thấp. |
| Độ tin cậy | 5 | 2 | 1,0 | Chưa chạy kiểm tra outage/startup/fault injection hiện tại. Tin cậy thấp. |
| **Tổng** | **100** |  | **34,5/100** | **NOT READY TO CERTIFY** |

> Điểm 34,5 biểu thị thiếu bằng chứng hiện hành, không phải kết luận hệ thống tụt chất lượng so với điểm 64 ngày 09/11.

## 7. Trạng thái phát hiện từ QA ngày 09/11

Các trạng thái dưới đây là **chưa xác minh lại**, trừ nhận xét tĩnh riêng về migration. Không kết luận đã sửa chỉ dựa trên việc mã nguồn hoặc migration đổi tên.

| Finding cũ | Trạng thái ngày 17/11 | Căn cứ |
|---|---|---|
| DF-07 — hai migration version V5 | Chưa xác minh; xung đột không còn thấy trong danh sách file | Có một migration V5 và migration metadata ở V8; chưa chạy Flyway. |
| CV-03 — response lỗi không thống nhất | Chưa xác minh | Không chạy API lỗi hiện tại. |
| CV-02/04/05/07 — dữ liệu sách/contract | Chưa xác minh | Không có request API và DB để đối chiếu. |
| DF-01/02/05/06 — transaction và tồn kho | Chưa xác minh | Không chạy test DB/concurrency hiện hành. |
| AC-01/02/03/04 — token, Swagger, rate limit | Chưa xác minh | Suite bảo mật hiện hành không chạy được. |
| PB-01…PB-04 — tìm kiếm, N+1, phân trang sâu, pool | Chưa xác minh | Số đo ngày 09/11 không đại diện cho dữ liệu hiện tại. |
| Timeout DB/SMTP và độ tin cậy | Chưa xác minh | Không chạy fault injection. |

### Bằng chứng lịch sử ngày 09/11 (không tái kiểm chứng)

Báo cáo QA Phase 0–7 ghi nhận 338 test, 27 workflow E2E, 42 ca dữ liệu, 39/39 API có test HTTP và điểm **64/100 — NOT READY**. Các vấn đề được nêu gồm response lỗi chưa thống nhất, một số dữ liệu sách không được lưu, lỗi transaction/tồn kho, rủi ro auth, tìm kiếm chậm/N+1 và timeout. Đây là kết quả của revision/môi trường lúc đó; phải xem là lịch sử cho đến khi được chạy lại.

## 8. Hạng mục chưa kiểm tra hoặc bị chặn

1. Truy vấn DB đang dùng để xác nhận số sách/thể loại/liên kết, liên kết mồ côi/trùng, sách thiếu category, ISBN/UUID và migration history.
2. Bằng chứng trước/sau về bảo toàn tài khoản, loan, tác giả, số bản và rating.
3. Flyway trên schema trống và bản sao schema cũ; khởi động profile production và Hibernate validation.
4. Chạy test suite trong môi trường có Mockito agent hoạt động; kiểm thử HTTP cho toàn bộ 56 API.
5. Regression catalog và luồng mượn/trả với DB đã cập nhật.
6. Query plan và latency cho tìm kiếm, filter category, danh sách category, trang đầu/trang sâu, tải đồng thời.
7. UI trình duyệt, Google token thật, Tomcat/HTTP connector thật, SMTP auth/TLS và DAST/pentest đầy đủ.
8. Quy tắc nghiệp vụ Q1–Q12 từng được nêu trong báo cáo cũ vẫn cần owner xác nhận trước khi đánh giá đúng/sai.

## 9. Việc cần làm trước khi chấm/release lại

1. Chạy các truy vấn **chỉ đọc** trên đúng DB đã cập nhật; ghi endpoint/schema, migration history và kết quả count/integrity. Dùng snapshot/backup đã có để kiểm tra bảo toàn; không import lại để tạo bằng chứng.
2. Khắc phục hoặc cung cấp môi trường test cho Mockito agent, sau đó chạy lại suite và phân biệt assertion failure với lỗi hạ tầng.
3. Chạy Flyway trên DB thử nghiệm trống và bản sao của schema cũ; xác nhận production profile khởi động được.
4. Lập route-to-test matrix đủ 56 API; ưu tiên catalog/category, quản trị category, review, stats, và các luồng liên quan sách.
5. Đo query plan và p50/p95/p99 trên dataset hiện tại; xác nhận index tìm kiếm/category tồn tại và được dùng. Cần chốt SLA trước khi kết luận đạt hiệu năng.
6. Chạy lại regression mượn/trả và đối chiếu trạng thái/số bản ở DB.
7. Cập nhật scorecard chỉ sau khi có kết quả mới; mọi finding chưa chạy phải tiếp tục ghi “chưa xác minh”.

## 10. Chỉ mục tài liệu và giới hạn

| Tài liệu / bằng chứng | Ghi chú |
|---|---|
| `docs/qa/API_QUALITY_SCORECARD.md` | Scorecard cũ ngày 09/11, 39 API; chưa được cập nhật thành ma trận 56 API. |
| `docs/qa/FINAL_QA_REPORT.md` | Báo cáo tổng hợp hiện hành, ngày 17/11/2026. |
| `database/README.md`, `database/category-normalization.md`, `database/books.sql` | Quy trình và số liệu kỳ vọng; không thay thế truy vấn DB thực tế. |
| `docs/qa/RAG_DATA_QUALITY_RESEARCH.md` | Nghiên cứu riêng về chất lượng dữ liệu cho RAG, không phải kết quả QA API hiện tại. |
| `backend/src/lms/src/main/resources/db/migration/` | Migration hiện tại; chưa được chạy trong lượt rà soát này. |

**Giới hạn:** đánh giá này không chứng nhận dữ liệu production hay khả năng phát hành. DB không truy cập được và suite test bị chặn, nên kết luận có độ tin cậy thấp ở các trục chức năng, hợp đồng, dữ liệu, bảo mật, E2E, hiệu năng và độ tin cậy.
