#!/usr/bin/env bash
set -euo pipefail

fail() {
  printf 'RED: %s\n' "$*" >&2
  exit 1
}

info() {
  printf 'INFO: %s\n' "$*"
}

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
api_root="$(cd "$script_dir/.." && pwd)"
repo_root="$(git -C "$api_root" rev-parse --show-toplevel 2>/dev/null)" || fail "not inside a git repository"

if [[ "$(cd "$api_root" && pwd)" != "$repo_root/diagnosis-api" ]]; then
  fail "script must run from the framespark diagnosis-api tree"
fi

if [[ -n "$(git -C "$repo_root" status --porcelain)" ]]; then
  git -C "$repo_root" status --short >&2
  fail "git worktree must be clean before building a release artifact"
fi

commit_sha="$(git -C "$repo_root" rev-parse HEAD)"
build_time_utc="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
node_major="$(node -p "process.versions.node.split('.')[0]")"
[[ "$node_major" == "20" ]] || fail "Node 20 is required; found $(node -v)"

platform="$(node -p "process.platform")"
arch="$(node -p "process.arch")"
modules_abi="$(node -p "process.versions.modules")"
platform_line="$(node -p "process.platform + '/' + process.arch + ' modules=' + process.versions.modules")"
info "build platform: $platform_line"

if [[ "$platform" != "linux" ]]; then
  fail "release artifacts with native dependencies must be built on Linux; found $platform"
fi

os_release="$(awk -F= '/^PRETTY_NAME=/{gsub(/^"|"$/, "", $2); print $2}' /etc/os-release 2>/dev/null || true)"
[[ -n "$os_release" ]] || os_release="$(uname -a)"
glibc_line="$(getconf GNU_LIBC_VERSION 2>/dev/null || true)"
glibc_version="$(awk '{print $2}' <<<"$glibc_line")"
glibc_ldd_version="$(ldd --version 2>/dev/null | head -1 || true)"
[[ -n "$glibc_version" ]] || fail "unable to determine glibc version"

max_glibc_version="${RELEASE_MAX_GLIBC_VERSION:-2.35}"
if [[ "$(printf '%s\n%s\n' "$max_glibc_version" "$glibc_version" | sort -V | tail -1)" != "$max_glibc_version" ]]; then
  fail "build glibc $glibc_version is newer than allowed $max_glibc_version"
fi
info "build OS: $os_release"
info "build glibc: $glibc_line"

server_release_script="$(node -e "const s=require('$api_root/package.json').scripts['test:server-release'] || ''; process.stdout.write(s)")"
if [[ "$server_release_script" == *"beta-access-frontend"* ]]; then
  fail "test:server-release must not run test:beta-access-frontend"
fi

output_dir="${OUTPUT_DIR:-${RELEASE_OUTPUT_DIR:-$(cd "$repo_root/.." && pwd)/artifacts/diagnosis-api-server-release}}"
mkdir -p "$output_dir"
output_dir="$(cd "$output_dir" && pwd)"

tmp_root="$(mktemp -d "${TMPDIR:-/tmp}/framespark-release-build.XXXXXXXX")"
test_data_dir="$tmp_root/test-data"
npm_cache_dir="$tmp_root/npm-cache"
home_dir="$tmp_root/home"
mkdir -p "$test_data_dir" "$npm_cache_dir" "$home_dir"

cleanup() {
  rm -rf "$tmp_root"
}
trap cleanup EXIT

cd "$api_root"

info "installing production dependencies"
HOME="$home_dir" npm_config_cache="$npm_cache_dir" npm ci --omit=dev

info "checking better-sqlite3"
HOME="$home_dir" npm_config_cache="$npm_cache_dir" npm ls better-sqlite3 --depth=0
node -e "require('better-sqlite3'); console.log('sqlite_native_ok')"
better_sqlite_version="$(node -p "require('./node_modules/better-sqlite3/package.json').version")"

info "running production audit"
HOME="$home_dir" npm_config_cache="$npm_cache_dir" npm audit --omit=dev

info "running server release checks"
DIAGNOSIS_DATA_DIR="$test_data_dir" HOME="$home_dir" npm_config_cache="$npm_cache_dir" npm run test:server-release

if [[ -e "$api_root/logs/diagnosis" ]]; then
  fail "release build wrote logs/diagnosis inside diagnosis-api"
fi

