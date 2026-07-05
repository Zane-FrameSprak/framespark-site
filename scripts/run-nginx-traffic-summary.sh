#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="${PROJECT_DIR:-$(cd "$SCRIPT_DIR/.." && pwd)}"
ACCESS_LOG="/www/wwwlogs/framespark.cn.log"
ERROR_LOG="/www/wwwlogs/framespark.cn.error.log"
OUTPUT_DIR="/home/ubuntu/framespark-reports"
SUMMARY_SCRIPT="${PROJECT_DIR}/scripts/nginx-traffic-summary.js"

if ! command -v node >/dev/null 2>&1; then
  echo "Error: node is not installed or not available in PATH." >&2
  exit 1
fi

if [ ! -d "$PROJECT_DIR" ]; then
  echo "Error: project directory does not exist: $PROJECT_DIR" >&2
  exit 1
fi

if [ ! -f "$SUMMARY_SCRIPT" ]; then
  echo "Error: summary script does not exist: $SUMMARY_SCRIPT" >&2
  exit 1
fi

if [ ! -f "$ACCESS_LOG" ]; then
  echo "Error: access log does not exist: $ACCESS_LOG" >&2
  exit 1
fi

if [ ! -f "$ERROR_LOG" ]; then
  echo "Error: error log does not exist: $ERROR_LOG" >&2
  exit 1
fi

if [ ! -r "$ACCESS_LOG" ]; then
  echo "Error: Nginx 日志需要 sudo 权限读取，请使用 sudo bash scripts/run-nginx-traffic-summary.sh" >&2
  exit 1
fi

if [ ! -r "$ERROR_LOG" ]; then
  echo "Error: Nginx 错误日志需要 sudo 权限读取，请使用 sudo bash scripts/run-nginx-traffic-summary.sh" >&2
  exit 1
fi

mkdir -p "$OUTPUT_DIR"

run_summary() {
  local range="$1"
  local output="$2"

  node "$SUMMARY_SCRIPT" \
    --access-log "$ACCESS_LOG" \
    --error-log "$ERROR_LOG" \
    --range "$range" \
    --output "$output"

  echo "Generated: $output"
}

run_summary "today" "$OUTPUT_DIR/traffic-summary-today.json"
run_summary "yesterday" "$OUTPUT_DIR/traffic-summary-yesterday.json"
run_summary "last7" "$OUTPUT_DIR/traffic-summary-last7.json"
run_summary "last30" "$OUTPUT_DIR/traffic-summary-last30.json"
