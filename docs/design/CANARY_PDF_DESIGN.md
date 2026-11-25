# Thiết kế Canary Token cho bản đọc PDF — LMS

- **Ngày:** 2026-11-09
- **Trạng thái:** P0–P1 đã triển khai (`book_file`, storage, upload/quản lý PDF admin); P2 đã triển khai backend + UI cơ bản (canary token, endpoint stream, admin Canary manager, dialog đọc có watermark); P3–P5 còn ở mức thiết kế
- **Phạm vi:** backend `backend/src/lms`, `frontend/main-web`, `frontend/admin-web`
- **Mục tiêu:** mỗi bản PDF được cấp một link có token định danh; khi tài liệu bị lộ, tra ngược được **ai, phiên mượn nào, thời điểm nào** đã nhận bản đó.

> Tài liệu này là kế hoạch. Các tên bảng/endpoint/class là đề xuất, có thể đổi khi triển khai nhưng phải giữ nguyên các quyết định bảo mật ở §5.
>
> **Đã triển khai (P0–P1):** DF-07 đã sửa (`V5__update_book_metadata.sql` → `V5_1__...`); migration `V8__book_files.sql` tạo bảng `book_file` và drop `preview_url`/`reader_url`; storage abstraction `StorageService`/`LocalStorageService` (`app.storage.*`); API `POST/GET/DELETE /api/v1/admin/books/{bookId}/files` (+ `GET .../{fileId}/content`); `BookResponse` trả `hasPreviewFile`/`hasFullFile`; admin-web có khối "Tệp PDF" trong `BookCatalog`. Token canary (`canary_token`, `canary_access`) và endpoint stream vẫn thuộc P2.

---

## 1. Hiện trạng liên quan

| Thành phần | Hiện tại | Ảnh hưởng tới canary |
|---|---|---|
| `Book` entity | Không có `previewUrl`, `readerUrl`; chỉ có `coverImageUrl`, `ggId` | Chưa có chỗ lưu PDF |
| DB `book` | Có cột `preview_url`, `reader_url` từ `B4__complete_schema_after_v4.sql` nhưng entity không map | Cột "mồ côi", không dùng được |
| `BookRequest` / `BookResponse` | Không có 2 field trên | Admin gửi lên bị bỏ im lặng (CV-02) |
| Admin form | Type có `previewUrl/readerUrl`, payload có gửi, **UI không render ô nhập** | Hiện không nhập được; sắp tới thay bằng quản lý file |
| Reader preview | Google Books viewer theo `ggId` (`BookPreviewDialog.tsx`) | Không phải PDF nội bộ, không kiểm soát được |
| Storage | Không có S3/MinIO; chỉ Postgres + Mailpit | Cần abstraction lưu file |
| Flyway | **Hai migration cùng `V5`** (`V5__account_identity_sessions.sql`, `V5__update_book_metadata.sql`) | **Phải sửa trước khi thêm migration mới** (DF-07) |
| Rate limit | Chưa có (AC-04) | Cần cho endpoint cấp/đọc token |
| Swagger | Public (AC-03) | Endpoint canary sẽ lộ schema nếu không tắt ở prod |

**Kết luận hiện trạng:** canary không thể làm chỉ ở frontend. Phải bổ sung 3 thứ còn thiếu: **nơi lưu PDF**, **bảng token**, và **endpoint stream có kiểm quyền**.

---

## 2. Mục tiêu và không mục tiêu

### 2.1 Mục tiêu

1. Admin tải lên **một bản preview** và **một bản đầy đủ** (PDF) cho mỗi sách; thay thế hai ô URL ma.
2. Người đọc có phiên mượn hợp lệ mở được bản đầy đủ qua link **có canary token**.
3. Mỗi lần cấp link gắn với: sách, user, loan, thời điểm, hết hạn.
4. FE hiển thị dấu canary nhìn thấy được (email + mã token rút gọn) để ảnh chụp màn hình cũng mang dấu vết.
5. Admin tra cứu token → ra user/loan/lịch sử truy cập; thu hồi token ngay.
6. Không lộ storage path, không lộ token trong log.

### 2.2 Không mục tiêu (MVP)

- Không phải DRM: **không** chặn được screenshot, quay màn hình, hay người dùng tự gỡ watermark.
- Không chặn tải PDF (người dùng vẫn tải được file họ có quyền đọc).
- Không nhúng watermark vô hình/OCR forensic trong MVP.
- Không phát hiện tự động file bị đăng lên Internet.
- Không thay đổi luồng mượn/trả hiện có.

---

## 3. Kiến trúc đề xuất

```
Admin-web                Backend LMS                         Storage
─────────                ───────────                         ───────
Upload PDF  ──multipart──▶ POST /admin/books/{id}/files ──▶ book_file
                         │  kiểm tra %PDF, size, sha256      (private)
                         ▼
                    BookFileService

Main-web                 Backend LMS
────────                 ───────────
"Đọc sách"  ──POST──────▶ /users/me/books/{id}/access
                         │  kiểm tra loan ACTIVE/OVERDUE/PENDING_RETURN
                         │  sinh token 128-bit, lưu SHA-256
                         ◀── { url: /api/v1/reader/files/cnr_xxx,
                               expiresAt, watermarkText, tokenSuffix }
Mở iframe  ──GET────────▶ /reader/files/cnr_xxx
                         │  hash token → canary_token
                         │  kiểm tra hết hạn/thu hồi/quyền
                         │  ghi canary_access (IP hash, UA hash)
                         ◀── PDF stream (no-store, no-referrer)

Admin-web
"Canary"   ──GET────────▶ /admin/canary-tokens?q=...  → token + user + loan
"Tra cứu"  ──GET────────▶ /admin/canary-tokens/lookup?value=...
"Thu hồi"  ──POST───────▶ /admin/canary-tokens/{id}/revoke
```

