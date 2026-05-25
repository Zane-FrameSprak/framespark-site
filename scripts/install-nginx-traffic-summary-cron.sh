#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="/tmp/framespark-site"
OUTPUT_DIR="/home/ubuntu/framespark-reports"
CRON_LOG="$OUTPUT_DIR/traffic-summary-cron.log"
MARKER="FrameSpark traffic summary"
CRON_LINE="*/10 * * * * cd $PROJECT_DIR && bash scripts/run-nginx-traffic-summary.sh >> $CRON_LOG 2>&1 # $MARKER"

if [ "$(id -u)" -ne 0 ]; then
  echo "Error: Nginx 日志需要 root 权限读取，请使用 sudo bash scripts/install-nginx-traffic-summary-cron.sh" >&2
  exit 1
fi

if [ ! -d "$PROJECT_DIR" ]; then
  echo "Error: project directory does not exist: $PROJECT_DIR" >&2
  exit 1
fi

if [ ! -f "$PROJECT_DIR/scripts/run-nginx-traffic-summary.sh" ]; then
  echo "Error: run script does not exist: $PROJECT_DIR/scripts/run-nginx-traffic-summary.sh" >&2
  exit 1
fi

mkdir -p "$OUTPUT_DIR"

tmp_cron="$(mktemp)"
current_cron="$(crontab -l 2>/dev/null || true)"

if [ -n "$current_cron" ]; then
  printf '%s\n' "$current_cron" | grep -v "$MARKER" > "$tmp_cron" || true
else
  : > "$tmp_cron"
fi

printf '%s\n' "$CRON_LINE" >> "$tmp_cron"
crontab "$tmp_cron"
rm -f "$tmp_cron"

echo "Installed FrameSpark traffic summary cron:"
crontab -l | grep "$MARKER" || true
