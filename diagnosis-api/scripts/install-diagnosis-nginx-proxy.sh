#!/usr/bin/env bash
set -euo pipefail

SERVICE_NAME="framespark-diagnosis.service"
NGINX_CONF="/www/server/panel/vhost/nginx/framespark.cn.conf"
AUTH_FILE="/www/server/nginx/conf/framespark-diagnosis-beta.htpasswd"
BETA_DIR="/srv/framespark/diagnosis-beta-site/current"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Please run with sudo: sudo bash diagnosis-api/scripts/install-diagnosis-nginx-proxy.sh" >&2
  exit 1
fi

if ! systemctl is-active --quiet "${SERVICE_NAME}"; then
  echo "${SERVICE_NAME} is not active. Install and verify systemd service first." >&2
  exit 1
fi

if ! curl -fsS "http://127.0.0.1:8788/ready" >/dev/null; then
  echo "Local diagnosis readiness check failed: http://127.0.0.1:8788/ready" >&2
  exit 1
fi

if [[ ! -f "${AUTH_FILE}" ]]; then
  echo "Missing Basic Auth file: ${AUTH_FILE}" >&2
  echo "Create invite-only credentials before adding the proxy." >&2
  exit 1
fi

if [[ ! -f "${BETA_DIR}/index.html" || ! -f "${BETA_DIR}/app.js" || ! -f "${BETA_DIR}/beta.css" ]]; then
  echo "Protected Beta assets are missing from ${BETA_DIR}." >&2
  exit 1
fi

if [[ ! -f "${NGINX_CONF}" ]]; then
  echo "Nginx site config not found: ${NGINX_CONF}" >&2
  echo "Stop and confirm the framespark.cn Nginx config path manually." >&2
  exit 1
fi

check_location() {
  local label="$1"
  local pattern="$2"
  if grep -Fq "${pattern}" "${NGINX_CONF}"; then
    echo "PRESENT:${label}"
  else
    echo "MISSING:${label}"
  fi
}

echo "Current Nginx diagnosis location audit:"
check_location "beta-page" "location = /diagnosis/beta/"
check_location "beta-app" "location = /diagnosis/beta/app.js"
check_location "beta-style" "location = /diagnosis/beta/beta.css"
check_location "diagnosis-api" "location = /api/diagnosis/"
echo "Review every PRESENT location against the canonical B1 snippet below; add only missing locations."

cat <<'SNIPPET'
Manual Nginx locations to add inside the HTTPS framespark.cn server block:

# FrameSpark diagnosis Beta start
location = /diagnosis/beta {
    return 404;
}

location = /diagnosis/beta/ {
    auth_basic "FrameSpark diagnosis beta";
    auth_basic_user_file /www/server/nginx/conf/framespark-diagnosis-beta.htpasswd;
    limit_except GET { deny all; }
    rewrite ^/diagnosis/beta/$ /index.html break;
    root /srv/framespark/diagnosis-beta-site/current;
}

location = /diagnosis/beta/app.js {
    auth_basic "FrameSpark diagnosis beta";
    auth_basic_user_file /www/server/nginx/conf/framespark-diagnosis-beta.htpasswd;
    limit_except GET { deny all; }
    alias /srv/framespark/diagnosis-beta-site/current/app.js;
}

location = /diagnosis/beta/beta.css {
    auth_basic "FrameSpark diagnosis beta";
    auth_basic_user_file /www/server/nginx/conf/framespark-diagnosis-beta.htpasswd;
    limit_except GET { deny all; }
    alias /srv/framespark/diagnosis-beta-site/current/beta.css;
}

location ^~ /diagnosis/beta/ { return 404; }
location = /api/diagnosis { return 404; }

location = /api/diagnosis/ {
    auth_basic "FrameSpark diagnosis beta";
    auth_basic_user_file /www/server/nginx/conf/framespark-diagnosis-beta.htpasswd;
    limit_except POST { deny all; }
    proxy_pass http://127.0.0.1:8788/api/diagnosis/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $remote_addr;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Framespark-Beta-User $remote_user;
    proxy_set_header Authorization "";
    client_max_body_size 5m;
    proxy_connect_timeout 10s;
    proxy_read_timeout 240s;
    proxy_send_timeout 240s;
}

location ^~ /api/diagnosis/ { return 404; }
# FrameSpark diagnosis Beta end

Before manual edit, create a timestamped backup of the confirmed site config. After manual edit, run:
  sudo /www/server/nginx/sbin/nginx -t -c /www/server/nginx/conf/nginx.conf
  sudo /www/server/nginx/sbin/nginx -s reload -c /www/server/nginx/conf/nginx.conf
SNIPPET

echo "No automatic Nginx edit was made. Avoiding blind insertion."
echo "This script does not affect /api/analytics/ or expose feedback, health or readiness."
exit 2
