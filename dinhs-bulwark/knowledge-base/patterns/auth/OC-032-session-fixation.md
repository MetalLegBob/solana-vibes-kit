# OC-032: Session Fixation

**Category:** Authentication & Authorization
**Severity:** HIGH
**Auditors:** AUTH-02
**CWE:** CWE-384
**OWASP:** A07:2021 - Identification and Authentication Failures

## Description

Session fixation occurs when an application does not regenerate the session identifier after a user authenticates. An attacker obtains a valid session ID from the application, tricks the victim into using it (via a link, cookie injection, or cross-site scripting), and then uses the now-authenticated session to impersonate the victim.

CVE-2021-41246 in `express-openid-connect` (Auth0's Express middleware) demonstrated this exact flaw: the middleware did not regenerate the session ID or session cookie when users logged in, opening the application to session fixation attacks. This affected all versions before 2.5.2. Passport.js addressed a similar class of vulnerabilities in version 0.6.0, adding session regeneration after authentication.

The attack is particularly effective in applications that accept session IDs from URL parameters or allow session IDs to be set via cross-site mechanisms. Even cookie-based sessions are vulnerable if session IDs persist across the authentication boundary.

## Detection

```
# Passport login without session regeneration
grep -rn "passport\.authenticate\|req\.login\|req\.logIn" --include="*.ts" --include="*.js"
# Session creation without regeneration
grep -rn "req\.session\.\(user\|userId\|authenticated\)" --include="*.ts" --include="*.js" | grep -v "regenerate\|destroy"
# Missing req.session.regenerate
grep -rn "login\|signin\|authenticate" --include="*.ts" --include="*.js" -A 10 | grep -v "regenerate"
```

## Vulnerable Code

```typescript
import session from 'express-session';

// VULNERABLE: Session ID not regenerated after login
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await authenticate(email, password);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  // Session ID from before authentication persists
  req.session.userId = user.id;
  req.session.authenticated = true;
  res.redirect('/dashboard');
});
```

## Secure Code

```typescript
import session from 'express-session';

// SECURE: Regenerate session after authentication
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await authenticate(email, password);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  // Regenerate session ID to prevent fixation
  const oldSession = req.session;
  req.session.regenerate((err) => {
    if (err) return res.status(500).json({ error: 'Session error' });
    // Restore necessary data to new session
    req.session.userId = user.id;
    req.session.authenticated = true;
    res.redirect('/dashboard');
  });
});
```

## Impact

An attacker who fixes a session can hijack the victim's authenticated session after they log in. This grants full access to the victim's account without knowing their credentials.

## References

- CVE-2021-41246: express-openid-connect session fixation (no session regeneration on login)
- Passport.js 0.6.0: Session fixation fix - https://medium.com/passportjs/fixing-session-fixation-b2b68619c51d
- CWE-384: Session Fixation
- OWASP Session Fixation: https://owasp.org/www-community/attacks/Session_fixation
