# OC-133: Missing Rate Limiting on Sensitive Endpoint

**Category:** API & Network
**Severity:** MEDIUM
**Auditors:** API-01, ERR-03
**CWE:** CWE-770
**OWASP:** API4:2023 - Unrestricted Resource Consumption

## Description

Missing rate limiting on sensitive endpoints allows attackers to send unlimited requests to authentication, password reset, OTP verification, transaction, and data export endpoints. This enables brute-force credential attacks, account enumeration, OTP bypasses, resource exhaustion, and financial fraud through rapid repeated operations.

OWASP API Security Top 10 (2023 edition) elevated this to API4:2023, noting that unlimited resource consumption is prevalent because APIs often lack proper throttling controls. The vulnerability is consistently exploited in the wild: credential stuffing attacks typically send millions of login attempts using leaked credential databases, while OTP brute-force attacks can exhaust a 6-digit code space (1,000,000 combinations) in minutes without rate limiting.

In Node.js applications, the default Express server processes every request without any throttling. Rate limiting must be explicitly added via middleware such as `express-rate-limit`, `rate-limiter-flexible`, or API gateway configurations. Many developers add rate limiting globally but fail to apply stricter limits to sensitive endpoints like login, password reset, and payment processing.

## Detection

```
# Check if rate limiting middleware is imported
grep -rn "rate.limit\|rateLimit\|rate-limit\|throttle" --include="*.ts" --include="*.js"
# Login/auth endpoints without rate limiting middleware
grep -rn "\.post.*login\|\.post.*auth\|\.post.*register\|\.post.*reset" --include="*.ts" --include="*.js"
# Check express-rate-limit in dependencies
grep -rn "express-rate-limit\|rate-limiter-flexible" package.json
# Sensitive endpoints - look for handler without middleware chain
grep -rn "app\.\(post\|put\).*\/api\/.*\(login\|password\|otp\|verify\|transfer\)" --include="*.ts" --include="*.js"
```

## Vulnerable Code

```typescript
import express from 'express';

const app = express();

// VULNERABLE: No rate limiting on login endpoint
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findByEmail(email);
  if (!user || !await bcrypt.compare(password, user.hash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  res.json({ token: generateToken(user) });
});

// VULNERABLE: No rate limiting on OTP verification
app.post('/api/verify-otp', async (req, res) => {
  const { phone, code } = req.body;
  // Attacker can brute-force all 999999 OTP values
  if (await verifyOTP(phone, code)) {
    return res.json({ verified: true });
  }
  res.status(400).json({ error: 'Invalid code' });
});
```

## Secure Code

```typescript
import express from 'express';
import rateLimit from 'express-rate-limit';

const app = express();

// Strict rate limit for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,                    // 5 attempts per window
  keyGenerator: (req) => `${req.ip}:${req.body?.email || ''}`,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts, try again later' },
});

// Even stricter limit for OTP verification
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  keyGenerator: (req) => `otp:${req.body?.phone || req.ip}`,
  message: { error: 'Too many verification attempts' },
});

app.post('/api/login', authLimiter, async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findByEmail(email);
  if (!user || !await bcrypt.compare(password, user.hash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  res.json({ token: generateToken(user) });
});

app.post('/api/verify-otp', otpLimiter, async (req, res) => {
  const { phone, code } = req.body;
  if (await verifyOTP(phone, code)) {
    return res.json({ verified: true });
  }
  res.status(400).json({ error: 'Invalid code' });
});
```

## Impact

Without rate limiting, attackers can brute-force credentials via automated credential stuffing, bypass OTP/MFA verification by exhausting the code space, launch denial-of-service attacks by flooding endpoints, enumerate valid accounts through rapid requests with timing analysis, and perform financial fraud through rapid repeated transaction submissions. The cost of such attacks is near-zero for the attacker while potentially catastrophic for the application.

## References

- CWE-770: Allocation of Resources Without Limits or Throttling
- OWASP API4:2023 - Unrestricted Resource Consumption: https://owasp.org/API-Security/editions/2023/en/0xa4-unrestricted-resource-consumption/
- OWASP Rate Limiting Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Denial_of_Service_Cheat_Sheet.html
- express-rate-limit: https://www.npmjs.com/package/express-rate-limit
