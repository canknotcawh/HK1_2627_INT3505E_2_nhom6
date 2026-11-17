# Ma trận đối chiếu API — source, OpenAPI và test HTTP

- **Ngày kiểm tra:** 18/11/2026 (Asia/Bangkok)
- **Revision source:** `a53ef43` (nhánh `feature/account-manager`)
- **OpenAPI runtime:** `http://localhost:8080/v3/api-docs` trả HTTP 200; 51 path, 57 operation.
- **Phạm vi test:** tìm request `MockMvc.perform(...)` trong test source; đã thêm 13 request test còn thiếu và chạy targeted suite. Đây là HTTP-level controller test, không đồng nghĩa kiểm thử qua SecurityFilterChain hoặc server thật.
- **Môi trường test:** Java 25.0.5, Maven Wrapper của dự án. Toàn suite chưa chạy được ổn định do Mockito inline mock maker không tự attach được agent trong môi trường chạy; chi tiết bên dưới.

## Kết quả đối chiếu

| Đối chiếu | Kết quả |
|---|---:|
| Mapping trong controller source | **57** |
| Operation trong OpenAPI runtime | **57** trên 51 path |
| Chỉ có trong source / chỉ có trong OpenAPI | **0 / 0** |
| Operation có ít nhất một lời gọi MockMvc sau cập nhật | **57/57** |
| Operation chưa thấy test HTTP | **0/57** |
| Targeted controller test (`MissingControllerRoutesWebTest,ControllersWebTest`) | **39 chạy, 39 đạt, 0 lỗi** |
| Toàn bộ Maven test suite | **200 chạy, 143 lỗi khởi tạo Mockito, 0 assertion failure, 1 bỏ qua** |

Đếm cũ ra 56 vì bỏ sót annotation viết đủ package `@org.springframework.web.bind.annotation.PatchMapping("/me")` trong `UserController`. Operation tương ứng là `PATCH /api/v1/users/me`; OpenAPI và source thực tế khớp nhau ở 57 operation.

## Danh sách 57 operation

Ký hiệu test: **Có** = có request MockMvc trong test source; **Chưa thấy** = không tìm thấy request HTTP cho method/path. Với các dòng “Có”, test gọi controller qua `MockMvcBuilders.standaloneSetup` và mock service, nên không kiểm tra filter chain, connector HTTP thật hoặc database.

