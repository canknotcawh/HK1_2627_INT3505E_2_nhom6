# FINAL QA REPORT — LMS API (Phase 0–7)

- **Ngày:** 2026-11-09
- **Phạm vi:** toàn bộ backend `backend/src/lms` (Java 25, Spring Boot 4.1.1, PostgreSQL 16)
- **Nhánh:** `main` @ `3b81ee7` + working tree của Phase 0–7 (chưa commit)
- **Người thực hiện:** QA Lead (Phase 7)
- **Nguyên tắc:** không sửa business code, không commit/push; mọi kết luận dưới đây gắn với một lần chạy hoặc một test cụ thể.

---

## 1. Kết luận điều hành

> ## ❌ NOT READY

Hệ thống **không đạt tiêu chí phát hành** tại thời điểm nghiệm thu, vì còn **1 blocker** và **1 lỗi CRITICAL** đang mở, cùng 11 lỗi HIGH:

1. **DF-07 (blocker):** hai migration cùng version `V5` (`V5__account_identity_sessions.sql`, `V5__update_book_metadata.sql`). `MigrationIntegrityTest` chạy Flyway thật trên database trống và nhận `Found more than one migration with version 5`. Với cấu hình hiện tại (`spring.flyway.enabled: true`, `ddl-auto: validate`), **profile production không thể khởi tạo schema/khởi động**. Test profile tắt Flyway nên 338 test vẫn xanh — đây là lý do coverage không phản ánh khả năng phát hành.
2. **CV-03 (critical):** lỗi tham số/đường dẫn/415/500 không trả schema `ApiError` (không có `code`). Client không có hợp đồng lỗi thống nhất để xử lý.
3. **11 lỗi HIGH** gồm mất dữ liệu im lặng (`previewUrl`/`readerUrl`), xoá tồn kho khi PATCH body rỗng, `ggId` không bao giờ được ghi, register không nguyên tử, test cũ khẳng định sai hành vi production, và 6 điểm nghẽn hiệu năng/độ tin cậy.

Chi tiết quyết định và điều kiện phát hành lại: [`RELEASE_READINESS.md`](RELEASE_READINESS.md). Danh sách lỗi: [`BUG_SUMMARY.md`](BUG_SUMMARY.md). Rủi ro còn lại: [`REMAINING_RISKS.md`](REMAINING_RISKS.md).

---

## 2. Phạm vi và phương pháp

| Giai đoạn | Nội dung | Đầu ra chính |
|---|---|---|
| Phase 0 | Kiểm kê 39 endpoint, DTO, migration, khoảng trống test | `docs/qa/phase-0/` |
| Phase 1 | Rà hợp đồng API | 25 vi phạm `CV-01…25` |
| Phase 2 | Test chức năng Auth (25 case) | `AuthApiTest` (không có thư mục tài liệu riêng — xem §9) |
| Phase 3 | Transaction & nhất quán dữ liệu | 42/42 case PASS, `DF-01…08` |
| Phase 4 | Authentication/authorization/IDOR | 59 test, `AC-01…10` |
| Phase 5 | 27 workflow E2E + hợp đồng frontend | 27/27 PASS, `F-01…08` |
| Phase 6 | Hiệu năng, độ tin cậy, an toàn đầu vào | 110.235 request, 31 test input, `PB-01…09`, `R6-F1…F5`, `SEC6-F1…F6` |
| Phase 7 | Regression, tổng hợp, nghiệm thu | 6 tài liệu này |

**Thay đổi source trong toàn bộ Phase 0–7:** không có. `git status` chỉ có `backend/src/lms/pom.xml` thêm dependency test `testcontainers-postgresql` và các thư mục test/tài liệu untracked. Không có file `src/main` nào bị sửa.

**Môi trường chạy test:**

| Thành phần | Giá trị |
|---|---|
| Java | 25.0.4.1 |
| Maven | 3.9.16 (wrapper `only-script`, chạy bằng `bash ./mvnw`) |
| Spring Boot | 4.1.1 |
| Database test | PostgreSQL 16 Testcontainer, container mới mỗi JVM |
| Email test | Mock `JavaMailSender` (mặc định) + Mailpit thật cho `MailpitEmailWorkflowTest` |
| Profile test | `test`: Flyway **tắt**, `ddl-auto=create-drop`, JWT secret test |
| Máy | 12 vCPU / 10 GiB RAM |

Lệnh chạy:

