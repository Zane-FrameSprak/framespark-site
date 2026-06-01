---
name: framespark-deploy-check
description: Use before or after deploying FrameSpark static files to Tencent Cloud; checks rsync deployment safety, exclusions, webroot exposure, and curl verification without changing server config.
---

# FrameSpark Deploy Check

## Use When

- Preparing or verifying Tencent Cloud deployment.
- Checking whether public static files can be synced safely.

## Read First

- `docs/ai-handoff/PROJECT_STATE.md`
- `docs/ai-handoff/NEXT_TASKS.md`
- `docs/ai-handoff/ARCHITECTURE.md`
- `docs/ai-handoff/DECISIONS.md`

## Current Facts

- GitHub push does not equal production deploy.
- Production webroot: `/www/wwwroot/framespark.cn`
- Short-term deploy: local `rsync` static files to Tencent Cloud webroot.
- Server-side GitHub pull is unreliable; do not rely on it by default.

## Check

- Local `git status --short` is clean or expected.
- Intended commit is pushed to GitHub, if release policy requires it.
- Webroot backup exists before sync.
- Run rsync dry-run first.
- Exclude: `.git/`, `diagnosis-api/`, `analytics-api/`, `docs/`, `internal/`, `scripts/`, `node_modules/`, `test-results/`.
- Verify production with `curl` after deploy.
- Check public exposure:
  - `/.git/`
  - `/docs/`
  - `/internal/`
  - `/diagnosis-api/`
  - `/scripts/`
  - `/analytics-api/`
  - `/test-results/`

## Do Not

- Do not restart Nginx by default.
- Do not change SSL, Nginx config, or reverse proxies.
- Do not sync backend/internal/docs/scripts directories.
- Do not deploy unless the user explicitly asks.

## Output

- Deploy readiness.
- Exclusion risks.
- Verification commands and results.
- One next action.

## Update Handoff

After an actual deploy, update:

- `PROJECT_STATE.md`
- `NEXT_TASKS.md`
- `CHANGELOG_AI.md`
