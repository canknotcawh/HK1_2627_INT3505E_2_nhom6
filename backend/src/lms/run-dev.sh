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
export DB_HOST DB_PORT DB_NAME DB_USER DB_PASSWORD
DB_WAIT_SECONDS="${DB_WAIT_SECONDS:-60}"

info() { printf '\033[36m%s\033[0m\n' "$*"; }
warn() { printf '\033[33m%s\033[0m\n' "$*" >&2; }
fail() { printf '\033[31m%s\033[0m\n' "$*" >&2; exit 1; }

is_local() { [[ "$DB_HOST" == "localhost" || "$DB_HOST" == "127.0.0.1" || "$DB_HOST" == "::1" ]]; }
port_open() { (exec 3<>"/dev/tcp/${DB_HOST}/${DB_PORT}") 2>/dev/null; }
psql_hint() { echo "  psql -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${DB_NAME} -c 'select 1'"; }

# 0 = đăng nhập + chọn database OK, 1 = sai, 2 = không có client để kiểm tra.
DB_LOGIN_ERROR=""
db_login_ok() {
  local out
  if command -v psql >/dev/null 2>&1; then
    out="$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc 'select 1' 2>&1)" \
      || { DB_LOGIN_ERROR="$(tr '\n' ' ' <<<"$out")"; return 1; }
  elif is_local; then
    # Không có psql trên máy: hỏi DB qua container. Phải nối bằng IP của container,
    # vì image postgres tin cậy mọi kết nối từ 127.0.0.1 (pg_hba) nên sẽ bỏ qua mật khẩu.
    out="$(docker compose exec -T -e PGPASSWORD="$DB_PASSWORD" postgres \
      sh -c 'exec psql -h "$(hostname -i | cut -d" " -f1)" -p 5432 -U "$0" -d "$1" -tAc "select 1"' \
      "$DB_USER" "$DB_NAME" 2>&1)" \
      || { DB_LOGIN_ERROR="$(tr '\n' ' ' <<<"$out")"; return 1; }
  else
    return 2
  fi
}

if is_local; then
  command -v docker >/dev/null 2>&1 \
    || fail "Không có 'docker' nên không thể tự bật Postgres dev (${DB_HOST}:${DB_PORT}). Cài Docker hoặc trỏ DB_HOST sang máy khác."
  docker info >/dev/null 2>&1 \
    || fail "Docker daemon chưa chạy nên không thể tự bật Postgres dev (${DB_HOST}:${DB_PORT}). Bật Docker rồi chạy lại."

  info "Bật Postgres dev bằng docker compose (cổng ${DB_PORT})..."
  DB_PORT="$DB_PORT" docker compose up -d postgres \
    || fail "Không bật được Postgres. Xem chi tiết: cd backend/src/lms && docker compose logs postgres"

  published="$(docker compose port postgres 5432 2>/dev/null || true)"
  [[ -z "$published" || "$published" == *":${DB_PORT}" ]] \
    || fail "Postgres đang publish ${published} nhưng app cần ${DB_HOST}:${DB_PORT}.
  Tạo lại: cd backend/src/lms && DB_PORT=${DB_PORT} docker compose up -d --force-recreate postgres"
fi

deadline=$((SECONDS + DB_WAIT_SECONDS))
until port_open; do
  (( SECONDS < deadline )) || fail "Hết ${DB_WAIT_SECONDS}s mà ${DB_HOST}:${DB_PORT} vẫn không nhận kết nối — dừng trước khi khởi động Spring Boot.
  Kiểm tra: docker ps --format '{{.Names}} {{.Ports}}' | grep postgres
            ss -ltnp | grep :${DB_PORT}   # cổng bị project khác chiếm?
  Hoặc dùng cổng khác: DB_PORT=5434 ./run-dev.sh"
  sleep 1
done

login_rc=0
db_login_ok || login_rc=$?
case "$login_rc" in
  0) ;;
  1) fail "Cổng ${DB_HOST}:${DB_PORT} mở nhưng đăng nhập database thất bại.
  user=${DB_USER}  db=${DB_NAME}
  Lỗi Postgres: ${DB_LOGIN_ERROR}
  Kiểm tra DB_USER/DB_PASSWORD/DB_NAME (hoặc .env). Compose dev tạo sẵn user/db 'lms' với mật khẩu 'lms'.
  Thử tay: $(psql_hint)" ;;
  2) warn "Không có psql trên máy nên bỏ qua bước kiểm tra đăng nhập DB (${DB_USER}@${DB_HOST}:${DB_PORT}/${DB_NAME})." ;;
esac

info "Database sẵn sàng tại ${DB_HOST}:${DB_PORT} — khởi động Spring Boot."
exec ./mvnw spring-boot:run "$@"
