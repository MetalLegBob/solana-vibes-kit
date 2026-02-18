# OC-024: JWT Audience/Issuer Not Validated

**Category:** Authentication & Authorization
**Severity:** MEDIUM
**Auditors:** AUTH-01
**CWE:** CWE-284, CWE-345
**OWASP:** A07:2021 - Identification and Authentication Failures

## Description

JWTs include `iss` (issuer) and `aud` (audience) claims that specify which authorization server created the token and which service it is intended for. When these claims are not validated, a token issued by one service can be replayed against another, allowing cross-service authentication bypass.

This is especially dangerous in microservice architectures and multi-tenant systems where multiple services share signing keys or use a common identity provider. If Service A issues a token for its own use, but Service B accepts any valid token without checking the audience, an attacker with a legitimate Service A token can access Service B resources.

The risk extends to third-party OAuth providers. If an application accepts any JWT with a valid signature from the provider without verifying that the `aud` claim matches its own client ID, an attacker can use a token issued for a different application to authenticate.

## Detection

```
# jwt.verify without audience/issuer options
grep -rn "jwt\.verify" --include="*.ts" --include="*.js" | grep -v "audience\|issuer"
# Manual token parsing without claim checks
grep -rn "decoded\.\(iss\|aud\)" --include="*.ts" --include="*.js"
# JWKS validation without audience
grep -rn "jwks\|getKey\|JwksClient" --include="*.ts" --include="*.js"
```

## Vulnerable Code

```typescript
import jwt from 'jsonwebtoken';

// VULNERABLE: No audience or issuer validation
app.get('/api/resource', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  try {
    const decoded = jwt.verify(token, publicKey, { algorithms: ['RS256'] });
    // Token from ANY service with same signing key is accepted
    res.json(getResource(decoded.sub));
  } catch (err) {
    res.status(401).json({ error: 'Unauthorized' });
  }
});
```

## Secure Code

```typescript
import jwt from 'jsonwebtoken';

// SECURE: Validate audience and issuer
app.get('/api/resource', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  try {
    const decoded = jwt.verify(token, publicKey, {
      algorithms: ['RS256'],
      audience: 'https://api.example.com',
      issuer: 'https://auth.example.com',
    });
    res.json(getResource(decoded.sub));
  } catch (err) {
    res.status(401).json({ error: 'Unauthorized' });
  }
});
```

## Impact

An attacker can replay tokens across services, gaining unauthorized access to resources in services that share signing infrastructure. In multi-tenant environments, a token from Tenant A could grant access to Tenant B's data.

## References

- RFC 7519 Section 4.1.1-4.1.3: iss, sub, aud claims
- https://owasp.org/Top10/A07_2021-Identification_and_Authentication_Failures/
- https://portswigger.net/web-security/jwt
- CWE-284: Improper Access Control