**Nguyên tắc:** token là **bearer credential** trong URL. Ai có URL còn hạn thì đọc được — đây là chủ ý để phát hiện chia sẻ link. Vì vậy TTL ngắn, thu hồi được, và mọi lần dùng đều ghi log.

---

## 4. Mô hình dữ liệu

### 4.1 `book_file` — PDF gốc, không bao giờ public

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `id` | UUID PK | |
| `book_id` | UUID FK `book(id)` | |
| `kind` | VARCHAR(10) | `PREVIEW` \| `FULL` |
| `storage_key` | VARCHAR(500) UNIQUE | `books/{bookId}/{fileId}.pdf`, không trả ra client |
| `original_name` | VARCHAR(255) | |
| `content_type` | VARCHAR(100) | chỉ `application/pdf` |
| `size_bytes` | BIGINT | ≤ 50 MB (cấu hình) |
| `sha256` | CHAR(64) | chống trùng/phát hiện thay thế |
| `page_count` | INT | đọc bằng PDFBox khi upload |
| `status` | VARCHAR(20) | `ACTIVE` \| `ARCHIVED` |
| `created_by` | UUID FK `app_user(id)` | admin upload |
| `created_at` | TIMESTAMPTZ | |
| `archived_at` | TIMESTAMPTZ | |

Ràng buộc/index:

```sql
CREATE UNIQUE INDEX uq_book_file_active_kind
  ON book_file (book_id, kind) WHERE status = 'ACTIVE';
CREATE INDEX idx_book_file_book ON book_file (book_id, created_at DESC);
```

> Mỗi sách tối đa 1 bản `PREVIEW` + 1 bản `FULL` đang active. Upload bản mới = archive bản cũ, không xoá vật lý ngay (còn token cũ tham chiếu).

### 4.2 `canary_token` — không lưu token thô

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `id` | UUID PK | dùng trong admin URL |
| `token_hash` | CHAR(64) UNIQUE | SHA-256 của token thô |
| `token_prefix` | VARCHAR(12) | 8–10 ký tự đầu, chỉ để admin nhìn/tìm |
| `book_id` | UUID FK | |
| `file_id` | UUID FK `book_file(id)` | |
| `user_id` | UUID FK `app_user(id)` | |
| `loan_id` | UUID FK `loan(id)` | null nếu cấp cho preview không qua mượn |
| `purpose` | VARCHAR(10) | `READ` \| `PREVIEW` |
| `issued_at` | TIMESTAMPTZ | |
| `expires_at` | TIMESTAMPTZ | |
| `revoked_at` | TIMESTAMPTZ | null = chưa thu hồi |
| `revoke_reason` | VARCHAR(100) | `RETURNED`, `LOST`, `SUSPENDED`, `ADMIN`, `PASSWORD_CHANGED` |
| `revoked_by` | UUID FK `app_user(id)` | null nếu hệ thống tự thu hồi |
| `last_seen_at` | TIMESTAMPTZ | cập nhật mỗi lần đọc |
| `access_count` | INT DEFAULT 0 | |
| `created_ip_address` | VARCHAR(45) | IP thô của thiết bị xin cấp link (IPv4/IPv6) |
| `created_ip_hash` | CHAR(64) | HMAC-SHA256(IP, server pepper) |
| `created_ua_hash` | CHAR(64) | |

Index:

```sql
CREATE INDEX idx_canary_token_book ON canary_token (book_id, issued_at DESC);
CREATE INDEX idx_canary_token_user ON canary_token (user_id, issued_at DESC);
CREATE INDEX idx_canary_token_expiry ON canary_token (expires_at);
```

IP thô được lưu (`created_ip_address`) để biết thiết bị nào đã xin link; `ip_hash` có pepper vẫn được giữ để đối chiếu ẩn danh. UA chỉ lưu hash.

### 4.3 `canary_access` — lịch sử đọc

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `id` | BIGSERIAL PK | |
| `token_id` | UUID FK | |
| `accessed_at` | TIMESTAMPTZ | |
| `ip_hash` | CHAR(64) | hash có pepper, đối chiếu ẩn danh |
| `ua_hash` | CHAR(64) | |
| `ip_address` | VARCHAR(45) | IP thô của thiết bị (IPv4/IPv6) |
| `ip_version` | VARCHAR(10) | `IPv4` \| `IPv6` |
| `country_code` | VARCHAR(2) | ISO-3166 alpha-2, ví dụ `VN` |
| `country_name` | VARCHAR(100) | |
| `region_name` | VARCHAR(120) | tỉnh/bang |
| `city_name` | VARCHAR(120) | thành phố |
| `latitude` / `longitude` | DOUBLE PRECISION | toạ độ ước lượng |
| `time_zone` | VARCHAR(64) | ví dụ `Asia/Bangkok` |
| `isp` | VARCHAR(150) | nhà mạng/tổ chức |
| `location_source` | VARCHAR(20) | `GEOIP` \| `LOCAL` \| `UNKNOWN` |
| `outcome` | VARCHAR(20) | `OK` \| `EXPIRED` \| `REVOKED` \| `FORBIDDEN` \| `NOT_FOUND` |
| `bytes_sent` | BIGINT | |
| `range_header` | VARCHAR(50) | `bytes=0-` hoặc null |
| `request_id` | VARCHAR(64) | trace id, không chứa token |

