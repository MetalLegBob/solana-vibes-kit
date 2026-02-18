# OC-097: CSRF via CORS Misconfiguration

**Category:** Web Application Security
**Severity:** HIGH
**Auditors:** WEB-03, WEB-02
**CWE:** CWE-352
**OWASP:** A01:2021 - Broken Access Control

## Description

When CORS is misconfigured to allow arbitrary origins with credentials (see OC-088 and OC-089), it not only enables data exfiltration but also enables a powerful form of CSRF. Traditional CSRF is limited to "simple" requests (form submissions) because the browser blocks cross-origin JavaScript requests without proper CORS headers. However, when CORS reflects the attacker's origin, the attacker can use `fetch()` or `XMLHttpRequest` with full control over request headers, body format, and HTTP method.

SonarSource documented this exact attack chain in Whistle, a popular HTTP debugging proxy. The origin reflection bug (reflecting the `Origin` header in `Access-Control-Allow-Origin`) combined with `Access-Control-Allow-Credentials: true` enabled both data theft and state-changing actions via cross-origin JavaScript. The attacker could send JSON-bodied POST/PUT/DELETE requests with custom headers, bypassing traditional CSRF defenses that rely on content-type restrictions.

This pattern is especially dangerous for JSON-based APIs that rely on the `Content-Type: application/json` header as an implicit CSRF defense, since CORS misconfiguration removes that protection entirely.

## Detection

```
# CORS configuration combined with state-changing endpoints
grep -rn "Access-Control-Allow-Credentials.*true" --include="*.ts" --include="*.js"
grep -rn "origin:\s*true\|origin.*req\.headers\.origin" --include="*.ts" --include="*.js"

# JSON APIs without CSRF tokens (relying on Content-Type as defense)
grep -rn "app\.\(post\|put\|delete\|patch\)" --include="*.ts" --include="*.js" | grep -v "csrf"

# APIs that accept both form and JSON content types
grep -rn "express\.urlencoded\|express\.json" --include="*.ts" --include="*.js"
```

## Vulnerable Code

```typescript
import express from 'express';

const app = express();
app.use(express.json());

// VULNERABLE: CORS reflects any origin with credentials
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// API relies on Content-Type: application/json as implicit CSRF defense
// But CORS misconfiguration allows cross-origin JSON requests
app.post('/api/account/change-password', (req, res) => {
  const { newPassword } = req.body;
  db.users.update(req.session.userId, { password: hash(newPassword) });
  res.json({ success: true });
});

// Attacker's page:
// fetch('https://target.com/api/account/change-password', {
//   method: 'POST',
//   credentials: 'include',
//   headers: { 'Content-Type': 'application/json' },
//   body: JSON.stringify({ newPassword: 'hacked123' })
// });
```

## Secure Code

```typescript
import express from 'express';
import cors from 'cors';
import { doubleCsrf } from 'csrf-csrf';

const ALLOWED_ORIGINS = new Set([
  'https://app.example.com',
  'https://admin.example.com',
]);

const app = express();
app.use(express.json());

// SECURE: Strict CORS allowlist
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || ALLOWED_ORIGINS.has(origin)) {
      callback(null, origin || false);
    } else {
      callback(new Error('CORS violation'));
    }
  },
  credentials: true,
}));

// SECURE: CSRF protection as additional defense layer
const { doubleCsrfProtection } = doubleCsrf({
  getSecret: () => process.env.CSRF_SECRET!,
  cookieName: '__csrf',
  cookieOptions: { httpOnly: true, sameSite: 'strict', secure: true },
  getTokenFromRequest: (req) => req.headers['x-csrf-token'] as string,
});

app.use(doubleCsrfProtection);

app.post('/api/account/change-password', (req, res) => {
  const { newPassword } = req.body;
  db.users.update(req.session.userId, { password: hash(newPassword) });
  res.json({ success: true });
});
```

## Impact

CORS-based CSRF bypasses traditional content-type defenses and enables an attacker to perform any authenticated API action: password changes, fund transfers, settings modifications, and data deletion. Combined with the ability to read responses (data exfiltration), this creates a complete account takeover vector.

## References

- CWE-352: Cross-Site Request Forgery (CSRF)
- SonarSource: "Never Underestimate CSRF: Why Origin Reflection is a Bad Idea" -- Whistle CORS-to-CSRF chain
- CVE-2025-55462: Eramba CORS misconfiguration enabling CSRF
- OWASP: CORS and CSRF interaction
- PortSwigger: "CORS vulnerability with trusted insecure protocols"
