#!/usr/bin/env bash
set -euo pipefail

NGINX_CONF="/www/server/panel/vhost/nginx/framespark.cn.conf"
MARK_START="# FrameSpark analytics proxy start"
MARK_END="# FrameSpark analytics proxy end"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP="${NGINX_CONF}.bak.analytics-${TIMESTAMP}"

if [ "${EUID}" -ne 0 ]; then
  echo "请使用 sudo bash analytics-api/scripts/install-nginx-proxy.sh"
  exit 1
fi

if [ ! -f "${NGINX_CONF}" ]; then
  echo "Nginx 配置文件不存在：${NGINX_CONF}"
  exit 1
fi

if grep -q "location /api/analytics/" "${NGINX_CONF}"; then
  echo "analytics Nginx proxy already exists."
  exit 0
fi

cp "${NGINX_CONF}" "${BACKUP}"

python3 - "$NGINX_CONF" <<'PY'
import sys
from pathlib import Path

conf_path = Path(sys.argv[1])
text = conf_path.read_text()
lines = text.splitlines(keepends=True)

server_start = None
brace_depth = 0
in_443_server = False
insert_index = None

for index, line in enumerate(lines):
    stripped = line.strip()
    if stripped.startswith("server") and "{" in stripped and not in_443_server:
        server_start = index
        brace_depth = line.count("{") - line.count("}")
        in_443_server = False
        continue

    if server_start is not None:
        brace_depth += line.count("{") - line.count("}")
        if "listen 443 ssl" in stripped:
            in_443_server = True
        if in_443_server and stripped.startswith("location / {"):
            insert_index = index
            break
        if brace_depth <= 0:
            server_start = None
            in_443_server = False

if insert_index is None:
    raise SystemExit("未找到 HTTPS server 块中的 location / { 插入点。")

block = [
    "    # FrameSpark analytics proxy start\n",
    "    location /api/analytics/ {\n",
    "        proxy_pass http://127.0.0.1:8787/api/analytics/;\n",
    "        proxy_http_version 1.1;\n",
    "        proxy_set_header Host $host;\n",
    "        proxy_set_header X-Real-IP $remote_addr;\n",
    "        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n",
    "        proxy_set_header X-Forwarded-Proto $scheme;\n",
    "        client_max_body_size 32k;\n",
    "    }\n",
    "    # FrameSpark analytics proxy end\n",
    "\n",
]

lines[insert_index:insert_index] = block
conf_path.write_text("".join(lines))
PY

if ! nginx -t; then
  cp "${BACKUP}" "${NGINX_CONF}"
  echo "nginx -t failed. Restored backup: ${BACKUP}"
  nginx -t || true
  exit 1
fi

systemctl reload nginx
echo "Nginx analytics proxy installed."
echo "Backup: ${BACKUP}"