- Ghi **bất đồng bộ** (Spring `@Async`/event) để không làm chậm stream; nếu lỗi ghi log thì vẫn phục vụ, nhưng phải có metric.
- **IP & vị trí:** IP được lấy qua `ClientIpResolver` (chỉ tin `X-Forwarded-For` khi peer là proxy nội bộ) và ghi ngay cùng lượt truy cập. Vị trí do `IpGeolocationService` phân giải qua HTTP API cấu hình bằng `app.canary.geolocation.*` (mặc định ip-api.com, không cần key; timeout 800 ms, cache 6 giờ theo IP) nhưng **chạy sau commit trên executor riêng** (`CanaryAccessLocationEnricher`), nên luồng stream PDF không phải chờ mạng. Trong lúc chờ, `location_source = PENDING`; lỗi/timeout thành `UNKNOWN` và **không chặn** việc đọc; IP nội bộ/loopback thành `LOCAL`.
- Giữ 180 ngày, sau đó job xoá theo `accessed_at` (cấu hình).
- Với `EXPIRED/REVOKED/NOT_FOUND`, `token_id` có thể null nếu không tìm thấy hash; khi đó không log token thô.

### 4.4 Quan hệ

```
book 1 ── n book_file 1 ── n canary_token 1 ── n canary_access
                              │
                              ├─ user
                              └─ loan (nullable)
```

---

## 5. Thiết kế token

### 5.1 Định dạng

```
cnr_<22 ký tự base64url>
```

- 16 byte từ `SecureRandom` → 128-bit entropy; encode base64url không padding = 22 ký tự.
- Tổng 26 ký tự; không chứa email/userId/bookId → không lộ dữ liệu nếu token bị đọc.
- **Không** dùng JWT cho token này: không cần stateless, cần thu hồi tức thì.

### 5.2 Lưu trữ và tra cứu

- Sinh token thô → `sha256(token)` → lưu `token_hash`; **chỉ trả token thô một lần** trong response cấp link.
- Tra cứu: `SELECT ... WHERE token_hash = :hash` (unique index) → constant-time không cần thiết vì so sánh hash trong DB.
- Log application **không** ghi token thô hay full URL. Cấu hình logback mask path `/api/v1/reader/files/*` và query `t=`.
- Admin chỉ thấy `token_prefix` (8 ký tự) + `id`; muốn tra từ token thô thì dán vào ô lookup, server hash rồi tìm, không hiển thị lại token.

### 5.3 Vòng đời

```
ISSUED ──(hết TTL)──▶ EXPIRED
   │
   ├──(user trả sách / mất sách)──▶ REVOKED
   ├──(user bị suspend / đổi mật khẩu)──▶ REVOKED
   └──(admin thu hồi)──▶ REVOKED
```

- **TTL mặc định:** 30 phút cho `READ`, 15 phút cho `PREVIEW`.
- **Absolute max:** 12 giờ kể từ `issued_at`; FE xin token mới khi hết hạn, không gia hạn token cũ.
- Cấp lại link **không** thu hồi token cũ ngay (để không mất lịch sử), nhưng có thể cấu hình chỉ giữ 1 token active/user/book; token cũ vẫn dùng được tới hết TTL.
- Thu hồi tức thì: set `revoked_at`; request kế tiếp nhận `410 Gone`.
- Job dọn token hết hạn > 180 ngày (giữ metadata tối thiểu nếu cần đối soát).

### 5.4 Điều kiện cấp token

| Purpose | Điều kiện |
|---|---|
| `READ` | User đang có loan `ACTIVE`, `OVERDUE` hoặc `PENDING_RETURN` cho đúng `book_id`; sách `ACTIVE`; có `book_file` loại `FULL` status `ACTIVE` |
| `PREVIEW` | User đã đăng nhập; có file `PREVIEW`; không cần mượn. Guest dùng Google preview hiện tại, **không** có canary |

- Không cấp `READ` khi loan `RETURNED`/`LOST` → `403 LOAN_REQUIRED`.
- Admin **không** tự động đọc full nếu không có loan (trừ khi thêm quyền `CANARY_READ_ANY` — không làm trong MVP).

### 5.5 Chống lạm dụng

| Biện pháp | Giá trị đề xuất |
|---|---|
| Rate limit cấp token | 10 lần/phút/user/book |
| Rate limit stream | 120 request/phút/token (đủ cho range request của PDF viewer) |
| Kích thước PDF | ≤ 50 MB, chỉ `%PDF-` magic, `page_count` ≤ 2.000 |
| Upload | chỉ ADMIN, multipart, kiểm tra content-type + magic + sha256 |
| Enumeration | token sai/hết hạn đều trả `404` hoặc `410` thống nhất, không tiết lộ sách/tồn tại |
| Referrer | `Referrer-Policy: no-referrer` trên response PDF |
| Cache | `Cache-Control: private, no-store` + `Pragma: no-cache` |
| Indexing | `X-Robots-Tag: noindex, nofollow, noarchive` |
| CORS | chỉ origin main-web/admin-web đã cấu hình |
| Log | không log token; IP/UA chỉ hash |
| Admin action | ghi audit `CANARY_REVOKE`, `CANARY_LOOKUP` kèm admin id + token id (không token thô) |

