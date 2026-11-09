# API QUALITY SCORECARD — LMS (Phase 7)

- **Ngày:** 2026-11-09
- **Nguồn:** Phase 0–6 + lần chạy Phase 7 (`clean verify`, random order, test độc lập)
- **Nguyên tắc:** điểm được cho theo **bằng chứng test/đo lường**, không suy ra từ coverage. Thang mỗi trục 0–10, có trọng số.

---

## 1. Điểm tổng hợp

| # | Trục | Trọng số | Điểm | Điểm có trọng số | Kết luận |
|---|---|---:|---:|---:|---|
| 1 | API inventory coverage | 10 | 9 | 9,0 | Đạt |
| 2 | API functional test coverage | 20 | 14 | 14,0 | Chưa đạt |
| 3 | Response contract compliance | 15 | 6 | 6,0 | **Không đạt** |
| 4 | Database consistency | 15 | 10 | 10,0 | Chưa đạt |
| 5 | Authentication/authorization | 15 | 11 | 11,0 | Chưa đạt |
| 6 | E2E workflow coverage | 10 | 8 | 8,0 | Đạt có giới hạn |
| 7 | Performance | 10 | 4 | 4,0 | **Không đạt** |
| 8 | Reliability | 5 | 2 | 2,0 | **Không đạt** |
| | **Tổng** | **100** | | **64,0/100** | **NOT READY** |

Ngưỡng đề xuất: `READY WITH RISKS` cần ≥ 80/100, không còn blocker/critical, và đạt mọi tiêu chí bắt buộc trong [`RELEASE_READINESS.md`](RELEASE_READINESS.md).

> Trọng số do QA Lead đặt cho bối cảnh đồ án/LMS, không phải chuẩn đã được khách hàng phê duyệt. Nếu thay đổi trọng số, kết luận NOT READY không đổi vì còn blocker DF-07 và critical CV-03.

---

## 2. Ma trận 39 endpoint

Ký hiệu mức phủ:

- **●** — có test HTTP qua filter chain thật + assertion nội dung/dữ liệu hoặc nhánh lỗi ở happy path.
- **◐** — chỉ assert status/404/authz; **thiếu** assertion body happy path.
- **Mock** — có test nhưng biên giới ngoài (Google) bị mock.

