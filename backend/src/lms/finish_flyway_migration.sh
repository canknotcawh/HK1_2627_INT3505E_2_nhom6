#!/usr/bin/env bash
# Finishes the Flyway migration work for Account Phase 3.
# Run from backend/src/lms (where docker-compose.yml lives).
#
#   ./finish_flyway_migration.sh                      rehearsal on scratch databases only
#   APPLY_TO_REAL=yes ./finish_flyway_migration.sh    rehearsal, then migrate the real "lms" database
#
# Never deletes or alters anything in "lms" except through Flyway when APPLY_TO_REAL=yes.
# Only the scratch databases lms_migration_copy and lms_migration_fresh are dropped and recreated.
set -euo pipefail

DB_USER_NAME=lms
REAL_DB=lms
COPY_DB=lms_migration_copy
FRESH_DB=lms_migration_fresh
MIG=src/main/resources/db/migration
EXPECTED_V2_CHECKSUM=1166829414
STAMP=$(date +%Y%m%d-%H%M%S)
BACKUP="/tmp/lms-before-apply-$STAMP.dump"
WORK=$(mktemp -d)
FAILURES=0

pg() { docker compose exec -T postgres psql -U "$DB_USER_NAME" -v ON_ERROR_STOP=1 -P pager=off "$@"; }
q()  { local db=$1; shift; pg -d "$db" -Atc "$*"; }
step() { echo; echo "== $* =="; }
pass() { echo "PASS  $*"; }
fail() { echo "FAIL  $*"; FAILURES=$((FAILURES + 1)); }
check() { # check "description" expected actual
  if [ "$2" = "$3" ]; then pass "$1"; else fail "$1 (expected '$2', got '$3')"; fi
}

flyway_checksum() {
  python3 -I - "$1" <<'EOF'
import sys, zlib
crc = 0
for line in open(sys.argv[1], encoding="utf-8-sig").read().splitlines():
    crc = zlib.crc32(line.encode("utf-8"), crc)
print(crc - 2**32 if crc >= 2**31 else crc)
EOF
}

stop_app() { # pid port
  kill -- "-$1" 2>/dev/null || kill "$1" 2>/dev/null || true
  if command -v lsof >/dev/null 2>&1; then
    lsof -ti "tcp:$2" 2>/dev/null | xargs -r kill 2>/dev/null || true
  fi
  sleep 3
}

# Starts the backend against a database with Hibernate in validate mode, waits for
# startup or failure, then stops it. Flyway runs before Hibernate validation.
run_app() { # db port logfile
  local db=$1 port=$2 log=$3 pid
  SPRING_PROFILES_ACTIVE=dev DB_HOST=127.0.0.1 DB_PORT=5433 DB_NAME="$db" \
  DB_USER="$DB_USER_NAME" DB_PASSWORD=lms SERVER_PORT="$port" MAIL_HOST=127.0.0.1 \
  SPRING_JPA_HIBERNATE_DDL_AUTO=validate \
    setsid ./mvnw -q spring-boot:run >"$log" 2>&1 &
  pid=$!
  for _ in $(seq 1 120); do
    if grep -qE "Started .* in [0-9.]+ seconds" "$log"; then stop_app "$pid" "$port"; return 0; fi
    if grep -q "APPLICATION FAILED TO START" "$log"; then break; fi
    if ! kill -0 "$pid" 2>/dev/null; then break; fi
    sleep 2
  done
  stop_app "$pid" "$port"
  echo "---- last lines of $log ----"; tail -60 "$log"
  return 1
}