```bash
cd backend/src/lms
bash ./mvnw clean verify          # build + 338 test + JaCoCo gate
bash ./mvnw test -Dsurefire.runOrder=random -Dsurefire.runOrder.random.seed=20261109
bash ./mvnw test -Dtest=AuthApiTest
bash ./mvnw test -Dtest=AccessControlTest
```

> `mvnw` không có exec bit trong repo; dùng `bash ./mvnw` để không thay đổi quyền file.

---

## 3. Kết quả thực thi

### 3.1 Build & test

| Lần chạy | Lệnh | Kết quả | Thời gian |
|---|---|---|---|
| 1 | `mvn test` (Phase 6, trước Phase 7) | 338 test, 0 fail, 0 error, 1 skip — BUILD SUCCESS | ~41 s |
| 2 | `bash ./mvnw clean verify` | 338 test, 0 fail, 0 error, 1 skip — BUILD SUCCESS; `All coverage checks have been met` | 40,909 s |
| 3 | random order, seed `20261109` | 338 test, 0 fail, 0 error, 1 skip — BUILD SUCCESS | 33,666 s |
| 4 | `-Dtest=AuthApiTest` (riêng lẻ) | 25 test, 0 fail — BUILD SUCCESS | ~25 s |
| 5 | `-Dtest=AccessControlTest` (riêng lẻ) | 20 test, 0 fail — BUILD SUCCESS | ~20 s |

- **PASS:** 337/338
- **FAIL:** 0
- **ERROR:** 0
- **SKIPPED:** 1 — `LmsApplicationTests`, bị skip có chủ đích vì cần biến `LMS_IT`; không phải test nghiệp vụ.
- **Số test class:** 37.
- **Thời gian test cộng dồn (surefire):** 46,0 s.

### 3.2 JaCoCo

Nguồn: `target/site/jacoco/jacoco.csv` (82 class), sinh bởi `clean verify`.

| Chỉ số | Kết quả | Ngưỡng |
|---|---:|---|
| Instruction | **94,59%** (5.105/5.397) | — |
| Branch | **79,17%** (342/432) | — |
| Line | **94,90%** (1.154/1.216) | ≥ 50% ✅ |
| Complexity | 82,21% | — |

Coverage theo tầng:

| Tầng | Line | Branch |
|---|---:|---:|
| `controller` | 98,8% (80/81) | 83,3% |
| `service` | 93,7% (462/493) | 73,9% |
| `domain` | 98,0% (289/295) | 83,8% |
| `security` | 86,7% (111/128) | 76,9% |
| `dto` | 95,0% (38/40) | 66,7% |
| `exception` | 100% (78/78) | 100% |
| `mapper` | 100% (44/44) | 50,0% |
| `validation` | 100% (42/42) | 97,1% |
| `config` | 81,8% (9/11) | — |

**Diễn giải:** coverage cao nhưng **không** chứng minh chất lượng. Controller đạt 98,8% line trong khi hợp đồng lỗi vẫn sai (CV-03) và hai endpoint chỉ được assert status. Gate hiện tại (LINE ≥ 0,50) quá thấp để có ý nghĩa nghiệm thu. Vì vậy báo cáo này đánh giá 8 trục độc lập ở §6.

### 3.3 Tính độc lập và lặp lại

- 3 lần chạy full suite (2 lần cùng thứ tự, 1 lần random seed `20261109`) đều cho **cùng kết quả 338/0/0/1**.
- 2 class chạy **riêng lẻ** đều PASS (`AuthApiTest` 25, `AccessControlTest` 20) → không phụ thuộc thứ tự hay dữ liệu của class khác.
- Mỗi test DB chạy trong transaction riêng và rollback; container PostgreSQL tạo mới mỗi JVM.
- Phụ thuộc ngoài: Docker (Testcontainers) bắt buộc; Mailpit chỉ cần cho 1 test và test **tự SKIP** nếu Mailpit không chạy (`assumeTrue`). Lần chạy này Mailpit bật nên test PASS thật.

Chi tiết: [`REGRESSION_TEST_RESULTS.md`](REGRESSION_TEST_RESULTS.md).

---

## 4. Tổng hợp theo API module

39 endpoint / 6 controller. Không có `DELETE`.

