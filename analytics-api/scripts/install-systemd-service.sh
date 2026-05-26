#!/usr/bin/env bash
set -euo pipefail

SERVICE_NAME="framespark-analytics.service"
SERVICE_PATH="/etc/systemd/system/${SERVICE_NAME}"
PROJECT_DIR="/tmp/framespark-site/analytics-api"
DATA_DIR="/home/ubuntu/framespark-analytics"

if [ "${EUID}" -ne 0 ]; then
  echo "请使用 sudo bash analytics-api/scripts/install-systemd-service.sh"
  exit 1
fi

if [ ! -d "${PROJECT_DIR}" ]; then
  echo "项目目录不存在：${PROJECT_DIR}"
  echo "请先在服务器执行：cd /tmp/framespark-site && git pull"
  exit 1
fi

if [ ! -f "${PROJECT_DIR}/package.json" ]; then
  echo "未找到 analytics-api/package.json：${PROJECT_DIR}/package.json"
  exit 1
fi

mkdir -p "${DATA_DIR}"
chown ubuntu:ubuntu "${DATA_DIR}"

cat > "${SERVICE_PATH}" <<SERVICE
[Unit]
Description=FrameSpark Analytics API
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=${PROJECT_DIR}
Environment=NODE_ENV=production
Environment=ANALYTICS_HOST=127.0.0.1
Environment=ANALYTICS_PORT=8787
Environment=ANALYTICS_DATA_DIR=${DATA_DIR}
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
SERVICE

systemctl daemon-reload
systemctl enable "${SERVICE_NAME}"
systemctl restart "${SERVICE_NAME}"

systemctl status "${SERVICE_NAME}" --no-pager