---

## 6. Thiết kế link PDF

### 6.1 Vì sao không trả link storage trực tiếp

Nếu trả `https://cdn.../books/abc.pdf`:

- Không biết ai đọc, không thu hồi được.
- Link sống mãi, chia sẻ tự do.
- Lộ cấu trúc storage.

Vì vậy **mọi lượt đọc đi qua backend**, storage key chỉ nằm trong DB.

### 6.2 Hai loại link

| Loại | Ai nhận | Canary | Mục đích |
|---|---|---|---|
| Preview | Guest: Google Books (`ggId`); user đăng nhập: PDF `PREVIEW` nếu có | Không (guest) / Có (user) | Cho xem thử, không cần mượn |
| Full | User có loan hợp lệ | **Có** | Đọc toàn bộ, truy vết rò rỉ |

- Nếu sách chưa upload PDF: giữ nguyên hành vi hiện tại (Google preview; không có nút đọc full). Không tạo link rỗng.
- Preview PDF của user đăng nhập cũng cấp token `PREVIEW` TTL 15 phút; guest dùng Google để tránh phải định danh người chưa đăng nhập.

### 6.3 URL

```
GET /api/v1/reader/files/{token}
```

- Token nằm trong **path**, không phải query: giảm lộ qua query log, Referer, analytics.
- Không có `?download=1` trong MVP; `Content-Disposition: inline` để trình duyệt mở viewer. Nếu cần tải, thêm endpoint riêng có audit.
- Hỗ trợ `Range` để PDF viewer không tải lại cả file; mỗi range request đều tính là một access (hoặc gộp theo `request_id` để tránh nhiễu thống kê).

### 6.4 Headers bắt buộc

```http
Content-Type: application/pdf
Content-Disposition: inline; filename*=UTF-8''<ten-sach>.pdf
Cache-Control: private, no-store, max-age=0
Pragma: no-cache
Referrer-Policy: no-referrer
X-Content-Type-Options: nosniff
X-Robots-Tag: noindex, nofollow, noarchive
Accept-Ranges: bytes
Content-Security-Policy: frame-ancestors 'self' http://localhost:5173 http://localhost:5175
```

`frame-ancestors` phải khớp origin FE; nếu dùng iframe cross-origin, cấu hình theo môi trường, không dùng `*`.

---

## 7. API đề xuất

### 7.1 Admin — quản lý file

| Method | Path | Quyền | Body/Query | Response |
|---|---|---|---|---|
| `POST` | `/api/v1/admin/books/{bookId}/files` | ADMIN | multipart `file`, `kind=PREVIEW\|FULL` | `201 BookFileResponse` |
| `GET` | `/api/v1/admin/books/{bookId}/files` | ADMIN | — | `List<BookFileResponse>` |
| `DELETE` | `/api/v1/admin/books/{bookId}/files/{fileId}` | ADMIN | — | `204` (archive) |

`BookFileResponse`: `id, kind, originalName, sizeBytes, pageCount, sha256, status, createdAt, activeTokenCount` — **không** có `storageKey`.

Lỗi: `409 FILE_ALREADY_EXISTS` (nếu muốn bắt buộc xoá trước), `413 FILE_TOO_LARGE`, `415 UNSUPPORTED_MEDIA_TYPE`, `422 INVALID_PDF`, `404 BOOK_NOT_FOUND`.

### 7.2 Admin — quản lý canary

| Method | Path | Query/Body | Response |
|---|---|---|---|
| `GET` | `/api/v1/admin/canary-tokens` | `bookId, userId, status=ACTIVE\|EXPIRED\|REVOKED, q, page, size` | `Page<CanaryTokenSummary>` |
| `GET` | `/api/v1/admin/canary-tokens/groups` | `bookId`, `q` (email/họ tên/tên sách/mã token), `page, size` | `Page<CanaryGroupSummary>` — gom theo cặp (người đọc, sách), phân trang bằng LIMIT/OFFSET ở DB |
| `GET` | `/api/v1/admin/canary-tokens/{tokenId}` | — | `CanaryTokenDetail` |
| `GET` | `/api/v1/admin/canary-tokens/{tokenId}/accesses` | `page, size` | `Page<CanaryAccessResponse>` |
| `POST` | `/api/v1/admin/canary-tokens/{tokenId}/revoke` | `{reason}` | `CanaryTokenDetail` |
| `GET` | `/api/v1/admin/canary-tokens/lookup` | `value=<token\|url\|prefix>` | `CanaryLookupResult` |
| `POST` | `/api/v1/admin/canary-tokens/revoke-for-user` | `{userId, bookId?}` | `{revoked: n}` (dùng khi suspend) |

`CanaryTokenSummary`:

```json
{
  "id": "uuid",
  "tokenPrefix": "cnr_7Kd2mQ",
  "book": { "id": "uuid", "title": "Clean Code" },
  "user": { "id": "uuid", "email": "reader@example.com", "fullName": "..." },
  "loanId": "uuid",
  "purpose": "READ",
  "issuedAt": "...",
  "expiresAt": "...",
  "revokedAt": null,
  "lastSeenAt": "...",
  "accessCount": 14,
  "distinctIpCount": 2,
  "status": "ACTIVE"
}
```