| Mã | Method & path | Module | Bằng chứng test | Mức phủ | Ghi chú |
|---|---|---|---|---|---|
| A1 | POST `/api/v1/public/auth/google` | M1 | `GoogleLoginTest` 11, `AuthApiTest` 3, `AccessControlTest` | Mock | Chưa có Google token thật |
| A2 | POST `/api/v1/public/auth/refresh` | M1 | `AuthApiTest` 6, `ReaderOnboardingWorkflowTest`, `AccountRecoveryWorkflowTest`, `JwtSecurityTest` | ● | Rotation + reuse detection |
| A3 | POST `/api/v1/public/auth/logout` | M1 | `AuthApiTest` 3, `ReaderOnboardingWorkflowTest` | ● | 204; AC-02 còn mở |
| A4 | POST `/api/v1/public/auth/password-reset/request` | M1 | `AuthApiTest` 4, `AccountRecoveryWorkflowTest` | ● | Cooldown |
| A5 | POST `/api/v1/public/auth/password-reset/confirm` | M1 | `AuthApiTest` 4, `AccountRecoveryWorkflowTest` | ● | DF-03 |
| A6 | POST `/api/v1/public/auth/register` | M1 | `AuthApiTest` 8, `MailpitEmailWorkflowTest`, `InputSecurityTest` | ● | DF-01 |
| A7 | POST `/api/v1/public/auth/login` | M1 | `AuthApiTest` 13, `InputSecurityTest` | ● | AC-04 |
| E1 | POST `/api/v1/public/auth/email-verification/confirm` | M1 | `ReaderOnboardingWorkflowTest` 2, `MailpitEmailWorkflowTest`, `TransactionBoundaryTest` | ● | OTP + token |
| E2 | POST `/api/v1/public/auth/email-verification/resend` | M1 | `ReaderOnboardingWorkflowTest`, `MailpitEmailWorkflowTest` | ● | CV-09 |
| U1 | GET `/api/v1/users/me` | M1 | `AccessControlTest`, `InputSecurityTest`, `FrontendContractTest`, e2e | ● | |
| U2 | PATCH `/api/v1/users/me` | M1 | `ReaderOnboardingWorkflowTest` WF-01, `ApiDatabaseConsistencyTest`, `InputSecurityTest` | ● | Trim + DB |
| U3 | POST `/api/v1/users/me/password` | M1 | `ReaderOnboardingWorkflowTest` WF-04, `ApiDatabaseConsistencyTest` | ● | DF-03 |
| P1 | GET `/api/v1/public/books` | M2 | `InputSecurityTest` 11, `FrontendContractTest`, `BorrowReturnWorkflowTest`, `ApiDatabaseConsistencyTest` | ● | CV-18/PB-01 |
| P2 | GET `/api/v1/public/books/categories` | M2 | `AccessControlTest` (chỉ 200) | ◐ | Không assert nội dung/order/RETIRED |
| P3 | GET `/api/v1/public/books/{bookId}` | M2 | `FrontendContractTest` WF-21, `BorrowReturnWorkflowTest` WF-12 | ● | CV-06 |
| B1 | GET `/api/v1/admin/books` | M2 | `AccessControlTest` (200/401/403) | ◐ | Không assert page/filter |
| B2 | POST `/api/v1/admin/books` | M2 | `ControllersWebTest`, `AccessControlTest`, `ApiDatabaseConsistencyTest`, `FrontendContractTest` | ● | CV-02, CV-05 |
| B3 | PUT `/api/v1/admin/books/{bookId}` | M2 | `ControllersWebTest`, `ApiDatabaseConsistencyTest`, `FrontendContractTest` WF-22 | ● | CV-02, CV-07 |
| B4 | PATCH `/api/v1/admin/books/{bookId}/copies` | M2 | `ControllersWebTest`, `ApiDatabaseConsistencyTest`, `ConcurrentUpdateTest` | ● | CV-04, DF-02, DF-06 |
| B5 | POST `/api/v1/admin/books/{bookId}/retire` | M2 | `ControllersWebTest`, `BorrowReturnWorkflowTest` WF-11 | ● | |
| B6 | POST `/api/v1/admin/books/{bookId}/activate` | M2 | `ControllersWebTest`, `BorrowReturnWorkflowTest` WF-11 | ● | |
| L1 | GET `/api/v1/admin/loans` | M3 | `AccessControlTest`, `ControllersWebTest` | ◐ | Không assert nội dung page |
| L2 | GET `/api/v1/admin/loans/{loanId}` | M3 | `ApiDatabaseConsistencyTest` (404), `AccessControlTest`, `ControllersWebTest` | ◐ | Thiếu body happy path |
| L3 | GET `/api/v1/admin/users/{userId}/loans` | M3 | `BorrowReturnWorkflowTest` WF-10, `IdorTest` | ● | DF-04 |
| L4 | POST `/api/v1/admin/loans/{loanId}/return` | M3 | `ApiDatabaseConsistencyTest`, `BorrowReturnWorkflowTest` | ● | Kho tăng đúng |
| L5 | POST `/api/v1/admin/loans/{loanId}/reject-return` | M3 | `BorrowReturnWorkflowTest` WF-08 | ● | `due_at` giữ nguyên |
| L6 | POST `/api/v1/admin/loans/{loanId}/lost` | M3 | `BorrowReturnWorkflowTest` WF-09 | ● | |
| L7 | POST `/api/v1/admin/loans/{loanId}/recover` | M3 | `BorrowReturnWorkflowTest` WF-09 | ● | |
| L8 | POST `/api/v1/admin/loans/mark-overdue` | M3 | `TransactionBoundaryTest` 2, `ControllersWebTest` | ● | `updated` khớp DB |
| U4 | GET `/api/v1/users/me/loans` | M3 | `FrontendContractTest` WF-26, `InputSecurityTest`, `AccessControlTest` | ● | Clamp 100 |
| U5 | POST `/api/v1/users/me/loans` | M3 | `BorrowReturnWorkflowTest` WF-07/10, `ConcurrentUpdateTest` | ● | Không oversell |
| U6 | POST `/api/v1/users/me/loans/{loanId}/return` | M3 | `BorrowReturnWorkflowTest` WF-07/08 | ● | 2 bước |
| U7 | POST `/api/v1/users/me/loans/{loanId}/renew` | M3 | `BorrowReturnWorkflowTest` WF-08, `ControllersWebTest` | ● | |
| C1 | GET `/api/v1/admin/users` | M4 | `FrontendContractTest` WF-20, `AccountRecoveryWorkflowTest` | ● | 7 key `ManagedUser` |
| C2 | GET `/api/v1/admin/users/{userId}` | M4 | `ApiDatabaseConsistencyTest` 404, `IdorTest` 403, `ControllersWebTest` 200 | ◐ | Thiếu body happy path |
| C3 | POST `/api/v1/admin/users/{userId}/suspend` | M4 | `AccountRecoveryWorkflowTest` WF-15 | ● | 422 tự suspend |
| C4 | POST `/api/v1/admin/users/{userId}/reactivate` | M4 | WF-15 | ● | |
| C5 | POST `/api/v1/admin/users/{userId}/promote` | M4 | WF-16 | ● | |
| C6 | POST `/api/v1/admin/users/{userId}/demote` | M4 | WF-16 | ● | 422 tự demote |

