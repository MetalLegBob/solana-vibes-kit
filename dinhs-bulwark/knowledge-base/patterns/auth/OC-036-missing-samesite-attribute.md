# OC-036: Missing SameSite Attribute on Cookies

**Category:** Authentication & Authorization
**Severity:** MEDIUM
**Auditors:** AUTH-02
**CWE:** CWE-1275
**OWASP:** A01:2021 - Broken Access Control

## Description

The `SameSite` cookie attribute controls whether cookies are sent with cross-site requests. Without it (or with `SameSite=None`), the browser includes the cookie in all requests to the target domain, including those initiated by third-party sites. This is the fundamental mechanism that enables Cross-Site Request Forgery (CSRF) attacks.

Modern browsers default to `SameSite=Lax` for cookies that do not explicitly set the attribute, which blocks cookies on cross-site POST requests. However, `Lax` still allows cookies on top-level GET navigations, which can be exploited if the application performs state-changing operations via GET requests. `SameSite=Strict` provides the strongest protection but may break legitimate cross-site navigation flows.

The deprecation of the `csurf` middleware for Express.js (September 2022) due to unresolved security vulnerabilities in its double-submit cookie pattern has made SameSite attributes even more important as a first line of CSRF defense. Many applications that relied solely on `csurf` are now vulnerable.

## Detection

```
# Cookies without SameSite
grep -rn "res\.cookie\s*(" --include="*.ts" --include="*.js" | grep -v "sameSite\|samesite"
# Session config without SameSite
grep -rn "session\s*(\s*{" --include="*.ts" --include="*.js" -A 15 | grep "cookie" -A 5 | grep -v "sameSite"
# SameSite set to None
grep -rn "sameSite.*none\|samesite.*none" -i --include="*.ts" --include="*.js"
```

## Vulnerable Code

```typescript
import session from 'express-session';

// VULNERABLE: No SameSite attribute
app.use(session({
  secret: process.env.SESSION_SECRET,
  cookie: {
    httpOnly: true,
    secure: true,
    // Missing sameSite -- relies on browser default
  },
}));

// VULNERABLE: SameSite=None without justification
app.use(session({
  secret: process.env.SESSION_SECRET,
  cookie: {
    httpOnly: true,
    secure: true,
    sameSite: 'none', // Allows cross-site requests
  },
}));
```

## Secure Code

```typescript
import session from 'express-session';

// SECURE: Strict SameSite for session cookies
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: true,
    sameSite: 'strict', // No cross-site cookie transmission
    maxAge: 3600000,
  },
}));

// For apps needing cross-site navigation (e.g., OAuth callbacks):
// Use 'lax' instead of 'strict' and combine with CSRF tokens
```

## Impact

Without SameSite protection, an attacker can craft a malicious page that makes authenticated requests to the target application using the victim's session. This enables CSRF attacks including unauthorized transfers, settings changes, and data modifications.

## References

- CWE-1275: Sensitive Cookie with Improper SameSite Attribute
- https://owasp.org/Top10/A01_2021-Broken_Access_Control/
- https://web.dev/samesite-cookies-explained/
- csurf deprecation: https://www.veracode.com/blog/analysis-and-remediation-guidance-csrf-vulnerability-csurf-expressjs-middleware/
