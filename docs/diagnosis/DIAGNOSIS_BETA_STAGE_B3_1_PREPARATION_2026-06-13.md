# Diagnosis Beta Stage B3.1 Preparation

Date: 2026-06-13

## Scope And Stop Boundary

Stage B3.1 prepares rules, user-facing notices, a manual feedback template, a deletion procedure and an operations checklist for a future small invitation-only Beta. It does not create tester accounts, change production limits or environment variables, restart or enable services, call AI, invite users, expose feedback, or authorize Stage B3.2.

## Initial Beta Rules

- Initial target: three testers over seven days, invited in a `1 then 2` sequence only after the first tester's operational result is reviewed.
- Each tester is planned for at most two total submissions and one submission per day. These are operating rules managed in a manual invitation ledger until persistent per-account enforcement is implemented and verified.
- The code contains an in-process account-keyed daily limiter, but its production per-account behavior has not been separately verified for B3. It resets when the service restarts and must not be represented as an implemented persistent account quota or technical guarantee.
- Supported inputs remain pasted text, UTF-8 TXT and DOCX. PDF, images, OCR, archives and full-length long scripts remain outside B3.
- Recommended material length is 300-8,000 Chinese characters, within the existing technical maximum.
- Testers may submit fictional material, their own material, authorized material or sufficiently de-identified material. They must not submit identity data, contact details, confidential information, trade secrets, NDA material, unauthorized works or other sensitive personal content.
- B3 uses `reviewConsent=false`. The Beta page does not offer full-material retention, and complete material or reports must not be retained for manual review during this stage.
- Feedback remains manual. `/api/diagnosis-feedback` stays closed.
- Diagnosis request counts and provider call counts are separate records. Operators must record both values directly and must not infer provider usage by multiplying diagnosis requests by three.

## User Notice

Use the following points on the Beta page and in the invitation message:

- This is an invitation-only Beta and access credentials must not be shared.
- A diagnosis normally needs 60-90 seconds. Keep the page open and do not submit repeatedly.
- Submit only material the tester is authorized to process and has appropriately de-identified.
- Content is sent to a third-party AI provider for diagnosis.
- B3 defaults to `reviewConsent=false` and FrameSpark does not retain complete material or complete reports.
- Results are AI-generated creative references, may be incomplete or incorrect, and do not constitute legal, investment, production or commercial advice.
- If a request fails, do not retry immediately. Record the time and visible error message and contact the Beta operator.
- Privacy or deletion requests use `law@framespark.cn`; story and product feedback uses `script@framespark.cn`.

## Manual Feedback Template

The operator may copy this template into a private one-to-one channel. Do not ask for passwords, complete source material or a complete report.

```text
Beta account alias:
Diagnosis ID:
Completion status: completed / stopped with guidance / failed
Submitted at:
Overall usefulness (1-5):
Understanding accuracy (1-5):
Actionability (1-5):
Issue category: misunderstanding / vague advice / missing issue / display problem / timeout or error / other
Optional note (maximum 500 Chinese characters; do not paste complete material or report):
May FrameSpark contact you for clarification: yes / no
```

Manual feedback records should be accessible only to the Beta operator, retained for no more than 30 days and deleted earlier on request. They must not be committed to Git or placed in the public webroot.

## Deletion Request Procedure

1. Receive requests through `law@framespark.cn` and record the receipt time.
2. Ask only for the diagnosis ID, Beta account alias and minimal information needed to verify control of the account. Never ask for the Basic Auth password or a copy of the material.
3. Locate only FrameSpark-managed metadata, manual feedback or other records tied to that diagnosis ID. Do not print record content into chat or ordinary logs.
4. Complete deletion within three business days. B3 has no review-consent full-material record by design; an unexpected complete-material record is a stop condition and security incident.
5. Keep a minimal deletion audit containing request date, diagnosis ID hash, completion date and operator identifier. It must not contain material, report text, credentials or contact-message content.
6. Confirm completion to the requester and record any deletion failure as a B3 blocker.

This procedure covers FrameSpark-controlled records. It must not claim deletion from third-party provider systems unless that behavior has been separately verified and legally reviewed.

## Monitoring Duty Checklist

Run the checklist after each tester's first request and at the start and end of each Beta day:

- Record diagnosis request count separately from provider call count.
- Record HTTP status distribution: 2xx, 4xx and 5xx.
- Record request duration and any timeout.
- For completed metadata, record stage, fallback state and provider call count without report content.
- Confirm `NRestarts=0` and Diagnosis remains active with `8788` listening only on loopback.
- Review Nginx errors and repeated 401/403 patterns without recording Authorization values.
- Check logs for sensitive-keyword matches; do not print matching material or response bodies into the duty record.
- Check the DeepSeek dashboard for daily call and cost changes. The application does not currently provide authoritative token-cost accounting.
- Confirm no complete material or complete report was retained with `reviewConsent=false`.
- Confirm the public `/diagnosis/` page, analytics and protected Beta boundary remain unchanged.

Immediately pause invitations on internal-field exposure, unauthorized content retention, credential leakage, provider authentication failure, abnormal provider-call counts, repeated 5xx, service restart/crash loop, non-loopback listening or unexpected cost growth. Do not automatically retry failed diagnoses.

## Basic Auth Account Handling

- Future testers require separate account aliases; the existing operator smoke account must not be shared.
- Add users to the existing password file using interactive password entry and an atomic update procedure.
- Never use `htpasswd -c` when adding a user: `-c` recreates the file and can remove existing accounts.
- Passwords and hashes must not enter chat, command arguments, shell history, Git, screenshots or duty records.
- Account creation, distribution, rotation and revocation belong to a separately authorized B3.2 task.

## B3.2 Entry Blockers

B3.2 must not begin until all items below are explicitly resolved:

- Decide whether to enable `framespark-diagnosis.service` at boot. If it remains disabled, formally accept Beta interruption after a server restart and define the operator responsible for restoring service.
- Confirm actual production diagnosis, account, IP, global, concurrency and provider limits, including a dedicated verification of account-key isolation. Document that in-memory request counters reset on process restart.
- Assign a named monitoring duty owner, deletion-request owner and DeepSeek cost-check owner.
- Approve independent tester account aliases and a private credential-delivery and revocation procedure.
- Complete human legal review of the Beta page notice, privacy policy, terms, third-party AI disclosure and deletion wording.
- Define the manual invitation ledger used to enforce total per-tester submissions until persistent account quotas exist.
- Confirm the feedback API remains closed and that manual feedback storage has an owner and deletion date.

Passing B3.1 documentation and static checks does not authorize account creation, invitation distribution, production configuration changes, service actions, AI calls or Stage B3.2.