`CanaryTokenDetail` thêm `revokeReason`, `createdIpHash`, `createdUaHash`, `file` (kind/size/sha256), `riskFlags: ["ACCESSED_AFTER_RETURN", "MANY_IPS"]`.

`CanaryLookupResult`:

```json
{
  "matched": true,
  "matchType": "TOKEN | PREFIX | URL",
  "token": { ...summary... },
  "signals": [
    "Token còn hạn",
    "2 IP khác nhau",
    "Lần đọc cuối sau khi sách đã trả"
  ]
}
```

Lookup chấp nhận:

- Token thô `cnr_...` → hash → exact.
- URL đầy đủ → server parse path `/reader/files/{token}` → hash.
- Prefix 8 ký tự → trả tối đa 20 kết quả (có thể trùng); **không** cho phép prefix ngắn hơn 6.

### 7.3 Reader — cấp quyền đọc

| Method | Path | Body | Response |
|---|---|---|---|
| `GET` | `/api/v1/users/me/books/{bookId}/reading-access` | — | `ReadingAccessResponse` |
| `POST` | `/api/v1/users/me/books/{bookId}/access` | `{purpose: "READ"\|"PREVIEW"}` | `CanaryLinkResponse` |

`ReadingAccessResponse` (để FE biết hiện nút gì):

```json
{
  "canRead": true,
  "canPreview": true,
  "loanId": "uuid",
  "dueAt": "...",
  "hasFullFile": true,
  "hasPreviewFile": true
}
```

`CanaryLinkResponse`:

```json
{
  "url": "/api/v1/reader/files/cnr_xxx",
  "expiresAt": "2026-11-09T10:30:00Z",
  "tokenSuffix": "7Kd2mQ",
  "watermarkText": "reader@example.com • CNR-7Kd2mQ • 09/11/2026 10:00",
  "fileName": "Clean Code.pdf"
}
```

- `url` là relative; FE ghép API base. Không trả absolute URL để tránh lệch host/proxy.
- Nếu chưa có file: `409 BOOK_FILE_NOT_AVAILABLE`.
- Nếu không có loan: `403 LOAN_REQUIRED`.
- Nếu token hết hạn khi đọc: `410 TOKEN_EXPIRED`; FE gọi lại endpoint cấp link.

### 7.4 Endpoint stream

```
GET /api/v1/reader/files/{token}
```

- **Không** yêu cầu `Authorization` header: token là credential, để PDF viewer/iframe mở được trực tiếp.
- Vẫn kiểm tra: hash tồn tại → chưa revoke → chưa hết hạn → file `ACTIVE` → loan còn hiệu lực (nếu `READ`) → user `ACTIVE`.
- `404` cho token không tồn tại; `410` cho expired/revoked; `403` cho loan không còn/hết quyền (không tiết lộ khác biệt quá mức).
- Trả file theo `Range`; nếu không hỗ trợ range, PDF viewer tải lại toàn bộ — chấp nhận được nhưng nên làm.

### 7.5 Luồng cấp + đọc (tuần tự)

```
1. FE: người dùng bấm "Đọc sách"
2. FE → POST /users/me/books/{id}/access {purpose:READ}
3. BE: tìm loan hợp lệ của user cho book
4. BE: tìm book_file FULL active
5. BE: sinh token, lưu hash + user + loan + TTL
6. BE → FE: { url, expiresAt, watermarkText, tokenSuffix }
7. FE: mở iframe src=url, overlay watermark
8. Browser → GET /reader/files/{token}
9. BE: hash → token; kiểm tra trạng thái/quyền
10. BE: ghi canary_access (async), stream PDF
```

---

## 8. Thiết kế frontend

### 8.1 Main-web (người đọc)

**Màn hình `BookDetail` hiện tại** (`frontend/main-web/src/pages/BookDetail.tsx`):

- Có nút "Mượn sách này" và "Preview" (Google).
- Chưa biết user có loan hay không → cần gọi `reading-access`.

**Thay đổi đề xuất:**

1. Thêm `lib/reading.ts`:
   - `getReadingAccess(bookId)`
   - `requestReadingLink(bookId, purpose)`
2. Trong `BookDetail`, sau khi tải sách + đã đăng nhập:
   - Gọi `getReadingAccess` song song; nếu `canRead` → hiện nút **"Đọc bản đầy đủ"**.
   - Nếu `canPreview && hasPreviewFile` → nút Preview mở PDF canary thay Google (hoặc thêm lựa chọn).
3. Component mới `CanaryReaderDialog.tsx`:
   - `<dialog>` full-screen, header: tên sách + đồng hồ hết hạn + nút đóng.
   - `<iframe src={url} title={...}>` hoặc `<object type="application/pdf">`.
   - Overlay watermark: `position:absolute; inset:0; pointer-events:none;` lặp chéo chuỗi `email • CNR-xxxx • timestamp`, opacity ~0.10–0.18, font 12–14px.
   - Banner trên cùng: **"Bản đọc cá nhân hóa cho {email}. Mã canary CNR-xxxx. Không chia sẻ link."**
   - Nếu iframe lỗi/410: hiện nút "Làm mới phiên đọc" gọi lại API.
