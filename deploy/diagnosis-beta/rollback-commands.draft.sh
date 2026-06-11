#!/usr/bin/env bash
set -euo pipefail

echo "DRAFT ONLY: review commands manually; this file must never execute rollback." >&2
exit 64

# The unreachable function below is command-review material. Remove the
# unconditional exit only in a separately approved rollback task.

rollback_draft() {
  local previous_release="/srv/framespark/diagnosis-api/releases/REPLACE_PREVIOUS_FULL_SHA"
  local site_config="/www/server/panel/vhost/nginx/framespark.cn.conf"
  local pre_beta_config_backup="/secure/reviewed/framespark.cn.conf.pre-diagnosis-beta"
  local expected_beta_config_sha256="REPLACE_REVIEWED_POST_BETA_CONFIG_SHA256"

  test -d "${previous_release}"
  test -f "${pre_beta_config_backup}"

  # Stop rather than overwrite unrelated Nginx edits made after Beta deployment.
  test "$(sudo sha256sum "${site_config}" | awk '{print $1}')" = \
    "${expected_beta_config_sha256}"

  # First close all three Beta locations by restoring the reviewed pre-Beta
  # config. Do not leave an API location active without the page/auth boundary.
  sudo install -o root -g root -m 0644 "${pre_beta_config_backup}" "${site_config}"
  sudo /www/server/nginx/sbin/nginx -t -c /www/server/nginx/conf/nginx.conf
  sudo /www/server/nginx/sbin/nginx -s reload -c /www/server/nginx/conf/nginx.conf

  # Then switch back to the recorded previous release and restart the service.
  sudo ln -sfn "${previous_release}" /srv/framespark/diagnosis-api/current
  sudo systemctl restart framespark-diagnosis.service
  curl --fail http://127.0.0.1:8788/ready

  # Verify the public website and analytics remain available. Do not call the
  # diagnosis endpoint or run real AI during rollback verification.
  curl --fail --head https://framespark.cn/
  curl --fail --head https://framespark.cn/diagnosis/
  curl --fail --head https://framespark.cn/js/analytics.js

  # Preserve only approved metadata logs and retention-managed review records.
  # Do not export or retain complete submitted material, complete reports,
  # provider responses, env content, or authentication content.
}
