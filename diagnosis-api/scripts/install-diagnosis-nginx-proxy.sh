#!/usr/bin/env bash
set -euo pipefail

SERVICE_NAME="framespark-diagnosis.service"
NGINX_CONF="/www/server/panel/vhost/nginx/framespark.cn.conf"
BACKUP_SUFFIX="$(date +%Y%m%d-%H%M%S)"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Please run with sudo: sudo bash diagnosis-api/scripts/install-diagnosis-nginx-proxy.sh" >&2
  exit 1
fi

if ! systemctl is-active --quiet "${SERVICE_NAME}"; then
  echo "${SERVICE_NAME} is not active. Install and verify systemd service first." >&2
  exit 1
fi

if ! curl -fsS "http://127.0.0.1:8788/health" >/dev/null; then
  echo "Local diagnosis health check failed: http://127.0.0.1:8788/health" >&2
  exit 1
fi

if [[ ! -f "${NGINX_CONF}" ]]; then
  echo "Nginx site config not found: ${NGINX_CONF}" >&2
  echo "Stop and confirm the framespark.cn Nginx config path manually." >&2
  exit 1
fi

if grep -q "location /api/diagnosis/" "${NGINX_CONF}"; then
  echo "Nginx already contains location /api/diagnosis/. No change made."
  exit 0
fi

backup="${NGINX_CONF}.bak.diagnosis-${BACKUP_SUFFIX}"
cp "${NGINX_CONF}" "${backup}"
echo "Backup prepared: ${backup}"

cat <<'SNIPPET'
Manual Nginx location to add inside the HTTPS framespark.cn server block:

# FrameSpark diagnosis API proxy start
location /api/diagnosis/ {
    proxy_pass http://127.0.0.1:8788/api/diagnosis/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    client_max_body_size 10m;
    proxy_read_timeout 180s;
    proxy_send_timeout 180s;
}
# FrameSpark diagnosis API proxy end

After manual edit, run:
  sudo /www/server/nginx/sbin/nginx -t -c /www/server/nginx/conf/nginx.conf
  sudo /www/server/nginx/sbin/nginx -s reload -c /www/server/nginx/conf/nginx.conf
SNIPPET

echo "No automatic Nginx edit was made. Avoiding blind insertion."
echo "This script does not affect /api/analytics/ and does not reopen public uploads."
exit 2
