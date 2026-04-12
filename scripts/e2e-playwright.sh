#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${E2E_ENV_FILE:-$ROOT_DIR/.env.e2e.local}"

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

rm -rf "$ROOT_DIR/test-results" "$ROOT_DIR/playwright-report" "$ROOT_DIR/.playwright"

export VITE_E2E_LOCAL_AUTH="${VITE_E2E_LOCAL_AUTH:-true}"
export E2E_APP_PORT="${E2E_APP_PORT:-6001}"
export PLAYWRIGHT_BASE_URL="${PLAYWRIGHT_BASE_URL:-http://localhost:${E2E_APP_PORT}}"

npx playwright test "$@"
