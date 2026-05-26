#!/usr/bin/env bash
set -euo pipefail

NGINX_CONF="/www/server/panel/vhost/nginx/framespark.cn.conf"
MARK_START="# FrameSpark analytics proxy start"
MARK_END="# FrameSpark analytics proxy end"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP="${NGINX_CONF}.bak.analytics-${TIMESTAMP}"

if [ "${EUID}" -ne 0 ]; then
  echo "请使用 sudo bash analytics-api/scripts/uninstall-nginx-proxy.sh"
  exit 1
fi

if [ ! -f "${NGINX_CONF}" ]; then
  echo "Nginx 配置文件不存在：${NGINX_CONF}"
  exit 1
fi

if ! grep -q "${MARK_START}" "${NGINX_CONF}"; then
  echo "analytics Nginx proxy is not installed."
  exit 0
fi

cp "${NGINX_CONF}" "${BACKUP}"

python3 - "$NGINX_CONF" "$MARK_START" "$MARK_END" <<'PY'
import sys
from pathlib import Path

conf_path = Path(sys.argv[1])
mark_start = sys.argv[2]
mark_end = sys.argv[3]
lines = conf_path.read_text().splitlines(keepends=True)

start = None
end = None
for index, line in enumerate(lines):
    if mark_start in line:
        start = index
    if start is not None and mark_end in line:
        end = index
        break

if start is None or end is None:
    raise SystemExit("未找到完整 analytics proxy 标记块。")

del lines[start:end + 1]
if start < len(lines) and lines[start].strip() == "":
    del lines[start]

conf_path.write_text("".join(lines))
PY

if ! nginx -t; then
  cp "${BACKUP}" "${NGINX_CONF}"
  echo "nginx -t failed. Restored backup: ${BACKUP}"
  nginx -t || true
  exit 1
fi

systemctl reload nginx
echo "Nginx analytics proxy uninstalled."
echo "Backup: ${BACKUP}"
