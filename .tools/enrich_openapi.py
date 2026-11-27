"""Làm giàu spec springdoc của LMS rồi ghi ra docs/api/openapi.json + openapi.yaml.

Chỉ dùng cho mục đích tài liệu; không ảnh hưởng mã nguồn backend.
Nguồn: http://localhost:8080/v3/api-docs (backend dev đang chạy).
"""
import json
import urllib.request
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "docs" / "api"
OUT.mkdir(parents=True, exist_ok=True)

with urllib.request.urlopen("http://localhost:8080/v3/api-docs", timeout=20) as resp:
    spec = json.load(resp)

TAGS = {
    "Tra cứu sách": "/api/v1/public/books",
    "Xác thực công khai": "/api/v1/public/auth",
    "Đánh giá sách (công khai)": "/api/v1/public/books/{bookId}/reviews",
    "Hồ sơ & mượn trả (bạn đọc)": "/api/v1/users/me/loans",
    "Hồ sơ cá nhân": "/api/v1/users/me",
    "Quyền đọc & cấp link canary": "/api/v1/users/me/books",
    "Đọc PDF bằng canary token": "/api/v1/reader/files",
    "Đánh giá sách (bạn đọc)": "/api/v1/books",
    "Đánh giá của tôi": "/api/v1/users/me/reviews",
    "Quản trị — Tệp PDF": "/api/v1/admin/books/{bookId}/files",
    "Quản trị — Sách": "/api/v1/admin/books",
    "Quản trị — Danh mục": "/api/v1/admin/categories",
    "Quản trị — Mượn/trả": "/api/v1/admin/loans",
    "Quản trị — Mượn của người dùng": "/api/v1/admin/users/{userId}/loans",
    "Quản trị — Người dùng": "/api/v1/admin/users",
    "Quản trị — Thống kê": "/api/v1/admin/stats",
    "Quản trị — Canary": "/api/v1/admin/canary-tokens",
    "Quản trị — Kiểm duyệt đánh giá": "/api/v1/admin/reviews",
}

TAG_ORDER = [
    "Xác thực công khai",
    "Tra cứu sách",
    "Đánh giá sách (công khai)",
    "Hồ sơ cá nhân",
    "Hồ sơ & mượn trả (bạn đọc)",
    "Quyền đọc & cấp link canary",
    "Đọc PDF bằng canary token",
    "Đánh giá sách (bạn đọc)",
    "Đánh giá của tôi",
    "Quản trị — Sách",
    "Quản trị — Tệp PDF",
    "Quản trị — Danh mục",
    "Quản trị — Mượn/trả",
    "Quản trị — Mượn của người dùng",
    "Quản trị — Người dùng",
    "Quản trị — Thống kê",
    "Quản trị — Canary",
    "Quản trị — Kiểm duyệt đánh giá",
]

