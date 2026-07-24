#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="$ROOT_DIR/docker-compose.convex-local.yml"

if [[ "${1:-}" == "--local" ]]; then
  cleanup() {
    docker compose -f "$COMPOSE_FILE" down >/dev/null 2>&1 || true
  }
  trap cleanup EXIT
  bun "$ROOT_DIR/scripts/app-dev.ts" "$@"
  exit $?
fi

exec bun "$ROOT_DIR/scripts/app-dev.ts" "$@"
