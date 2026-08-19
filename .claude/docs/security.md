# Security Reference

Complete guide to security hardening, configuration, and verification for iLokal.

---

## 🔒 Security Architecture

### Defense Layers

```
┌──────────────────────────────────────────┐
│   Application Layer (Next.js, React)     │
│  - Input validation (Zod schemas)        │
│  - Authentication (Server Actions)       │
│  - Authorization (verifyAdminAccess)     │
└──────────────────────────────────────────┘
                     ↓
┌──────────────────────────────────────────┐
│   HTTP Headers (next.config.ts)          │
│  - CSP, CORS, X-Frame-Options           │
│  - X-Content-Type-Options, XSS           │
│  - Strict-Transport-Security (HTTPS)     │
└──────────────────────────────────────────┘
                     ↓
┌──────────────────────────────────────────┐
│   Cookie Security (supabase/server.ts)   │
│  - HttpOnly (no JS access)               │
│  - Secure (HTTPS only)                   │
│  - SameSite: Lax (CSRF protection)       │
│  - Path: / (app-wide)                    │
└──────────────────────────────────────────┘
                     ↓
┌──────────────────────────────────────────┐
│   Database Layer (Supabase RLS)          │
│  - Row-Level Security policies           │
│  - Server-side verification              │
│  - PostgreSQL constraints                │
└──────────────────────────────────────────┘
```

---

## 🍪 Cookie Security (supabase/server.ts)

### Configuration

```typescript
// supabase/server.ts
const secureOptions = {
  httpOnly: true, // ✅ Prevents JavaScript access (XSS protection)
  secure: true, // ✅ Only sent over HTTPS
  sameSite: 'lax' as const, // ✅ CSRF protection
  path: '/', // ✅ Available to entire app
};

cookieStore.set(name, value, secureOptions);
```

### Flag Explanation

| Flag         | Value | Purpose                 | Protects Against  |
| ------------ | ----- | ----------------------- | ----------------- |
| **HttpOnly** | true  | JS can't access token   | XSS attacks       |
| **Secure**   | true  | HTTPS only (production) | MITM attacks      |
| **SameSite** | Lax   | Cross-site policy       | CSRF attacks      |
| **Path**     | /     | App-wide availability   | Subdomain attacks |

### What This Means

**HttpOnly: TRUE**

```javascript
// Attacker injects: <script>fetch('/steal?token=' + document.cookie)</script>
// Result: ❌ document.cookie is empty
// Why: httpOnly prevents JavaScript from accessing auth cookie
```

**Secure: TRUE**

```
Connect via HTTP:  ❌ Cookie NOT sent
Connect via HTTPS: ✅ Cookie sent safely
```

**SameSite: Lax**

```html
<!-- Attacker's evil.com tries: -->
<img src="https://yoursite.com/api/auth/logout" />

<!-- Result: ❌ Cookie NOT sent to yoursite.com -->
<!-- Why: SameSite policy prevents cross-site requests -->
```

---

## 🔐 HTTP Security Headers (next.config.ts)

### Headers Configuration

```typescript
// next.config.ts - async headers()
async headers() {
  return [
    {
      source: '/(.*)',
      headers: [
        // CORS - Allow your domain
        {
          key: 'Access-Control-Allow-Origin',
          value: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        },
        {
          key: 'Access-Control-Allow-Credentials',
          value: 'true',
        },
        {
          key: 'Access-Control-Allow-Methods',
          value: 'GET, POST, PUT, DELETE, OPTIONS',
        },
        {
          key: 'Access-Control-Allow-Headers',
          value: 'Content-Type, Authorization',
        },

        // MIME Type Protection
        {
          key: 'X-Content-Type-Options',
          value: 'nosniff',
        },

        // Clickjacking Protection
        {
          key: 'X-Frame-Options',
          value: 'DENY',
        },

        // XSS Protection
        {
          key: 'X-XSS-Protection',
          value: '1; mode=block',
        },

        // HTTPS Enforcement (production only)
        {
          key: 'Strict-Transport-Security',
          value: process.env.NODE_ENV === 'production'
            ? 'max-age=31536000; includeSubDomains; preload'
            : 'max-age=0',
        },

        // Referrer Control
        {
          key: 'Referrer-Policy',
          value: 'strict-origin-when-cross-origin',
        },

        // Permissions Policy - Deny dangerous APIs
        {
          key: 'Permissions-Policy',
          value: 'camera=(), microphone=(), geolocation=()',
        },

        // Dynamic CSP with image sources
        {
          key: 'Content-Security-Policy',
          value: `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: ${process.env.NEXT_IMAGE_PUBLIC_URL || ''}; font-src 'self' data:;`,
        },
      ],
    },
  ];
}
```

