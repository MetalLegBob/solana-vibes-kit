# OC-029: Brute Force on Login with No Rate Limit

**Category:** Authentication & Authorization
**Severity:** HIGH
**Auditors:** AUTH-01, ERR-03
**CWE:** CWE-307
**OWASP:** A07:2021 - Identification and Authentication Failures

## Description

Login endpoints without rate limiting allow attackers to attempt unlimited password guesses, making brute force and credential stuffing attacks trivially easy. Modern tools like Hydra, Burp Intruder, and custom scripts can attempt thousands of credentials per minute against unprotected endpoints.

CVE-2025-52576 in Kanboard demonstrated this vulnerability compounded with IP spoofing: by abusing trusted HTTP headers like `X-Forwarded-For`, attackers could bypass IP-based rate limiting entirely. A similar issue was found in Coolify (GHSA-688j-rm43-5r8x) where the `X-Forwarded-Host` header allowed rate limit bypass on the login endpoint. Rapid7 reported in Q1 2025 that over one million brute-force login attempts using FastHTTP targeted accounts without proper MFA protection.

Rate limiting is necessary but must be implemented carefully. IP-based limiting alone is insufficient because attackers use distributed botnets and proxy chains. Effective protection requires a combination of per-account limiting, progressive delays, CAPTCHA challenges, and account lockout policies.

## Detection

```
# Login endpoints
grep -rn "\/login\|\/signin\|\/auth\|\/authenticate" --include="*.ts" --include="*.js"
# Rate limiting middleware
grep -rn "rateLimit\|rate-limit\|express-rate-limit\|slowDown" --include="*.ts" --include="*.js"
# Login route without middleware
grep -rn "app\.\(post\|put\).*login\|router\.\(post\|put\).*login" --include="*.ts" --include="*.js"
```

## Vulnerable Code

```typescript
import express from 'express';

const app = express();

// VULNERABLE: No rate limiting on login
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await findUserByEmail(email);
  if (!user || !await verifyPassword(password, user.passwordHash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = generateToken(user);
  res.json({ token });
});
```

## Secure Code

```typescript
import express from 'express';
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';

const app = express();

// SECURE: Rate limiting with progressive penalties
const loginLimiter = rateLimit({
  store: new RedisStore({ sendCommand: (...args) => redisClient.sendCommand(args) }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,                    // 5 attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  // Key by both IP and username to prevent distributed attacks
  keyGenerator: (req) => `${req.ip}:${req.body?.email || 'unknown'}`,
  message: { error: 'Too many login attempts. Please try again later.' },
});

app.post('/api/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body;
  const user = await findUserByEmail(email);
  if (!user || !await verifyPassword(password, user.passwordHash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = generateToken(user);
  res.json({ token });
});
```

## Impact

Without rate limiting, an attacker can systematically guess passwords for any known username. Credential stuffing attacks using leaked password databases are especially effective, as many users reuse passwords across services.

## References

- CVE-2025-52576: Kanboard username enumeration and brute-force bypass via IP spoofing
- GHSA-688j-rm43-5r8x: Coolify rate-limit bypass via X-Forwarded-Host
- CWE-307: Improper Restriction of Excessive Authentication Attempts
- https://owasp.org/Top10/A07_2021-Identification_and_Authentication_Failures/