fingerprint() { q "$1" "select md5(coalesce(string_agg(id::text||'|'||email||'|'||role||'|'||status, ',' order by id), '')) from app_user"; }
counts() { q "$1" "select (select count(*) from app_user)||'/'||(select count(*) from auth_refresh_session)||'/'||(select count(*) from password_reset_token)"; }
history() { q "$1" "select coalesce(string_agg(version||':'||success::text, ' ' order by installed_rank), '') from flyway_schema_history where version is not null"; }
schema_shape() { # db outfile : name-independent description of the public schema
  {
    q "$1" "select table_name||'.'||column_name||' '||data_type||' null='||is_nullable||' default='||coalesce(regexp_replace(column_default,'nextval.*','seq'),'') from information_schema.columns where table_schema='public' and table_name <> 'flyway_schema_history' order by 1"
    q "$1" "select conrelid::regclass::text||' '||contype::text||' '||pg_get_constraintdef(oid) from pg_constraint where connamespace='public'::regnamespace and conrelid::regclass::text <> 'flyway_schema_history' order by 1"
    q "$1" "select tablename||' '||regexp_replace(indexdef,'INDEX \S+ ON','INDEX x ON') from pg_indexes where schemaname='public' and tablename <> 'flyway_schema_history' order by 1"
  } | sed -E -e 's/::(character varying|text)(\[\])?//g' -e '/ c CHECK/ s/[][() ]|ARRAY//g' | sort -u > "$2"
}
verify_phase3() { # db label
  check "$2: keycloak_subject is nullable" "YES" \
    "$(q "$1" "select is_nullable from information_schema.columns where table_name='app_user' and column_name='keycloak_subject'")"
  check "$2: both Phase 3 foreign keys cascade on delete" "2" \
    "$(q "$1" "select count(*) from pg_constraint where conname in ('fk_auth_refresh_session_user','fk_password_reset_token_user') and confdeltype='c'")"
  check "$2: Phase 3 indexes present" "3" \
    "$(q "$1" "select count(*) from pg_indexes where indexname in ('idx_auth_refresh_session_user_active','idx_auth_refresh_session_family','idx_password_reset_token_user')")"
  check "$2: ck_loan_status present" "1" \
    "$(q "$1" "select count(*) from pg_constraint where conname='ck_loan_status'")"
  check "$2: no failed Flyway rows" "0" \
    "$(q "$1" "select count(*) from flyway_schema_history where not success")"
  check "$2: highest applied version is 6" "6" \
    "$(q "$1" "select max(version::int) from flyway_schema_history where version is not null")"
}

step "0. Preconditions"
[ -f "docker-compose.yml" ] || { echo "Run this from backend/src/lms"; exit 2; }
docker compose ps postgres >/dev/null
for f in B4__complete_schema_after_v4.sql V1__create_identity_tables.sql V2__seed_roles.sql \
         V3__harden_user_storage.sql V4__track_bootstrap_admin_grant.sql \
         V5__account_identity_sessions.sql V6__reconcile_account_phase3_schema.sql; do
  [ -f "$MIG/$f" ] && pass "$f present" || fail "$f missing"
done
extra=$(ls "$MIG" | grep -vE '^(B4__complete_schema_after_v4|V[1-6]__.*)\.sql$' || true)
[ -z "$extra" ] && pass "no unexpected files in migration folder" || fail "unexpected files: $extra"
dupes=$(ls "$MIG" | grep -oE '^V[0-9]+' | sort | uniq -d || true)
[ -z "$dupes" ] && pass "no duplicate migration versions" || fail "duplicate versions: $dupes"
check "V2 checksum matches the one recorded in the database" "$EXPECTED_V2_CHECKSUM" \
  "$(flyway_checksum "$MIG/V2__seed_roles.sql")"
grep -n -i "flyway\|ddl-auto" pom.xml src/main/resources/application*.y*ml || true
grep -q "flyway-database-postgresql" pom.xml && pass "pom has flyway-database-postgresql" \
  || fail "pom.xml has no flyway-database-postgresql (needed by Flyway 10+ for PostgreSQL)"
grep -q "starter-flyway" pom.xml && pass "pom has spring-boot-starter-flyway" || fail "pom.xml has no spring-boot-starter-flyway"
if grep -rqi "baseline-on-migrate: *true" src/main/resources; then fail "baseline-on-migrate is true; remove it"; else pass "baseline-on-migrate is not enabled"; fi
[ "$FAILURES" -eq 0 ] || { echo; echo "Fix the failures above before continuing."; exit 1; }