### Header Explanations

#### CORS Headers

```
Access-Control-Allow-Origin: http://localhost:3000
├─ Only your domain can make cross-origin requests
└─ Other sites get blocked

Access-Control-Allow-Credentials: true
├─ Allows cookies to be sent with requests
└─ Required for auth tokens
```

#### X-Content-Type-Options: nosniff

```
Without: Browser might guess file type (dangerous!)
With: Browser respects Content-Type strictly
Result: Prevents MIME sniffing attacks
```

#### X-Frame-Options: DENY

```
Blocks your site from being embedded in:
<iframe src="https://yoursite.com"></iframe>

Protects against: Clickjacking attacks
Example: Invisible iframe over a button
```

#### X-XSS-Protection: 1; mode=block

```
Browser protection against XSS:
1 = Enable
mode=block = Block page if XSS detected

Note: CSP is more reliable in modern browsers
```

#### Strict-Transport-Security (HTTPS Only)

```
Production only:
max-age=31536000  → 1 year
includeSubDomains → Apply to all subdomains
preload           → Add to browser preload list

Result: Browser ALWAYS uses HTTPS
Prevents: MITM attacks via HTTP downgrade
```

#### Content-Security-Policy (CSP)

```
Controls where resources can load from:

default-src 'self'
├─ Everything from your origin only (unless overridden)

script-src 'self' 'unsafe-inline'
├─ Scripts only from your origin or inline (for testing)
├─ Production: Remove 'unsafe-inline'

img-src 'self' data: https: [NEXT_IMAGE_PUBLIC_URL]
├─ Images from: origin, data URIs, HTTPS, your storage
└─ Prevents loading images from attacker sites

Protects against: XSS, data theft via image src
```

#### Permissions-Policy

```
Denies dangerous browser APIs:
camera=()       → Can't access camera
microphone=()   → Can't access microphone
geolocation=()  → Can't access location

Prevents: Malicious scripts stealing user data
```

---

## 🧪 Security Verification

### 1. Verify Cookie Security

**In Browser DevTools:**

1. Open **DevTools (F12)**
2. Go to **Application → Cookies → http://localhost:3000**
3. Locate cookie starting with `sb-`
4. Verify these properties:

```
Name:     sb-xxxxx-auth-token
Value:    (your session token)
Domain:   localhost
Path:     /
Expires:  (far future date)
HttpOnly: ✅ true       ← Click to check
Secure:   ✅ true       ← Click to check
SameSite: ✅ Lax        ← Click to check
```

**Expected Output:**

All three should show ✅. If any show ❌, check:

-- **HttpOnly ❌?** Check `supabase/server.ts` has `httpOnly: true`
-- **Secure ❌?** You're on HTTP (normal for localhost). Production must use HTTPS.
-- **SameSite ❌?** Check `supabase/server.ts` has `sameSite: 'lax'`

### 2. Verify HTTP Headers

**In Browser DevTools:**

1. Open **DevTools (F12)**
2. Go to **Network tab**
3. Make any request to your app
4. Click on the request
5. Look for **Response Headers** section
6. Verify these are present:

```
Access-Control-Allow-Origin: http://localhost:3000 ✅
Access-Control-Allow-Credentials: true ✅
X-Content-Type-Options: nosniff ✅
X-Frame-Options: DENY ✅
Content-Security-Policy: ... ✅
```

**Using curl command:**

```bash
curl -i http://localhost:3000
# Look for headers in output
```

### 3. Test CORS Protection

