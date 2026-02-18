# OC-021: JWT Algorithm Confusion (none/HS256 on RS256)

**Category:** Authentication & Authorization
**Severity:** CRITICAL
**Auditors:** AUTH-01
**CWE:** CWE-345, CWE-347
**OWASP:** A02:2021 - Cryptographic Failures

## Description

JWT algorithm confusion (also called key confusion) occurs when an attacker changes the signing algorithm in a JWT header to trick the server into using a different verification method. The two most dangerous variants are the "none" algorithm attack and the RS256-to-HS256 downgrade.

In the "none" algorithm attack, the attacker sets `"alg": "none"` in the JWT header and strips the signature. If the server does not enforce a specific algorithm, it may accept the unsigned token as valid. In the RS256-to-HS256 confusion attack, the attacker changes the algorithm from RS256 (asymmetric) to HS256 (symmetric) and signs the token using the server's public key as the HMAC secret. Since the public key is available to anyone, this allows forging tokens that pass verification.

These vulnerabilities have been found in major JWT libraries across multiple languages. CVE-2022-23540 in the Node.js `jsonwebtoken` library (versions <= 8.5.1) allowed signature validation bypass when no algorithms were specified and a falsy secret was passed, defaulting to "none". CVE-2023-48223 in `fast-jwt` allowed algorithm confusion when public keys used the `BEGIN RSA PUBLIC KEY` header format.

## Detection

```
# Libraries that may be vulnerable
grep -rn "jwt.verify\s*(" --include="*.ts" --include="*.js"
# Missing algorithm specification
grep -rn "jwt.verify.*{" --include="*.ts" --include="*.js" | grep -v "algorithms"
# Direct decode without verification
grep -rn "jwt.decode\s*(" --include="*.ts" --include="*.js"
# Algorithm from token header
grep -rn "header\.alg\|token\.alg\|decoded\.header" --include="*.ts" --include="*.js"
```

## Vulnerable Code

```typescript
import jwt from 'jsonwebtoken';

// VULNERABLE: No algorithm specified - defaults to whatever the token says
app.get('/api/profile', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  try {
    const decoded = jwt.verify(token, publicKey);
    // Attacker can set alg: "none" or alg: "HS256" with public key
    res.json(decoded);
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
});
```

## Secure Code

```typescript
import jwt from 'jsonwebtoken';

app.get('/api/profile', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  try {
    // SECURE: Explicitly specify allowed algorithms
    const decoded = jwt.verify(token, publicKey, {
      algorithms: ['RS256'],
      issuer: 'https://auth.example.com',
      audience: 'api.example.com',
    });
    res.json(decoded);
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
});
```

## Impact

An attacker who exploits algorithm confusion can forge arbitrary JWT tokens, bypassing authentication entirely. This grants full impersonation of any user including administrators, access to all protected resources, and the ability to escalate privileges without credentials.

## References

- CVE-2022-23540: jsonwebtoken <= 8.5.1 signature bypass via "none" algorithm default
- CVE-2023-48223: fast-jwt algorithm confusion for RSA public keys
- CVE-2024-54150: cjwt C library algorithm confusion
- https://portswigger.net/web-security/jwt/algorithm-confusion
- https://auth0.com/blog/2015/03/31/critical-vulnerabilities-in-json-web-token-libraries/
