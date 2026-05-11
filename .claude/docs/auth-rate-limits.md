> **MERGED** — Content consolidated into `security.md` under "Rate Limiting & Abuse Protection". This file is kept for historical reference only.

# Auth Rate Limiting & Abuse Protections

Purpose: summarise minimal, non-breaking protections for auth-related endpoints and public mutating routes.

Recommendations

- Rate limit login/signup/reset endpoints using IP + account key (e.g., 10 reqs/min, 100/day). Prefer a CDN/WAF or edge middleware.
- Implement exponential backoff and temporary account lockout on repeated failed logins (e.g., 5 failures -> 15 minute lock).
- Require CAPTCHA or progressive challenge on suspicious activity (many failed attempts or new device).
- Apply global rate limits for public mutating endpoints (e.g., reviews, uploads) to mitigate abuse.
- Use token revocation on logout/refresh (invalidate refresh tokens server-side).
- Log authentication failures and suspicious activity to an audit stream.

Implementation options

- Edge: use Cloudflare Rate Limiting / Fastly / Vercel edge rules.
- App: add middleware using Redis to track counters (sliding window) and return 429 when exceeded.
- Long-term: integrate with dedicated bot-detection service or WAF.

Acceptance criteria

- Login, signup, reset-password endpoints have an operational rate limit in front of them (edge or middleware).
- Failed login attempts are tracked and escalate to lockout after threshold.
- Documentation updated and tests (integration) emulate rate-limit behavior.

Notes

- Rate limits must be tuned to user traffic and false-positive risk.
- For security-sensitive actions (password reset), consider secondary verification (email/otp) and lower thresholds.