4. Không lưu token vào `localStorage`; giữ trong state + `expiresAt`; đóng dialog thì bỏ.
5. Không thêm thư viện PDF mới ở MVP (dùng viewer native của trình duyệt) để tránh bundle nặng và lệch hành vi.

**Giới hạn cần nói rõ với người dùng:** overlay là deterrence, không chặn screenshot; nếu PDF viewer native che overlay (một số trình duyệt), cần kiểm thử và có thể chuyển sang render bằng PDF.js ở giai đoạn sau.

### 8.2 Admin-web

**Route mới:** `/canary` — "Canary & bản đọc" trong `adminRoutes` (`frontend/admin-web/src/routes/index.tsx`); `Sidebar` tự render vì lấy từ `adminRoutes`.

**Trang `CanaryManager.tsx`:**

- Tab 1 **Token**:
  - Filter: sách (search), người dùng (email), trạng thái, khoảng thời gian.
  - Bảng: `Mã` (prefix), `Sách`, `Người đọc`, `Mục đích`, `Cấp lúc`, `Hết hạn`, `Lần cuối`, `Lượt xem`, `IP khác nhau`, `Trạng thái`, `Thao tác`.
  - Badge trạng thái: ACTIVE (xanh), EXPIRED (xám), REVOKED (đỏ).
  - Cảnh báo `riskFlags` (nhiều IP, đọc sau khi trả) bằng icon + tooltip.
  - Nút "Thu hồi" mở dialog nhập lý do; sau khi thu hồi refresh dòng.
- Tab 2 **Tra cứu rò rỉ**:
  - Ô paste URL/token/prefix + nút "Tra cứu".
  - Kết quả: thẻ token + user + loan + timeline access + nút "Thu hồi ngay", "Mở hồ sơ người dùng".
  - Nếu không thấy: gợi ý kiểm tra prefix 8 ký tự hoặc token đã bị xoá theo retention.
- Tab 3 **Cấu hình** (chỉ đọc ở MVP): TTL, max file size, watermark template, retention — lấy từ `/admin/canary-settings` hoặc build-time env; không cần CRUD.

**Trong `BookCatalog`:**

- Bỏ type/field `previewUrl`, `readerUrl` khỏi form payload (đang là field ma).
- Thêm khu vực **"Tệp PDF"** trong modal sửa sách:
  - Hai dòng: `Bản xem trước` và `Bản đầy đủ`.
  - Mỗi dòng: tên file, dung lượng, số trang, ngày cập nhật, trạng thái; nút `Tải lên`/`Thay thế`/`Lưu trữ`.
  - Upload dùng `FormData`, hiển thị progress; lỗi 413/415/422 hiển thị message từ `ApiError`.
  - Link "Quản lý canary của sách này" → `/canary?bookId=...`.
- Danh sách sách có cột nhỏ "PDF" (đủ/thiếu) để admin biết sách nào chưa có bản đọc.

### 8.3 Trạng thái và lỗi FE

| Tình huống | UI |
|---|---|
| Chưa đăng nhập | Nút "Đăng nhập để đọc" |
| Có loan, có file | Nút "Đọc bản đầy đủ" |
| Có loan, chưa có file | Nút disabled + tooltip "Sách chưa có bản PDF" |
| Không có loan | Chỉ Preview (Google hoặc PDF preview) |
| 410 khi đang đọc | "Phiên đọc đã hết hạn" + nút làm mới |
| 403 | "Bạn không còn quyền đọc sách này" |
| 429 | "Bạn thao tác quá nhanh, thử lại sau" |

---

## 9. Quy trình điều tra rò rỉ

**Khi nhận được bằng chứng (ảnh, PDF, link):**

1. **Trích token:**
   - Trong URL: phần sau `/reader/files/`.
   - Trên ảnh/PDF: mã `CNR-xxxxxx` ở watermark/footer.
   - Nếu có file PDF: kiểm tra metadata/footer nếu đã bật stamp server-side.
2. **Tra cứu:** admin → Canary → tab Tra cứu → dán URL/token/prefix.
3. **Xác định:** token → user, email, loan, thời gian cấp, hết hạn, IP hash, UA hash, số lần đọc, lần cuối.
4. **Đánh giá:**
   - Token còn hạn + nhiều IP → khả năng chia sẻ link.
   - Token hết hạn từ lâu + file vẫn lan truyền → có thể đã tải file; watermark trên file là bằng chứng chính.
   - Trùng email với người mượn → xác nhận chủ tài khoản (nhưng không loại trừ lộ mật khẩu).
5. **Ngăn chặn:** thu hồi token; thu hồi toàn bộ token của user cho sách đó; suspend tài khoản nếu cần.
6. **Lưu vết:** export CSV/JSON token + access log; không xoá token ngay để còn đối soát.
7. **Báo cáo:** thời điểm, sách, user, loan, số access, IP hash (không trình bày như định danh tuyệt đối), hành động.

**Giới hạn:** IP hash/VPN/NAT và tài khoản dùng chung chỉ là tín hiệu, không phải bằng chứng tuyệt đối. Cần nêu rõ trong báo cáo.

---

## 10. Bảo mật và quyền riêng tư