| # | Method | Path | Controller | Test HTTP hiện có | Bằng chứng / ghi chú |
|---:|---|---|---|---|---|
| 1 | `DELETE` | `/api/v1/admin/categories/{id}` | `AdminCategoryController` | Có — `MissingControllerRoutesWebTest` | Targeted suite: pass; standalone MockMvc, service mock. |
| 2 | `DELETE` | `/api/v1/admin/reviews/{reviewId}` | `AdminBookReviewController` | Có — `BookReviewControllersWebTest` | MockMvc standalone; service được mock. |
| 3 | `DELETE` | `/api/v1/reviews/{reviewId}` | `BookReviewController` | Có — `BookReviewControllersWebTest` | MockMvc standalone; service được mock. |
| 4 | `GET` | `/api/v1/admin/books` | `AdminBookController` | Có — `MissingControllerRoutesWebTest` | Targeted suite: pass; standalone MockMvc, service mock. |
| 5 | `GET` | `/api/v1/admin/categories` | `AdminCategoryController` | Có — `MissingControllerRoutesWebTest` | Targeted suite: pass; standalone MockMvc, service mock. |
| 6 | `GET` | `/api/v1/admin/loans` | `AdminLoanController` | Có — `ControllersWebTest` | MockMvc standalone; service được mock. |
| 7 | `GET` | `/api/v1/admin/loans/{loanId}` | `AdminLoanController` | Có — `ControllersWebTest` | MockMvc standalone; service được mock. |
| 8 | `GET` | `/api/v1/admin/reviews` | `AdminBookReviewController` | Có — `MissingControllerRoutesWebTest` | Targeted suite: pass; standalone MockMvc, service mock. |
| 9 | `GET` | `/api/v1/admin/stats/overview` | `AdminStatsController` | Có — `MissingControllerRoutesWebTest` | Targeted suite: pass; standalone MockMvc, service mock. |
| 10 | `GET` | `/api/v1/admin/users` | `AdminUserController` | Có — `ControllersWebTest` | MockMvc standalone; service được mock. |
| 11 | `GET` | `/api/v1/admin/users/{userId}` | `AdminUserController` | Có — `ControllersWebTest` | MockMvc standalone; service được mock. |
| 12 | `GET` | `/api/v1/admin/users/{userId}/loans` | `AdminLoanController` | Có — `ControllersWebTest` | MockMvc standalone; service được mock. |
| 13 | `GET` | `/api/v1/books/{bookId}/reviews/eligibility` | `BookReviewController` | Có — `BookReviewControllersWebTest` | MockMvc standalone; service được mock. |
| 14 | `GET` | `/api/v1/books/{bookId}/reviews/me` | `BookReviewController` | Có — `BookReviewControllersWebTest` | MockMvc standalone; service được mock. |
| 15 | `GET` | `/api/v1/public/books` | `PublicBookController` | Có — `ControllersWebTest` | Đã sửa stub sang overload 4 tham số; targeted suite: pass. |
| 16 | `GET` | `/api/v1/public/books/categories` | `PublicBookController` | Có — `MissingControllerRoutesWebTest` | Targeted suite: pass; standalone MockMvc, service mock. |
| 17 | `GET` | `/api/v1/public/books/{bookId}` | `PublicBookController` | Có — `ControllersWebTest` | MockMvc standalone; service được mock. |
| 18 | `GET` | `/api/v1/public/books/{bookId}/reviews` | `PublicBookReviewController` | Có — `BookReviewControllersWebTest` | MockMvc standalone; service được mock. |
| 19 | `GET` | `/api/v1/public/books/{bookId}/reviews/stats` | `PublicBookReviewController` | Có — `BookReviewControllersWebTest` | MockMvc standalone; service được mock. |
| 20 | `GET` | `/api/v1/users/me` | `UserController` | Có — `ControllersWebTest` | MockMvc standalone; service được mock. |
| 21 | `GET` | `/api/v1/users/me/loans` | `UserController` | Có — `ControllersWebTest` | MockMvc standalone; service được mock. |
| 22 | `GET` | `/api/v1/users/me/reviews` | `BookReviewController` | Có — `MissingControllerRoutesWebTest` | Targeted suite: pass; standalone MockMvc, service mock. |
| 23 | `PATCH` | `/api/v1/admin/books/{bookId}/copies` | `AdminBookController` | Có — `ControllersWebTest` | MockMvc standalone; service được mock. |
| 24 | `PATCH` | `/api/v1/admin/reviews/{reviewId}/hide` | `AdminBookReviewController` | Có — `BookReviewControllersWebTest` | MockMvc standalone; service được mock. |
| 25 | `PATCH` | `/api/v1/admin/reviews/{reviewId}/restore` | `AdminBookReviewController` | Có — `BookReviewControllersWebTest` | MockMvc standalone; service được mock. |
| 26 | `PATCH` | `/api/v1/users/me` | `UserController` | Có — `ControllersWebTest` | MockMvc standalone; service được mock. |
| 27 | `POST` | `/api/v1/admin/books` | `AdminBookController` | Có — `ControllersWebTest` | MockMvc standalone; service được mock. |
| 28 | `POST` | `/api/v1/admin/books/{bookId}/activate` | `AdminBookController` | Có — `ControllersWebTest` | MockMvc standalone; service được mock. |
| 29 | `POST` | `/api/v1/admin/books/{bookId}/retire` | `AdminBookController` | Có — `ControllersWebTest` | MockMvc standalone; service được mock. |
| 30 | `POST` | `/api/v1/admin/categories` | `AdminCategoryController` | Có — `MissingControllerRoutesWebTest` | Targeted suite: pass; standalone MockMvc, service mock. |
| 31 | `POST` | `/api/v1/admin/categories/{id}/merge` | `AdminCategoryController` | Có — `MissingControllerRoutesWebTest` | Targeted suite: pass; standalone MockMvc, service mock. |
| 32 | `POST` | `/api/v1/admin/loans/mark-overdue` | `AdminLoanController` | Có — `ControllersWebTest` | MockMvc standalone; service được mock. |
| 33 | `POST` | `/api/v1/admin/loans/{loanId}/lost` | `AdminLoanController` | Có — `ControllersWebTest` | MockMvc standalone; service được mock. |
| 34 | `POST` | `/api/v1/admin/loans/{loanId}/recover` | `AdminLoanController` | Có — `ControllersWebTest` | MockMvc standalone; service được mock. |
| 35 | `POST` | `/api/v1/admin/loans/{loanId}/reject-return` | `AdminLoanController` | Có — `ControllersWebTest` | MockMvc standalone; service được mock. |
| 36 | `POST` | `/api/v1/admin/loans/{loanId}/return` | `AdminLoanController` | Có — `ControllersWebTest` | MockMvc standalone; service được mock. |
| 37 | `POST` | `/api/v1/admin/users/{userId}/demote` | `AdminUserController` | Có — `ControllersWebTest` | MockMvc standalone; service được mock. |
| 38 | `POST` | `/api/v1/admin/users/{userId}/promote` | `AdminUserController` | Có — `ControllersWebTest` | MockMvc standalone; service được mock. |
| 39 | `POST` | `/api/v1/admin/users/{userId}/reactivate` | `AdminUserController` | Có — `ControllersWebTest` | MockMvc standalone; service được mock. |
| 40 | `POST` | `/api/v1/admin/users/{userId}/suspend` | `AdminUserController` | Có — `ControllersWebTest` | MockMvc standalone; service được mock. |
| 41 | `POST` | `/api/v1/books/{bookId}/reviews` | `BookReviewController` | Có — `BookReviewControllersWebTest` | MockMvc standalone; service được mock. |
| 42 | `POST` | `/api/v1/public/auth/email-verification/confirm` | `EmailVerificationController` | Có — `MissingControllerRoutesWebTest` | Targeted suite: pass; standalone MockMvc, service mock. |
| 43 | `POST` | `/api/v1/public/auth/email-verification/resend` | `EmailVerificationController` | Có — `MissingControllerRoutesWebTest` | Targeted suite: pass; standalone MockMvc, service mock. |
| 44 | `POST` | `/api/v1/public/auth/google` | `AuthController` | Có — `MissingControllerRoutesWebTest` | Targeted suite: pass; standalone MockMvc, service mock. |
| 45 | `POST` | `/api/v1/public/auth/login` | `AuthController` | Có — `ControllersWebTest` | MockMvc standalone; service được mock. |
| 46 | `POST` | `/api/v1/public/auth/logout` | `AuthController` | Có — `ControllersWebTest` | MockMvc standalone; service được mock. |
| 47 | `POST` | `/api/v1/public/auth/password-reset/confirm` | `AuthController` | Có — `ControllersWebTest` | MockMvc standalone; service được mock. |
| 48 | `POST` | `/api/v1/public/auth/password-reset/request` | `AuthController` | Có — `ControllersWebTest` | MockMvc standalone; service được mock. |
| 49 | `POST` | `/api/v1/public/auth/refresh` | `AuthController` | Có — `ControllersWebTest` | MockMvc standalone; service được mock. |
| 50 | `POST` | `/api/v1/public/auth/register` | `AuthController` | Có — `ControllersWebTest` | MockMvc standalone; service được mock. |
| 51 | `POST` | `/api/v1/users/me/loans` | `UserController` | Có — `ControllersWebTest` | MockMvc standalone; service được mock. |
| 52 | `POST` | `/api/v1/users/me/loans/{loanId}/renew` | `UserController` | Có — `ControllersWebTest` | MockMvc standalone; service được mock. |
| 53 | `POST` | `/api/v1/users/me/loans/{loanId}/return` | `UserController` | Có — `ControllersWebTest` | MockMvc standalone; service được mock. |
| 54 | `POST` | `/api/v1/users/me/password` | `UserController` | Có — `ControllersWebTest` | MockMvc standalone; service được mock. |
| 55 | `PUT` | `/api/v1/admin/books/{bookId}` | `AdminBookController` | Có — `ControllersWebTest` | MockMvc standalone; service được mock. |
| 56 | `PUT` | `/api/v1/admin/categories/{id}` | `AdminCategoryController` | Có — `MissingControllerRoutesWebTest` | Targeted suite: pass; standalone MockMvc, service mock. |
| 57 | `PUT` | `/api/v1/reviews/{reviewId}` | `BookReviewController` | Có — `BookReviewControllersWebTest` | MockMvc standalone; service được mock. |

