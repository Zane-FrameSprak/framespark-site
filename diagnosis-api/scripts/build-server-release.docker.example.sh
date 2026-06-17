#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
artifacts_dir="${ARTIFACTS_DIR:-$(cd "$repo_root/.." && pwd)/artifacts/diagnosis-api-server-release}"
mkdir -p "$artifacts_dir"

cat <<EOF
Building a Linux amd64 Node 20 diagnosis-api release artifact.

Repository: $repo_root
Artifacts:  $artifacts_dir

This example does not mount or pass production env, keys, SQLite data, htpasswd,
or user material. It copies the read-only repository into the container and
runs the release builder there.
EOF

docker run --rm \
  --platform linux/amd64 \
  -v "$repo_root:/workspace/framespark-site:ro" \
  -v "$artifacts_dir:/artifacts" \
  node:20-bookworm \
  bash -lc '
    set -euo pipefail
    mkdir -p /build
    cp -a /workspace/framespark-site /build/framespark-site
    cd /build/framespark-site/diagnosis-api
    OUTPUT_DIR=/artifacts ./scripts/build-server-release.sh
  '
