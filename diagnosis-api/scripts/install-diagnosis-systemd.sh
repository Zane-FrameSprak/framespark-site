#!/usr/bin/env bash
set -euo pipefail

SERVICE_NAME="framespark-diagnosis.service"
PROJECT_DIR="/tmp/framespark-site/diagnosis-api"
ENV_FILE="/home/ubuntu/framespark-diagnosis.env"
PORT="8788"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Please run with sudo: sudo bash diagnosis-api/scripts/install-diagnosis-systemd.sh" >&2
  exit 1
fi

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Missing env file: ${ENV_FILE}" >&2
  echo "Create it first. Do not commit it to Git." >&2
  exit 1
fi

env_perms="$(stat -c '%a' "${ENV_FILE}")"
if [[ "${env_perms}" =~ .*[4567]$ ]]; then
  echo "Env file appears readable by group/others: ${ENV_FILE} (${env_perms})" >&2
  echo "Recommended: sudo chmod 600 ${ENV_FILE}" >&2
  exit 1
fi

if ss -lnt 2>/dev/null | grep -q ":${PORT} "; then
  echo "Port ${PORT} is already in use. Stop before installing diagnosis-api." >&2
  exit 1
fi

if [[ ! -d "${PROJECT_DIR}" ]]; then
  echo "Missing working directory: ${PROJECT_DIR}" >&2
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "npm not found. Install Node/npm before continuing." >&2
  exit 1
fi

cd "${PROJECT_DIR}"
echo "Installing production dependencies in ${PROJECT_DIR}..."
npm install --omit=dev

cat > "${SERVICE_FILE}" <<'SERVICE'
[Unit]
Description=FrameSpark Diagnosis API
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/tmp/framespark-site/diagnosis-api
EnvironmentFile=/home/ubuntu/framespark-diagnosis.env
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
SERVICE

systemctl daemon-reload
systemctl enable "${SERVICE_NAME}"
systemctl start "${SERVICE_NAME}"
systemctl status "${SERVICE_NAME}" --no-pager

echo "Installed ${SERVICE_NAME}."
echo "This script does not modify Nginx and does not reopen public uploads."