**Verify external requests are blocked:**

```bash
# Test from different origin
curl -i -H "Origin: http://evil.com" http://localhost:3000

# Check response headers
# If your origin is not in Access-Control-Allow-Origin, ✅ CORS blocks it
```

### 4. Test XSS Protection

**Verify JavaScript can't access cookies:**

Open **DevTools Console** and run:

```javascript
console.log(document.cookie);
// Expected: Empty or "undefined"
// If you see: sb-auth-token, ❌ HttpOnly is not set
```

### 5. Test CSRF Protection

**SameSite: Lax prevents:**

1. **Cross-site form submissions**

   ```html
   <!-- evil.com tries: -->
   <form action="https://yoursite.com/logout" method="POST">
     <input type="hidden" name="confirm" value="yes" />
   </form>
   <!-- Result: ❌ Cookie NOT sent, logout fails -->
   ```

2. **Image-based CSRF**
   ```html
   <!-- evil.com tries: -->
   <img src="https://yoursite.com/api/delete-account" />
   <!-- Result: ❌ Cookie NOT sent, request blocked -->
   ```

### 6. Test Clickjacking Protection

**Verify page can't be embedded:**

Try embedding your site in an iframe:

```html
<iframe src="https://yoursite.com"></iframe>
<!-- Result: ❌ Page doesn't load (X-Frame-Options: DENY) -->
```

---

## 🔧 Environment Variables

### Required

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_key_here
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

### Production Settings

```bash
# Switch to production
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://yourdomain.com

# This enables:
# ✅ Strict-Transport-Security header
# ✅ Secure cookie flag (HTTPS only)
# ✅ Production-grade CSP
```

### Optional - Image Storage

```bash
NEXT_IMAGE_PUBLIC_URL=https://your-storage-url.com
# Added to CSP img-src for dynamic image loading
```

---

## 📊 Threat Model Coverage

| Threat                       | Vector                                    | Prevention                             |
| ---------------------------- | ----------------------------------------- | -------------------------------------- |
| **XSS Attack**               | Inject `<script>` to steal cookie         | HttpOnly flag, CSP header              |
| **CSRF Attack**              | Cross-site form to action (delete/logout) | SameSite: Lax, Server Actions          |
| **Clickjacking**             | Invisible iframe over a button            | X-Frame-Options: DENY                  |
| **MITM (Man-in-the-Middle)** | HTTP downgrade to intercept token         | Secure flag, HTTPS enforcement         |
| **MIME Sniffing**            | Trick browser to execute JS as image      | X-Content-Type-Options: nosniff        |
| **Session Hijacking**        | Steal cookie, act as user                 | HttpOnly + Secure + HTTPS              |
| **Privilege Escalation**     | Self-assign admin role in signup          | Role forced to 'user' in public signup |
| **Data Theft via Referrer**  | Steal query params in Referer header      | Referrer-Policy: strict-origin         |
| **Malicious APIs**           | Access camera/microphone                  | Permissions-Policy denies them         |
| **Subdomain Takeover**       | Bypass security via subdomain             | HSTS includeSubDomains, SameSite       |

---

## ✅ Security Checklist

### Before Deploying

- [ ] Restart dev server to apply new headers
- [ ] Login and verify cookies in DevTools
- [ ] Check all security headers present
- [ ] Test XSS: `document.cookie` returns nothing
- [ ] Test CSRF: `curl -H "Origin: evil.com"` doesn't work
- [ ] Verify CSP allows your image storage URL
- [ ] Set `NODE_ENV=production`
- [ ] Enable HTTPS (required for Secure cookie flag)
- [ ] Set correct `NEXT_PUBLIC_APP_URL` for production

### In Production

- [ ] HTTPS certificate installed
- [ ] All environment variables set correctly
- [ ] `NODE_ENV=production` (enables HSTS)
- [ ] `NEXT_PUBLIC_APP_URL` matches your domain
- [ ] CORS origin matches production domain
- [ ] CSP img-src includes your image storage
- [ ] Monitor for security headers errors
- [ ] Regular security audits
- [ ] Keep dependencies updated