| Rủi ro | Kiểm soát |
|---|---|
| Token bị đoán | 128-bit CSPRNG; rate limit; 404 thống nhất |
| Token trong log | Mask path/query; không log response body; audit chỉ tokenId/prefix |
| Token trong Referer | `Referrer-Policy: no-referrer`; mở trong iframe cùng origin API hoặc blob |
| Link sống mãi | TTL 30 phút; absolute 12h; revoke |
| Chia sẻ link | Giới hạn TTL + gắn loan + log nhiều IP; watermark email/mã |
| Storage lộ | Private bucket/local; không trả `storageKey`; stream qua backend |
| Upload độc hại | Chỉ admin; kiểm tra magic `%PDF-`; giới hạn size/page; quét malware nếu có |
| Dò token | Rate limit theo IP + token; không phân biệt expired/revoked qua message |
| PII trong log | Không log IP/token ra file log; DB lưu IP thô (bắt buộc cho truy vết) + hash có pepper, UA chỉ hash; email/IP chỉ hiện trong admin có quyền |
| Admin lạm dụng | Audit `CANARY_LOOKUP`/`CANARY_REVOKE`; chỉ ADMIN |
| Swagger lộ endpoint | Tắt Swagger ở prod (AC-03) hoặc giới hạn admin |
| Rò rỉ qua cache/proxy | `no-store`, `private`, không CDN cho endpoint token |

**Không đưa vào token:** email, userId, bookId, role, timestamp ký. Token không cần parse; mọi metadata nằm trong DB.

---

## 11. Migration và cấu hình

### 11.1 Thứ tự bắt buộc

1. **Sửa DF-07 trước:** đổi tên một trong hai file `V5__...` (ví dụ `V5__update_book_metadata.sql` → `V5_1__update_book_metadata.sql`) và xác nhận Flyway chạy trên DB trống + DB hiện có. Không thêm migration mới khi Flyway còn fail.
2. Thêm `V8__book_files_and_canary.sql` (số 8 vì V6, V7 đã tồn tại):
   - `book_file`, `canary_token`, `canary_access` + index.
   - Không thêm cột `preview_url/reader_url` mới; quyết định giữ hay drop cột cũ ở migration riêng sau khi FE ngừng dùng.
3. Cấu hình:

```yaml
app:
  storage:
    type: ${STORAGE_TYPE:local}      # local | s3
    root: ${STORAGE_ROOT:./data/books}
  canary:
    read-ttl: ${CANARY_READ_TTL:30m}
    preview-ttl: ${CANARY_PREVIEW_TTL:15m}
    max-ttl: ${CANARY_MAX_TTL:12h}
    max-file-size: ${CANARY_MAX_FILE_SIZE:50MB}
    retention: ${CANARY_RETENTION:180d}
    ip-pepper: ${CANARY_IP_PEPPER:}   # bắt buộc ở prod, không commit
    rate-limit:
      issue-per-minute: ${CANARY_ISSUE_PER_MINUTE:10}    # mỗi user/book
      stream-per-minute: ${CANARY_STREAM_PER_MINUTE:120}  # mỗi token
```

- `CANARY_IP_PEPPER` phải là secret ≥ 32 byte; startup fail nếu prod thiếu.
- Local dev dùng thư mục `backend/src/lms/data/books` (gitignore).
- Prod dùng S3-compatible/private bucket; không public read.

### 11.2 Dọn dẹp hợp đồng cũ

- Xoá `previewUrl`, `readerUrl` khỏi type `Book`/payload admin và test hợp đồng (CV-02/F-01).
- `BookResponse` thêm `hasPreviewFile`, `hasFullFile` (boolean) thay vì URL.
- Cập nhật `FrontendContractTest` WF-21/22: không còn assert "không có previewUrl" mà assert 2 boolean + upload flow.

---

## 12. Kế hoạch triển khai theo giai đoạn

| Giai đoạn | Nội dung | Phụ thuộc | Ước lượng |
|---|---|---|---|
| P0 | Sửa DF-07; chốt schema; thêm `book_file` + storage abstraction | — | 1–2 ngày |
| P1 | Admin upload/quản lý PDF; bỏ field URL ma; hiển thị trạng thái file | P0 | 2–3 ngày |
| P2 | Sinh token, endpoint stream, kiểm tra loan, headers bảo mật, access log | P0 | 3–4 ngày |
| P3 | Reader FE: nút đọc, dialog, overlay watermark, xử lý 410/403 | P2 | 2 ngày |
| P4 | Admin Canary Manager: list/filter/detail/revoke/lookup | P2 | 3 ngày |
| P5 | Server-side stamp PDF (footer mỗi trang) + cache; risk flags; retention job | P2 | 3–4 ngày |
| P6 | Test bảo mật/E2E, tải lớn, tài liệu vận hành | P1–P5 | 2 ngày |

**MVP nên dừng ở P4** (token + overlay + admin manager). P5 là nâng cấp độ bền của bằng chứng.

---

## 13. Kế hoạch kiểm thử

