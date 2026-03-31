# API Wrapper Table — Security & Performance Enhancements

Overview

- This file supplements `WORKFLOW/api-wrapper-table-full.md` and the CSV `WORKFLOW/api-wrapper-table-full.csv` by providing concrete, actionable security and performance checks that apply across the API surface. The CSV includes a `Test Coverage` column (default `Unknown`).

Global Security Checks (apply where relevant)

- Auth & Authorization: ensure every write/admin route enforces session or role checks; prefer server-fast-paths for secrets-bearing flows.
- Secrets: never access provider secrets (payment, email) from client code or exported barrel; keep calls server-only and audit usage.
- Input Validation: apply Zod validation on server routes and re-validate on wrappers when accepting free-form input.
- Rate Limiting: per-IP and per-user rate limits on search, auth, and coupon redemption endpoints.
- PII Handling: redact or limit fields in public endpoints; use server-side masking for admin exports.
- Uploads: validate MIME type, size, and scan for malware; prefer signed URLs and background processing for heavy files.
- Idempotency & Audit: payment confirm/refund and invoice/send endpoints must be idempotent and write audit events.

Global Performance Checks (apply where relevant)

- Caching: add short TTL caches for trending/search suggestions; medium TTL for analytics aggregates.
- Pagination & Limits: enforce sensible defaults and maximum page sizes on list endpoints.
- Aggregation Strategy: precompute heavy analytics in background jobs and expose cached results to API.
- Indexing: ensure DB indexes on common filters (user_id, business_id, created_at, status) for billing, payments, invoices.
- Background Jobs: heavy I/O (email send, file processing, verification) should be queued and return quickly.
- CDN & Signed URLs: static and uploaded assets should use CDN with signed URLs.

How to proceed with per-route expansion

- I created `WORKFLOW/api-wrapper-table-full.csv` with a `Test Coverage` column (default `Unknown`). If you want per-route, per-column expansions (concrete DB indexes, exact auth guard function, test links), I can:
  1. Update `WORKFLOW/api-wrapper-table-full.md` inline (adds a new `Test Coverage` column and per-row enrichments), or
  2. Produce a per-route checklist file under `WORKFLOW/api-checks/<sanitized-path>.md` with exact acceptance criteria and suggested tests.

Next steps (pick one)

- I can update the markdown table inline to add `Test Coverage` and expand Security/Performance cells per route.
- Or I can generate per-route checklist files and link them from the table.
- Or update the CSV to include more columns (e.g., `Auth Guard`, `Suggested Index`, `Suggested Tests`).

If you prefer, I will now proceed to expand the markdown table inline for all routes — this is a larger edit and I will update it in a follow-up commit.
