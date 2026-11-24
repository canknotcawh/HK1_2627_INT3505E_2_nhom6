"""Prompt construction and dynamic time boundary computation for ai-service."""

import json
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional
from zoneinfo import ZoneInfo

VN_TZ = ZoneInfo("Asia/Ho_Chi_Minh")

# Path to few-shot examples
FEW_SHOT_FILE = Path(__file__).parent.parent / "prompts" / "few_shot.json"


def calculate_time_boundaries(reference_time_input: Optional[str] = None) -> Dict[str, str]:
    """Calculates deterministic timezone-aware (+07:00) time boundary literals for SQL injection.
    
    Args:
        reference_time_input: ISO-8601 string (e.g. '2026-11-21T12:00:00+07:00').
        
    Returns:
        Dict mapping boundary name to PostgreSQL timestamptz literal string.
    """
    if reference_time_input:
        dt = datetime.fromisoformat(reference_time_input)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=VN_TZ)
        else:
            dt = dt.astimezone(VN_TZ)
    else:
        dt = datetime.now(VN_TZ)

    # Base reference point
    today_start = dt.replace(hour=0, minute=0, second=0, microsecond=0)
    
    # Week starts on Monday (dt.weekday(): 0=Monday)
    week_start = today_start - timedelta(days=dt.weekday())

    # Month start (1st day of current month)
    month_start = today_start.replace(day=1)

    # Quarter start (1st day of current quarter: Jan, Apr, Jul, Oct)
    quarter_month = ((dt.month - 1) // 3) * 3 + 1
    quarter_start = today_start.replace(month=quarter_month, day=1)

    # Year start
    year_start = today_start.replace(month=1, day=1)

    # Relative windows
    last_7_days_start = dt - timedelta(days=7)
    last_30_days_start = dt - timedelta(days=30)

    # Previous month start
    if month_start.month == 1:
        prev_month_start = month_start.replace(year=month_start.year - 1, month=12)
    else:
        prev_month_start = month_start.replace(month=month_start.month - 1)

    # Previous quarter start
    if quarter_month == 1:
        prev_quarter_start = quarter_start.replace(year=quarter_start.year - 1, month=10)
    else:
        prev_quarter_start = quarter_start.replace(month=quarter_month - 3)

    def to_literal(d: datetime) -> str:
        # Format as PostgreSQL timestamptz literal e.g. '2026-11-21 12:00:00+07'::timestamptz
        return f"'{d.strftime('%Y-%m-%d %H:%M:%S')}+07'::timestamptz"

    return {
        "reference_time": to_literal(dt),
        "today_start": to_literal(today_start),
        "week_start": to_literal(week_start),
        "month_start": to_literal(month_start),
        "quarter_start": to_literal(quarter_start),
        "year_start": to_literal(year_start),
        "last_7_days_start": to_literal(last_7_days_start),
        "last_30_days_start": to_literal(last_30_days_start),
        "prev_month_start": to_literal(prev_month_start),
        "prev_quarter_start": to_literal(prev_quarter_start),
    }


VIEWS_DDL = """
-- 1. v_loan_analytics: 1 dòng / 1 khoản mượn (thể loại được gộp trong cột categories)
CREATE VIEW v_loan_analytics AS
  loan_id UUID,
  book_id UUID,
  book_title VARCHAR(255),
  user_id UUID,
  user_full_name VARCHAR(255),
  categories VARCHAR[], -- Mảng các tên thể loại của cuốn sách
  borrowed_at TIMESTAMPTZ,
  due_at TIMESTAMPTZ,
  returned_at TIMESTAMPTZ, -- Nullable (chỉ có khi đã hoàn trả)
  status VARCHAR(20),      -- 'ACTIVE', 'PENDING_RETURN', 'RETURNED', 'OVERDUE', 'LOST'
  renewed_count INTEGER;

-- 2. v_loan_category_analytics: 1 dòng / (khoản mượn, thể loại)
-- Dùng khi cần thống kê, gom nhóm theo từng thể loại cụ thể
CREATE VIEW v_loan_category_analytics AS
  loan_id UUID,
  book_id UUID,
  book_title VARCHAR(255),
  user_id UUID,
  user_full_name VARCHAR(255),
  category_id UUID,
  category_name VARCHAR(100),
  borrowed_at TIMESTAMPTZ,
  due_at TIMESTAMPTZ,
  returned_at TIMESTAMPTZ,
  status VARCHAR(20),
  renewed_count INTEGER;

-- 3. v_category_catalog: Danh mục các thể loại sách hiện có
CREATE VIEW v_category_catalog AS
  category_id UUID,
  category_name VARCHAR(100);
"""


DEFAULT_CATEGORIES = [
    "Fiction", "Fantasy", "Science Fiction", "Mystery & Crime", "Thriller & Suspense",
    "Horror", "Romance", "Historical Fiction", "Humor", "Poetry", "Drama",
    "Literary Studies", "Biography & Memoir", "History", "Religion & Spirituality",
    "Philosophy", "Psychology", "Self-Help", "Family & Relationships", "Children's Books",
    "Young Adult", "Comics & Graphic Novels", "Business & Economics", "Science & Technology",
]


def load_few_shot_examples(time_literals: Dict[str, str]) -> List[Dict[str, Any]]:
    """Loads few-shot examples and replaces dynamic time boundary placeholders."""
    if not FEW_SHOT_FILE.exists():
        return []

    with open(FEW_SHOT_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    # Format each example's SQL with calculated time literals
    formatted = []
    for item in data:
        ex = dict(item)
        if ex.get("sql"):
            try:
                ex["sql"] = ex["sql"].format(**time_literals)
            except KeyError:
                pass
        formatted.append(ex)
    return formatted


def build_system_prompt(reference_time_input: str, categories: Optional[List[str]] = None) -> str:
    """Builds the comprehensive system instruction prompt for Gemini."""
    time_literals = calculate_time_boundaries(reference_time_input)
    cats = categories or DEFAULT_CATEGORIES
    few_shots = load_few_shot_examples(time_literals)

    prompt_parts = [
        "BẠN LÀ TRỢ LÝ AI CHUYÊN GIA TEXT-TO-SQL CHO HỆ THỐNG QUẢN TRỊ THƯ VIỆN ĐIỆN TỬ (LMS ADMIN).",
        "Nhiệm vụ: Chuyển câu hỏi tiếng Việt của thủ thư/admin thành một câu truy vấn SQL PostgreSQL đọc dữ liệu chính xác, an toàn.",
        "",
        "### 1. QUY TẮC ĐẦU RA BẮT BUỘC",
        "- Chỉ trả về JSON tuân thủ schema:",
        '  {"status": "OK" | "OUT_OF_SCOPE", "sql": "<câu SQL>" | null, "message": "<giải thích khi OUT_OF_SCOPE>" | null}',
        "- Khi câu hỏi không liên quan đến thư viện hoặc yêu cầu thay đổi dữ liệu: trả status = 'OUT_OF_SCOPE'.",
        "- Khi câu hỏi hợp lệ: trả status = 'OK' và cung cấp câu SQL duy nhất.",
        "",
        "### 2. QUY ĐỊNH BẢO MẬT & CÚ PHÁP (AST VALIDATOR BẮT BUỘC)",
        "- CHỈ ĐƯỢC PHÉP TRUY VẤN TRÊN 3 VIEW: v_loan_analytics, v_loan_category_analytics, v_category_catalog.",
        "- TUYỆT ĐỐI CẤM truy cập bảng gốc (app_user, loan, book,...) hoặc bảng hệ thống (pg_class, information_schema).",
        "- TUYỆT ĐỐI CẤM tiền tố schema (KHÔNG DÙNG public. hay pg_catalog.).",
        "- TUYỆT ĐỐI CẤM các hàm đồng hồ động: NOW(), CURRENT_TIMESTAMP, CURRENT_DATE. BẮT BUỘC dùng mốc thời gian cố định được cung cấp bên dưới.",
        "- TUYỆT ĐỐI CẤM các literal thời gian tương đối như 'now', 'today', 'yesterday'.",
        "- TUYỆT ĐỐI CẤM DDL, DML, SELECT ... INTO, FOR UPDATE, và generate_series.",
        "- Khi xếp hạng Top-N, BẮT BUỘC có tiêu chí phụ ổn định trong ORDER BY (ví dụ: ORDER BY total_borrows DESC, user_id ASC LIMIT 5) để kết quả luôn xác định.",
        "- Khi gom nhóm theo thời gian, BẮT BUỘC dùng DATE_TRUNC('day'|'week'|'month'|'quarter'|'year', borrowed_at).",
        "",
        "### 3. SCHEMA DỮ LIỆU",
        VIEWS_DDL,
        "",
        "### 4. CÁC MỐC THỜI GIAN ĐÃ TÍNH SẴN (Múi giờ Asia/Ho_Chi_Minh):",
        f"- Thời điểm hiện tại (reference_time): {time_literals['reference_time']}",
        f"- Đầu ngày hôm nay (today_start): {time_literals['today_start']}",
        f"- Đầu tuần này (week_start - Thứ Hai): {time_literals['week_start']}",
        f"- Đầu tháng này (month_start): {time_literals['month_start']}",
        f"- Đầu quý này (quarter_start): {time_literals['quarter_start']}",
        f"- Đầu năm nay (year_start): {time_literals['year_start']}",
        f"- 7 ngày trước (last_7_days_start): {time_literals['last_7_days_start']}",
        f"- 30 ngày trước (last_30_days_start): {time_literals['last_30_days_start']}",
        f"- Đầu tháng trước (prev_month_start): {time_literals['prev_month_start']}",
        f"- Đầu quý trước (prev_quarter_start): {time_literals['prev_quarter_start']}",
        "",
        "### 5. ĐỊNH NGHĨA NGHIỆP VỤ",
        "- Lượt mượn: Đếm số dòng mượn (COUNT(*)), thời gian tính theo cột borrowed_at.",
        "- Sách đang được mượn: status = 'ACTIVE'.",
        "- Yêu cầu trả chờ duyệt: status = 'PENDING_RETURN'.",
        f"- Khoản mượn quá hạn: status = 'OVERDUE' OR (status IN ('ACTIVE', 'PENDING_RETURN') AND due_at < {time_literals['reference_time']}).",
        "- Khoản mượn trả trễ: status = 'RETURNED' AND returned_at > due_at.",
        "- Sách bị mất: status = 'LOST'.",
        "- Thống kê theo thể loại: Dùng view v_loan_category_analytics (COUNT(loan_id)).",
        "",
        "### 6. DANH MỤC THỂ LOẠI CHUẨN TRONG HỆ THỐNG (Khớp chính xác tên tiếng Anh):",
        f"{', '.join(cats)}",
        "Nếu người dùng dùng tiếng Việt (ví dụ: 'Khoa học viễn tưởng' -> 'Science Fiction', 'Kỳ ảo' -> 'Fantasy', 'Trinh thám' -> 'Mystery & Crime'), hãy ánh xạ sang đúng tên tiếng Anh ở trên. Nếu không tìm thấy thể loại tương ứng, trả về OUT_OF_SCOPE.",
        "",
        "### 7. VÍ DỤ MẪU (FEW-SHOT EXAMPLES):",
        json.dumps(few_shots, ensure_ascii=False, indent=2),
    ]

    return "\n".join(prompt_parts)
