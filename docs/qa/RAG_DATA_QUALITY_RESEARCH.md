# RAG Data Quality Research — LMS

- **Ngày rà soát:** 2026-11-16
- **Repository:** [canknotcawh/HK1_2627_INT3505E_2_nhom6](https://github.com/canknotcawh/HK1_2627_INT3505E_2_nhom6)
- **Phạm vi:** mã nguồn, schema/dữ liệu thư viện, QA report và tài liệu chính thức về RAG/Data Quality.
- **Lưu ý:** các ngưỡng dưới đây là đề xuất cho đặc tả, chưa phải kết quả đo thực tế.

## 1. Kết luận

1. LMS hiện có Spring Boot 4.1.1/Java 25, PostgreSQL 16, hai frontend React 19 và xác thực JWT. README mô tả các chức năng bạn đọc: tìm kiếm sách, xem chi tiết, mượn, trả và gia hạn. ([README](https://github.com/canknotcawh/HK1_2627_INT3505E_2_nhom6/blob/main/README.md))
2. Tìm kiếm hiện tại là PostgreSQL full-text search, chuẩn hóa dấu tiếng Việt bằng `immutable_unaccent`, prefix matching và fuzzy matching qua `pg_trgm/word_similarity`. Đây **không phải** vector retrieval hay RAG. ([BookRepository.java](https://github.com/canknotcawh/HK1_2627_INT3505E_2_nhom6/blob/main/backend/src/lms/src/main/java/com/soa/gr6/lms/repository/BookRepository.java), [init_search.sql](https://github.com/canknotcawh/HK1_2627_INT3505E_2_nhom6/blob/main/backend/src/lms/src/main/resources/data/init_search.sql))
3. `pom.xml` được rà soát chưa có dependency Spring AI/LangChain/embedding/vector store; các tìm kiếm trong repository không tìm thấy module RAG, ingestion pipeline hay cấu hình pgvector. Pipeline nạp tri thức và vector index phải được xem là hạng mục phát triển mới. ([pom.xml](https://github.com/canknotcawh/HK1_2627_INT3505E_2_nhom6/blob/main/backend/src/lms/pom.xml))
4. Repository có dữ liệu danh mục sách và tài liệu kỹ thuật, nhưng chưa xác nhận có bộ quy định/nội quy thư viện, FAQ hoặc hướng dẫn người dùng đã được khách hàng phê duyệt để làm Knowledge Base. Các tài liệu này cần được khách hàng cung cấp và xác nhận trước khi lập chỉ mục. ([README](https://github.com/canknotcawh/HK1_2627_INT3505E_2_nhom6/blob/main/README.md), [RUN_GUIDE](https://github.com/canknotcawh/HK1_2627_INT3505E_2_nhom6/blob/main/RUN_GUIDE.md))
5. Dữ liệu danh mục có thể hỗ trợ câu hỏi về thông tin sách; không thay thế quy định thư viện. Dữ liệu động như số bản còn, trạng thái mượn/trả và thông tin tài khoản phải lấy từ API nghiệp vụ tại thời điểm hỏi, không đưa vào vector index tĩnh.
6. Không đưa email, thông tin định danh, token, lịch sử mượn gắn với người dùng hoặc dữ liệu tài khoản vào Knowledge Base dùng chung cho end user.

## 2. Bằng chứng từ dự án

### 2.1 Kiến trúc và tìm kiếm

- README ghi nhận Spring Boot 4.1.1, Java 25, PostgreSQL 16, Flyway và hai frontend React 19. ([README](https://github.com/canknotcawh/HK1_2627_INT3505E_2_nhom6/blob/main/README.md))
- `BookRepository` tìm kiếm tiêu đề, subtitle, description và tác giả bằng `to_tsvector`, `vi_to_prefix_tsquery`, `immutable_unaccent` và `word_similarity`; bộ lọc thể loại/tình trạng sách dùng `book_category`, `category` và `available_copies`. ([BookRepository.java](https://github.com/canknotcawh/HK1_2627_INT3505E_2_nhom6/blob/main/backend/src/lms/src/main/java/com/soa/gr6/lms/repository/BookRepository.java))
- `pom.xml` khai báo Spring Web MVC, Spring Data JPA, Security, PostgreSQL, Flyway và các dependency liên quan; không thấy dependency RAG/vector trong file này. ([pom.xml](https://github.com/canknotcawh/HK1_2627_INT3505E_2_nhom6/blob/main/backend/src/lms/pom.xml))

### 2.2 Dữ liệu danh mục

- `Book` có các trường: `isbn13`, `title`, `subtitle`, `ggId`, `description`, `language`, `publishedYear`, `pageCount`, `coverImageUrl`, `totalCopies`, `availableCopies`, `ratingAvg`, `ratingCount`, `borrowCount`, `status`, `createdAt`, `updatedAt`; liên kết nhiều-nhiều tới `Author` và `Category`. ([Book.java](https://github.com/canknotcawh/HK1_2627_INT3505E_2_nhom6/blob/main/backend/src/lms/src/main/java/com/soa/gr6/lms/domain/Book.java))
- `BookRequest` yêu cầu title không rỗng, giới hạn độ dài một số trường, pageCount và totalCopies không âm; domain kiểm tra ISBN-13, năm xuất bản, rating và quan hệ số bản. ([BookRequest.java](https://github.com/canknotcawh/HK1_2627_INT3505E_2_nhom6/blob/main/backend/src/lms/src/main/java/com/soa/gr6/lms/dto/BookRequest.java), [Book.java](https://github.com/canknotcawh/HK1_2627_INT3505E_2_nhom6/blob/main/backend/src/lms/src/main/java/com/soa/gr6/lms/domain/Book.java))
- `Category.name` và `Author.name` là trường bắt buộc và unique ở entity. ([Category.java](https://github.com/canknotcawh/HK1_2627_INT3505E_2_nhom6/blob/main/backend/src/lms/src/main/java/com/soa/gr6/lms/domain/Category.java), [Author.java](https://github.com/canknotcawh/HK1_2627_INT3505E_2_nhom6/blob/main/backend/src/lms/src/main/java/com/soa/gr6/lms/domain/Author.java))

### 2.3 Chuẩn hóa category

Tài liệu chuẩn hóa ghi nhận 6.109 sách trước/sau; thể loại giảm từ 486 xuống 36; liên kết sách–thể loại tăng từ 6.109 lên 6.380. Báo cáo nêu không còn liên kết mồ côi, cặp liên kết trùng hoặc sách thiếu thể loại; UUID sách, tài khoản, lịch sử mượn/trả, tác giả, số bản và rating được giữ nguyên. Đây là kết quả được ghi trong tài liệu chuẩn hóa, không phải số liệu vừa truy vấn trực tiếp trên production. ([database/README.md](https://github.com/canknotcawh/HK1_2627_INT3505E_2_nhom6/blob/main/database/README.md), [category-normalization.md](https://github.com/canknotcawh/HK1_2627_INT3505E_2_nhom6/blob/main/database/category-normalization.md))

### 2.4 Dữ liệu giao dịch và rủi ro

- `Loan` liên kết tới `Book` và `User`, có `borrowedAt`, `dueAt`, `returnedAt`, `status`, `renewedCount`; domain quy định tối đa một lần gia hạn. Yêu cầu trả chuyển trạng thái sang `PENDING_RETURN`; việc trả hoàn tất và cập nhật số bản được thực hiện khi xác nhận trả. Đây là trạng thái nghiệp vụ biến động, không nên đóng gói thành nội dung tĩnh trong vector index. ([Loan.java](https://github.com/canknotcawh/HK1_2627_INT3505E_2_nhom6/blob/main/backend/src/lms/src/main/java/com/soa/gr6/lms/domain/Loan.java))
- QA report ngày 2026-11-09 còn ghi nhận các vấn đề nhất quán dữ liệu/contract liên quan tồn kho và cập nhật sách: lost update tồn kho (DF-02), PUT bỏ totalCopies và cho totalCopies thấp hơn số đang mượn (DF-05/DF-06), cùng lỗi PATCH body rỗng có thể làm thay đổi tồn kho (CV-04). Cần xác nhận trạng thái sửa lỗi trước khi chatbot trả lời dữ liệu tồn kho trực tiếp. ([FINAL_QA_REPORT.md](https://github.com/canknotcawh/HK1_2627_INT3505E_2_nhom6/blob/main/docs/qa/FINAL_QA_REPORT.md))
- Cùng QA report ghi nhận hai migration trùng version V5 là blocker tại thời điểm báo cáo; test profile tắt Flyway nên test xanh không chứng minh production migration khởi động thành công. Cần xác nhận đã khắc phục trước khi triển khai pipeline nạp dữ liệu trên môi trường thật. ([FINAL_QA_REPORT.md](https://github.com/canknotcawh/HK1_2627_INT3505E_2_nhom6/blob/main/docs/qa/FINAL_QA_REPORT.md))

## 3. Data Quality đề xuất cho RAG

| Tiêu chí | Cách kiểm tra | Ngưỡng đề xuất |
|---|---|---|
| Nguồn gốc và phê duyệt | Kiểm tra nguồn, chủ sở hữu, quyền sử dụng, trạng thái phê duyệt | 100% tài liệu có nguồn/chủ sở hữu/quyền sử dụng/phê duyệt; 0 tài liệu chưa duyệt được index |
| Độ chính xác và thẩm quyền | Đối chiếu điều khoản, con số và quy trình với văn bản có hiệu lực và chủ sở hữu nghiệp vụ | 100% nội dung chính sách trọng yếu được xác nhận; 0 mâu thuẫn chưa xử lý |
| Độ đầy đủ/phủ chủ đề | Lập ma trận chủ đề hỏi đáp với tài liệu nguồn | 100% chủ đề bắt buộc có ít nhất một nguồn được duyệt; phần thiếu phải đánh dấu chưa hỗ trợ |
| Nhất quán | So sánh các tài liệu đang hiệu lực và các bản sửa đổi | 0 xung đột chưa giải quyết trong tập tài liệu đang hoạt động |
| Tính cập nhật/phiên bản | Kiểm tra version, effective date, ngày cập nhật và thời gian tái lập chỉ mục | 100% tài liệu có version/ngày hiệu lực; cập nhật index trong 1 ngày làm việc sau khi bản mới được duyệt; vô hiệu hóa bản cũ |
| Không trùng lặp | So sánh document ID, version, checksum và nội dung | 0 bản trùng đang hoạt động |
| Chất lượng trích xuất | So sánh văn bản sau parse với PDF/DOCX/HTML gốc, đặc biệt bảng và điều khoản | 100% điều khoản/số liệu quan trọng được giữ đúng; không mất cấu trúc làm đổi nghĩa |
| Chất lượng chunk | Kiểm tra chunk theo heading/đoạn, không cắt rời điều kiện và ngoại lệ | Ít nhất 95% chunk trong mẫu kiểm tra được người duyệt đánh giá là đủ ngữ cảnh |
| Metadata/truy vết | Kiểm tra document_id, title, version, effective_date, section/page, source URI, approval status trên từng chunk | 100% chunk có metadata bắt buộc và truy ngược được về tài liệu gốc |
| Riêng tư và phân quyền | Quét PII/credential và kiểm tra danh sách nguồn được phép dùng cho end user | 0 token/mật khẩu/dữ liệu cá nhân/lịch sử mượn cá nhân trong KB dùng chung |
| Phân tách dữ liệu tĩnh/động | Kiểm tra dữ liệu chính sách so với số bản còn, trạng thái mượn/trả, trạng thái tài khoản | 100% dữ liệu biến động được truy vấn từ API nghiệp vụ có quyền phù hợp hoặc chatbot từ chối; không trả từ index tĩnh |

**Cách chấm 1–5:** chấm từng tiêu chí trên tập tài liệu thực tế và lấy trung bình các tiêu chí áp dụng. Tuy nhiên, nếu có tài liệu chưa được phê duyệt, mâu thuẫn chính sách chưa xử lý hoặc dữ liệu cá nhân/credential thì không được xem là sẵn sàng production dù điểm trung bình cao.

## 4. Baseline và đầu vào còn thiếu

- **Baseline Data Quality cho RAG: 2/5 (tạm tính, chưa đo).** Dự án có metadata sách đã được chuẩn hóa ở mức nhất định, nhưng chưa xác nhận corpus chính sách/FAQ được duyệt và chưa có pipeline ingestion/vector retrieval trong mã nguồn được rà soát.
- Khách hàng cần bàn giao: nội quy/quy định thư viện hiện hành; FAQ; hướng dẫn main-web dành cho bạn đọc; người/chức danh phê duyệt; version và ngày hiệu lực; quyền sử dụng; quy tắc thay thế/thu hồi tài liệu.
- Hai bên cần chốt danh sách chủ đề bắt buộc, thời hạn cập nhật sau khi chính sách thay đổi, cách xử lý tài liệu mâu thuẫn và dữ liệu nào chatbot được phép truy vấn trực tiếp.
- Không suy ra thời hạn mượn, phí phạt hoặc chính sách khác chỉ từ mã nguồn nếu chưa có văn bản nghiệp vụ được khách hàng xác nhận.
- Data Quality chỉ đánh giá chất lượng corpus và pipeline nạp dữ liệu. Recall@K, Faithfulness, Answer Correctness và Citation Accuracy thuộc phần đánh giá/tiêu chí nghiệm thu chatbot.

## 5. Tài liệu tham chiếu chính thức

1. Microsoft Learn, [RAG and Generative AI — Azure AI Search](https://learn.microsoft.com/en-us/azure/search/retrieval-augmented-generation-overview): chuẩn bị nội dung, chunking, vectorization và hybrid retrieval.
2. Microsoft Learn, [Chunk large documents for RAG and vector search](https://learn.microsoft.com/en-us/azure/search/vector-search-how-to-chunk-documents): chunk theo cấu trúc/ý nghĩa, overlap và bảo toàn ngữ cảnh.
3. Google Cloud, [Parse and chunk documents](https://docs.cloud.google.com/generative-ai-app-builder/docs/parse-chunk-documents): parser PDF/DOCX/HTML, layout-aware chunking, headings, tables, lists và chunk provenance.
4. NIST, [AI RMF Generative AI Profile — NIST AI 600-1](https://doi.org/10.6028/NIST.AI.600-1): theo dõi nguồn gốc/lineage, transformation, data quality, privacy và đánh giá với ground truth.
5. NIST, [AI RMF Playbook — Measure](https://airc.nist.gov/airmf-resources/playbook/measure/): chọn metric theo mục đích, đặt ngưỡng chấp nhận, ghi lại test set và theo dõi trước/sau triển khai.
