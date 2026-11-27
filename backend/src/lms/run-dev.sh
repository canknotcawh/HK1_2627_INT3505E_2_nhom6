#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"
if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

export SPRING_PROFILES_ACTIVE="${SPRING_PROFILES_ACTIVE:-dev}"

# Trùng tên biến với application.yaml; export để Spring Boot dùng đúng DB mà script đã kiểm tra.
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5433}"
DB_NAME="${DB_NAME:-lms}"
DB_USER="${DB_USER:-lms}"
DB_PASSWORD="${DB_PASSWORD:-lms}"
SERVER_PORT="${SERVER_PORT:-8080}"
export DB_HOST DB_PORT DB_NAME DB_USER DB_PASSWORD SERVER_PORT
DB_WAIT_SECONDS="${DB_WAIT_SECONDS:-60}"

REPO_ROOT="$(cd ../../.. && pwd)"
SEED_FILE="${SEED_FILE:-${REPO_ROOT}/database/books.sql}"

info() { printf '\033[36m%s\033[0m\n' "$*"; }
warn() { printf '\033[33m%s\033[0m\n' "$*" >&2; }
fail() { printf '\033[31m%s\033[0m\n' "$*" >&2; exit 1; }

is_local() { [[ "$DB_HOST" == "localhost" || "$DB_HOST" == "127.0.0.1" || "$DB_HOST" == "::1" ]]; }
tcp_open() { (exec 3<>"/dev/tcp/$1/$2") 2>/dev/null; } # $1 = host, $2 = port

if tcp_open 127.0.0.1 "$SERVER_PORT"; then
  fail "Cổng ${SERVER_PORT} đã bị tiến trình khác dùng nên Spring Boot sẽ không khởi động được.
  Xem tiến trình: ss -ltnp | grep :${SERVER_PORT}
  (nếu là backend của lần chạy trước, dừng nó trước khi chạy lại)
  Hoặc chọn cổng khác: SERVER_PORT=8081 ./run-dev.sh"
fi

if is_local; then
  command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1 \
    || fail "Docker không sẵn sàng (thiếu lệnh 'docker' hoặc daemon chưa chạy) nên không thể tự bật Postgres dev (${DB_HOST}:${DB_PORT}). Bật Docker rồi chạy lại."

  info "Bật Postgres dev bằng docker compose (cổng ${DB_PORT})..."
  DB_PORT="$DB_PORT" docker compose up -d postgres \
    || fail "Không bật được Postgres. Xem chi tiết: cd backend/src/lms && docker compose logs postgres"

  published="$(docker compose port postgres 5432 2>/dev/null || true)"
  [[ -z "$published" || "$published" == *":${DB_PORT}" ]] \
    || fail "Postgres đang publish ${published} nhưng app cần ${DB_HOST}:${DB_PORT}.
  Tạo lại: cd backend/src/lms && DB_PORT=${DB_PORT} docker compose up -d --force-recreate postgres"
  [[ "$DB_HOST" != "::1" || -z "$published" || "$published" == *"[::1]"* ]] \
    || fail "Container Postgres chỉ publish trên ${published}, nên không kết nối được qua ::1.
  Dùng DB_HOST=localhost (hoặc DB_HOST=127.0.0.1) thay vì ::1."
fi

deadline=$((SECONDS + DB_WAIT_SECONDS))
until tcp_open "$DB_HOST" "$DB_PORT"; do
  (( SECONDS < deadline )) || {
    if is_local; then
      fail "Hết ${DB_WAIT_SECONDS}s mà ${DB_HOST}:${DB_PORT} vẫn không nhận kết nối — dừng trước khi khởi động Spring Boot.
  Container: docker ps --format '{{.Names}} {{.Ports}}' | grep postgres
  Cổng bị chiếm: ss -ltnp | grep :${DB_PORT}
  Hoặc dùng cổng khác: DB_PORT=5434 ./run-dev.sh"
    else
      fail "Hết ${DB_WAIT_SECONDS}s mà không kết nối được DB remote ${DB_HOST}:${DB_PORT} (db=${DB_NAME}).
  Kiểm tra DB_HOST/DB_PORT, mạng/VPN và firewall của máy chủ DB. Script không tự khởi động DB remote."
    fi
  }
  sleep 1
done

# Cổng mở chưa chắc đã sẵn sàng (Postgres mới khởi tạo nhận TCP trước khi init xong)
# và chưa chắc đúng user/password/database — nên đăng nhập thử, lỗi tạm thời thì thử lại.
auth_error() { [[ "$1" == *"password authentication failed"* || "$1" == *"does not exist"* ]]; }

