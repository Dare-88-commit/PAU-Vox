#!/usr/bin/env bash
set -euo pipefail

HOST="${HOST:-0.0.0.0}"
PORT="${PORT:-8000}"
WORKERS="${WORKERS:-4}"
KEEP_ALIVE_SECONDS="${KEEP_ALIVE_SECONDS:-30}"
LOG_LEVEL="${LOG_LEVEL:-info}"

exec uvicorn app.main:app \
  --host "$HOST" \
  --port "$PORT" \
  --workers "$WORKERS" \
  --loop uvloop \
  --http httptools \
  --timeout-keep-alive "$KEEP_ALIVE_SECONDS" \
  --log-level "$LOG_LEVEL"

