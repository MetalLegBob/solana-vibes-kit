# OC-278: Missing Rate Limit on Auth Endpoint

**Category:** Error Handling & Resilience
**Severity:** HIGH
**Auditors:** ERR-03
**CWE:** CWE-307 (Improper Restriction of Excessive Authentication Attempts)
**OWASP:** A07:2021 -- Identification and Authentication Failures

## Description

Missing rate limiting on authentication endpoints allows attackers to perform brute force attacks against login, password reset, OTP verification, and token refresh endpoints at arbitrary speed. Without rate limiting, an attacker can try thousands of password combinations per second, enumerate valid usernames, or exhaust one-time codes.

This is one of the most common web application vulnerabilities. The OWASP Testing Guide recommends testing all authentication endpoints for brute force resistance. Despite this, many applications implement rate limiting on general API endpoints but forget to apply stricter limits on authentication-specific endpoints. The 2023 Okta credential stuffing attacks demonstrated how high-volume automated login attempts against insufficiently rate-limited endpoints can compromise user accounts at scale.

The danger is amplified when the authentication endpoint does not implement account lockout, CAPTCHA, or progressive delays. A missing rate limit combined with weak password policies means an attacker with a list of common passwords can compromise a significant percentage of user accounts.

## Detection

```
grep -rn "login\|signin\|sign-in\|authenticate\|password" --include="*.ts" --include="*.js" | grep -i "route\|router\|app\.\(post\|get\)"
grep -rn "rate\|limit\|throttle\|brute" --include="*.ts" --include="*.js"
grep -rn "app\.post.*login\|router\.post.*login" --include="*.ts" --include="*.js" -B 5 | grep -v "rateLimit\|throttle"
grep -rn "/api/auth\|/auth/\|/login\|/token" --include="*.ts" --include="*.js"
```

Look for: authentication routes without rate-limiting middleware, login endpoints with no reference to rate limiting libraries (express-rate-limit, rate-limiter-flexible), absence of brute force protection on OTP/MFA verification endpoints.

## Vulnerable Code

```typescript
import express from "express";
import bcrypt from "bcrypt";

const app = express();

// VULNERABLE: No rate limiting on login endpoint
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;

  const user = await db.findUserByEmail(email);
  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = generateJWT(user);
  res.json({ token });
});

// VULNERABLE: No rate limiting on OTP verification
app.post("/api/auth/verify-otp", async (req, res) => {
  const { userId, otp } = req.body;
  // 6-digit OTP: only 1,000,000 possibilities
  // Without rate limiting, brute-forceable in minutes
  const valid = await verifyOTP(userId, otp);
  if (!valid) {
    return res.status(401).json({ error: "Invalid code" });
  }
  res.json({ verified: true });
});
```

## Secure Code

```typescript
import express from "express";
import bcrypt from "bcrypt";
import { RateLimiterRedis } from "rate-limiter-flexible";
import Redis from "ioredis";

const app = express();
const redis = new Redis();

// Strict rate limiter for auth endpoints
const authLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: "auth_limit",
  points: 5,           // 5 attempts
  duration: 900,       // per 15 minutes
  blockDuration: 900,  // Block for 15 min after exceeding
});

// Per-account limiter (prevents distributed brute force)
const accountLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: "account_limit",
  points: 10,          // 10 attempts per account
  duration: 3600,      // per hour
  blockDuration: 3600,
});

// SECURE: Login with multi-layer rate limiting
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    // Rate limit by IP
    await authLimiter.consume(req.ip);
    // Rate limit by account (prevents distributed attacks)
    await accountLimiter.consume(email);
  } catch (rateLimitError) {
    const retryAfter = Math.ceil(rateLimitError.msBeforeNext / 1000);
    res.set("Retry-After", String(retryAfter));
    return res.status(429).json({ error: "Too many attempts. Try later." });
  }

  const user = await db.findUserByEmail(email);
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  // Reset limiter on successful login
  await accountLimiter.delete(email);

  const token = generateJWT(user);
  res.json({ token });
});

// SECURE: OTP with strict rate limit + attempt tracking
const otpLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: "otp_limit",
  points: 3,           // Only 3 OTP attempts
  duration: 300,       // per 5 minutes
  blockDuration: 1800, // Block for 30 min after exceeding
});

app.post("/api/auth/verify-otp", async (req, res) => {
  const { userId, otp } = req.body;

  try {
    await otpLimiter.consume(userId);
  } catch {
    return res.status(429).json({ error: "Too many attempts. OTP invalidated." });
  }

  const valid = await verifyOTP(userId, otp);
  if (!valid) {
    return res.status(401).json({ error: "Invalid code" });
  }

  await otpLimiter.delete(userId);
  res.json({ verified: true });
});
```

## Impact

Without rate limiting, an attacker can brute force login credentials at high speed, enumerate valid usernames, and exhaust 6-digit OTP codes (1,000,000 possibilities) within minutes. Credential stuffing attacks using leaked password databases become trivially easy. The result is account takeover at scale.

## References

- CWE-307: Improper Restriction of Excessive Authentication Attempts -- https://cwe.mitre.org/data/definitions/307.html
- OWASP A07:2021 -- Identification and Authentication Failures
- OWASP Brute Force Attack -- https://owasp.org/www-community/attacks/Brute_force_attack
- Okta credential stuffing incidents (2023) -- high-volume automated login attacks
- rate-limiter-flexible: Node.js rate limiting library -- https://www.npmjs.com/package/rate-limiter-flexible
