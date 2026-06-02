# Diagnosis API Production Plan

This is a deployment plan only. Do not reopen the public diagnosis upload entry until the API is deployed and verified.

Before production execution, read `DEPLOYMENT_RUNBOOK.md`.

## Runtime

- Service name: `framespark-diagnosis.service`
- Working directory: `/tmp/framespark-site/diagnosis-api` or a dedicated release directory
- Host: `127.0.0.1`
- Port: `8788`
- Reason for `8788`: analytics-api already uses `127.0.0.1:8787`
- Env file suggestion: `/home/ubuntu/framespark-diagnosis.env`
- Start command: `npm start`

## Required Environment

- `HOST=127.0.0.1`
- `PORT=8788`
- `DEEPSEEK_API_KEY=` must be set in production
- `DEEPSEEK_BASE_URL=https://api.deepseek.com`
- `DEEPSEEK_MODEL=deepseek-v4-flash`
- `AI_TIMEOUT_MS=90000`
- `MAX_UPLOAD_MB=10`
- `MIN_TEXT_CHARS=800`
- `MAX_TEXT_CHARS=80000`
- `ENABLE_DIAGNOSIS_V1=false`
- `ENABLE_DEV_TOOLS=false`
- `DIAGNOSIS_DAILY_LIMIT` and `DIAGNOSIS_FEEDBACK_DAILY_LIMIT` may be set for production traffic

## Nginx Reverse Proxy

- Public path: `/api/diagnosis/`
- Local target: `http://127.0.0.1:8788/api/diagnosis/`
- `client_max_body_size` should match `MAX_UPLOAD_MB`
- `proxy_read_timeout` should allow long AI requests
- Do not reuse port `8787`
- Keep analytics proxy separate at `/api/analytics/`

## Public Upload Recovery Conditions

Only restore public upload controls after all are true:

- systemd service is running
- local `GET /health` is OK
- HTTPS `/api/diagnosis` smoke test returns JSON
- rate limit behavior is verified
- error responses are understandable
- privacy and upload copy are aligned
- TXT/DOCX/paste support is clear, and PDF support is not promised unless separately implemented

## Current Format Note

The public parser currently supports TXT, DOCX, and pasted text. PDF support is not part of the current public parser and must not be promised before implementation, tests, and copy alignment. Internal dev parsing may support text PDF samples, but that is not public support.