| # | Case | Kỳ vọng |
|---|---|---|
| T1 | Cấp link khi có loan ACTIVE | 200, URL + expiresAt + suffix |
| T2 | Cấp link khi không có loan | 403 `LOAN_REQUIRED` |
| T3 | Cấp link khi sách chưa có file FULL | 409 `BOOK_FILE_NOT_AVAILABLE` |
| T4 | Đọc token hợp lệ | 200 PDF, đúng `Content-Type`, `no-store`, `no-referrer` |
| T5 | Đọc token hết hạn | 410, không stream |
| T6 | Đọc token đã thu hồi | 410 |
| T7 | Trả sách → token cũ | 410 ngay sau khi trả |
| T8 | User A dùng token của user B | Token vẫn hợp lệ theo thiết kế (bearer), nhưng access log ghi IP/UA; **không** cấp token cross-user qua API |
| T9 | Admin thu hồi | Token chết ngay; audit ghi admin id |
| T10 | Lookup token/URL/prefix | Trả đúng token + user + loan |
| T11 | Lookup prefix < 6 ký tự | 400, không dò |
| T12 | Upload file không phải PDF | 415/422, không lưu |
| T13 | Upload quá size | 413 |
| T14 | Upload bởi USER | 403 |
| T15 | Range request | 206, đúng bytes, access log ghi range |
| T16 | Token không xuất hiện trong log app | grep log không thấy chuỗi `cnr_` |
| T17 | 2 request đồng thời cùng token | Cả hai đọc được; `access_count` tăng đúng (không mất update) |
| T18 | Suspend user | Token bị revoke; request sau 410/403 |
| T19 | PDF lớn 50 MB / 2.000 trang | Stream không OOM; thời gian chấp nhận |
| T20 | Restart app | Token còn hiệu lực (DB), đọc tiếp được |

Bổ sung test hồi quy cho:
- Flyway chạy được trên DB trống (thay test đang khẳng định DF-07).
- `BookResponse` có `hasPreviewFile/hasFullFile`.
- Admin upload → reader đọc → trả sách → 410 (E2E).

---

## 14. Quyết định cần chốt

| # | Câu hỏi | Đề xuất mặc định |
|---|---|---|
| Q1 | Lưu PDF ở đâu? | Local dev; S3-compatible private bucket ở prod (abstraction `StorageService`) |
| Q2 | Watermark server-side ngay MVP? | **Không**; overlay FE + footer phase P5. Nếu cần bằng chứng mạnh ngay, làm stamp trang 1 ở P2 |
| Q3 | Guest có canary không? | Không; guest dùng Google preview hiện tại |
| Q4 | Token dùng lại hay one-time? | Dùng lại trong TTL (PDF viewer cần range request) |
| Q5 | Có chặn tải PDF? | Không; `inline` + audit. DRM ngoài phạm vi |
| Q6 | Có hiển thị email đầy đủ trên watermark? | Có, nhưng có thể mask một phần (`r***@example.com`) nếu lo PII |
| Q7 | Token trong URL hay header? | URL (path) để phát hiện chia sẻ link; chấp nhận rủi ro Referer và giảm bằng `no-referrer` |

---

## 15. Tiêu chí nghiệm thu

1. Admin upload được PDF preview/full; sách hiển thị trạng thái "có bản đọc".
2. Không còn field `previewUrl/readerUrl` trong payload/type; `BookResponse` có 2 boolean.
3. User có loan mở được PDF full; user không có loan bị 403.
4. Mỗi link có token riêng, hết hạn sau 30 phút, thu hồi được.
5. Watermark hiển thị email + mã CNR + thời gian; ảnh chụp màn hình đọc được mã.
6. Admin tra token → đúng user/loan/thời gian; xem được access log; thu hồi ngay.
7. Token không xuất hiện trong log application; storage key không trả ra client.
8. Test T1–T20 pass; `clean verify` xanh; không regression 27 workflow hiện có.
9. Flyway chạy được trên DB trống (DF-07 đã sửa) trước khi merge.
10. Tài liệu vận hành: cách cấp/thu hồi, quy trình điều tra, retention.

---

## 16. Rủi ro của chính giải pháp

| Rủi ro | Mức | Giảm thiểu |
|---|---|---|
| Overlay bị viewer PDF che | Trung bình | Test Chrome/Firefox/Safari; fallback PDF.js hoặc stamp server |
| Token trong URL bị chia sẻ | Cao (chủ ý) | TTL ngắn, revoke, log nhiều IP, watermark |
| Screenshot không chặn được | Cao | Chấp nhận; canary để truy vết, không phải DRM |
| Stream PDF lớn làm nghẽn | Trung bình | Range, giới hạn size, rate limit, cache stamped file |
| IP hash không định danh được sau VPN/NAT | Trung bình | Chỉ dùng làm tín hiệu; kết hợp loan + thời gian + watermark |
| Tăng PII (email trên watermark) | Trung bình | Mask một phần; chỉ admin xem đầy đủ |
| Migration mới chồng lên DF-07 | Cao | P0 bắt buộc sửa Flyway trước |
| Chi phí stamp PDF | Trung bình | Cache theo token; chỉ stamp trang cần thiết |

---

## 17. Tóm tắt một trang

- **Link PDF**: `/api/v1/reader/files/{token}`, token 128-bit, lưu SHA-256, TTL 30 phút, stream qua backend với `no-store`/`no-referrer`.
- **Canary**: gắn user + loan + book + thời điểm; watermark email + mã CNR trên FE; mỗi lần đọc ghi access log (IP/UA hash).
- **Admin**: trang `/canary` để lọc, xem chi tiết, tra cứu URL/token/prefix, thu hồi; quản lý file PDF trong `BookCatalog`.
- **Truy vết**: token → user → loan → lịch sử đọc; thu hồi + suspend khi cần.
- **Điều kiện tiên quyết**: sửa DF-07 (Flyway trùng V5), bỏ `previewUrl/readerUrl` ma, thêm storage + 3 bảng.
- **MVP**: P0–P4 (upload, token, đọc, admin manager). Server-side stamping là P5.
