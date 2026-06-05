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

### Rules

- Rate-limit login / signup / reset endpoints: **10 req/min per IP**, **100/day per account**.
- After **5 failed logins**: 15-minute account lockout with exponential backoff.
- Apply global rate limits to public mutating endpoints (reviews, uploads) to mitigate abuse.
- Revoke refresh tokens server-side on logout.
- Log auth failures and suspicious activity to the audit stream.

### Implementation options

| Layer            | Tool                                         |
| ---------------- | -------------------------------------------- |
| Edge (preferred) | Cloudflare Rate Limiting / Vercel edge rules |
| App              | Redis sliding-window middleware → return 429 |
| Long-term        | WAF / dedicated bot-detection service        |

### Acceptance criteria

- Login, signup, and reset-password endpoints have an operational rate limit.
- Failed login attempts escalate to lockout after threshold.
- Integration tests emulate rate-limit behavior.

---

## 🔗 Related Files

- [AUTHENTICATION.md](AUTHENTICATION.md) - Auth implementation & flows
- [SESSION_MANAGEMENT.md](SESSION_MANAGEMENT.md) - Session & expiration
- [ARCHITECTURE.md](ARCHITECTURE.md) - System architecture

---

## 📚 Additional Resources

- [OWASP: Insecure Deserialization](https://owasp.org/www-community/deserialization-of-untrusted-data)
- [MDN: Set-Cookie Security](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie)
- [MDN: Content-Security-Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [OWASP: CSRF Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [Next.js: Security](https://nextjs.org/docs/app/building-your-application/configuring/security-headers)
