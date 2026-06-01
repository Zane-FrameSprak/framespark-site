---
name: framespark-static-site-release-check
description: Use before releasing the FrameSpark public static site; runs a concise read-only release checklist for HTML/CSS/JS, analytics, SEO, legal, and public diagnosis state.
---

# FrameSpark Static Site Release Check

## Use When

- Checking the public site before deploy or after public-site edits.
- Verifying production-facing HTML/CSS/JS without changing code.

## Read First

- `docs/ai-handoff/PROJECT_CONTEXT.md`
- `docs/ai-handoff/WORKING_RULES.md`
- `docs/ai-handoff/PROJECT_STATE.md`
- `docs/ai-handoff/NEXT_TASKS.md`

## Check

```bash
git status --short
perl -Mutf8 -ne 'print "$ARGV:$.:$_" if /[\x{201C}\x{201D}\x{2018}\x{2019}]/' index.html css js diagnosis talent projects legal 404.html 2>/dev/null || true
node --check js/main.js
node --check js/site-data.js
node --check js/analytics.js
git diff --check
grep -R -n 'localhost\\|127\\.0\\.0\\.1\\|8787\\|8130' index.html css js diagnosis talent projects legal 404.html 2>/dev/null || true
```

Also check manually:

- Core links and project links.
- Public diagnosis copy matches actual API availability.
- Analytics failures are silent.
- `robots.txt`, `sitemap.xml`, canonical, title, description, favicon, `og:image`.
- Mobile and WeChat rendering.
- Browser Console and Network errors.
- ICP, public security filing state, privacy, and terms.

## Do Not

- Do not deploy.
- Do not modify `diagnosis-api/`.
- Do not change copy or code unless the user explicitly asks.
- Do not run real AI/API tests.

## Output

- Pass/fail summary.
- Blocking risks.
- Commands run.
- One next action.

## Update Handoff

Update handoff only after a release-relevant change or verified deployment.
