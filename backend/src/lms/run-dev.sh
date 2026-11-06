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

exec ./mvnw spring-boot:run "$@"
