#!/usr/bin/env bash
set -euo pipefail

echo "DRAFT ONLY: review commands manually; this file must never execute deployment." >&2
exit 64

# The unreachable functions below are command-review material. Remove the
# unconditional exit only in a separately approved deployment task.

local_release_draft() {
  git fetch origin main
  test -z "$(git status --porcelain)"

  local candidate_sha
  candidate_sha="$(git rev-parse origin/main)"
  test "$(git rev-parse HEAD)" = "${candidate_sha}"
  test "$(printf '%s' "${candidate_sha}" | wc -c | tr -d ' ')" = "40"

  # Review the exact candidate before packaging it.
  git log -1 --format=fuller "${candidate_sha}"
  git show --stat --oneline "${candidate_sha}"
  git diff --check "${candidate_sha}^" "${candidate_sha}" -- diagnosis-api

  local archive="/tmp/framespark-diagnosis-${candidate_sha}.tar.gz"
  git archive --format=tar.gz --output="${archive}" "${candidate_sha}:diagnosis-api"
  shasum -a 256 "${archive}" > "${archive}.sha256"

  # Replace the host placeholder only after deployment approval.
  scp "${archive}" "${archive}.sha256" ubuntu@REPLACE_SERVER_HOST:/tmp/
}

server_prepare_draft() {
  # Set this from the freshly reviewed full origin/main SHA. Never reuse a
  # historical value without fetch and diff review.
  local candidate_sha="REPLACE_FULL_40_CHARACTER_SHA"
  local archive="/tmp/framespark-diagnosis-${candidate_sha}.tar.gz"
  local release_dir="/srv/framespark/diagnosis-api/releases/${candidate_sha}"

  # Stop if analytics is not on 8787 or diagnosis port 8788 is occupied.
  sudo ss -ltnp | grep '127.0.0.1:8787'
  if sudo ss -ltn | grep -q ':8788 '; then
    echo "Port 8788 is occupied; stop." >&2
    return 1
  fi

  # Create the dedicated no-login runtime identity and production directories.
  sudo useradd --system --home-dir /nonexistent --no-create-home \
    --shell /usr/sbin/nologin framespark-diagnosis
  sudo install -d -o root -g root -m 0755 /srv/framespark/diagnosis-api/releases
  sudo install -d -o framespark-diagnosis -g framespark-diagnosis -m 0700 \
    /var/lib/framespark-diagnosis
  sudo install -d -o root -g root -m 0755 "${release_dir}"

  # Verify the uploaded archive against its separately uploaded checksum.
  cd /tmp
  sha256sum -c "${archive}.sha256"
  sudo tar -xzf "${archive}" -C "${release_dir}"

  # Install only production dependencies in the versioned release, then run
  # the approved no-AI checks before making the release read-only.
  cd "${release_dir}"
  sudo npm ci --omit=dev
  sudo npm run check
  sudo npm run test:mvp-production-safety
  sudo npm run test:mvp-docx-safety
  sudo npm run test:mvp-retention
  sudo npm run test:mvp-http-integration
  sudo chown -R root:root "${release_dir}"
  sudo chmod -R a-w "${release_dir}"

  # Prepare the real env outside Git using an approved secure source file.
  # The source must contain a real key but must never be printed or committed.
  if sudo grep -q '^DEEPSEEK_API_KEY=REPLACE_ME$' /secure/reviewed/diagnosis-api.env; then
    echo "The reviewed env still contains the placeholder key; stop." >&2
    return 1
  fi
  sudo install -d -o root -g root -m 0755 /etc/framespark
  sudo install -o root -g root -m 0600 \
    /secure/reviewed/diagnosis-api.env /etc/framespark/diagnosis-api.env

  # Promote only after release, env and data checks pass.
  sudo ln -sfn "${release_dir}" /srv/framespark/diagnosis-api/current
  readlink -f /srv/framespark/diagnosis-api/current

  # Install the reviewed unit draft, then verify its exact content before any
  # enable/start operation. These service actions require separate approval.
  sudo install -o root -g root -m 0644 \
    /secure/reviewed/framespark-diagnosis.service \
    /etc/systemd/system/framespark-diagnosis.service
  sudo systemd-analyze verify /etc/systemd/system/framespark-diagnosis.service
  sudo systemctl daemon-reload
  sudo systemctl enable framespark-diagnosis.service
  sudo systemctl start framespark-diagnosis.service

  # Health and readiness remain local only.
  curl --fail http://127.0.0.1:8788/health
  curl --fail http://127.0.0.1:8788/ready

  # Run mock/no-AI regression checks before any provider call. Do not call the
  # production diagnosis endpoint with real material during this phase.
  sudo -u framespark-diagnosis /usr/bin/npm run test:mvp-production-safety

  # Create Basic Auth credentials through a separately reviewed secure process,
  # then install the result without printing its contents. Replace the Nginx
  # group placeholder only after confirming the active worker group.
  sudo install -o root -g REPLACE_NGINX_GROUP -m 0640 \
    /secure/reviewed/framespark-diagnosis-beta.htpasswd \
    /etc/nginx/framespark-diagnosis-beta.htpasswd

  # Merge the reviewed location fragment into the existing site config only
  # after all three locations share authentication and analytics is unchanged.
  sudo cp --preserve=mode,ownership,timestamps \
    /www/server/panel/vhost/nginx/framespark.cn.conf \
    /secure/reviewed/framespark.cn.conf.pre-diagnosis-beta
  sudo /www/server/nginx/sbin/nginx -T -c /www/server/nginx/conf/nginx.conf
  # STOP HERE for manual merge and review of all three authenticated locations.
  sudo /www/server/nginx/sbin/nginx -t -c /www/server/nginx/conf/nginx.conf
  sudo /www/server/nginx/sbin/nginx -s reload -c /www/server/nginx/conf/nginx.conf

  # A single fictional real-AI production smoke requires separate written
  # authorization and an explicit provider-call budget. It is not part of this draft.
}