TAG_DESCRIPTIONS = {
    "Xác thực công khai": "Đăng ký, đăng nhập mật khẩu/Google, refresh/logout, quên mật khẩu, xác thực email bằng OTP.",
    "Tra cứu sách": "Tìm kiếm/lọc sách công khai, chi tiết sách, danh sách thể loại. Không cần đăng nhập.",
    "Đánh giá sách (công khai)": "Đọc đánh giá đã công bố và thống kê điểm của một cuốn sách.",
    "Hồ sơ cá nhân": "Xem/cập nhật hồ sơ và đổi mật khẩu của người dùng đang đăng nhập.",
    "Hồ sơ & mượn trả (bạn đọc)": "Danh sách lượt mượn của tôi, mượn sách, gửi trả, gia hạn.",
    "Quyền đọc & cấp link canary": "Kiểm tra quyền đọc và xin link PDF có canary token (TTL ngắn, thu hồi được).",
    "Đọc PDF bằng canary token": "Stream PDF theo token; không dùng header Authorization. Hỗ trợ Range, no-store, no-referrer.",
    "Đánh giá sách (bạn đọc)": "Tạo/sửa/xóa đánh giá; chỉ người đã mượn và đã trả sách mới đủ điều kiện.",
    "Đánh giá của tôi": "Danh sách đánh giá do chính người dùng viết.",
    "Quản trị — Sách": "CRUD sách, số bản, ngừng/kích hoạt lưu hành.",
    "Quản trị — Tệp PDF": "Upload/list/archive PDF preview & full; tải nội dung để kiểm tra. Không lộ storage key.",
    "Quản trị — Danh mục": "Thêm/đổi tên/gộp/xóa thể loại.",
    "Quản trị — Mượn/trả": "Duyệt/từ chối trả, đánh dấu quá hạn, mất sách, thu hồi sách.",
    "Quản trị — Mượn của người dùng": "Xem lịch sử mượn của một người dùng cụ thể.",
    "Quản trị — Người dùng": "Tìm kiếm, xem chi tiết, khóa/mở khóa, cấp/hạ quyền admin.",
    "Quản trị — Thống kê": "Số liệu tổng quan cho bảng điều khiển.",
    "Quản trị — Canary": "Danh sách/lọc token, chi tiết, lịch sử đọc, tra cứu token/URL/prefix, thu hồi.",
    "Quản trị — Kiểm duyệt đánh giá": "Xem toàn bộ đánh giá, ẩn/khôi phục/xóa.",
}

