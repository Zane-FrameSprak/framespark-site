#!/usr/bin/env bash
set -euo pipefail

echo "DRAFT ONLY: review commands manually; this file must never execute deployment." >&2
exit 64

# The unreachable functions below are command-review material. Remove the
# unconditional exit only in a separately approved deployment task.

local_release_draft() {
  git fetch origin main
  test -z "$(git status --porcelain)"

  local approved_base_sha="REPLACE_APPROVED_BASE_FULL_40_CHARACTER_SHA"
  local candidate_sha
  candidate_sha="$(git rev-parse origin/main)"
  test "$(git rev-parse HEAD)" = "${candidate_sha}"
  test "$(printf '%s' "${candidate_sha}" | wc -c | tr -d ' ')" = "40"
  test "$(printf '%s' "${approved_base_sha}" | wc -c | tr -d ' ')" = "40"
  git merge-base --is-ancestor "${approved_base_sha}" "${candidate_sha}"

  # Review every commit and diagnosis-api change in the approved range. Record
  # both full SHAs in the signed deployment checklist before packaging.
  printf 'approved base: %s\ndeployment candidate: %s\n' \
    "${approved_base_sha}" "${candidate_sha}"
  git log -1 --format=fuller "${candidate_sha}"
  git log --oneline "${approved_base_sha}..${candidate_sha}"
  git diff --stat "${approved_base_sha}..${candidate_sha}" -- diagnosis-api deploy/diagnosis-beta
  git diff "${approved_base_sha}..${candidate_sha}" -- diagnosis-api deploy/diagnosis-beta
  git diff --check "${approved_base_sha}..${candidate_sha}" -- diagnosis-api deploy/diagnosis-beta

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
  local test_data_dir="/var/tmp/framespark-diagnosis-smoke-${candidate_sha}"
  local service_user="framespark-diagnosis"
  local service_group="framespark-diagnosis"
  local nginx_group="REPLACE_NGINX_GROUP"

  # Stop if analytics is not on 8787 or diagnosis port 8788 is occupied.
  sudo ss -ltnp | grep '127.0.0.1:8787'
  if sudo ss -ltn | grep -q ':8788 '; then
    echo "Port 8788 is occupied; stop." >&2
    return 1
  fi

  # Create the dedicated identity only when absent. Always verify an existing
  # account before trusting it as the runtime/build identity.
  if ! getent group "${service_group}" >/dev/null; then
    sudo groupadd --system "${service_group}"
  fi
  if ! getent passwd "${service_user}" >/dev/null; then
    sudo useradd --system --home-dir /nonexistent --no-create-home \
      --gid "${service_group}" --shell /usr/sbin/nologin "${service_user}"
  fi
  test "$(id -gn "${service_user}")" = "${service_group}"
  test "$(getent group "${service_group}" | cut -d: -f3)" -lt 1000
  test "$(getent passwd "${service_user}" | cut -d: -f6)" = "/nonexistent"
  test "$(getent passwd "${service_user}" | cut -d: -f7)" = "/usr/sbin/nologin"
  test "$(id -u "${service_user}")" -lt 1000

  sudo install -d -o root -g root -m 0755 /srv/framespark/diagnosis-api/releases
  sudo install -d -o "${service_user}" -g "${service_group}" -m 0700 \
    /var/lib/framespark-diagnosis
  sudo install -d -o "${service_user}" -g "${service_group}" -m 0750 "${release_dir}"
  sudo install -d -o "${service_user}" -g "${service_group}" -m 0700 "${test_data_dir}"

  # Verify the uploaded archive against its separately uploaded checksum.
  cd /tmp
  sha256sum -c "${archive}.sha256"
  sudo -u "${service_user}" tar -xzf "${archive}" -C "${release_dir}"

  # Never run npm lifecycle code as root. Build and test as the unprivileged
  # dedicated user, then transfer the finished release to root/read-only.
  cd "${release_dir}"
  sudo -u "${service_user}" /usr/bin/npm ci --omit=dev
  sudo -u "${service_user}" /usr/bin/npm run check
  sudo -u "${service_user}" env \
    NODE_ENV=test DIAGNOSIS_DATA_DIR="${test_data_dir}" DEEPSEEK_API_KEY= \
    /usr/bin/npm run test:no-ai

  # Use only built-in fictional test fixtures and an isolated test data path.
  # These checks must verify metadata redaction and must never write to the
  # production retention directory.
  sudo -u "${service_user}" env \
    NODE_ENV=test \
    DIAGNOSIS_DATA_DIR="${test_data_dir}" \
    DEEPSEEK_API_KEY= \
    /usr/bin/npm run test:mvp-production-safety
  sudo -u "${service_user}" env \
    NODE_ENV=test DIAGNOSIS_DATA_DIR="${test_data_dir}" DEEPSEEK_API_KEY= \
    /usr/bin/npm run test:mvp-docx-safety
  sudo -u "${service_user}" env \
    NODE_ENV=test DIAGNOSIS_DATA_DIR="${test_data_dir}" DEEPSEEK_API_KEY= \
    /usr/bin/npm run test:mvp-retention
  sudo -u "${service_user}" env \
    NODE_ENV=test DIAGNOSIS_DATA_DIR="${test_data_dir}" DEEPSEEK_API_KEY= \
    /usr/bin/npm run test:mvp-http-integration

  # The access-code foundation is repository-only in Phase 1. Do not create
  # its production database, HMAC keys or real codes in this deployment draft.
  # ENABLE_BETA_CODE_ACCESS must remain false until a separate Nginx/homepage
  # migration and rollback task has been approved.

  # Existing tests assert that default metadata excludes the fictional full
  # material/report markers. Remove all isolated test metadata after review.
  sudo rm -rf --one-file-system "${test_data_dir}"
  test ! -e "${test_data_dir}"

  # Freeze the release as root-owned and service-group-readable. Preserve
  # directory/existing executable traversal while removing all write access
  # from the runtime identity.
  sudo chown -R root:"${service_group}" "${release_dir}"
  sudo chmod -R u=rwX,g=rX,o= "${release_dir}"
  test "$(sudo stat -c '%U:%G:%a' "${release_dir}")" = \
    "root:${service_group}:750"

  # Prepare the real env outside Git using an approved secure source file.
  # The source must contain a non-empty real key but must never be printed.
  test -f /secure/reviewed/diagnosis-api.env
  test ! -L /secure/reviewed/diagnosis-api.env
  test -s /secure/reviewed/diagnosis-api.env
  if ! sudo grep -Eq '^DEEPSEEK_API_KEY=[^[:space:]].+$' \
    /secure/reviewed/diagnosis-api.env; then
    echo "The reviewed env has no non-empty provider key; stop." >&2
    return 1
  fi
  if sudo grep -Eq '^DEEPSEEK_API_KEY=(REPLACE_ME|REPLACE_WITH_REAL_KEY)$' \
    /secure/reviewed/diagnosis-api.env; then
    echo "The reviewed env still contains the placeholder key; stop." >&2
    return 1
  fi
  sudo install -d -o root -g root -m 0755 /etc/framespark
  sudo install -o root -g root -m 0600 \
    /secure/reviewed/diagnosis-api.env /etc/framespark/diagnosis-api.env
  test -f /etc/framespark/diagnosis-api.env
  test ! -L /etc/framespark/diagnosis-api.env
  test "$(sudo stat -c '%U:%G:%a' /etc/framespark/diagnosis-api.env)" = "root:root:600"

  test -d /var/lib/framespark-diagnosis
  test ! -L /var/lib/framespark-diagnosis
  test "$(sudo stat -c '%U:%G:%a' /var/lib/framespark-diagnosis)" = \
    "${service_user}:${service_group}:700"

  # Promote only after release, env and data checks pass.
  sudo ln -sfn "${release_dir}" /srv/framespark/diagnosis-api/current
  test -L /srv/framespark/diagnosis-api/current
  case "$(readlink -f /srv/framespark/diagnosis-api/current)" in
    /srv/framespark/diagnosis-api/releases/*) ;;
    *) echo "current points outside the reviewed releases directory; stop." >&2; return 1 ;;
  esac

  # Install the reviewed unit draft, then verify its exact content before any
  # enable/start operation. These service actions require separate approval.
  sudo install -o root -g root -m 0644 \
    /secure/reviewed/framespark-diagnosis.service \
    /etc/systemd/system/framespark-diagnosis.service
  sudo systemd-analyze verify /etc/systemd/system/framespark-diagnosis.service
  sudo systemctl daemon-reload
  test "$(sudo systemctl is-enabled framespark-diagnosis.service 2>/dev/null || true)" = "disabled"
  sudo systemctl start framespark-diagnosis.service

  # Readiness is an external deployment gate, not ExecStartPost. Poll for at
  # most 30 seconds, reject exits/restarts, then check health. On failure stop
  # the still-disabled service and require review before another start.
  local ready=0
  local deadline=$((SECONDS + 30))
  while (( SECONDS < deadline )); do
    if ! sudo systemctl is-active --quiet framespark-diagnosis.service; then
      echo "Diagnosis service exited before readiness." >&2
      break
    fi
    if [[ "$(sudo systemctl show framespark-diagnosis.service -p NRestarts --value)" != "0" ]]; then
      echo "Diagnosis service restarted during readiness polling." >&2
      break
    fi
    if curl --fail --silent --show-error --max-time 1 \
      http://127.0.0.1:8788/ready >/dev/null; then
      ready=1
      break
    fi
    sleep 1
  done
  if [[ "${ready}" != "1" ]] || \
    ! curl --fail --silent --show-error --max-time 2 \
      http://127.0.0.1:8788/health >/dev/null; then
    sudo systemctl stop framespark-diagnosis.service
    echo "Diagnosis local readiness/health verification failed; service stopped." >&2
    return 1
  fi

  # Read only this start invocation's journal. Do not depend on host-specific
  # timestamp parsing and never print journal content during the safety check.
  local invocation_id
  local sensitive_matches
  invocation_id="$(sudo systemctl show framespark-diagnosis.service \
    --property=InvocationID --value)"
  if [[ -z "${invocation_id}" ]]; then
    sudo systemctl stop framespark-diagnosis.service
    echo "Diagnosis service has no InvocationID; service stopped." >&2
    return 1
  fi
  sensitive_matches="$(sudo journalctl \
    "_SYSTEMD_INVOCATION_ID=${invocation_id}" --no-pager -o cat \
    | grep -Eic \
      'DEEPSEEK_API_KEY|Authorization|sk-[A-Za-z0-9_-]{8,}|material_summary|reportV1|用户材料|完整报告' \
    || true)"
  if [[ "${sensitive_matches}" != "0" ]]; then
    sudo systemctl stop framespark-diagnosis.service
    echo "Sensitive-content signal detected in the current service invocation; service stopped." >&2
    return 1
  fi

  # Create Basic Auth credentials through a separately reviewed secure process,
  # then install the result without printing its contents. Replace the Nginx
  # group placeholder only after confirming the active worker group.
  getent group "${nginx_group}" >/dev/null
  test -f /secure/reviewed/framespark-diagnosis-beta.htpasswd
  test ! -L /secure/reviewed/framespark-diagnosis-beta.htpasswd
  test -s /secure/reviewed/framespark-diagnosis-beta.htpasswd
  sudo install -o root -g "${nginx_group}" -m 0640 \
    /secure/reviewed/framespark-diagnosis-beta.htpasswd \
    /etc/nginx/framespark-diagnosis-beta.htpasswd
  test -f /etc/nginx/framespark-diagnosis-beta.htpasswd
  test ! -L /etc/nginx/framespark-diagnosis-beta.htpasswd
  test "$(sudo stat -c '%U:%G:%a' /etc/nginx/framespark-diagnosis-beta.htpasswd)" = \
    "root:${nginx_group}:640"

  # Merge the reviewed location fragment into the existing site config only
  # after all three locations share authentication and analytics is unchanged.
  sudo cp --preserve=mode,ownership,timestamps \
    /www/server/panel/vhost/nginx/framespark.cn.conf \
    /secure/reviewed/framespark.cn.conf.pre-diagnosis-beta
  sudo /www/server/nginx/sbin/nginx -T -c /www/server/nginx/conf/nginx.conf

  # HARD STOP: a separate approved task must merge and review all three
  # authenticated locations. Commands below remain unreachable in this phase.
  echo "Manual Nginx merge approval required; stop before config mutation." >&2
  return 75

  sudo /www/server/nginx/sbin/nginx -t -c /www/server/nginx/conf/nginx.conf
  sudo /www/server/nginx/sbin/nginx -s reload -c /www/server/nginx/conf/nginx.conf

  # A single fictional real-AI production smoke requires separate written
  # authorization and an explicit provider-call budget. It is not part of this draft.
}
