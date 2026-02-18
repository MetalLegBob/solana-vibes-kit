# OC-037: Session Not Invalidated on Logout

**Category:** Authentication & Authorization
**Severity:** MEDIUM
**Auditors:** AUTH-02
**CWE:** CWE-613
**OWASP:** A07:2021 - Identification and Authentication Failures

## Description

When a user logs out, the server must destroy the session on the server side and clear the session cookie. If the application only clears the client-side cookie or removes session data without destroying the server-side session record, the old session token remains valid. An attacker who has previously captured the token (via XSS, log exposure, or network sniffing) can continue using it indefinitely.

This problem is common with JWT-based authentication. Because JWTs are stateless and self-contained, "logging out" on the server does not automatically invalidate the token. Without a server-side token blacklist or revocation mechanism, a JWT remains valid until its expiration time, regardless of whether the user has "logged out."

In applications using `express-session`, calling `req.session.destroy()` removes the session from the store. However, simply deleting properties from `req.session` (e.g., `delete req.session.userId`) leaves the session record intact and potentially reusable.

## Detection

```
# Logout handlers
grep -rn "\/logout\|signout\|sign-out" --include="*.ts" --include="*.js"
# Session destruction patterns
grep -rn "req\.session\.\(destroy\|regenerate\)" --include="*.ts" --include="*.js"
# Incomplete logout (only clearing properties)
grep -rn "delete req\.session\.\|req\.session\.user.*=.*null" --include="*.ts" --include="*.js"
# JWT logout without blacklist
grep -rn "logout\|signOut" --include="*.ts" --include="*.js" -A 10 | grep -v "blacklist\|revoke\|invalidate\|destroy"
```

## Vulnerable Code

```typescript
// VULNERABLE: Only clears client-side, server session lives on
app.post('/logout', (req, res) => {
  delete req.session.userId;
  delete req.session.authenticated;
  res.clearCookie('connect.sid');
  res.json({ message: 'Logged out' });
  // Server-side session record still exists and is reusable
});

// VULNERABLE: JWT "logout" with no server-side mechanism
app.post('/api/logout', (req, res) => {
  // Nothing happens server-side -- JWT is still valid until expiry
  res.json({ message: 'Logged out' });
});
```

## Secure Code

```typescript
// SECURE: Destroy server-side session completely
app.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ error: 'Logout failed' });
    res.clearCookie('connect.sid', { path: '/' });
    res.json({ message: 'Logged out' });
  });
});

// SECURE: JWT logout with token blacklist
const tokenBlacklist = new Set<string>(); // Use Redis in production

app.post('/api/logout', authenticateJWT, (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  tokenBlacklist.add(token);
  res.json({ message: 'Logged out' });
});

// In auth middleware: check blacklist before accepting token
function authenticateJWT(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (tokenBlacklist.has(token)) {
    return res.status(401).json({ error: 'Token revoked' });
  }
  // ... verify token
}
```

## Impact

A stolen session token continues to grant access after the user believes they have logged out. This is especially dangerous in shared computer scenarios, post-breach situations, or when users are trying to revoke access after detecting unauthorized activity.

## References

- CWE-613: Insufficient Session Expiration
- OWASP Session Management Cheat Sheet: Session Destruction
- https://owasp.org/Top10/A07_2021-Identification_and_Authentication_Failures/
- NIST SP 800-63B Section 7.1: Session Binding
