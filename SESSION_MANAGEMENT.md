# Session Management & Expiration

## Overview

The application now includes automatic session management with:

- ✅ Role-based session timeouts
- ✅ Automatic session verification
- ✅ User activity detection (auto-refresh)
- ✅ Session expiration warnings
- ✅ Smart logout on expiration

## Recommended Session Timeouts

Based on OWASP security standards and industry best practices:

| Role               | Timeout                | Recommended For               | Security Level |
| ------------------ | ---------------------- | ----------------------------- | -------------- |
| **Admin**          | **60 minutes**         | Security-sensitive operations | 🔴 Strict      |
| **Business Owner** | **240 minutes** (4h)   | Daily business operations     | 🟡 Moderate    |
| **Regular User**   | **1440 minutes** (24h) | Customer convenience          | 🟢 Extended    |

## Configuration

### Environment Variables

Set these in `.env.local` to customize timeouts:

```bash
# Admin session timeout (minutes)
NEXT_PUBLIC_SESSION_ADMIN_TIMEOUT=60

# Business owner session timeout (minutes)
NEXT_PUBLIC_SESSION_BUSINESS_TIMEOUT=240

# Regular user session timeout (minutes)
NEXT_PUBLIC_SESSION_USER_TIMEOUT=1440

# Warning interval - show dialog this many minutes before expiration
NEXT_PUBLIC_SESSION_WARNING_INTERVAL=5
```

### Example: Production Override

```bash
# More strict for production
NEXT_PUBLIC_SESSION_ADMIN_TIMEOUT=30
NEXT_PUBLIC_SESSION_BUSINESS_TIMEOUT=120
```

## How It Works

### 1. Session Initialization

When user logs in, session expiration time is calculated:

```
expiration = currentTime + role-based-timeout
```

### 2. Periodic Verification

Every minute, the system:

```
✓ Verifies session is still valid with server
✓ Checks if session has expired
✓ Checks if session is about to expire (within warning interval)
```

### 3. Activity Detection

User interactions automatically extend session:

```
Events detected:
- Mouse movement/click
- Keyboard input
- Page scrolling
- Touch events

Action:
- Session expiration time is reset
- Warning is dismissed
```

### 4. Expiration Warning

When session about to expire:

```
Dialog appears 5 minutes before logout showing:
- Time remaining
- "Continue Session" button (resets timeout)
- "Logout" button
```

### 5. Automatic Logout

On expiration:

```
- User is automatically logged out
- Redirected to login page
- All auth state is cleared
```

## Implementation Details

### Core Files

1. **lib/auth/sessionConfig.ts**
   - Session timeout constants
   - Helper functions for expiration checks
   - Configuration based on role

2. **hooks/useSessionMonitor.ts**
   - Main session monitoring hook
   - Periodic verification logic
   - Activity detection
   - Warning detection

3. **components/auth/SessionWarningDialog.tsx**
   - UI dialog for expiration warning
   - Continue/Logout options
   - Time remaining display

4. **components/providers/AuthProvider.tsx**
   - Initializes session monitoring on app startup
   - Verifies session on mount

## Usage in Components

### Show Session Warning

The dialog automatically appears when session is expiring - no setup needed!

### Extend Session Programmatically

```tsx
'use client';
import { useSessionMonitor } from '@/hooks/useSessionMonitor';

export function MyComponent() {
  const { refreshSession } = useSessionMonitor();

  const handleImportantAction = () => {
    refreshSession(); // Reset session timer
    // ... perform action
  };

  return <button onClick={handleImportantAction}>Do Something</button>;
}
```

### Check Session Status

```tsx
const { timeRemaining, isExpiring, sessionExpiration } = useSessionMonitor();

if (isExpiring) {
  return <div>Session expiring in {timeRemaining} minutes</div>;
}
```

## Security Features

### Activity-Based Refresh ✅

Session timeout **does not** count idle time if user is active:

```
User typing → Session extends
User inactive → Session counts down
```

### Server-Side Verification ✅

Session validity is confirmed with Supabase every minute:

```
Even if client tries to fake expiration time,
server will catch it and force logout
```

### OWASP Compliance ✅

- Follows OWASP session management guidelines
- Role-based timeout appropriate for each access level
- Automatic logout prevents account hijacking
- User activity detection balances security and UX

### Protected Against ✅

- Session hijacking (via HttpOnly cookies)
- Session replay attacks (Supabase handles this)
- Idle timeouts (activity detection)
- Expired token usage (server verification)

## Testing

### Test Session Expiration

1. **Quick Test (1min)**

   ```bash
   # .env.local
   NEXT_PUBLIC_SESSION_ADMIN_TIMEOUT=1
   NEXT_PUBLIC_SESSION_WARNING_INTERVAL=0.5
   ```

   Login as admin → Wait ~30 seconds for warning → Wait for logout

2. **Test Activity Refresh**
   - Login as admin
   - Set timeout to 2 minutes
   - Move mouse/type keyboard
   - Warning should be dismissed
   - Session should extend

3. **Test Role-Based Timeouts**
   - Login with different roles
   - Verify different timeout durations
   - Check warning appears at correct times

## Behavior by Role

### Admin (60 minutes)

```
Strict security for sensitive operations
├─ Warning at: 55 minutes
├─ Logout at: 60 minutes
└─ Use case: Dashboard access, critical operations
```

### Business Owner (4 hours)

```
Moderate timeout for daily operations
├─ Warning at: 3h 55min
├─ Logout at: 4 hours
└─ Use case: Shop management, order processing
```

### Regular User (24 hours)

```
Extended timeout for convenience
├─ Warning at: 23h 55min
├─ Logout at: 24 hours
└─ Use case: Shopping, browsing
```

## Troubleshooting

### Issue: Getting logged out too frequently

**Solution:**

- Increase `NEXT_PUBLIC_SESSION_[ROLE]_TIMEOUT`
- Check if activity detection is working (mouse/keyboard events)

### Issue: Warning dialog not appearing

**Solution:**

- Verify `NEXT_PUBLIC_SESSION_WARNING_INTERVAL` is set
- Default is 5 minutes before expiration
- Check browser console for errors

### Issue: Can't extend session after warning

**Solution:**

- "Continue Session" button should refresh immediately
- If not working, your session may already be expired server-side
- Re-login required

### Issue: Server reports session invalid but client disagrees

**Solution:**

- This is intentional - server truth takes precedence
- Client-side timeout is a visual guide
- Server-side verification is authoritative

## Best Practices

### For Admins

- ✅ Monitor dashboard before expiration
- ✅ Save important work frequently
- ✅ Be aware of expiration warning
- ✅ Click "Continue" to stay logged in

### For Business Owners

- ✅ Longer timeout reduces interruptions
- ✅ Activity keeps you logged in
- ✅ You have ~4 hours before logout

### For Developers

- ✅ Keep default timeouts unless security requires change
- ✅ Test session expiration before deploying
- ✅ Monitor server logs for session issues
- ✅ Never disable session verification

## Production Checklist

- [ ] Verify environment variables are set correctly
- [ ] Test with each user role
- [ ] Confirm activity detection works
- [ ] Test dialog appearance and functionality
- [ ] Verify forced logout happens at expiration
- [ ] Check server logs for session verification
- [ ] Test on mobile devices
- [ ] Verify HTTPS is enforced (required for secure cookies)

## Related Security Features

This session management integrates with:

- ✅ HTTP-only cookie auth (no JS access)
- ✅ CSRF protection (SameSite: Lax)
- ✅ Server-side session verification
- ✅ Automatic logout with redirect

See [AUTHENTICATION_SECURITY.md](./AUTHENTICATION_SECURITY.md) for complete auth architecture.
