# OC-033: Session Token Insufficient Entropy

**Category:** Authentication & Authorization
**Severity:** HIGH
**Auditors:** AUTH-02
**CWE:** CWE-330, CWE-331
**OWASP:** A07:2021 - Identification and Authentication Failures

## Description

Session tokens must be generated with sufficient randomness (entropy) to prevent an attacker from guessing or predicting valid session IDs. OWASP recommends at least 128 bits of entropy from a cryptographically secure pseudorandom number generator (CSPRNG). When session tokens are generated using weak random sources like `Math.random()`, sequential counters, timestamps, or hashes of predictable data, attackers can predict valid tokens and hijack sessions.

`Math.random()` in JavaScript is not cryptographically secure -- it uses an internal state that can be reconstructed from observed outputs. Node.js versions prior to certain patches used xorshift128+ which is fully predictable after observing a few outputs. Similarly, UUID v1 tokens are based on timestamps and MAC addresses, both of which are predictable.

The `express-session` middleware uses `uid-safe` for session ID generation by default, which relies on `crypto.randomBytes()`. However, custom session stores or manual session management often introduce weak randomness.

## Detection

```
# Weak random for session/token generation
grep -rn "Math\.random\(\)" --include="*.ts" --include="*.js" | grep -i "session\|token\|id\|key"
# UUID v1 for session identifiers
grep -rn "uuid.*v1\|uuidv1" --include="*.ts" --include="*.js"
# Timestamp-based tokens
grep -rn "Date\.now\(\).*session\|Date\.now\(\).*token" --include="*.ts" --include="*.js"
# Custom session ID generation
grep -rn "genid\|generateId\|sessionId" --include="*.ts" --include="*.js"
```

## Vulnerable Code

```typescript
// VULNERABLE: Math.random() for session tokens
function generateSessionToken(): string {
  return Math.random().toString(36).substring(2) +
         Math.random().toString(36).substring(2);
}

app.post('/login', async (req, res) => {
  const user = await authenticate(req.body);
  if (!user) return res.status(401).end();
  const token = generateSessionToken(); // Predictable
  sessions.set(token, { userId: user.id });
  res.cookie('session', token);
  res.redirect('/dashboard');
});
```

## Secure Code

```typescript
import crypto from 'crypto';

// SECURE: Cryptographically random session tokens
function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex'); // 256 bits of entropy
}

app.post('/login', async (req, res) => {
  const user = await authenticate(req.body);
  if (!user) return res.status(401).end();
  const token = generateSessionToken();
  await sessionStore.set(token, { userId: user.id, createdAt: Date.now() });
  res.cookie('session', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: 3600000,
  });
  res.redirect('/dashboard');
});
```

## Impact

An attacker who can predict session tokens can hijack any active user session. With weak random sources, observing a small number of tokens may allow prediction of all future tokens, enabling mass session hijacking.

## References

- CWE-330: Use of Insufficiently Random Values
- CWE-331: Insufficient Entropy
- OWASP Session Management Cheat Sheet
- https://snyk.io/blog/session-management-security/
- NIST SP 800-63B: Memorized Secret Verifier Requirements