---

## 🚦 Rate Limiting & Abuse Protection

> **This section describes what is ACTUALLY ENFORCED, re-derived from the code
> on 2026-08-19.** It previously described a design that was never built —
> "10 req/min per IP", "100/day per account", and a "5 failed logins → 15-minute
> lockout" that does not exist anywhere in this repo. **A security doc that
> overstates coverage is worse than no doc**: it is read as proof a surface is
> protected, so nobody checks. If you change a limit, change this table in the
> same commit. Aspirational items live under "Not built" at the bottom, clearly
> separated from enforced ones.

### The primitive

One function backs every layer: `rateLimit(key, limit, windowMs)` in
`app/api/helpers/rateLimit.ts` — a fixed-window counter in a module-level `Map`,
no external dependency. The **caller builds the key**, which is what lets one
primitive serve three different identity models (IP, email, user id) without
knowing anything about auth.

**🔴 State is per-runtime-instance.** On serverless each isolate holds its own
`Map`, so with N warm instances the effective ceiling is roughly N × the
configured limit. **Treat every number below as a baseline flood guard, not a
distributed quota.** The swap path is a Redis/Upstash store behind the same
`rateLimit()` signature — one file, no call-site changes. Tracked as **TD-007**.

Windows are fixed, not sliding: a burst straddling a boundary can briefly get
2× the limit. Acceptable for flood control, not for anything billed.

### What is enforced

| Layer | Where | Keyed by | Budget | Env |
| --- | --- | --- | --- | --- |
| **Edge / pre-auth** | `proxy.ts` | IP | **200 / 60s** on `/api/mobile` + `/api/protected/mobile` | `MOBILE_RATE_LIMIT`, `MOBILE_RATE_WINDOW_MS` |
| **Edge / pre-auth** | `proxy.ts` | IP | **60 / 60s** on the Sentry tunnel (`/monitoring`) | `SENTRY_TUNNEL_RATE_LIMIT`, `SENTRY_TUNNEL_WINDOW_MS` |
| **Auth surface** | `checkAuthRateLimit()` | IP **and** email | **30 / 60s** per IP + **8 / 300s** per account | `AUTH_RATE_LIMIT_IP`, `AUTH_RATE_LIMIT_ACCOUNT`, `AUTH_RATE_WINDOW_MS`, `AUTH_ACCOUNT_WINDOW_MS` |
| **Upload surface** | `checkUploadRateLimit()` | user id | **30 / 60s** shared across all 7 `/api/web/upload/**` routes | `WEB_UPLOAD_RATE_LIMIT`, `WEB_UPLOAD_RATE_WINDOW_MS` |
| **Server Actions** | inline per action | user id | **30 / 60s** business + customer, **20 / 60s** admin menu-follow-up | `BUSINESS_ACTION_RATE_LIMIT`, `CUSTOMER_ACTION_RATE_LIMIT`, `ADMIN_ACTION_RATE_LIMIT` (+ `_WINDOW_MS`) |

Three properties worth preserving, each of which cost something to learn:

- **The proxy limits mobile BEFORE `getUser()` or any PostgREST call** — a flood
  cannot reach the database at all. A guard placed after auth still pays for the
  auth.
- **Doors that share a budget must share a key namespace.** The login API route
  and `signInAction` both use `auth:login:*`; all seven upload routes use
  `web-upload:${userId}`. Give each door its own bucket and an attacker
  multiplies their allowance by rotating between them.
- **Never key on a client-supplied identifier.** `upload/avatar` accepts a
  `userId` form field for admin edits; keying on it would grant unlimited budget
  by rotating the value. Key on the *verified* session identity.

### Coverage — check this during any audit

