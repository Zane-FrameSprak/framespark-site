#!/usr/bin/env bash
set -euo pipefail

OUTPUT_DIR="/home/ubuntu/framespark-analytics-summaries"
CRON_MARKER="# FrameSpark analytics summary cron"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="${PROJECT_DIR:-$(cd "$SCRIPT_DIR/../.." && pwd)}"
CRON_COMMAND="*/5 * * * * cd $PROJECT_DIR && bash analytics-api/scripts/run-analytics-summary.sh >> /home/ubuntu/framespark-analytics-summaries/analytics-summary-cron.log 2>&1 $CRON_MARKER"

if [ "$(id -u)" -ne 0 ]; then
  echo "请使用 sudo bash analytics-api/scripts/install-analytics-summary-cron.sh"
  exit 1
fi

mkdir -p "$OUTPUT_DIR"
chown ubuntu:ubuntu "$OUTPUT_DIR" 2>/dev/null || true

tmp_file="$(mktemp)"
trap 'rm -f "$tmp_file"' EXIT

crontab -l 2>/dev/null | grep -v "FrameSpark analytics summary cron" > "$tmp_file" || true
echo "$CRON_COMMAND" >> "$tmp_file"
crontab "$tmp_file"

echo "Installed FrameSpark analytics summary cron:"
crontab -l | grep "FrameSpark analytics summary cron" || true
