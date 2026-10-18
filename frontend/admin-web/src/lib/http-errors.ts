import { isAxiosError } from "axios";

export function listErrorMessage(error: unknown): string {
  if (!isAxiosError<{ code?: string; message?: string }>(error)) {
    return "Không tải được dữ liệu. Vui lòng tải lại trang.";
  }

  if (error.response?.status === 401) {
    return "Phiên đăng nhập hết hạn. Hãy đăng xuất rồi đăng nhập lại.";
  }
  if (error.response?.status === 403) {
    return "Backend từ chối quyền xem dữ liệu. Hãy đăng nhập bằng tài khoản ADMIN.";
  }
  if (error.response) {
    const detail = error.response.data?.message || error.response.data?.code;
    return `Backend trả lỗi HTTP ${error.response.status}${detail ? `: ${detail}` : "."}`;
  }
  return "Không kết nối được backend tại API đã cấu hình. Kiểm tra backend, cổng 8080 và cấu hình CORS.";
}

export function actionErrorMessage(error: unknown, fallback = "Không thực hiện được. Vui lòng thử lại."): string {
  if (!isAxiosError<{ code?: string; message?: string }>(error)) {
    return fallback;
  }

  if (error.response?.status === 401 || error.response?.status === 403) {
    return "Phiên đăng nhập không còn quyền quản trị. Hãy đăng nhập lại bằng tài khoản admin.";
  }
  return error.response?.data?.message || fallback;
}
