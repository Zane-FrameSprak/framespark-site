#!/usr/bin/env bash
set -euo pipefail

fail() {
  printf 'RED: %s\n' "$*" >&2
  exit 1
}

info() {
  printf 'INFO: %s\n' "$*"
}

usage() {
  cat >&2 <<'EOF'
Usage:
  verify-server-release-artifact.sh <tarball> <SHA256SUMS> <manifest.json>

Run this in a server staging directory. The script verifies a prebuilt
diagnosis-api release artifact without npm install, network access, env changes,
current symlink changes, service restarts, or production secrets.
EOF
}

[[ $# -eq 3 ]] || { usage; exit 2; }

tarball="$1"
sha_file="$2"
manifest="$3"

[[ -f "$tarball" ]] || fail "tarball not found: $tarball"
[[ -f "$sha_file" ]] || fail "SHA256SUMS not found: $sha_file"
[[ -f "$manifest" ]] || fail "manifest not found: $manifest"

tarball_abs="$(cd "$(dirname "$tarball")" && pwd)/$(basename "$tarball")"
sha_abs="$(cd "$(dirname "$sha_file")" && pwd)/$(basename "$sha_file")"
manifest_abs="$(cd "$(dirname "$manifest")" && pwd)/$(basename "$manifest")"
tarball_name="$(basename "$tarball_abs")"

info "checking sha256"
(
  cd "$(dirname "$tarball_abs")"
  grep -F "  $tarball_name" "$sha_abs" | sha256sum -c -
)

actual_sha="$(sha256sum "$tarball_abs" | awk '{print $1}')"
manifest_sha="$(node -e "const fs=require('node:fs'); const m=JSON.parse(fs.readFileSync(process.argv[1], 'utf8')); process.stdout.write(m.tarballSha256 || '')" "$manifest_abs")"
[[ "$actual_sha" == "$manifest_sha" ]] || fail "manifest tarballSha256 does not match tarball"

manifest_tarball="$(node -e "const fs=require('node:fs'); const m=JSON.parse(fs.readFileSync(process.argv[1], 'utf8')); process.stdout.write(m.tarballFilename || '')" "$manifest_abs")"
[[ "$manifest_tarball" == "$tarball_name" ]] || fail "manifest tarballFilename does not match tarball"

if tar -tzf "$tarball_abs" | grep -E '(^|/)(\.env|logs|tmp|temp|coverage|secrets|test-results|test-runs)(/|$)|(^|/)diagnosis/(metadata|review|provider)(/|$)|\.sqlite($|[-.])' >/dev/null; then
  fail "tarball contains a forbidden path"
fi

tmp_root="$(mktemp -d "${TMPDIR:-/tmp}/framespark-release-verify.XXXXXXXX")"
cleanup() {
  rm -rf "$tmp_root"
}
trap cleanup EXIT

info "extracting artifact to temporary directory"
tar -xzf "$tarball_abs" -C "$tmp_root"

[[ -f "$tmp_root/package.json" ]] || fail "package.json missing"
[[ -f "$tmp_root/package-lock.json" ]] || fail "package-lock.json missing"
[[ -d "$tmp_root/node_modules/better-sqlite3" ]] || fail "node_modules/better-sqlite3 missing"

info "checking native better-sqlite3 load"
(
  cd "$tmp_root"
  node -e "require('better-sqlite3'); console.log('sqlite_native_ok')"
)

if find "$tmp_root" \( -name '.env' -o -name '.env.*' -o -name '*.sqlite' -o -name '*.sqlite-*' \) -print -quit | grep . >/dev/null; then
  fail "extracted artifact contains forbidden env or sqlite files"
fi

info "manifest summary"
node -e "const fs=require('node:fs'); const m=JSON.parse(fs.readFileSync(process.argv[1], 'utf8')); console.log(JSON.stringify({commitSha:m.commitSha,nodeVersion:m.nodeVersion,npmVersion:m.npmVersion,platform:m.platform,arch:m.arch,modulesAbi:m.modulesAbi,betterSqlite3Version:m.betterSqlite3Version,serverReleaseCheck:m.serverReleaseCheck}, null, 2));" "$manifest_abs"

printf 'GREEN: artifact verified without npm ci, env changes, current switch, restart, or network access\n'
