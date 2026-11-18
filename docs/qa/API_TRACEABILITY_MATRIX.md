# Ma trận đối chiếu API — source, OpenAPI và test HTTP

- **OpenAPI runtime:** `http://localhost:8080/v3/api-docs` trả HTTP 200; 51 path, 57 operation.
- **Môi trường test:** Java 25.0.5, Maven Wrapper của dự án.

## Kết quả đối chiếu

| Đối chiếu | Kết quả |
|---|---:|
| Mapping trong controller source | **57** |
| Operation trong OpenAPI runtime | **57** trên 51 path |
| Chỉ có trong source / chỉ có trong OpenAPI | **0 / 0** |
| Operation có ít nhất một lời gọi MockMvc sau cập nhật | **57/57** |
| Operation chưa thấy test HTTP | **0/57** |
| Targeted controller test (`MissingControllerRoutesWebTest,ControllersWebTest`) | **39 chạy, 39 đạt, 0 lỗi** |
| Toàn bộ Maven test suite (chạy ngoài sandbox, 18/11/2026) | **200 chạy, 0 failure, 0 error, 1 bỏ qua; BUILD SUCCESS** |

## Danh sách 57 operation

Mỗi operation dưới đây có ít nhất một request MockMvc trong test source. Các test gọi controller qua `MockMvcBuilders.standaloneSetup` và mock service, nên không kiểm tra filter chain, connector HTTP thật hoặc database.

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

## Cách tái lập

Tải `/v3/api-docs`, đọc mapping annotation trên 12 controller (ghép class-level và method-level path), chuẩn hóa biến path thành `{}`, rồi so khớp theo `METHOD + PATH`. Với test inventory, chỉ tính request builder trong `MockMvc.perform`; test gọi service/repository không được tính là test HTTP.

Toàn suite trong sandbox từng không khởi tạo được Mockito inline mock maker vì JVM không cho self-attach. Khi chạy ngoài sandbox ngày 18/11/2026, `bash ./mvnw test` hoàn tất 200 test với 0 failure, 0 error và 1 skipped. Mockito phát cảnh báo dynamic agent loading trên Java 25.
