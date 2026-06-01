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
- Short-term deploy: local `sudo rsync` static files to Tencent Cloud webroot.
- Server-side GitHub pull is unreliable; do not rely on it by default.
- `.user.ini` must be preserved.

## Check

- Local `git status --short` is clean or expected.
- Intended commit is pushed to GitHub, if release policy requires it.
- Webroot backup exists before sync.
- Run sudo rsync dry-run first.
- Exclude: `.git/`, `.github/`, `.agents/`, `.claude/`, `CLAUDE.md`, `README.md`, `.gitignore`, `.nojekyll`, `.user.ini`, `diagnosis-api/`, `analytics-api/`, `docs/`, `internal/`, `scripts/`, `node_modules/`, `test-results/`, `.DS_Store`, `.env`, `*.log`.
- Do not use `--delete-excluded` to protect `.user.ini`.
- If public legacy files must be cleaned, use explicit whitelist delete commands only.
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

- 10 lines or fewer after success.
- Deploy readiness.
- Exclusion risks.
- Verification results only.
- One next action.

## Update Handoff

After an actual deploy, update:

- `PROJECT_STATE.md`
- `NEXT_TASKS.md`
- `CHANGELOG_AI.md`