| Surface | State |
| --- | --- |
| `/api/mobile/**`, `/api/protected/mobile/**` | ✅ proxy, per IP |
| `/api/auth/login`, `/signup`, `/reset-password` | ✅ per IP + per account |
| `/api/web/upload/**` (7 routes) | ✅ per user, shared bucket (2026-08-19) |
| `/api/web/businesses/[id]/offerings`, `/deal` | ✅ self-guarded (registration) |
| `/monitoring` (Sentry tunnel) | ✅ proxy, per IP |
| 8 Server Action files (business/customer/admin writes) | ✅ per user |
| **`/api/web/businesses/[id]/files`** | 🔲 **unguarded** — sibling upload route, outside `upload/` |
| **15 other mutating `/api/web/**` routes** | 🔲 **unguarded** — payments (checkout/confirm/refund), ratings, coupon redeem, invoices, notifications, users, taxonomy |
| **14 mutating `/api/admin/**` routes** | 🔲 **unguarded** — in the proxy matcher, but the limiter block only tests the two mobile prefixes |
| **22 Server Action files** | 🔲 **unguarded** — incl. coupons, branches, profile, sections, most of admin |
| `/api/auth/logout`, `/refresh-token`, `/verify-email` | 🔲 unguarded |

**🔴 The structural cause, which matters more than any single route:
`/api/web` is absent from the proxy matcher.** A route added there is
unthrottled *by default* and nothing at review time says so. Until that changes,
every new `/api/web` mutating route must guard itself. Tracked as **TD-021**.

### Rules for new code

- **Any new `/api/auth/*` route** must call `checkAuthRateLimit` (per-IP +
  per-account, scoped by endpoint label).
- **Any new `/api/web/upload/**` route** must call `checkUploadRateLimit(userId)`
  after auth and **before `request.formData()`** — buffering the body and
  re-encoding the image is the cost being prevented. Enforced by
  `app/api/web/upload/__tests__/upload-rate-limit.contract.test.ts`, which
  discovers routes from the filesystem, so a new one fails until guarded.
- **Any new mutating `/api/web/*` or `/api/admin/*` route** must guard itself —
  the proxy will not do it for you.
- **Any new Server Action that writes, uploads, emails, or fans out** must
  rate-limit per user. Server-Action POSTs never reach the proxy limiter.
- **Return 429 with `Retry-After`**, and **match the route's existing error
  shape**. `tooManyRequestsResponse` emits `{ message }`; the upload routes emit
  `{ error }` because their clients read `.error` (`BannerUploader` does
  `json.error ?? 'Banner upload failed'`). A body the client cannot read renders
  as a generic failure and invites the immediate retry that makes a flood worse.
- **Place the guard between auth and work**, and fail closed: a missing user id
  is `401`, never "skip the limiter".

### Not built (aspirational — do not read as coverage)

- Distributed/shared-state limiting (Redis, Upstash, Vercel KV) — **TD-007**.
- Failed-login lockout with exponential backoff. There is a *throttle*
  (8/300s per account); there is **no lockout**.
- CAPTCHA / progressive challenge on suspicious activity.
- Edge/WAF-layer limiting (Cloudflare, Vercel firewall rules).
- Bot-detection service.
- An audit stream for auth failures (failures are `console.error`'d and reach
  Sentry via `logActionError`/`loggedServerError`; there is no dedicated
  security audit log).

### Acceptance criteria

- Every surface in the coverage table is either ✅ or listed as a tracked gap —
  no third state.
- A new route on a guarded surface fails its contract test until guarded.
- **The numbers here match the code.** Counted 2026-08-19: **47** mutating API
  routes carry no guard, of which **14 are `/api/mobile*` and covered by the
  proxy**, leaving **33 genuinely unguarded** (16 `/api/web`, 14 `/api/admin`,
  3 `/api/auth`) plus 22 Server Action files. Re-derive with the sweep in
  [testing.md](testing.md) — do not trust this paragraph after a release.

---

## 🔗 Related Files

- [authentication.md](authentication.md) - Auth implementation & flows
- [session-management.md](session-management.md) - Session & expiration
- [architecture.md](architecture.md) - System architecture

---

## 📚 Additional Resources

- [OWASP: Insecure Deserialization](https://owasp.org/www-community/deserialization-of-untrusted-data)
- [MDN: Set-Cookie Security](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie)
- [MDN: Content-Security-Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [OWASP: CSRF Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [Next.js: Security](https://nextjs.org/docs/app/building-your-application/configuring/security-headers)
