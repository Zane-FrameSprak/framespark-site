#!/usr/bin/env bash
set -euo pipefail

SERVICE_NAME="framespark-diagnosis.service"
SERVICE_USER="framespark-diagnosis"
PROJECT_DIR="/srv/framespark/diagnosis-api/current"
RELEASES_DIR="/srv/framespark/diagnosis-api/releases"
ENV_FILE="/etc/framespark/diagnosis-api.env"
DATA_DIR="/var/lib/framespark-diagnosis"
PORT="8788"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Please run with sudo: sudo bash diagnosis-api/scripts/install-diagnosis-systemd.sh" >&2
  exit 1
fi

if ! id "${SERVICE_USER}" >/dev/null 2>&1; then
  echo "Missing dedicated service user: ${SERVICE_USER}" >&2
  echo "Create a no-login system user before continuing." >&2
  exit 1
fi

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Missing env file: ${ENV_FILE}" >&2
  echo "Create it first. Do not commit it to Git." >&2
  exit 1
fi

env_perms="$(stat -c '%a' "${ENV_FILE}")"
if [[ "${env_perms}" != "600" ]]; then
  echo "Env file appears readable by group/others: ${ENV_FILE} (${env_perms})" >&2
  echo "Recommended: sudo chmod 600 ${ENV_FILE}" >&2
  exit 1
fi

if ss -lnt 2>/dev/null | grep -q ":${PORT} "; then
  echo "Port ${PORT} is already in use. Stop before installing diagnosis-api." >&2
  exit 1
fi

if [[ ! -L "${PROJECT_DIR}" ]]; then
  echo "Current release must be a symlink: ${PROJECT_DIR}" >&2
  exit 1
fi

resolved_project_dir="$(readlink -f "${PROJECT_DIR}")"
case "${resolved_project_dir}" in
  "${RELEASES_DIR}"/*) ;;
  *)
    echo "Current release points outside ${RELEASES_DIR}: ${resolved_project_dir}" >&2
    exit 1
    ;;
esac

if [[ ! -f "${PROJECT_DIR}/package.json" || ! -f "${PROJECT_DIR}/package-lock.json" ]]; then
  echo "Release is missing package metadata: ${PROJECT_DIR}" >&2
  exit 1
fi

if [[ ! -d "${PROJECT_DIR}/node_modules" ]]; then
  echo "Production dependencies are missing from the prepared release." >&2
  echo "Run npm ci --omit=dev in the versioned release before promoting current." >&2
  exit 1
fi

if [[ ! -d "${DATA_DIR}" ]]; then
  echo "Missing writable data directory: ${DATA_DIR}" >&2
  exit 1
fi

if [[ "$(stat -c '%U' "${DATA_DIR}")" != "${SERVICE_USER}" ]]; then
  echo "Data directory must be owned by ${SERVICE_USER}: ${DATA_DIR}" >&2
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "npm not found. Install Node/npm before continuing." >&2
  exit 1
fi

cat > "${SERVICE_FILE}" <<'SERVICE'
[Unit]
Description=FrameSpark Diagnosis API
After=network.target

[Service]
Type=simple
User=framespark-diagnosis
Group=framespark-diagnosis
WorkingDirectory=/srv/framespark/diagnosis-api/current
EnvironmentFile=/etc/framespark/diagnosis-api.env
ExecStart=/usr/bin/npm start
ExecStartPost=/usr/bin/curl --fail --retry 10 --retry-delay 1 http://127.0.0.1:8788/ready
Restart=on-failure
RestartSec=5
TimeoutStartSec=30
TimeoutStopSec=20
UMask=0077
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/lib/framespark-diagnosis
RestrictAddressFamilies=AF_UNIX AF_INET AF_INET6

[Install]
WantedBy=multi-user.target
SERVICE

systemctl daemon-reload
systemctl enable "${SERVICE_NAME}"
systemctl start "${SERVICE_NAME}"
systemctl status "${SERVICE_NAME}" --no-pager

echo "Installed ${SERVICE_NAME}."
echo "Release dependencies were verified but not modified."
echo "This script does not modify Nginx and does not reopen public uploads."
