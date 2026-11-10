package com.soa.gr6.lms.service.identity;

final class VerificationEmailHtml {

    private static final String BRAND = "#e60023";
    private static final String[] DIGIT_COLORS = {
            "#e60023", "#f97316", "#d97706", "#16a34a", "#2563eb", "#7c3aed"
    };

    private VerificationEmailHtml() {
    }

    static String render(String code, long ttlMinutes, String link) {
        StringBuilder digits = new StringBuilder();
        for (int i = 0; i < code.length(); i++) {
            String color = DIGIT_COLORS[i % DIGIT_COLORS.length];
            digits.append("<td style=\"padding:0 4px\">")
                    .append("<div style=\"width:46px;height:58px;line-height:58px;text-align:center;")
                    .append("font-size:30px;font-weight:700;font-family:Consolas,'Courier New',monospace;")
                    .append("color:").append(color).append(";background:#ffffff;")
                    .append("border:2px solid ").append(color).append(";border-radius:10px\">")
                    .append(code.charAt(i)).append("</div></td>");
        }
        String safeLink = link.replace("&", "&amp;").replace("\"", "&quot;");
        return "<!DOCTYPE html><html><body style=\"margin:0;padding:24px;background:#f4f4f5;"
                + "font-family:Segoe UI,Arial,sans-serif;color:#18181b\">"
                + "<table role=\"presentation\" align=\"center\" width=\"480\" cellpadding=\"0\" cellspacing=\"0\" "
                + "style=\"max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden\">"
                + "<tr><td style=\"background:" + BRAND + ";padding:20px 28px;color:#ffffff;"
                + "font-size:20px;font-weight:700\">Thư viện điện tử</td></tr>"
                + "<tr><td style=\"padding:28px\">"
                + "<p style=\"margin:0 0 8px;font-size:18px;font-weight:600\">Xác minh email của bạn</p>"
                + "<p style=\"margin:0 0 24px;font-size:14px;line-height:1.6;color:#52525b\">"
                + "Nhập mã gồm 6 số dưới đây vào trang xác minh. Mã có hiệu lực trong "
                + ttlMinutes + " phút.</p>"
                + "<table role=\"presentation\" align=\"center\" cellpadding=\"0\" cellspacing=\"0\"><tr>"
                + digits + "</tr></table>"
                + "<p style=\"margin:28px 0 12px;text-align:center;font-size:13px;color:#71717a\">"
                + "Hoặc xác minh nhanh bằng một lần bấm:</p>"
                + "<p style=\"margin:0;text-align:center\"><a href=\"" + safeLink + "\" "
                + "style=\"display:inline-block;background:" + BRAND + ";color:#ffffff;text-decoration:none;"
                + "padding:12px 28px;border-radius:999px;font-size:14px;font-weight:600\">Xác minh email</a></p>"
                + "<p style=\"margin:28px 0 0;font-size:12px;line-height:1.5;color:#a1a1aa\">"
                + "Nếu bạn không đăng ký tài khoản, hãy bỏ qua email này.</p>"
                + "</td></tr></table></body></html>";
    }
}