SUMMARY = {
    ("post", "/api/v1/public/auth/register"): "Đăng ký tài khoản bằng email (gửi OTP xác thực)",
    ("post", "/api/v1/public/auth/login"): "Đăng nhập bằng email và mật khẩu",
    ("post", "/api/v1/public/auth/google"): "Đăng nhập bằng Google ID token",
    ("post", "/api/v1/public/auth/refresh"): "Đổi refresh token lấy access token mới",
    ("post", "/api/v1/public/auth/logout"): "Thu hồi refresh token (đăng xuất)",
    ("post", "/api/v1/public/auth/password-reset/request"): "Yêu cầu gửi email đặt lại mật khẩu",
    ("post", "/api/v1/public/auth/password-reset/confirm"): "Đặt lại mật khẩu bằng token trong email",
    ("post", "/api/v1/public/auth/email-verification/confirm"): "Xác thực email bằng mã OTP hoặc token",
    ("post", "/api/v1/public/auth/email-verification/resend"): "Gửi lại email xác thực",
    ("get", "/api/v1/public/books"): "Tìm kiếm/lọc sách (phân trang)",
    ("get", "/api/v1/public/books/{bookId}"): "Chi tiết một cuốn sách",
    ("get", "/api/v1/public/books/categories"): "Danh sách thể loại đang có sách",
    ("get", "/api/v1/public/books/{bookId}/reviews"): "Đánh giá công khai của một cuốn sách",
    ("get", "/api/v1/public/books/{bookId}/reviews/stats"): "Thống kê điểm đánh giá của sách",
    ("get", "/api/v1/users/me"): "Thông tin người dùng đang đăng nhập",
    ("patch", "/api/v1/users/me"): "Cập nhật họ tên của tôi",
    ("post", "/api/v1/users/me/password"): "Đổi mật khẩu (thu hồi các phiên khác)",
    ("get", "/api/v1/users/me/loans"): "Lịch sử mượn của tôi (lọc theo trạng thái)",
    ("post", "/api/v1/users/me/loans"): "Mượn một cuốn sách",
    ("post", "/api/v1/users/me/loans/{loanId}/return"): "Gửi yêu cầu trả sách",
    ("post", "/api/v1/users/me/loans/{loanId}/renew"): "Gia hạn lượt mượn (tối đa 1 lần)",
    ("get", "/api/v1/users/me/books/{bookId}/reading-access"): "Kiểm tra quyền đọc/preview của sách",
    ("post", "/api/v1/users/me/books/{bookId}/access"): "Cấp link đọc PDF có canary token",
    ("get", "/api/v1/reader/files/{token}"): "Stream PDF theo canary token (Range, no-store)",
    ("post", "/api/v1/books/{bookId}/reviews"): "Viết đánh giá sách đã mượn và đã trả",
    ("get", "/api/v1/books/{bookId}/reviews/eligibility"): "Kiểm tra điều kiện viết đánh giá",
    ("get", "/api/v1/books/{bookId}/reviews/me"): "Đánh giá của tôi cho một cuốn sách",
    ("put", "/api/v1/reviews/{reviewId}"): "Sửa đánh giá của tôi",
    ("delete", "/api/v1/reviews/{reviewId}"): "Xóa đánh giá của tôi",
    ("get", "/api/v1/users/me/reviews"): "Danh sách đánh giá của tôi",
    ("get", "/api/v1/admin/books"): "Danh sách sách cho quản trị",
    ("post", "/api/v1/admin/books"): "Thêm sách mới",
    ("put", "/api/v1/admin/books/{bookId}"): "Cập nhật thông tin sách",
    ("patch", "/api/v1/admin/books/{bookId}/copies"): "Điều chỉnh số bản và số bản còn",
    ("post", "/api/v1/admin/books/{bookId}/retire"): "Ngừng lưu hành sách",
    ("post", "/api/v1/admin/books/{bookId}/activate"): "Kích hoạt lại sách",
    ("get", "/api/v1/admin/books/{bookId}/files"): "Danh sách tệp PDF của sách",
    ("post", "/api/v1/admin/books/{bookId}/files"): "Upload PDF preview/full (multipart)",
    ("delete", "/api/v1/admin/books/{bookId}/files/{fileId}"): "Lưu trữ tệp PDF",
    ("get", "/api/v1/admin/books/{bookId}/files/{fileId}/content"): "Tải nội dung PDF để kiểm tra",
    ("get", "/api/v1/admin/categories"): "Danh sách thể loại kèm số sách",
    ("post", "/api/v1/admin/categories"): "Thêm thể loại",
    ("put", "/api/v1/admin/categories/{id}"): "Đổi tên thể loại",
    ("delete", "/api/v1/admin/categories/{id}"): "Xóa thể loại rỗng",
    ("post", "/api/v1/admin/categories/{id}/merge"): "Gộp thể loại vào thể loại khác",
    ("get", "/api/v1/admin/loans"): "Danh sách lượt mượn (lọc theo trạng thái)",
    ("get", "/api/v1/admin/loans/{loanId}"): "Chi tiết lượt mượn",
    ("post", "/api/v1/admin/loans/{loanId}/return"): "Xác nhận đã trả sách",
    ("post", "/api/v1/admin/loans/{loanId}/reject-return"): "Từ chối yêu cầu trả sách",
    ("post", "/api/v1/admin/loans/{loanId}/lost"): "Đánh dấu mất sách",
    ("post", "/api/v1/admin/loans/{loanId}/recover"): "Thu hồi sách báo mất",
    ("post", "/api/v1/admin/loans/mark-overdue"): "Đánh dấu các lượt mượn quá hạn",
    ("get", "/api/v1/admin/users"): "Tìm kiếm người dùng (lọc trạng thái, vai trò)",
    ("get", "/api/v1/admin/users/{userId}"): "Chi tiết người dùng",
    ("post", "/api/v1/admin/users/{userId}/suspend"): "Khóa tài khoản",
    ("post", "/api/v1/admin/users/{userId}/reactivate"): "Mở khóa tài khoản",
    ("post", "/api/v1/admin/users/{userId}/promote"): "Cấp quyền admin",
    ("post", "/api/v1/admin/users/{userId}/demote"): "Hạ quyền admin",
    ("get", "/api/v1/admin/users/{userId}/loans"): "Lịch sử mượn của một người dùng",
    ("get", "/api/v1/admin/stats/overview"): "Số liệu tổng quan bảng điều khiển",
    ("get", "/api/v1/admin/canary-tokens"): "Danh sách canary token (lọc, phân trang)",
    ("get", "/api/v1/admin/canary-tokens/{tokenId}"): "Chi tiết canary token và cờ rủi ro",
    ("get", "/api/v1/admin/canary-tokens/{tokenId}/accesses"): "Lịch sử truy cập của token",
    ("get", "/api/v1/admin/canary-tokens/lookup"): "Tra cứu token/URL/prefix",
    ("post", "/api/v1/admin/canary-tokens/{tokenId}/revoke"): "Thu hồi canary token",
    ("post", "/api/v1/admin/canary-tokens/revoke-for-user"): "Thu hồi mọi token của một người dùng",
    ("get", "/api/v1/admin/reviews"): "Danh sách toàn bộ đánh giá",
    ("patch", "/api/v1/admin/reviews/{reviewId}/hide"): "Ẩn đánh giá",
    ("patch", "/api/v1/admin/reviews/{reviewId}/restore"): "Khôi phục đánh giá",
    ("delete", "/api/v1/admin/reviews/{reviewId}"): "Xóa đánh giá",
}

