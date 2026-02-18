# OC-096: CSRF Token Not Validated Server-Side

**Category:** Web Application Security
**Severity:** HIGH
**Auditors:** WEB-03
**CWE:** CWE-352
**OWASP:** A01:2021 - Broken Access Control

## Description

Some applications include CSRF tokens in forms or request headers but fail to validate them server-side. This can happen when: (1) the CSRF middleware is configured but not applied to all routes, (2) validation logic has been commented out or disabled, (3) the server accepts requests regardless of whether the token is present or correct, or (4) the token check returns a warning but does not reject the request.

This is a deceptive vulnerability because the presence of CSRF tokens in forms and headers gives the appearance of protection. Developers and security reviewers may assume the tokens are being validated without verifying the server-side enforcement. Advanced CSRF bypass techniques documented by security researchers include token fixation (reusing a known valid token), empty token acceptance, and predictable token generation.

Another common variant is validating the token only for `POST` requests but ignoring it for `PUT`, `PATCH`, or `DELETE` requests, or only validating when the token is present but accepting requests where the token parameter is omitted entirely.

## Detection

```
# CSRF middleware imported but check if it's applied
grep -rn "csrf\|csurf\|csrfProtection" --include="*.ts" --include="*.js"

# Routes that skip CSRF validation
grep -rn "csrf.*false\|skipCsrf\|csrfExempt\|noCsrf" --include="*.ts" --include="*.js"

# Token present in form but not checked in handler
grep -rn "csrfToken\|_csrf" --include="*.html" --include="*.ejs" --include="*.tsx"

# CSRF validation in error-handling mode (log but don't reject)
grep -rn "csrf.*warn\|csrf.*log\|csrf.*ignore" --include="*.ts" --include="*.js"
```

## Vulnerable Code

```typescript
import express from 'express';

const app = express();
app.use(express.urlencoded({ extended: true }));

// VULNERABLE: CSRF token generated but never validated
app.get('/settings', (req, res) => {
  const csrfToken = generateCsrfToken(req.session.id);
  res.render('settings', { csrfToken }); // Token in form
});

app.post('/settings/update', (req, res) => {
  // Token is in req.body._csrf but NEVER checked!
  // The developer forgot to add validation
  const { displayName, email } = req.body;
  db.users.update(req.session.userId, { displayName, email });
  res.redirect('/settings');
});

// ALSO VULNERABLE: Token check disabled in production
app.post('/api/withdraw', (req, res) => {
  // TODO: Re-enable CSRF check after testing
  // if (req.body._csrf !== req.session.csrfToken) {
  //   return res.status(403).json({ error: 'Invalid CSRF token' });
  // }
  processWithdrawal(req.session.userId, req.body.amount, req.body.address);
  res.json({ success: true });
});
```

## Secure Code

```typescript
import express from 'express';
import { doubleCsrf } from 'csrf-csrf';

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const { doubleCsrfProtection, generateToken } = doubleCsrf({
  getSecret: () => process.env.CSRF_SECRET!,
  cookieName: '__csrf',
  cookieOptions: { httpOnly: true, sameSite: 'strict', secure: true },
  getTokenFromRequest: (req) =>
    req.headers['x-csrf-token'] as string || req.body._csrf,
});

// SECURE: CSRF middleware applied globally -- validates every state-changing request
app.use(doubleCsrfProtection);

app.get('/settings', (req, res) => {
  const csrfToken = generateToken(req, res);
  res.render('settings', { csrfToken });
});

app.post('/settings/update', (req, res) => {
  // CSRF token is validated by middleware BEFORE this handler runs
  const { displayName, email } = req.body;
  db.users.update(req.session.userId, { displayName, email });
  res.redirect('/settings');
});

app.post('/api/withdraw', (req, res) => {
  // CSRF protection enforced -- no way to bypass
  processWithdrawal(req.session.userId, req.body.amount, req.body.address);
  res.json({ success: true });
});
```

## Impact

If CSRF tokens are generated but not validated, an attacker can perform all the same actions as a standard CSRF attack. The tokens provide no protection and create a false sense of security that may delay detection of the vulnerability. State-changing actions including fund transfers, email changes, and privilege modifications are all exploitable.

## References

- CWE-352: Cross-Site Request Forgery (CSRF)
- OWASP: "CSRF in 2025: Solved But Still Bypassable" -- common validation failures
- PortSwigger Web Security Academy: CSRF token validation tests
- OWASP Testing Guide: Testing for CSRF (WSTG-SESS-05)