**Tổng hợp ma trận:** ● 33, ◐ 5, Mock 1 → **39/39 endpoint có test HTTP**, **5 endpoint thiếu body happy path**, **1 endpoint phụ thuộc mock Google**.

---

## 3. Chi tiết từng trục

### 3.1 API inventory coverage — 9/10

- 39 endpoint / 6 controller khớp `API_INVENTORY.md`; không có endpoint mồ côi.
- 39/39 được gọi trong test HTTP thật (không còn endpoint chỉ tồn tại trên giấy).
- Trừ 1 điểm vì 5 endpoint chỉ được assert status/404/authz và Phase 0 từng ghi 5 endpoint chưa test — khoảng trống đã thu hẹp nhưng chưa đóng hoàn toàn về chiều sâu.

### 3.2 Functional test coverage — 14/20

- 338 test, 37 class, 0 fail; 27 workflow E2E; 42 case DB; 31 test input; 59 test bảo mật.
- Phủ đủ các luồng chính: đăng ký/xác minh, đăng nhập/refresh/logout, reset mật khẩu, mượn/trả/mất, quản trị sách, quản trị user.
- Trừ 6 điểm:
  - 5 endpoint thiếu assertion body happy path.
  - Business rule Q1–Q12 (giới hạn sách đang mượn, có cho retire sách đang mượn, quy tắc renew…) **chưa được chủ sản phẩm chốt** nên không thể coi là "đúng".
  - Không có báo cáo Phase 2 độc lập dù test tồn tại.
  - Chưa có UI/browser test; hợp đồng frontend chỉ kiểm bằng key set.

### 3.3 Response contract compliance — 6/15

Đã chốt bằng test: key set login, `LoanDto` 11 field, `ManagedUser` 7 field, `BookResponse`, `Page` 4 field, `ApiError` cho nghiệp vụ.

Chưa đạt:

| Mức | Vi phạm | Bằng chứng |
|---|---|---|
| CRITICAL | 400 sai kiểu/đường dẫn, 415, 500 không có `code` | CV-03; `InputSecurityTest` thấy body 415 rỗng |
| HIGH | `previewUrl`/`readerUrl` nhận rồi bỏ | WF-21/22: response không có 2 field, DB không đổi |
| HIGH | PATCH copies `{}` → 0/0 | CV-04; DTO dùng `int` primitive |
| HIGH | `ggId` validate nhưng không ghi | CV-05; grep `updateGgId` không có usage |
| MEDIUM | 403 ba nghĩa, `PageImpl` trực tiếp, sort mặc định ASC, message trộn ngôn ngữ… | CV-01/10/13/17 |

Vì còn 1 CRITICAL và 2 HIGH mất dữ liệu, trục này không thể đạt.

### 3.4 Database consistency — 10/15

- 42/42 case Phase 3 PASS; số bản sách, trạng thái loan, `returned_at`, `due_at`, `borrow_count` được đối chiếu DB.
- Borrow/return/lost/recover nguyên tử dưới test; 5 request đồng thời không oversell.
- Trừ 5 điểm do:
  - **DF-07:** Flyway không migrate được (blocker).
  - **DF-01:** register commit user trước khi gửi mail.
  - **DF-02:** lost update tồn kho (không `@Version`).
  - **DF-05/DF-06:** PUT bỏ `totalCopies`; cho `totalCopies` nhỏ hơn số đang mượn.

### 3.5 Authentication/authorization — 11/15

- 27 endpoint protected trả 401 khi thiếu token; 20 endpoint admin trả 403 với USER.
- 10 test IDOR không lộ dữ liệu; admin 403 trước khi xử lý nghiệp vụ.
- Không phát hiện bypass.
- Trừ 4 điểm:
  - AC-01/AC-02: access token còn hiệu lực 15 phút sau đổi mật khẩu/logout.
  - AC-03: Swagger/OpenAPI public.
  - AC-04: không rate limit login (1.238 lần/12 s).
  - AC-08: 422 thay vì 403/409 cho tự bảo vệ admin.

### 3.6 E2E workflow coverage — 8/10

- 27/27 workflow PASS, có bằng chứng DB; email thật qua Mailpit.
- Trừ 2 điểm: chưa chạy browser thật, Google token thật, Tomcat/HTTP thật; chưa test mobile/accessibility.

### 3.7 Performance — 4/10

- Tích cực: 110.235 request, 0 lỗi 5xx; detail 1.651 RPS; login 102 RPS/P50 95 ms.
- Không đạt:
  - Search 6,9 RPS, P99 **5,47 s**, Seq Scan 10.000 dòng (PB-01).
  - N+1 `2 + 2×size` statement/request (PB-02).
  - Trang sâu 400: 47,1 RPS, sort tràn disk 3.272 kB (PB-03).
  - Pool 10 connection, `pg_stat_activity.active` chạm trần (PB-04).
  - Không có SLA để tuyên bố "đạt".

### 3.8 Reliability — 2/5

- DB down: 30 s timeout mỗi request rồi 500, không circuit breaker.
- Không `statement_timeout`/`lock_timeout`; đo lock wait 5,12 s.
- SMTP lỗi: 503 nhưng user vẫn commit (DF-01); không timeout SMTP.
- Không Actuator health để giám sát.

---

## 4. Điều kiện cải thiện điểm

| Hành động | Trục tăng | Ước tính |
|---|---|---|
| Sửa DF-07 + test khởi động prod | DB + inventory | +3 |
| Sửa CV-03 + CV-02/04/05/07 | Contract | +5 |
| Sửa DF-01/02/05/06 + regression test | DB | +3 |
| AC-03/AC-04 + quyết định AC-01/02 | Auth | +2 |
| Assert body 5 endpoint + fix CV-14 | Functional | +3 |
| Xử lý PB-01…PB-04 hoặc SLA chấp nhận | Performance | +3 |
| Timeout DB/SMTP + map 503 | Reliability | +2 |

Mức tăng chỉ là ước lượng để lập kế hoạch; phải chạy lại và đo lại trước khi tuyên bố đạt.