PAGE_SIZE_DEFAULT = {
    "/api/v1/public/books/{bookId}/reviews": 10,
    "/api/v1/users/me/reviews": 10,
}


def tag_for(path: str) -> str:
    best = None
    for tag, prefix in TAGS.items():
        if path == prefix or path.startswith(prefix + "/"):
            if best is None or len(prefix) > len(TAGS[best]):
                best = tag
    return best or "Khác"


def is_public(path: str) -> bool:
    return path.startswith("/api/v1/public/") or path.startswith("/api/v1/reader/")


spec["openapi"] = "3.1.0"
spec["info"] = {
    "title": "LMS API — Hệ thống thư viện điện tử",
    "version": "1.0.0",
    "description": (
        "REST API JSON của hệ thống thư viện điện tử (nhóm 6, INT3505E).\n\n"
        "**Client:** `frontend/main-web` (bạn đọc, cổng 5173) và `frontend/admin-web` "
        "(quản trị, cổng 5175). Kiến trúc tách rời cho phép thêm mobile app/đối tác dùng lại API.\n\n"
        "**Xác thực:** JWT tự ký (HS256). Access token 15 phút, refresh token 7 ngày; gửi qua "
        "`Authorization: Bearer <accessToken>`.\n\n"
        "**Phân quyền:** `/api/v1/public/**` và `/api/v1/reader/**` công khai; `/api/v1/admin/**` "
        "yêu cầu role ADMIN; các nhóm còn lại yêu cầu đăng nhập.\n\n"
        "**Lỗi:** mọi lỗi trả cùng một cấu trúc `ApiError` với `code` ổn định.\n\n"
        "**Phân trang:** tham số `page` (0-based), `size`, `sort=field,asc|desc`; response kiểu "
        "Spring `Page` (`content`, `totalElements`, `totalPages`, `number`, `size`)."
    ),
}
spec["servers"] = [
    {"url": "http://localhost:8080", "description": "Môi trường dev local (Spring Boot)"},
]
spec["tags"] = [{"name": t, "description": TAG_DESCRIPTIONS[t]} for t in TAG_ORDER]