artifact_prefix="diagnosis-api-server-release-$commit_sha"
tarball_name="$artifact_prefix.tar.gz"
manifest_name="$artifact_prefix.manifest.json"
tarball_path="$output_dir/$tarball_name"
manifest_path="$output_dir/$manifest_name"
sha_path="$output_dir/SHA256SUMS"

rm -f "$tarball_path" "$manifest_path" "$sha_path"

info "creating release tarball"
tar \
  --exclude='./.git' \
  --exclude='./.env' \
  --exclude='./.env.*' \
  --exclude='./logs' \
  --exclude='./logs/*' \
  --exclude='./tmp' \
  --exclude='./tmp/*' \
  --exclude='./temp' \
  --exclude='./temp/*' \
  --exclude='./coverage' \
  --exclude='./coverage/*' \
  --exclude='./secrets' \
  --exclude='./secrets/*' \
  --exclude='./test-results' \
  --exclude='./test-results/*' \
  --exclude='./test-runs' \
  --exclude='./test-runs/*' \
  --exclude='./diagnosis/metadata' \
  --exclude='./diagnosis/metadata/*' \
  --exclude='./diagnosis/review' \
  --exclude='./diagnosis/review/*' \
  --exclude='./diagnosis/provider' \
  --exclude='./diagnosis/provider/*' \
  --exclude='./*.sqlite' \
  --exclude='./*.sqlite-*' \
  -czf "$tarball_path" \
  .

if tar -tzf "$tarball_path" | grep -E '(^|/)(\.env|logs|tmp|temp|coverage|secrets|test-results|test-runs)(/|$)|(^|/)diagnosis/(metadata|review|provider)(/|$)|\.sqlite($|[-.])' >/dev/null; then
  fail "release tarball contains a forbidden path"
fi

tarball_sha256="$(sha256sum "$tarball_path" | awk '{print $1}')"
npm_version="$(npm -v)"
node_version="$(node -v)"
build_runner_image="${BUILD_RUNNER_IMAGE:-${ImageOS:-unknown}}"

MANIFEST_COMMIT_SHA="$commit_sha" \
MANIFEST_BUILD_TIME_UTC="$build_time_utc" \
MANIFEST_NODE_VERSION="$node_version" \
MANIFEST_NPM_VERSION="$npm_version" \
MANIFEST_PLATFORM="$platform" \
MANIFEST_ARCH="$arch" \
MANIFEST_MODULES_ABI="$modules_abi" \
MANIFEST_BETTER_SQLITE_VERSION="$better_sqlite_version" \
MANIFEST_TARBALL_NAME="$tarball_name" \
MANIFEST_TARBALL_SHA256="$tarball_sha256" \
MANIFEST_OS_RELEASE="$os_release" \
MANIFEST_GLIBC_VERSION="$glibc_version" \
MANIFEST_GLIBC_LDD_VERSION="$glibc_ldd_version" \
MANIFEST_BUILD_RUNNER_IMAGE="$build_runner_image" \
node - "$manifest_path" <<'NODE'
const fs = require('node:fs');
const manifestPath = process.argv[2];
const manifest = {
  commitSha: process.env.MANIFEST_COMMIT_SHA,
  buildTimeUtc: process.env.MANIFEST_BUILD_TIME_UTC,
  osRelease: process.env.MANIFEST_OS_RELEASE,
  glibcVersion: process.env.MANIFEST_GLIBC_VERSION,
  glibcLddVersion: process.env.MANIFEST_GLIBC_LDD_VERSION,
  nodeVersion: process.env.MANIFEST_NODE_VERSION,
  npmVersion: process.env.MANIFEST_NPM_VERSION,
  platform: process.env.MANIFEST_PLATFORM,
  arch: process.env.MANIFEST_ARCH,
  modulesAbi: process.env.MANIFEST_MODULES_ABI,
  betterSqlite3Version: process.env.MANIFEST_BETTER_SQLITE_VERSION,
  buildRunnerImage: process.env.MANIFEST_BUILD_RUNNER_IMAGE,
  serverReleaseCheck: 'passed',
  tarballFilename: process.env.MANIFEST_TARBALL_NAME,
  tarballSha256: process.env.MANIFEST_TARBALL_SHA256
};
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
NODE

(
  cd "$output_dir"
  sha256sum "$tarball_name" "$manifest_name" > "$sha_path"
)

info "release artifact created"
printf 'GREEN: tarball=%s\n' "$tarball_path"
printf 'GREEN: manifest=%s\n' "$manifest_path"
printf 'GREEN: sha256=%s\n' "$sha_path"
