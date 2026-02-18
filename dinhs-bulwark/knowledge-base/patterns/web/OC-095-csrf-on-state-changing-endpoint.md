# OC-095: CSRF on State-Changing Endpoint

**Category:** Web Application Security
**Severity:** HIGH
**Auditors:** WEB-03
**CWE:** CWE-352
**OWASP:** A01:2021 - Broken Access Control

## Description

Cross-Site Request Forgery (CSRF) occurs when a malicious website tricks an authenticated user's browser into making an unintended state-changing request (POST, PUT, DELETE) to a vulnerable application. The browser automatically includes cookies (including session cookies) with the request, so the server processes it as a legitimate authenticated action.

Despite the widespread adoption of SameSite cookies (Chrome defaults to `Lax` since 2021), CSRF remains exploitable in 2025. PortSwigger's Web Security Academy documents multiple SameSite bypass techniques: GET-based state changes that work with `Lax`, cookie refresh windows within 2 minutes of OAuth login, and method override attacks. The HTTP Cookie Sandwich attack (2025) demonstrated a new technique to bypass `HttpOnly` flags, further expanding the CSRF attack surface.

State-changing endpoints that accept `application/x-www-form-urlencoded` or `multipart/form-data` content types are most vulnerable because these can be submitted via HTML forms cross-origin without triggering CORS preflight requests.

## Detection

```
# State-changing endpoints without CSRF protection
grep -rn "app\.\(post\|put\|delete\|patch\)" --include="*.ts" --include="*.js"

# Missing CSRF middleware
grep -rn "csrf\|csrfToken\|csurf\|csrf-protection" --include="*.ts" --include="*.js"

# Form submissions without CSRF tokens
grep -rn "<form.*method.*POST\|<form.*method.*post" --include="*.html" --include="*.ejs" --include="*.hbs" --include="*.tsx"

# Check for CSRF token in forms
grep -rn "_csrf\|csrf_token\|csrfToken\|X-CSRF-Token" --include="*.html" --include="*.tsx" --include="*.ejs"
```

## Vulnerable Code

```typescript
import express from 'express';

const app = express();
app.use(express.urlencoded({ extended: true }));

// VULNERABLE: State-changing endpoint with no CSRF protection
app.post('/api/account/change-email', (req, res) => {
  const { newEmail } = req.body;
  // Session cookie is sent automatically by the browser
  db.users.update(req.session.userId, { email: newEmail });
  res.json({ success: true });
});

// VULNERABLE: Financial action without CSRF token
app.post('/api/transfer', (req, res) => {
  const { to, amount } = req.body;
  processTransfer(req.session.userId, to, parseFloat(amount));
  res.json({ success: true });
});

// Attacker's page:
// <form action="https://target.com/api/account/change-email" method="POST">
//   <input type="hidden" name="newEmail" value="attacker@evil.com" />
// </form>
// <script>document.forms[0].submit();</script>
```

## Secure Code

```typescript
import express from 'express';
import { doubleCsrf } from 'csrf-csrf';

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const {
  generateToken,
  doubleCsrfProtection,
} = doubleCsrf({
  getSecret: () => process.env.CSRF_SECRET!,
  cookieName: '__csrf',
  cookieOptions: {
    httpOnly: true,
    sameSite: 'strict',
    secure: true,
  },
  getTokenFromRequest: (req) =>
    req.headers['x-csrf-token'] as string || req.body._csrf,
});

// SECURE: Apply CSRF protection to all state-changing routes
app.use(doubleCsrfProtection);

// Generate CSRF token for forms
app.get('/api/csrf-token', (req, res) => {
  const token = generateToken(req, res);
  res.json({ token });
});

// Protected endpoint
app.post('/api/account/change-email', (req, res) => {
  const { newEmail } = req.body;
  db.users.update(req.session.userId, { email: newEmail });
  res.json({ success: true });
});

app.post('/api/transfer', (req, res) => {
  const { to, amount } = req.body;
  processTransfer(req.session.userId, to, parseFloat(amount));
  res.json({ success: true });
});
```

## Impact

CSRF enables attackers to perform any action the victim user can perform: changing email/password, initiating financial transfers, modifying account settings, approving transactions, or deleting data. In cryptocurrency applications, CSRF can be used to change withdrawal addresses or approve wallet connections.

## References

- CWE-352: Cross-Site Request Forgery (CSRF)
- PortSwigger: "Bypassing SameSite cookie restrictions"
- InfoSec Write-ups: "CSRF in 2025: Solved But Still Bypassable" (2025)
- SnoopBees: "HTTP Cookie Sandwich Attack" (2025)
- OWASP CSRF Prevention Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html