## Giới hạn và việc cần làm

1. **Độ sâu assertion chưa được chấm tự động cho mọi test.** “Có” xác nhận có request MockMvc cùng method/path; cần đọc từng test để phân biệt chỉ assert status với assert body, lỗi và tác động dữ liệu.
2. **Không có bằng chứng SecurityFilterChain cho 44 route này từ hai lớp controller test.** Cả hai lớp dựng controller standalone và gắn principal/security context thủ công. Nếu yêu cầu là kiểm thử HTTP qua security filter chain thật, cần bổ sung lớp integration test tương ứng.
3. Toàn bộ 13 route trước đó thiếu hiện có test trong `MissingControllerRoutesWebTest`; test chạy targeted thành công. Stub sai overload ở `ControllersWebTest.publicSearchAndDetail` đã được sửa và targeted run cũng đạt.
4. Toàn suite `bash ./mvnw test` chạy 200 test nhưng 143 bị lỗi khởi tạo Mockito inline mock maker vì Java 25 không cho phép cơ chế self-attach trong môi trường này; log cho thấy 0 assertion failure và 1 skipped. Vì vậy toàn suite là **BLOCKED**, không được coi là pass hay lỗi chức năng đã xác nhận. Cần chạy lại trong môi trường cho phép attach agent hoặc cấu hình Mockito agent trong build.
5. Test mới dùng standalone MockMvc, service mock và không truy cập DB đang chạy; chúng chứng minh đường đi HTTP controller/request mapping và response assertion, không chứng minh persistence, SecurityFilterChain thật, migration/Flyway, hay hành vi API trên server đang chạy.

**Cách tái lập:** tải `/v3/api-docs`, đọc mapping annotation trên 12 controller (ghép class-level và method-level path), chuẩn hóa biến path thành `{}`, rồi so khớp theo `METHOD + PATH`. Với test inventory, chỉ tính request builder trong `MockMvc.perform`; test gọi service/repository không được tính là test HTTP.
