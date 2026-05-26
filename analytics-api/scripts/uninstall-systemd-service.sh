#!/usr/bin/env bash
set -euo pipefail

SERVICE_NAME="framespark-analytics.service"
SERVICE_PATH="/etc/systemd/system/${SERVICE_NAME}"
DATA_DIR="/home/ubuntu/framespark-analytics"

if [ "${EUID}" -ne 0 ]; then
  echo "请使用 sudo bash analytics-api/scripts/uninstall-systemd-service.sh"
  exit 1
fi

if systemctl list-unit-files "${SERVICE_NAME}" >/dev/null 2>&1; then
  systemctl stop "${SERVICE_NAME}" 2>/dev/null || true
  systemctl disable "${SERVICE_NAME}" 2>/dev/null || true
fi

if [ -f "${SERVICE_PATH}" ]; then
  rm -f "${SERVICE_PATH}"
fi

systemctl daemon-reload

echo "已卸载 ${SERVICE_NAME}。"
echo "数据目录未删除：${DATA_DIR}"