components = spec.setdefault("components", {})
components.setdefault("securitySchemes", {})["bearerAuth"] = {
    "type": "http",
    "scheme": "bearer",
    "bearerFormat": "JWT",
    "description": "Access token JWT nhận từ /api/v1/public/auth/login hoặc /google.",
}
schemas = components.setdefault("schemas", {})
schemas["ApiError"] = {
    "type": "object",
    "description": "Cấu trúc lỗi thống nhất của toàn bộ API.",
    "required": ["status", "code", "message", "timestamp"],
    "properties": {
        "status": {"type": "integer", "format": "int32", "example": 403},
        "code": {"type": "string", "example": "LOAN_REQUIRED"},
        "message": {"type": "string", "example": "an active loan is required to read this book"},
        "timestamp": {"type": "string", "format": "date-time"},
        "fieldErrors": {
            "type": ["object", "null"],
            "additionalProperties": {"type": "string"},
            "description": "Chỉ có khi lỗi validation 400: tên field → thông điệp.",
            "example": {"email": "must be a well-formed email address"},
        },
    },
}
schemas["PageMeta"] = {
    "type": "object",
    "description": "Các field phân trang có trong mọi response kiểu Page của Spring.",
    "properties": {
        "totalElements": {"type": "integer", "format": "int64"},
        "totalPages": {"type": "integer", "format": "int32"},
        "number": {"type": "integer", "format": "int32", "description": "Trang hiện tại, 0-based"},
        "size": {"type": "integer", "format": "int32"},
        "numberOfElements": {"type": "integer", "format": "int32"},
        "first": {"type": "boolean"},
        "last": {"type": "boolean"},
        "empty": {"type": "boolean"},
    },
}
components["responses"] = {
    "BadRequest": {
        "description": "Dữ liệu không hợp lệ (`VALIDATION_FAILED`).",
        "content": {"application/json": {"schema": {"$ref": "#/components/schemas/ApiError"}}},
    },
    "Unauthorized": {
        "description": "Chưa đăng nhập hoặc access token không hợp lệ/hết hạn (`UNAUTHORIZED`).",
        "content": {"application/json": {"schema": {"$ref": "#/components/schemas/ApiError"}}},
    },
    "Forbidden": {
        "description": "Không đủ quyền hoặc tài khoản bị khóa (`FORBIDDEN`, `ACCOUNT_DISABLED`, `LOAN_REQUIRED`…).",
        "content": {"application/json": {"schema": {"$ref": "#/components/schemas/ApiError"}}},
    },
    "NotFound": {
        "description": "Không tìm thấy tài nguyên (`*_NOT_FOUND`).",
        "content": {"application/json": {"schema": {"$ref": "#/components/schemas/ApiError"}}},
    },
}

PDF_PATHS = {
    ("get", "/api/v1/reader/files/{token}"),
    ("get", "/api/v1/admin/books/{bookId}/files/{fileId}/content"),
}

