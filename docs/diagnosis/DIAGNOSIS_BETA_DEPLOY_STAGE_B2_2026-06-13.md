# Diagnosis Beta Deployment Stage B2

Date: 2026-06-13

## Scope

Stage B2 executed one separately authorized production real-AI smoke through the Basic Auth protected HTTPS Beta API. The smoke used one reviewed fictional short-story sample, made one HTTP POST with automatic retry disabled, and did not authorize invitation distribution, public Diagnosis uploads, feedback, public health/readiness routes or any later deployment stage.

## Result

- The single request returned HTTP 200 in approximately 67.9 seconds.
- The response was valid JSON and matched the public DTO whitelist. No internal diagnostics, prompt metadata, raw report or other forbidden internal field was exposed.
- The saved metadata reached `stage=final` with decision `complete_final`.
- The final prompt version was `v1-final-2026-06-patch5`, the model was `deepseek-v4-flash`, and `fallback=false`.
- The diagnosis metadata recorded three provider calls. The persistent provider counter increased by three and matched the metadata.
- No second POST or automatic retry occurred.

## Runtime And Boundary Verification

- Diagnosis remained `active/disabled`, with `NRestarts=0` and port `8788` listening only on loopback.
- The active Nginx site and Beta include hashes were unchanged.
- The public home page, frozen `/diagnosis/` page and analytics boundary remained healthy.
- Beta remained protected by Basic Auth. Feedback and backend health/readiness were not exposed as Diagnosis routes.
- New Diagnosis and Nginx log entries had zero matches for Authorization values, provider keys, submitted sample text, complete reports or provider payloads.
- The metadata record was retained with `reviewConsent=false`; no review-consent record was created.

## Cleanup And Retained Evidence

- The temporary sample, response headers and complete response were deleted only after DTO, metadata, provider-count, service, log and routing checks passed.
- A restricted mode `0600` redacted execution summary and the production metadata record remain as audit evidence.
- This document contains no sample text, complete response, headers, password, key, Authorization value or provider payload.

## Stop State

Stage B2 is complete as a production-chain smoke only. It verifies the protected request path, staged V1 execution, public DTO boundary and operational controls for this one fictional sample. It does not establish diagnosis quality, authorize public or invitation distribution, enable systemd at boot, open feedback, or authorize a subsequent stage.
