# OC-098: SameSite Cookie Bypass

**Category:** Web Application Security
**Severity:** MEDIUM
**Auditors:** WEB-03
**CWE:** CWE-1275
**OWASP:** A01:2021 - Broken Access Control

## Description

The `SameSite` cookie attribute restricts when cookies are sent in cross-site requests. `SameSite=Strict` blocks cookies on all cross-site requests, while `SameSite=Lax` (Chrome's default since 2021) allows cookies only on top-level GET navigations. However, multiple bypass techniques exist that undermine these protections.

PortSwigger's Web Security Academy documents several SameSite bypass techniques: (1) exploiting GET-based state changes with `Lax` cookies, (2) abusing the 2-minute cookie refresh window after OAuth login where Chrome treats new cookies as `None`, (3) using `method=POST` override parameters with GET requests, and (4) sibling subdomain attacks where a vulnerable subdomain can set cookies for the parent domain. The HTTP Cookie Sandwich technique (2025) demonstrated bypassing `HttpOnly` by exploiting mismatches between how servers and browsers parse the `Cookie` header.

Applications that rely solely on SameSite cookies for CSRF protection without additional defense layers are vulnerable to these bypass techniques.

## Detection

```
# Cookie configuration without SameSite or with SameSite=None
grep -rn "sameSite.*none\|samesite.*none" --include="*.ts" --include="*.js" -i
grep -rn "Set-Cookie" --include="*.ts" --include="*.js" | grep -v -i "samesite"

# State changes via GET requests (bypassable with Lax)
grep -rn "app\.get\|router\.get" --include="*.ts" --include="*.js" | grep -i "delete\|update\|change\|transfer\|withdraw"

# Method override parameters
grep -rn "_method\|methodOverride\|X-HTTP-Method-Override" --include="*.ts" --include="*.js"

# OAuth flows that may trigger cookie refresh window
grep -rn "oauth\|callback\|authorize" --include="*.ts" --include="*.js"
```

## Vulnerable Code

```typescript
import express from 'express';
import session from 'express-session';

const app = express();

app.use(session({
  secret: process.env.SESSION_SECRET!,
  cookie: {
    httpOnly: true,
    secure: true,
    sameSite: 'lax', // Default -- allows GET navigation
  },
}));

// VULNERABLE: State change via GET -- bypassable with SameSite=Lax
app.get('/api/account/unsubscribe', (req, res) => {
  db.users.update(req.session.userId, { subscribed: false });
  res.redirect('/settings');
});

// VULNERABLE: Method override allows POST-like actions via GET
app.use((req, res, next) => {
  if (req.query._method) {
    req.method = req.query._method as string;
  }
  next();
});

// GET /api/account/delete?_method=DELETE bypasses SameSite=Lax
app.delete('/api/account/delete', (req, res) => {
  db.users.delete(req.session.userId);
  res.json({ deleted: true });
});
```

## Secure Code

```typescript
import express from 'express';
import session from 'express-session';
import { doubleCsrf } from 'csrf-csrf';

const app = express();

app.use(session({
  secret: process.env.SESSION_SECRET!,
  cookie: {
    httpOnly: true,
    secure: true,
    sameSite: 'strict', // SECURE: Strict -- blocks all cross-site requests
  },
}));

// SECURE: Do not use method override
// SECURE: State changes only via POST/PUT/DELETE (never GET)

const { doubleCsrfProtection } = doubleCsrf({
  getSecret: () => process.env.CSRF_SECRET!,
  cookieName: '__csrf',
  cookieOptions: { httpOnly: true, sameSite: 'strict', secure: true },
  getTokenFromRequest: (req) => req.headers['x-csrf-token'] as string,
});

app.use(doubleCsrfProtection);

// State changes require POST with CSRF token
app.post('/api/account/unsubscribe', (req, res) => {
  db.users.update(req.session.userId, { subscribed: false });
  res.json({ success: true });
});

app.delete('/api/account/delete', (req, res) => {
  db.users.delete(req.session.userId);
  res.json({ deleted: true });
});
```

## Impact

SameSite bypass enables CSRF attacks even when cookies have SameSite=Lax or SameSite=Strict protections. Attackers can force account modifications, trigger financial transactions, or change security settings through carefully crafted cross-site requests that exploit the bypass techniques.

## References

- CWE-1275: Sensitive Cookie with Improper SameSite Attribute
- PortSwigger: "Bypassing SameSite cookie restrictions" -- comprehensive bypass guide
- PortSwigger Lab: "SameSite Lax bypass via cookie refresh"
- SnoopBees: "HTTP Cookie Sandwich Attack" (2025)
- OWASP: SameSite cookie attribute documentation