db_login_out=""
db_login_rc=1
login_deadline=$((SECONDS + DB_WAIT_SECONDS))
while :; do
  db_login_rc=0
  if command -v psql >/dev/null 2>&1; then
    db_login_out="$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" \
      -U "$DB_USER" -d "$DB_NAME" -tAc 'select 1' 2>&1)" || db_login_rc=1
  elif is_local; then
    # Không có psql: hỏi qua container. Phải nối bằng IP của container vì image postgres
    # tin cậy mọi kết nối từ 127.0.0.1 (pg_hba) và sẽ bỏ qua mật khẩu.
    db_login_out="$(docker compose exec -T -e PGPASSWORD="$DB_PASSWORD" postgres \
      sh -c 'exec psql -h "$(hostname -i | cut -d" " -f1)" -U "$0" -d "$1" -tAc "select 1"' \
      "$DB_USER" "$DB_NAME" 2>&1)" || db_login_rc=1
  else
    db_login_rc=3 # không có client để kiểm tra
    break
  fi
  if (( db_login_rc == 0 )); then break; fi
  if auth_error "$db_login_out"; then break; fi # sai tài khoản: thử lại vô ích
  if (( SECONDS >= login_deadline )); then break; fi
  sleep 1
done

if (( db_login_rc == 1 )) && auth_error "$db_login_out"; then
  hint="Kiểm tra DB_USER/DB_PASSWORD/DB_NAME (hoặc .env)."
  if is_local; then hint+=" Compose dev tạo sẵn user/db 'lms' với mật khẩu 'lms'."; fi
  fail "Cổng ${DB_HOST}:${DB_PORT} mở nhưng đăng nhập database thất bại (user=${DB_USER}, db=${DB_NAME}).
  Lỗi Postgres: $(tr '\n' ' ' <<<"$db_login_out")
  ${hint}
  Thử tay: PGPASSWORD=... psql -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${DB_NAME} -c 'select 1'"
elif (( db_login_rc == 1 )); then
  fail "Cổng ${DB_HOST}:${DB_PORT} mở nhưng database chưa sẵn sàng sau ${DB_WAIT_SECONDS}s (đang khởi tạo hoặc chạy init script?).
  Lỗi cuối: $(tr '\n' ' ' <<<"$db_login_out")
  Xem log: docker compose logs postgres"
elif (( db_login_rc == 3 )); then
  printf '\033[33m%s\033[0m\n' \
    "Không có psql trên máy nên bỏ qua bước kiểm tra đăng nhập DB ${DB_USER}@${DB_HOST}:${DB_PORT}/${DB_NAME}." >&2
fi

# Catalog không được mount vào docker-entrypoint nữa (nó tạo bảng trước Flyway), nên nạp sau
# khi migrate xong: chờ Tomcat mở cổng (Flyway chạy trước web server) rồi nạp nếu bảng book rỗng.
seed_catalog_when_ready() {
  local deadline=$((SECONDS + 180)) rows
  until tcp_open 127.0.0.1 "$SERVER_PORT"; do
    (( SECONDS < deadline )) || return 0
    sleep 1
  done
  if ! command -v psql >/dev/null 2>&1; then
    warn "Không có psql nên không tự nạp catalog; chạy tay: PGPASSWORD=${DB_PASSWORD} psql -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${DB_NAME} -f database/books.sql"
    return 0
  fi
  rows="$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    -tAc 'select count(*) from book' 2>/dev/null)" || return 0
  [[ "$rows" == "0" ]] || return 0
  info "Bảng book đang rỗng — nạp catalog từ ${SEED_FILE}..."
  local seed_err seeded
  if seed_err="$(PGPASSWORD="$DB_PASSWORD" psql -q -v ON_ERROR_STOP=1 -h "$DB_HOST" -p "$DB_PORT" \
       -U "$DB_USER" -d "$DB_NAME" -f "$SEED_FILE" 2>&1)"; then
    seeded="$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
      -tAc 'select count(*) from book' 2>/dev/null)"
    info "Đã nạp catalog: ${seeded:-?} sách."
  else
    warn "Nạp catalog thất bại — lỗi psql:"
    printf '%s\n' "${seed_err:-psql không trả về nội dung lỗi}" >&2
    warn "Chạy tay: PGPASSWORD=${DB_PASSWORD} psql -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${DB_NAME} -f ${SEED_FILE}"
  fi
}

info "Database sẵn sàng tại ${DB_HOST}:${DB_PORT} — khởi động Spring Boot."
seed_catalog_when_ready &
exec ./mvnw spring-boot:run "$@"