for path, item in spec["paths"].items():
    tag = tag_for(path)
    for method, op in sorted(item.items()):
        if method not in {"get", "post", "put", "patch", "delete"}:
            continue
        op["tags"] = [tag]
        op["summary"] = SUMMARY.get((method, path), op.get("summary") or op.get("operationId", ""))

        # springdoc (Spring Boot 4) gộp pageable thành một tham số; tách lại cho đúng hợp đồng.
        params = op.get("parameters", [])
        if any(p.get("name") == "pageable" for p in params):
            params = [p for p in params if p.get("name") != "pageable"]
            default_size = PAGE_SIZE_DEFAULT.get(path, 20)
            params += [
                {
                    "name": "page",
                    "in": "query",
                    "required": False,
                    "schema": {"type": "integer", "format": "int32", "default": 0, "minimum": 0},
                    "description": "Số trang, bắt đầu từ 0.",
                },
                {
                    "name": "size",
                    "in": "query",
                    "required": False,
                    "schema": {"type": "integer", "format": "int32", "default": default_size, "minimum": 1},
                    "description": "Số phần tử mỗi trang.",
                },
                {
                    "name": "sort",
                    "in": "query",
                    "required": False,
                    "schema": {"type": "string"},
                    "description": "Sắp xếp dạng `field,asc|desc`, ví dụ `borrowedAt,desc`.",
                },
            ]
        op["parameters"] = params

        # Content-Type thật của response
        for status, response in op.get("responses", {}).items():
            content = response.get("content")
            if not content:
                continue
            if (method, path) in PDF_PATHS:
                response["content"] = {"application/pdf": next(iter(content.values()))}
            else:
                response["content"] = {"application/json": next(iter(content.values()))}

        if (method, path) in PDF_PATHS:
            op.setdefault("parameters", []).append(
                {
                    "name": "Range",
                    "in": "header",
                    "required": False,
                    "schema": {"type": "string"},
                    "description": "Range HTTP để tải từng phần, ví dụ `bytes=0-1023`.",
                    "example": "bytes=0-",
                }
            )
            ok = op["responses"].get("200", {})
            ok["description"] = "Nội dung PDF (200 toàn bộ, 206 khi có Range)."
            ok.setdefault("headers", {}).update(
                {
                    "Content-Disposition": {"schema": {"type": "string"}, "description": "inline; filename*=UTF-8''…"},
                    "Cache-Control": {"schema": {"type": "string"}, "description": "private, no-store, max-age=0"},
                    "Referrer-Policy": {"schema": {"type": "string"}, "description": "no-referrer"},
                    "X-Robots-Tag": {"schema": {"type": "string"}, "description": "noindex, nofollow, noarchive"},
                    "Accept-Ranges": {"schema": {"type": "string"}, "description": "bytes"},
                }
            )
            op["responses"].setdefault(
                "206", {"description": "Một phần nội dung theo header Range (Content-Range đi kèm)."}
            )
            op["responses"].setdefault(
                "410",
                {
                    "description": "Token hết hạn/đã thu hồi hoặc file không còn (`CANARY_TOKEN_EXPIRED`, `CANARY_TOKEN_REVOKED`).",
                    "content": {"application/json": {"schema": {"$ref": "#/components/schemas/ApiError"}}},
                },
            )

        # Upload PDF: multipart, không phải JSON
        if (method, path) == ("post", "/api/v1/admin/books/{bookId}/files"):
            op["requestBody"] = {
                "required": True,
                "content": {
                    "multipart/form-data": {
                        "schema": {
                            "type": "object",
                            "required": ["file", "kind"],
                            "properties": {
                                "kind": {
                                    "type": "string",
                                    "enum": ["PREVIEW", "FULL"],
                                    "description": "Loại tệp: bản xem trước hay bản đầy đủ.",
                                },
                                "file": {"type": "string", "format": "binary", "description": "PDF ≤ 50 MB."},
                            },
                        }
                    }
                },
            }
            for p in op["parameters"]:
                if p.get("name") == "kind":
                    p["schema"] = {"type": "string", "enum": ["PREVIEW", "FULL"]}

        if is_public(path):
            op["security"] = []
        else:
            op["security"] = [{"bearerAuth": []}]
            op["responses"].setdefault("401", {"$ref": "#/components/responses/Unauthorized"})
            op["responses"].setdefault("403", {"$ref": "#/components/responses/Forbidden"})
        if op.get("requestBody"):
            op["responses"].setdefault("400", {"$ref": "#/components/responses/BadRequest"})
        if "{" in path:
            op["responses"].setdefault("404", {"$ref": "#/components/responses/NotFound"})

        for status, response in op["responses"].items():
            if "$ref" in response:
                continue
            if status in {"200", "201", "204"} and response.get("description") in (
                None, "", "OK", "Created", "No Content",
            ):
                response["description"] = {
                    "200": "Thành công",
                    "201": "Tạo mới thành công",
                    "204": "Không có nội dung trả về",
                }[status]

json_text = json.dumps(spec, ensure_ascii=False, indent=2)
(OUT / "openapi.json").write_text(json_text + "\n", encoding="utf-8")
(OUT / "openapi.yaml").write_text(
    yaml.safe_dump(spec, allow_unicode=True, sort_keys=False, width=120), encoding="utf-8"
)

ops = sum(1 for p in spec["paths"].values() for m in p if m in {"get", "post", "put", "patch", "delete"})
missing = [
    (m, p)
    for p, item in spec["paths"].items()
    for m in item
    if m in {"get", "post", "put", "patch", "delete"} and not item[m].get("summary")
]
print(f"paths={len(spec['paths'])} operations={ops} schemas={len(schemas)} missingSummary={len(missing)}")
print("wrote", OUT / "openapi.json", OUT / "openapi.yaml")