| Module | Endpoint | Test HTTP chính | Kết quả | Phát hiện nổi bật |
|---|---:|---|---|---|
| **M1 — Identity & session** (`AuthController`, `EmailVerificationController`, `UserController` phần `/me`) | 12 | `AuthApiTest` 25, `GoogleLoginTest` 11, `ReaderOnboardingWorkflowTest` 6, `AccountRecoveryWorkflowTest` 4, `InputSecurityTest` | 0 fail | DF-01 register không nguyên tử; DF-03/AC-01 token còn hạn sau đổi mật khẩu; AC-02 sau logout; CV-12; CV-19 |
| **M2 — Book catalog** (`PublicBookController`, `AdminBookController`) | 9 | `BookServiceImplTest` 12, `BookDomainTest` 8, `ApiDatabaseConsistencyTest`, `BorrowReturnWorkflowTest`, `FrontendContractTest` | 0 fail | CV-02 mất `previewUrl/readerUrl`; CV-04 body rỗng xoá tồn kho; CV-05 `ggId` không ghi; CV-07/DF-05 PUT bỏ `totalCopies`; DF-02; DF-06; CV-18 |
| **M3 — Loan circulation** (`UserController` phần loans, `AdminLoanController`) | 12 | `LoanServiceImplTest` 13, `LoanDomainTest` 12, `LoanLifecycleTest` 5, `BorrowReturnWorkflowTest` 6, `TransactionBoundaryTest` | 0 fail | DF-04/CV-22; CV-25; R6-F1 không timeout; PB-05 thiếu index |
| **M4 — Admin users** (`AdminUserController`) | 6 | `AdminUserProtectionRulesTest` 10, `AdminUserServiceImplTest` 4, `IdorTest` 10, WF-15/16 | 0 fail | AC-08 dùng 422; CV-17 sort mặc định; `GET /admin/users/{id}` chưa assert body happy path |
| **Xuyên tầng** | — | DB 42 case, security 59, contract 10, input 31, concurrency 2, transaction 11, migration 1 | 0 fail | DF-07 blocker; CV-03; AC-03/AC-04 |

> Số test ở bảng không cộng dồn thành 338 vì một test class có thể phủ nhiều module và các test xuyên tầng được liệt kê riêng.

---

## 5. Endpoint và test case

### 5.1 Endpoint

| Chỉ số | Giá trị |
|---|---:|
| Tổng endpoint | **39** |
| Có ít nhất một test HTTP qua SecurityFilterChain thật | **39/39 (100%)** |
| Có assertion nội dung/dữ liệu ở happy path | **34/39** |
| Chỉ assert status/404/authz (thiếu body happy path) | **5/39**: P2 categories, B1 admin list books, L1 admin list loans, L2 admin loan detail, C2 admin user detail |
| Chưa có test HTTP nào | **0** |

Phase 0 từng ghi 5 endpoint chưa có test HTTP (A1, E1, E2, P2, B1). Sau Phase 2–6, **cả 39 endpoint đều đã được gọi qua filter chain thật**. Khoảng trống còn lại là **độ sâu**, không phải sự tồn tại của test.

### 5.2 Test case

| Kết quả | Số lượng |
|---|---:|
| Tổng | **338** |
| PASS | **337** |
| FAIL | **0** |
| ERROR | **0** |
| SKIPPED | **1** (`LmsApplicationTests`, cần `LMS_IT`) |

Lớp test lớn: `InputSecurityTest` 31, `ControllersWebTest` 26, `AuthApiTest` 25, `AuthServiceTest` 22, `AccessControlTest` 20, `JwtSecurityTest` 18, `ApiDatabaseConsistencyTest` 16, `LoanServiceImplTest` 13, `BookServiceImplTest` 12, `LoanDomainTest` 12, `GoogleLoginTest` 11, `TransactionBoundaryTest` 11, `IdorTest` 10, `FrontendContractTest` 10, `AdminUserProtectionRulesTest` 10.

Ma trận 39 endpoint: [`API_QUALITY_SCORECARD.md`](API_QUALITY_SCORECARD.md) §2.

---

## 6. Đánh giá 8 trục (không dựa vào coverage)

Điểm có trọng số; thang 0–10 cho từng trục. Đây là đánh giá của QA Lead dựa trên bằng chứng, **không phải chuẩn công nghiệp đã thống nhất**.

