#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-/tmp/framespark-site}"
INPUT_DIR="${ANALYTICS_INPUT_DIR:-/home/ubuntu/framespark-analytics}"
OUTPUT_DIR="${ANALYTICS_SUMMARY_OUTPUT_DIR:-/home/ubuntu/framespark-analytics-summaries}"
SUMMARY_SCRIPT="$PROJECT_DIR/analytics-api/scripts/analytics-summary.js"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required to generate analytics summaries." >&2
  exit 1
fi

if [ ! -f "$SUMMARY_SCRIPT" ]; then
  echo "Analytics summary script not found: $SUMMARY_SCRIPT" >&2
  exit 1
fi

mkdir -p "$OUTPUT_DIR"

node "$SUMMARY_SCRIPT" --input-dir "$INPUT_DIR" --range today --output "$OUTPUT_DIR/analytics-summary-today.json"
node "$SUMMARY_SCRIPT" --input-dir "$INPUT_DIR" --range yesterday --output "$OUTPUT_DIR/analytics-summary-yesterday.json"
node "$SUMMARY_SCRIPT" --input-dir "$INPUT_DIR" --range last7 --output "$OUTPUT_DIR/analytics-summary-last7.json"
node "$SUMMARY_SCRIPT" --input-dir "$INPUT_DIR" --range last30 --output "$OUTPUT_DIR/analytics-summary-last30.json"

echo "Analytics summary files generated:"
echo "$OUTPUT_DIR/analytics-summary-today.json"
echo "$OUTPUT_DIR/analytics-summary-yesterday.json"
echo "$OUTPUT_DIR/analytics-summary-last7.json"
echo "$OUTPUT_DIR/analytics-summary-last30.json"
