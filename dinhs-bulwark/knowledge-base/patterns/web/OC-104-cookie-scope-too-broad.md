# OC-104: Cookie Scope Too Broad (domain/path)

**Category:** Web Application Security
**Severity:** MEDIUM
**Auditors:** WEB-03, AUTH-02
**CWE:** CWE-1275
**OWASP:** A05:2021 - Security Misconfiguration

## Description

Cookies with overly broad `Domain` or `Path` attributes are sent to more endpoints than necessary, increasing the attack surface. A cookie set with `Domain=.example.com` is sent to every subdomain (`staging.example.com`, `blog.example.com`, `legacy.example.com`), including potentially compromised or less-secure services. Similarly, a cookie with `Path=/` is sent with every request to the domain, including static asset requests and public endpoints.

This is particularly dangerous in organizations that use subdomains for different services with varying security levels. A session cookie scoped to `.example.com` means that XSS on `blog.example.com` (which may be a WordPress instance) can steal sessions for `app.example.com` (the main application). In the PortSwigger SameSite bypass research, sibling subdomain attacks were identified as a key technique for exploiting `SameSite=Strict` cookies.

The risk compounds when third-party services are hosted on subdomains (e.g., `help.example.com` pointing to Zendesk) because these third-party services receive the application's cookies, potentially leaking session tokens to external systems.

## Detection

```
# Cookie domain configuration
grep -rn "domain:\s*['\"]\\." --include="*.ts" --include="*.js"
grep -rn "Set-Cookie.*domain=" --include="*.ts" --include="*.js"

# Session cookie configuration
grep -rn "cookie:\s*{" --include="*.ts" --include="*.js" -A 10
grep -rn "cookieOptions\|cookie.*domain\|cookie.*path" --include="*.ts" --include="*.js"

# Express-session or cookie-session config
grep -rn "express-session\|cookie-session" --include="*.ts" --include="*.js" -l | xargs grep -n "domain"

# Broad path scope
grep -rn "path:\s*['\"]/" --include="*.ts" --include="*.js" | grep -i "cookie"
```

## Vulnerable Code

```typescript
import express from 'express';
import session from 'express-session';

const app = express();

app.use(session({
  secret: process.env.SESSION_SECRET!,
  cookie: {
    // VULNERABLE: Cookie sent to ALL subdomains
    domain: '.example.com',
    path: '/',
    httpOnly: true,
    secure: true,
  },
}));

// Also vulnerable: setting cookies with broad scope
app.post('/api/login', (req, res) => {
  const token = generateToken(req.body.userId);
  res.cookie('auth_token', token, {
    domain: '.example.com', // Sent to blog.example.com, staging.example.com, etc.
    path: '/',
    httpOnly: true,
    secure: true,
  });
  res.json({ success: true });
});
```

## Secure Code

```typescript
import express from 'express';
import session from 'express-session';

const app = express();

app.use(session({
  secret: process.env.SESSION_SECRET!,
  cookie: {
    // SECURE: Cookie scoped to specific host (no domain attr = host-only)
    // Omitting 'domain' means cookie is only sent to the exact host
    path: '/',
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
  },
}));

// For APIs that need a different path scope
app.post('/api/login', (req, res) => {
  const token = generateToken(req.body.userId);
  res.cookie('auth_token', token, {
    // SECURE: No domain attribute -- host-only cookie
    // Only sent to app.example.com, not *.example.com
    path: '/api', // Only sent to /api/* routes
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
  });
  res.json({ success: true });
});
```

## Impact

Overly broad cookie scope exposes session tokens to XSS attacks on any subdomain, including less-secure services like staging environments, blogs, and third-party SaaS tools hosted on subdomains. It also increases the attack surface for cookie-based attacks like session fixation and CSRF via sibling subdomain exploitation.

## References

- CWE-1275: Sensitive Cookie with Improper SameSite Attribute
- PortSwigger: SameSite bypass via sibling subdomain attacks
- MDN: Cookie Domain attribute documentation
- OWASP: Session Management Cheat Sheet
- RFC 6265: HTTP State Management Mechanism -- domain matching rules
