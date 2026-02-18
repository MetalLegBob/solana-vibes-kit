# OC-035: Missing Secure Flag on Session Cookie

**Category:** Authentication & Authorization
**Severity:** MEDIUM
**Auditors:** AUTH-02
**CWE:** CWE-614
**OWASP:** A05:2021 - Security Misconfiguration

## Description

The `Secure` flag on cookies ensures they are only transmitted over HTTPS connections. Without it, session cookies are sent in plaintext over HTTP, allowing any network attacker (on public WiFi, compromised routers, or via DNS spoofing) to intercept the session token through a passive man-in-the-middle attack.

Even when the application itself runs on HTTPS, a missing Secure flag means the cookie will be sent if the user accidentally visits the HTTP version of the site, or if any resource is loaded over HTTP. Many applications serve redirects from HTTP to HTTPS, but the initial HTTP request already includes the cookie in plaintext before the redirect occurs.

This vulnerability is especially critical in environments where users connect via untrusted networks, which is effectively all mobile and remote work scenarios. A single HTTP request with a session cookie is enough for an attacker to capture and replay the session.

## Detection

```
# Cookies set without secure flag
grep -rn "res\.cookie\s*(" --include="*.ts" --include="*.js" | grep -v "secure"
# Session config without secure
grep -rn "session\s*(\s*{" --include="*.ts" --include="*.js" -A 15 | grep -i "cookie" -A 5 | grep -v "secure"
# Cookie middleware configuration
grep -rn "cookie.*{" --include="*.ts" --include="*.js" -A 5
```

## Vulnerable Code

```typescript
import session from 'express-session';

// VULNERABLE: Session cookie sent over HTTP
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 3600000,
    httpOnly: true,
    // Missing secure: true -- cookie sent over HTTP
  },
}));
```

## Secure Code

```typescript
import session from 'express-session';

// SECURE: Cookie only sent over HTTPS
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 3600000,
    httpOnly: true,
    secure: true,          // Only sent over HTTPS
    sameSite: 'strict',
  },
}));

// For development environments behind a proxy:
app.set('trust proxy', 1); // Trust first proxy
```

## Impact

An attacker on the same network can passively intercept session cookies sent over HTTP. This requires no active exploitation -- simply monitoring network traffic on public WiFi or a compromised network is sufficient to steal sessions.

## References

- CWE-614: Sensitive Cookie in HTTPS Session Without 'Secure' Attribute
- OWASP Secure Cookie: https://owasp.org/www-community/controls/SecureCookieAttribute
- https://owasp.org/Top10/A05_2021-Security_Misconfiguration/
- RFC 6265 Section 5.2.5: The Secure Attribute
