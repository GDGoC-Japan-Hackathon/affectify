#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

INSTANCE_CONNECTION_NAME="${INSTANCE_CONNECTION_NAME:-hackathon-2e83a:asia-northeast1:whitecoder-postgres-dev}"
DB_NAME="${DB_NAME:-affectify}"
DB_USER="${DB_USER:-whitecoder_app}"
DB_PASSWORD="${DB_PASSWORD:-}"
PROXY_PORT="${PROXY_PORT:-15432}"

if [[ -z "${DB_PASSWORD}" ]]; then
  echo "DB_PASSWORD is required." >&2
  exit 1
fi

if ! command -v cloud-sql-proxy >/dev/null 2>&1; then
  echo "cloud-sql-proxy command not found." >&2
  exit 1
fi

if ! command -v atlas >/dev/null 2>&1; then
  echo "atlas command not found." >&2
  exit 1
fi

cleanup() {
  if [[ -n "${PROXY_PID:-}" ]]; then
    # migration 終了後に Cloud SQL Proxy を確実に停止する。
    kill "${PROXY_PID}" >/dev/null 2>&1 || true
    wait "${PROXY_PID}" >/dev/null 2>&1 || true
  fi
}

trap cleanup EXIT

# Cloud SQL へローカルの Atlas CLI から接続できるよう、一時的に proxy を立てる。
cloud-sql-proxy "${INSTANCE_CONNECTION_NAME}" --port "${PROXY_PORT}" >/tmp/cloud-sql-proxy.log 2>&1 &
PROXY_PID=$!

# proxy が起動する前に Atlas が走ると接続失敗するため、ポートが開くまで待つ。
for _ in {1..30}; do
  if nc -z 127.0.0.1 "${PROXY_PORT}" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

if ! nc -z 127.0.0.1 "${PROXY_PORT}" >/dev/null 2>&1; then
  echo "cloud-sql-proxy did not become ready." >&2
  echo "See /tmp/cloud-sql-proxy.log for details." >&2
  exit 1
fi

cd "${BACKEND_DIR}"

# Cloud SQL Proxy 越しに Cloud SQL へ migration を適用する。
atlas migrate apply \
  --dir file://migrations \
  --url "postgres://${DB_USER}:${DB_PASSWORD}@127.0.0.1:${PROXY_PORT}/${DB_NAME}?sslmode=disable"