| # | Trục | Trọng số | Điểm | Căn cứ |
|---|---|---:|---:|---|
| 1 | API inventory coverage | 10 | **9** | 39/39 endpoint có test HTTP; 5 endpoint thiếu body happy path |
| 2 | Functional test coverage | 20 | **14** | 338 test, 27 workflow E2E; nhưng Q1–Q12 business rule chưa chốt, 5 endpoint phủ mỏng |
| 3 | Response contract compliance | 15 | **6** | 1 CRITICAL (CV-03), 2 HIGH mất dữ liệu (CV-02, CV-04), 1 HIGH `ggId` (CV-05), 11 MEDIUM |
| 4 | Database consistency | 15 | **10** | 42/42 case PASS, borrow/return/lost/recover đúng; DF-01, DF-02, DF-05, DF-06, DF-07 còn mở |
| 5 | Authentication/authorization | 15 | **11** | 27 endpoint 401 đúng, 20 endpoint admin 403 đúng, 10 IDOR test không lộ dữ liệu; AC-01…AC-04 mở |
| 6 | E2E workflow coverage | 10 | **8** | 27/27 workflow PASS kèm bằng chứng DB; chưa chạy browser thật, Google thật, Tomcat thật |
| 7 | Performance | 10 | **4** | Search 6,9 RPS, P99 5,47 s; N+1; pool 10; không có SLA để so |
| 8 | Reliability | 5 | **2** | DB down → chờ 30 s rồi 500; không timeout lock; SMTP lỗi để lại user mồ côi |
| | **Tổng** | **100** | **64/100** | **NOT READY** |

Ngưỡng đề xuất để được `READY WITH RISKS`: ≥ 80/100 **và** không còn blocker/critical **và** các tiêu chí bắt buộc ở [`RELEASE_READINESS.md`](RELEASE_READINESS.md) đạt.

### 6.1 Response

- Các response chính đã được chốt key set: login (`accessToken, refreshToken, user`), `LoanDto` 11 field, `ManagedUser` 7 field, `BookResponse` 19 field frontend dùng, `Page` 4 field.
- Lỗi nghiệp vụ chuẩn `ApiError` (status, code, message, timestamp, fieldErrors) cho 400 validation/401/403/404/409/422.
- **Chưa đạt:** lỗi sai kiểu tham số/đường dẫn (400) và 415/500 không theo `ApiError`; 403 mang 3 nghĩa; message trộn Việt/Anh; `PageImpl` serialize trực tiếp (cảnh báo của Spring).

### 6.2 Dữ liệu

- 42/42 case Phase 3 PASS: borrow nguyên tử, trả 2 bước, lost/recover đối xứng, không oversell dưới 5 request đồng thời.
- **Chưa đạt:** register commit user trước khi gửi mail (DF-01); lost update tồn kho (DF-02); PUT bỏ `totalCopies` (DF-05); cho `totalCopies` nhỏ hơn số đang mượn (DF-06, chưa test); Flyway không chạy được (DF-07).

### 6.3 Bảo mật

- Không phát hiện SQL injection ở 7 điểm kiểm tra; bind parameter + allowlist sort.
- Không liệt kê user qua login; không lộ hash/JWT subject/stack trace/SQL/host.
- 10 test IDOR: không truy cập tài nguyên người khác; admin 403 trước khi xử lý nghiệp vụ.
- **Chưa đạt:** token còn hiệu lực sau đổi mật khẩu/logout (AC-01/02); Swagger public (AC-03); không rate limit login — 1.238 lần/12 s không 429 (AC-04); không giới hạn body ở tầng app.

### 6.4 Hiệu năng

- 2 lượt load: **110.235 request, 0 lỗi 5xx**; detail 1.651 RPS; login 102 RPS/P50 95 ms.
- Search: **6,9 RPS**, P50 2.143 ms, **P99 5,47 s**, plan Seq Scan 10.000 dòng; trang sâu 400: 47,1 RPS; pool tối đa 10 connection.
- Không có SLA nên **không thể kết luận "đạt"**. Với catalog là chức năng chính, P99 > 5 s được xem là rủi ro HIGH.

### 6.5 Độ tin cậy

- DB down: mỗi request chờ **30 s** rồi 500, không circuit breaker.
- SMTP down: register trả 503 nhưng user vẫn được commit (DF-01).
- Lock contention: chờ **5,12 s**, không `statement_timeout`/`lock_timeout`.
- Không có Actuator health; `/actuator/health` trả 401.

---

## 7. Những hành vi đã được chứng minh là đúng

