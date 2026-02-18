# OC-023: Missing JWT Expiry Validation

**Category:** Authentication & Authorization
**Severity:** HIGH
**Auditors:** AUTH-01
**CWE:** CWE-613
**OWASP:** A07:2021 - Identification and Authentication Failures

## Description

JWTs include an `exp` (expiration) claim to limit their validity period. When the server does not validate this claim -- or when tokens are issued without one -- stolen or leaked tokens remain valid indefinitely. This means a single token compromise grants permanent access until the signing key is rotated.

CVE-2026-25537 in the Rust `jsonwebtoken` crate demonstrated a subtle variant: when the `exp` claim was provided with an incorrect JSON type (e.g., a string instead of a number), the library marked it as "FailedToParse" and treated it as absent, silently skipping expiration validation. This type confusion allowed attackers to bypass time-based restrictions.

Many JWT libraries do validate `exp` by default, but developers sometimes use `jwt.decode()` instead of `jwt.verify()`, or explicitly disable clock checks via options like `ignoreExpiration: true`. In both cases the token's expiry is never enforced, creating a window for token replay attacks.

## Detection

```
# Using decode instead of verify
grep -rn "jwt\.decode\s*(" --include="*.ts" --include="*.js"
# Explicitly disabling expiration
grep -rn "ignoreExpiration.*true" --include="*.ts" --include="*.js"
# Tokens signed without expiry
grep -rn "jwt\.sign" --include="*.ts" --include="*.js" | grep -v "expiresIn\|exp"
# Manual token parsing without exp check
grep -rn "JSON\.parse.*atob\|Buffer\.from.*base64" --include="*.ts" --include="*.js"
```

## Vulnerable Code

```typescript
import jwt from 'jsonwebtoken';

// VULNERABLE: Token issued without expiration
app.post('/login', async (req, res) => {
  const user = await authenticate(req.body);
  const token = jwt.sign({ userId: user.id, role: user.role }, secret);
  // No expiresIn -- token is valid forever
  res.json({ token });
});

// VULNERABLE: Using decode instead of verify
app.get('/api/data', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const decoded = jwt.decode(token); // No signature or expiry check
  if (decoded?.userId) {
    return res.json(getUserData(decoded.userId));
  }
  res.status(401).json({ error: 'Unauthorized' });
});
```

## Secure Code

```typescript
import jwt from 'jsonwebtoken';

// SECURE: Short-lived tokens with mandatory expiry
app.post('/login', async (req, res) => {
  const user = await authenticate(req.body);
  const accessToken = jwt.sign(
    { userId: user.id, role: user.role },
    secret,
    { algorithm: 'HS256', expiresIn: '15m' }
  );
  const refreshToken = jwt.sign(
    { userId: user.id, type: 'refresh' },
    refreshSecret,
    { algorithm: 'HS256', expiresIn: '7d' }
  );
  res.json({ accessToken, refreshToken });
});

// SECURE: verify() checks signature AND expiry by default
app.get('/api/data', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  try {
    const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] });
    return res.json(getUserData(decoded.userId));
  } catch (err) {
    res.status(401).json({ error: 'Unauthorized' });
  }
});
```

## Impact

Tokens without expiry validation allow indefinite access after a single theft. An attacker who obtains a token through XSS, log exposure, or man-in-the-middle can use it for days, weeks, or permanently, even after the user changes their password.

## References

- CVE-2026-25537: jsonwebtoken type confusion bypasses exp/nbf validation
- RFC 7519 Section 4.1.4: "exp" (Expiration Time) Claim
- https://owasp.org/Top10/A07_2021-Identification_and_Authentication_Failures/
- CWE-613: Insufficient Session Expiration
