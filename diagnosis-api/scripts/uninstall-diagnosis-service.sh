#!/usr/bin/env bash
set -euo pipefail

SERVICE_NAME="framespark-diagnosis.service"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}"
ENV_FILE="/etc/framespark/diagnosis-api.env"
PROJECT_DIR="/srv/framespark/diagnosis-api"
DATA_DIR="/var/lib/framespark-diagnosis"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Please run with sudo: sudo bash diagnosis-api/scripts/uninstall-diagnosis-service.sh" >&2
  exit 1
fi

if systemctl list-unit-files "${SERVICE_NAME}" >/dev/null 2>&1; then
  systemctl stop "${SERVICE_NAME}" 2>/dev/null || true
  systemctl disable "${SERVICE_NAME}" 2>/dev/null || true
fi

if [[ -f "${SERVICE_FILE}" ]]; then
  rm -f "${SERVICE_FILE}"
fi

systemctl daemon-reload

echo "Uninstalled ${SERVICE_NAME} if it existed."
echo "Env file preserved: ${ENV_FILE}"
echo "Source directory preserved: ${PROJECT_DIR}"
echo "Diagnosis data preserved: ${DATA_DIR}"
echo "Nginx diagnosis proxy is not changed by this script; roll it back separately if needed."
