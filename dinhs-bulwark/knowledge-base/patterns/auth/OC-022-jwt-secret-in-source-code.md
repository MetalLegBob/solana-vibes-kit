# OC-022: JWT Secret in Source Code

**Category:** Authentication & Authorization
**Severity:** CRITICAL
**Auditors:** AUTH-01, SEC-02
**CWE:** CWE-798, CWE-321
**OWASP:** A02:2021 - Cryptographic Failures

## Description

Hardcoding JWT signing secrets directly in application source code is one of the most common and dangerous authentication vulnerabilities. When a JWT secret is committed to a repository, anyone with access to the codebase -- including former employees, contractors, or attackers who compromise the repository -- can forge valid authentication tokens for any user.

This issue is pervasive in production systems. Semgrep's research on JWT misuse found that hardcoded secrets are among the top three JWT security mistakes in real-world Node.js applications. The problem is compounded by the fact that secrets committed to git remain in the repository history even after removal from the current codebase.

HMAC-based JWT algorithms (HS256, HS384, HS512) are particularly vulnerable because the same secret is used for both signing and verification. If that secret is exposed, an attacker has everything needed to mint valid tokens. Weak secrets compound the issue -- tools like `hashcat` and `jwt-cracker` can brute-force short or common secrets in seconds.

## Detection

```
# Hardcoded secret strings near JWT operations
grep -rn "secret.*=.*['\"]" --include="*.ts" --include="*.js" | grep -i "jwt\|token\|sign"
# Common variable names
grep -rn "JWT_SECRET\|TOKEN_SECRET\|jwtSecret\|signingKey" --include="*.ts" --include="*.js"
# jwt.sign with inline string
grep -rn "jwt\.sign.*['\"].*['\"]" --include="*.ts" --include="*.js"
# Check for weak/common secrets
grep -rn "secret\|password\|changeme\|keyboard" --include="*.ts" --include="*.js" | grep -i jwt
```

## Vulnerable Code

```typescript
import jwt from 'jsonwebtoken';

// VULNERABLE: Secret hardcoded in source
const JWT_SECRET = 'my-super-secret-key-123';

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await authenticate(username, password);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const token = jwt.sign(
    { userId: user.id, role: user.role },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
  res.json({ token });
});
```

## Secure Code

```typescript
import jwt from 'jsonwebtoken';

// SECURE: Secret loaded from environment/vault at startup
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be set and at least 32 characters');
}

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await authenticate(username, password);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const token = jwt.sign(
    { userId: user.id, role: user.role },
    JWT_SECRET,
    { algorithm: 'HS256', expiresIn: '1h' }
  );
  res.json({ token });
});
```

## Impact

An attacker with access to the JWT secret can forge tokens for any user, impersonate administrators, and bypass all authentication. Because JWTs are stateless, there is no server-side mechanism to revoke forged tokens until the secret is rotated.

## References

- CVE-2022-23529: jsonwebtoken RCE via malicious secret object
- https://semgrep.dev/blog/2020/hardcoded-secrets-unverified-tokens-and-other-common-jwt-mistakes
- https://owasp.org/Top10/A02_2021-Cryptographic_Failures/
- CWE-798: Use of Hard-coded Credentials