- 27/27 workflow E2E PASS với bằng chứng DB (OTP, mượn/trả/mất, reset mật khẩu, suspend/reactivate, promote/demote, email thật qua Mailpit).
- Refresh token rotation có reuse detection cấp family.
- Trả sách 2 bước đúng; reject-return giữ nguyên `due_at`; lost/recover đối xứng.
- Hết bản sao trả 422 và không để lại loan rác.
- Suspend/reactivate và promote/demote có hiệu lực ngay với access token đang tồn tại.
- Không bypass phân quyền, không IDOR, không SQL injection ở các điểm đã kiểm.
- Chống oversell đúng dưới 5 request đồng thời.

---

## 8. NOT TESTED / giới hạn

| # | Hạng mục | Ảnh hưởng |
|---|---|---|
| 1 | Khởi động app với profile production + Flyway trên DB trống | Chỉ chứng minh qua `MigrationIntegrityTest` (Flyway API), chưa chạy `spring-boot:run` prod |
| 2 | Google ID token thật | `GoogleIdTokenVerifier` bị mock; chưa kiểm chứng client-id/audience thật |
| 3 | Tomcat/HTTP thật | MockMvc bỏ qua connector: body limit, header limit, timeout, HTTP/2, TLS |
| 4 | UI trình duyệt (2 web) | Chỉ kiểm hợp đồng TypeScript, chưa render/Playwright |
| 5 | SMTP auth/TLS, email HTML | Mailpit dev không auth; email text thuần |
| 6 | Dataset lớn hơn 10.000 sách / 21.200 loan | Chưa kiểm chứng scale |
| 7 | DAST/pentest đầy đủ | Chỉ black-box có mục tiêu |
| 8 | Business rule Q1–Q12 | Chưa có owner chốt (xem `REMAINING_RISKS.md` §5) |
| 9 | Tài liệu Phase 2 | Không có thư mục `docs/qa/phase-2/`; test tồn tại nhưng không có báo cáo riêng |

---

## 9. Điều kiện phát hành lại

Tối thiểu phải đạt:

1. Sửa **DF-07**: đổi version một migration V5; chạy Flyway trên DB trống; khởi động profile production thành công.
2. Sửa **CV-03**: handler cho `MethodArgumentTypeMismatchException`, `HttpMediaTypeNotSupportedException`, `DataAccessException` → `ApiError` có `code`.
3. Sửa **CV-02, CV-04, CV-05, CV-07/DF-05**: không bỏ im lặng dữ liệu client gửi; không cho body rỗng xoá tồn kho.
4. Sửa **DF-01**: register nguyên tử hoặc có compensation/retry; thêm regression test đảo chiều test hiện tại.
5. Quyết định **AC-03/AC-04** (tắt Swagger ở prod, rate limit login) và ghi nhận **AC-01/AC-02** nếu chấp nhận rủi ro 15 phút.
6. Fix **CV-14** (test cũ) và bổ sung assert body cho **P2, B1, L1, L2, C2**.
7. Lập kế hoạch hiệu năng cho **PB-01…PB-04** hoặc chấp nhận có văn bản.
8. Chạy lại `clean verify`, random order và 2 class độc lập; cập nhật 6 tài liệu này.

Chi tiết tiêu chí và kế hoạch: [`RELEASE_READINESS.md`](RELEASE_READINESS.md).

---

## 10. Chỉ mục bằng chứng

| Bằng chứng | Vị trí |
|---|---|
| Build + test + coverage | `/tmp/lms-verify.log`, `target/surefire-reports/`, `target/site/jacoco/jacoco.csv` |
| Random order | `/tmp/lms-random.log` (seed `20261109`) |
| Test riêng lẻ | `/tmp/lms-AuthApiTest.log`, `/tmp/lms-AccessControlTest.log` |
| 42 case dữ liệu | `docs/qa/phase-3/DATA_INTEGRITY_RESULTS.md` |
| 59 test bảo mật | `docs/qa/phase-4/` |
| 27 workflow E2E | `docs/qa/phase-5/E2E_TEST_RESULTS.md` |
| Hiệu năng/độ tin cậy | `docs/qa/phase-6/` |
| Danh sách lỗi | [`BUG_SUMMARY.md`](BUG_SUMMARY.md) |
| Ma trận endpoint | [`API_QUALITY_SCORECARD.md`](API_QUALITY_SCORECARD.md) |
| Regression | [`REGRESSION_TEST_RESULTS.md`](REGRESSION_TEST_RESULTS.md) |
| Rủi ro | [`REMAINING_RISKS.md`](REMAINING_RISKS.md) |
| Quyết định phát hành | [`RELEASE_READINESS.md`](RELEASE_READINESS.md) |