step "1. Backup of the real database (read-only)"
docker compose exec -T postgres pg_dump -U "$DB_USER_NAME" -d "$REAL_DB" --format=custom --no-owner --no-acl > "$BACKUP"
[ -s "$BACKUP" ] && pass "backup written to $BACKUP" || { fail "backup is empty"; exit 1; }
BEFORE_FP=$(fingerprint "$REAL_DB"); BEFORE_COUNTS=$(counts "$REAL_DB")
echo "real db users/sessions/reset-tokens: $BEFORE_COUNTS"
echo "real db flyway history: $(history "$REAL_DB")"

step "2. Rehearsal on a copy of the real data"
pg -d postgres -c "DROP DATABASE IF EXISTS $COPY_DB" -c "DROP DATABASE IF EXISTS $FRESH_DB" \
   -c "CREATE DATABASE $COPY_DB" -c "CREATE DATABASE $FRESH_DB"
docker compose exec -T postgres pg_restore -U "$DB_USER_NAME" -d "$COPY_DB" --no-owner --no-acl < "$BACKUP"
if run_app "$COPY_DB" 18081 "$WORK/copy.log"; then pass "backend starts on the copy (Flyway enabled, ddl-auto=validate)"; else fail "backend did not start on the copy"; fi
echo "copy flyway history: $(history "$COPY_DB")"
check "copy: history is 1..6, all successful" "1:true 2:true 3:true 4:true 5:true 6:true" "$(history "$COPY_DB")"
check "copy: user, session and reset-token data unchanged" "$BEFORE_COUNTS" "$(counts "$COPY_DB")"
check "copy: user rows unchanged" "$BEFORE_FP" "$(fingerprint "$COPY_DB")"
verify_phase3 "$COPY_DB" "copy"

step "3. Fresh database built only from the committed migrations"
if run_app "$FRESH_DB" 18082 "$WORK/fresh.log"; then pass "backend starts on a fresh database (Flyway enabled, ddl-auto=validate)"; else fail "backend did not start on the fresh database"; fi
echo "fresh flyway history: $(history "$FRESH_DB")"
verify_phase3 "$FRESH_DB" "fresh"

step "4. Fresh database vs migrated copy (schema shape)"
schema_shape "$COPY_DB" "$WORK/shape_copy.txt"
schema_shape "$FRESH_DB" "$WORK/shape_fresh.txt"
if diff "$WORK/shape_copy.txt" "$WORK/shape_fresh.txt" > "$WORK/shape.diff"; then
  pass "fresh and migrated schemas are identical (ignoring names)"
else
  fail "schemas differ; '<' is the migrated copy, '>' is the fresh database"
  cat "$WORK/shape.diff"
fi

step "5. Unit tests"
if ./mvnw -q test; then pass "./mvnw -q test"; else fail "./mvnw -q test"; fi

if [ "$FAILURES" -ne 0 ]; then
  echo; echo "$FAILURES check(s) failed. The real database was not touched. Logs: $WORK"
  exit 1
fi

if [ "${APPLY_TO_REAL:-no}" != "yes" ]; then
  echo
  echo "Rehearsal passed. The real database was not touched."
  echo "Stop the running backend, then run: APPLY_TO_REAL=yes $0"
  exit 0
fi

step "6. Applying to the real database (Flyway only)"
echo "Backup for this step: $BACKUP"
if run_app "$REAL_DB" 18083 "$WORK/real.log"; then pass "backend starts on $REAL_DB with Flyway enabled"; else fail "backend did not start on $REAL_DB"; fi
echo "real flyway history: $(history "$REAL_DB")"
check "real: history is 1..6, all successful" "1:true 2:true 3:true 4:true 5:true 6:true" "$(history "$REAL_DB")"
check "real: user, session and reset-token data unchanged" "$BEFORE_COUNTS" "$(counts "$REAL_DB")"
check "real: user rows unchanged" "$BEFORE_FP" "$(fingerprint "$REAL_DB")"
verify_phase3 "$REAL_DB" "real"

echo
if [ "$FAILURES" -eq 0 ]; then
  echo "All checks passed. Start the backend as usual."
else
  echo "$FAILURES check(s) failed. Backup: $BACKUP. Logs: $WORK"
  echo "To restore manually: docker compose exec -T postgres pg_restore -U $DB_USER_NAME -d $REAL_DB --clean --if-exists --no-owner --no-acl < $BACKUP"
  exit 1
fi
