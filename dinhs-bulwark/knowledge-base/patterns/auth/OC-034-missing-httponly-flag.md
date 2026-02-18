# OC-034: Missing HttpOnly Flag on Session Cookie

**Category:** Authentication & Authorization
**Severity:** MEDIUM
**Auditors:** AUTH-02
**CWE:** CWE-1004
**OWASP:** A05:2021 - Security Misconfiguration

## Description

The `HttpOnly` flag on cookies prevents client-side JavaScript from accessing the cookie value via `document.cookie`. Without this flag, any XSS vulnerability in the application allows an attacker to steal session tokens directly from the browser. This turns a medium-severity XSS into a complete session hijacking attack.

In the context of authentication, session cookies and JWT tokens stored in cookies are the primary targets. If an attacker can execute JavaScript in the user's browser (via stored XSS, reflected XSS, or a compromised third-party script), they can exfiltrate the session cookie to their server and replay it to gain full account access.

This is one of the most commonly misconfigured cookie attributes. Express.js sets `httpOnly: false` by default when creating cookies manually via `res.cookie()`, and many developers simply forget to add it. The `express-session` middleware does set `httpOnly: true` by default, but manual session management often misses it.

## Detection

```
# Cookie setting without httpOnly
grep -rn "res\.cookie\s*(" --include="*.ts" --include="*.js" | grep -v "httpOnly"
# Session configuration
grep -rn "session\s*(\s*{" --include="*.ts" --include="*.js" -A 10 | grep -i "cookie"
# Set-Cookie header without HttpOnly
grep -rn "Set-Cookie\|set-cookie" --include="*.ts" --include="*.js" | grep -v "httponly\|HttpOnly"
# document.cookie access to session data
grep -rn "document\.cookie" --include="*.ts" --include="*.js" --include="*.tsx"
```

## Vulnerable Code

```typescript
// VULNERABLE: Session cookie accessible to JavaScript
app.post('/login', async (req, res) => {
  const user = await authenticate(req.body);
  const token = generateToken(user);
  res.cookie('session_token', token, {
    maxAge: 3600000,
    // Missing httpOnly: true
  });
  res.json({ success: true });
});
```

## Secure Code

```typescript
// SECURE: HttpOnly prevents JavaScript access
app.post('/login', async (req, res) => {
  const user = await authenticate(req.body);
  const token = generateToken(user);
  res.cookie('session_token', token, {
    httpOnly: true,    // Cannot be accessed via document.cookie
    secure: true,      // Only sent over HTTPS
    sameSite: 'strict', // CSRF protection
    maxAge: 3600000,
    path: '/',
  });
  res.json({ success: true });
});
```

## Impact

Without HttpOnly, any XSS vulnerability allows an attacker to steal session cookies via `document.cookie`. The stolen token can be used from any location to impersonate the victim for the lifetime of the session.

## References

- CWE-1004: Sensitive Cookie Without 'HttpOnly' Flag
- OWASP Secure Cookie Attribute: https://owasp.org/www-community/HttpOnly
- https://owasp.org/Top10/A05_2021-Security_Misconfiguration/
- MDN: Set-Cookie HttpOnly attribute
