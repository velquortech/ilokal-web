# 📅 Session Management & Expiration

> Last Updated: March 15, 2026  
> Status: **Modernized with localStorage & SessionTracker** ✅

Complete guide to session configuration, management, expiration, and monitoring.

---

## 🎯 Overview

The application implements automatic session management with:

- ✅ **Role-based timeouts** (Admin: 60min, Business: 4h, User: 24h)
- ✅ **Activity detection** (auto-extends on mouse, keyboard, scroll, touch)
- ✅ **Session verification** (every 60 seconds with server)
- ✅ **Expiration warnings** (dialog 5 minutes before logout)
- ✅ **Automatic logout** (clears cookies and redirects)
- ✅ **Server-side truth** (can't be faked on client)

---

## ⏱️ Session Timeouts

### Recommended Configuration

| Role               | Timeout                | Recommended For      | Security Level | Warning At |
| ------------------ | ---------------------- | -------------------- | -------------- | ---------- |
| **Admin**          | **60 minutes**         | Sensitive operations | 🔴 Strict      | 55 min     |
| **Business Owner** | **240 minutes** (4h)   | Daily operations     | 🟡 Moderate    | 235 min    |
| **Regular User**   | **1440 minutes** (24h) | Shopping & browsing  | 🟢 Extended    | 1435 min   |

> **Note (March 15, 2026):** Session expiration time is now stored in `localStorage['sessionExpiration']` (timestamp in ms) via the `SessionTracker` component, instead of being tracked in Zustand. This allows the session monitor to work without accessing Zustand, following SSR best practices.

### Why These Timeouts?

#### Admin: 60 Minutes

**Risk Profile:**

- Manages users, data, settings
- Account compromise = major breach
- Minimal daily tasks (check once per hour)

**Security Trade-off:** 100% security, 0% convenience
**Best for:** Financial/medical/critical systems

#### Business Owner: 240 Minutes (4 Hours)

**Risk Profile:**

- Manages shop, products, orders
- Can access customer data
- Multiple hours of continuous work

**Security Trade-off:** 80% security, 20% convenience
**Best for:** E-commerce, SaaS platforms

#### Regular User: 1440 Minutes (24 Hours)

**Risk Profile:**

- Limited data access (own profiles)
- Lower privilege level
- Extended shopping/browsing session

**Security Trade-off:** 50% security, 50% convenience
**Best for:** Consumer-facing apps (Shopify, Amazon model)

---

## ⚙️ Configuration

### Environment Variables

Set these in `.env.local` to customize timeouts:

```bash
# Admin session timeout (minutes) - default: 60
NEXT_PUBLIC_SESSION_ADMIN_TIMEOUT=60

# Business owner session timeout (minutes) - default: 240
NEXT_PUBLIC_SESSION_BUSINESS_TIMEOUT=240

# Regular user session timeout (minutes) - default: 1440
NEXT_PUBLIC_SESSION_USER_TIMEOUT=1440

# Warning interval - show dialog this many minutes before expiration - default: 5
NEXT_PUBLIC_SESSION_WARNING_INTERVAL=5

# Check interval - verify session every X seconds - default: 60
NEXT_PUBLIC_SESSION_CHECK_INTERVAL=60
```

### Example: Custom Timeouts

**Development (Quick Testing):**

```bash
NEXT_PUBLIC_SESSION_ADMIN_TIMEOUT=1
NEXT_PUBLIC_SESSION_BUSINESS_TIMEOUT=2
NEXT_PUBLIC_SESSION_USER_TIMEOUT=3
NEXT_PUBLIC_SESSION_WARNING_INTERVAL=0.5
```

**Production (Strict Security):**

```bash
NEXT_PUBLIC_SESSION_ADMIN_TIMEOUT=30       # 30 min
NEXT_PUBLIC_SESSION_BUSINESS_TIMEOUT=120   # 2 hours
NEXT_PUBLIC_SESSION_USER_TIMEOUT=720       # 12 hours
NEXT_PUBLIC_SESSION_WARNING_INTERVAL=10    # Warn 10 min before
```

**Production (User Friendly):**

```bash
NEXT_PUBLIC_SESSION_ADMIN_TIMEOUT=120      # 2 hours
NEXT_PUBLIC_SESSION_BUSINESS_TIMEOUT=480   # 8 hours
NEXT_PUBLIC_SESSION_USER_TIMEOUT=2880      # 48 hours
NEXT_PUBLIC_SESSION_WARNING_INTERVAL=15    # Warn 15 min before
```

---

## 🔄 How Session Management Works

### 1. Session Initialization (On Login)

```typescript
// App/auth/actions.ts
export async function loginAction(email: string, password: string) {
  // ... authenticate user ...
  // Session expiration = currentTime + role-based-timeout
  // Stored in sessionExpiration cookie
}
```

**Calculation Example (Admin):**

```
Current Time: 09:00 AM
Role: admin
Role Timeout: 60 minutes
Session Expires At: 10:00 AM
```

### 2. Periodic Verification (Every 60 Seconds)

```typescript
// hooks/useSessionMonitor.ts
useEffect(() => {
  const interval = setInterval(async () => {
    // Every 60 seconds:
    const result = await verifySessionAction();

    if (!result.valid) {
      // Session expired → logout
      logout();
      redirect('/login');
    } else if (isExpiringSoon()) {
      // Within 5 minutes → show warning
      setIsExpiring(true);
    }
  }, 60000);
}, []);
```

**Timeline Example:**

```
08:00 - Login as admin (timeout: 60 min)
08:00 - Session expires at 09:00
08:00 - 08:59 - Working (all good)
08:55 - Within 5 min → SessionWarningDialog appears
08:59 - No action → Auto-logout triggered
```

### 3. Activity Detection (Mouse, Keyboard, Scroll, Touch)

```typescript
// hooks/useSessionMonitor.ts
useEffect(() => {
  const handleActivity = () => {
    // On any interaction:
    refreshSession(); // Reset expiration timer
    setIsExpiring(false); // Dismiss warning
  };

  // Listen for activity events
  window.addEventListener('mousemove', handleActivity);
  window.addEventListener('keydown', handleActivity);
  window.addEventListener('scroll', handleActivity);
  window.addEventListener('touchstart', handleActivity);

  return () => {
    // Cleanup listeners
  };
}, []);
```

**Timeline Example:**

```
08:00 - Login (expires at 09:00)
08:55 - User types something
        └─ Activity detected → Session extended to 09:55
09:50 - User moves mouse
        └─ Activity detected → Session extended to 10:50
11:00 - User still working (never logged out!)
```

### 4. Expiration Warning (5 Minutes Before)

```typescript
// When sessionExpiration - now < warningInterval:
setIsExpiring(true); // Show dialog

// Dialog renders:
<SessionWarningDialog
  timeRemaining={5}
  onContinue={refreshSession} // Reset timer
  onLogout={logoutAction}     // Logout now
/>
```

**What User Sees:**

```
┌─────────────────────────────────┐
│  Your session is expiring soon  │
│                                 │
│  Time remaining: 5 minutes      │
│                                 │
│  [ Continue    ] [ Logout ]     │
└─────────────────────────────────┘
```

### 5. Automatic Logout (At Expiration)

```typescript
// When sessionExpiration <= now:
await logoutAction(); // Clear auth
redirect('/login'); // Go to login
```

**Timeline Example (Complete):**

```
09:00 - Login as user (24 hour timeout → 09:00 tomorrow)
09:00 - 13:00 - Active (lots of mouse/keyboard events)
        └─ Each activity extends session to 24h from that time
13:00 - Goes to lunch (no activity)
13:00 - 13:30 - Session counts down (30 min until expiration)
13:30 - Back to work (moves mouse)
        └─ Activity → Session extended again
13:30 - 23:55 - Working (session keeps extending)
23:55 - Leaves desk (no more activity)
23:55 - 23:59 - Session counts down (dialog appears at 23:55)
        └─ User doesn't interact
00:00 - Auto-logout (24 hours from last activity)
00:00 - Redirected to login page
```

---

## 🛠️ Implementation Details

### Core Files

#### lib/auth/sessionConfig.ts

```typescript
// Session timeout constants (minutes)
export const SESSION_TIMEOUTS = {
  ADMIN: parseInt(process.env.NEXT_PUBLIC_SESSION_ADMIN_TIMEOUT || '60', 10),
  BUSINESS_OWNER: parseInt(
    process.env.NEXT_PUBLIC_SESSION_BUSINESS_TIMEOUT || '240',
    10,
  ),
  USER: parseInt(process.env.NEXT_PUBLIC_SESSION_USER_TIMEOUT || '1440', 10),
};

// Helper functions
export function getSessionTimeout(role: string): number {
  // Returns timeout based on role
}

export function isSessionExpired(expirationTime: number): boolean {
  // Checks if session is expired
}

export function isSessionExpiring(expirationTime: number): boolean {
  // Checks if within warning interval
}
```

#### hooks/useSessionMonitor.ts

```typescript
export function useSessionMonitor() {
  // Main session monitoring hook
  // - Verifies session every 60 seconds
  // - Detects activity
  // - Auto-extends session
  // - Triggers warning dialog
  // - Auto-logout at expiration

  return {
    isExpiring: boolean,        // Session within 5 min of expiration
    timeRemaining: number,      // Minutes until logout
    sessionExpiration: number,  // Timestamp of expiration
    refreshSession: () => void, // Manually extend session
  };
}
```

#### components/auth/SessionWarningDialog.tsx

```typescript
export function SessionWarningDialog() {
  // Dialog shown when session expiring
  // - Displays time remaining
  // - "Continue Session" button (resets timeout)
  // - "Logout" button (logout immediately)
  // - Can't be dismissed by clicking outside
}
```

#### app/auth/actions.ts

```typescript
export async function verifySessionAction() {
  // Server-side session verification
  // - Checks HTTP-only cookie
  // - Verifies with Supabase backend
  // - Fetches fresh user profile
  // - Returns { valid: boolean; user: User | null }
}
```

---

## 📊 Session Timeline Examples

### Admin (60 minutes)

```
09:00 - Login
        Expires at: 10:00
        Warning at: 09:55

09:00 - 09:54 - Working (all normal)
09:55 - Dialog appears ("5 minutes remaining")
09:57 - User clicks "Continue Session"
        Expires at: 10:57 (reset)
        Warning at: 10:52

10:52 - Dialog appears again
10:55 - User continues working (activity detected)
        Expires at: 10:55 + 60min = 11:55
        Warning at: 11:50
```

### Business Owner (4 hours)

```
08:00 - Login
        Expires at: 12:00 (4 hours)
        Warning at: 11:55

08:00 - 12:00 - Working (activity detected multiple times)
        └─ Each activity resets the 4-hour timer
        └─ As long as active, never warned

12:00 - Lunch break (no activity for 30 min)
12:30 - Back to work (activity detected)
        └─ Session was still valid (didn't expire during break)
        └─ Session extended to 16:30

16:30 - No activity (goes home without logging out manually)
16:30 - Session counts down...
```

### Regular User (24 hours - Persistent Session)

```
10:00 Monday - Login
               Expires at: 10:00 Tuesday
               Warning at: 09:55 Tuesday

10:00 Mon - 09:00 Tue - Shopping with breaks
                        └─ Activity events refresh the 24h timer
                        └─ Effectively stays logged in as long as active

09:55 Tue - Dialog appears (5 min remaining)
10:00 Tue - Auto-logout if no activity

Or if active:
09:30 Tue - Last activity event
            └─ Session extended to 09:30 Wed
```

---

## 🧪 Testing Session Expiration

### Quick Test (1 Minute)

```bash
# Set minimal timeouts in .env.local:
NEXT_PUBLIC_SESSION_ADMIN_TIMEOUT=1
NEXT_PUBLIC_SESSION_WARNING_INTERVAL=0.5

# Then:
1. npm run dev
2. Login as admin
3. Wait ~30 seconds
4. SessionWarningDialog should appear
5. Click "Continue" or wait for auto-logout
```

### Test Activity Detection

```bash
1. Login
2. Wait for warning dialog
3. Move your mouse around
4. Dialog should disappear (session extended)
5. Wait again without moving
6. Dialog reappears (counting down again)
```

### Test Role-Based Timeouts

```bash
1. Login multiple times with different roles
2. Admin: Warning should appear after ~55 min
3. Business Owner: After ~235 min
4. User: After ~1435 min

Or with test timeouts:
NEXT_PUBLIC_SESSION_ADMIN_TIMEOUT=2
NEXT_PUBLIC_SESSION_BUSINESS_TIMEOUT=3
NEXT_PUBLIC_SESSION_USER_TIMEOUT=4
```

---

## ✅ Session Management Checklist

- [ ] Environment variables configured (.env.local)
- [ ] Dev server restarted
- [ ] Login works (session is created)
- [ ] Activity detection works (mouse movement extends session)
- [ ] Verification runs every 60 seconds (check console logs)
- [ ] Warning dialog appears 5 minutes before logout
- [ ] "Continue Session" button extends timeout
- [ ] "Logout" button logs out immediately
- [ ] Auto-logout occurs at expiration (if no activity)
- [ ] Server-side verification prevents fake expiration times
- [ ] Role-based timeouts are different
- [ ] Tested with all user roles

---

## 🔒 Security Features

### Prevents

- ✅ **Idle account exposure** - Automatic logout after timeout
- ✅ **Session hijacking** - Server verifies every 60 seconds
- ✅ **Fake expiration times** - Can't be set on client
- ✅ **Interrupted workflows** - Activity auto-extends session
- ✅ **Forgotten logout** - Automatic logout as safety net

### Activity Extends Session

```
Inactivity (5 min) → Warning appears
Inactivity (0 more min) → Auto-logout

But:
User active → Session extends → No logout
User moves mouse → Timer resets → No warning
```

### Server-Side Verification

```javascript
// Client tries to fake it:
document.cookie = 'sessionExpiration=' + futureDate;

// Server check:
const verifySessionAction();
// Server queries Supabase → Authoritative truth
// Client cookie is ignored
// User gets logged out anyway ✅
```

---

## 📈 Production Deployment

### Before Deploying

- [ ] Set appropriate timeouts for your use case
- [ ] Test session expiration works
- [ ] Verify activity detection on target devices
- [ ] Test on mobile (touch events)
- [ ] Verify warning dialog appears
- [ ] Monitor server logs for session verification calls

### Configuration for Production

```bash
# Balance security and user experience
NEXT_PUBLIC_SESSION_ADMIN_TIMEOUT=120       # 2 hours
NEXT_PUBLIC_SESSION_BUSINESS_TIMEOUT=480    # 8 hours
NEXT_PUBLIC_SESSION_USER_TIMEOUT=2880       # 48 hours
NEXT_PUBLIC_SESSION_WARNING_INTERVAL=15     # 15 min warning
```

---

## 🔗 Related Files

- [AUTHENTICATION.md](AUTHENTICATION.md) - Auth implementation & flows
- [SECURITY.md](SECURITY.md) - Cookie/header security
- [ARCHITECTURE.md](ARCHITECTURE.md) - System architecture

---

## 📚 OWASP References

- [OWASP: Session Management](https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/06-Session_Management_Testing/README)
- [OWASP: Idle Timeout](https://owasp.org/www-community/controls/Session_timeout)
- [Security Cheat Sheet: Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
