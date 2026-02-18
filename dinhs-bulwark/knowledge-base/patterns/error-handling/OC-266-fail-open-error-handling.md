# OC-266: Fail-Open Error Handling

**Category:** Error Handling & Resilience
**Severity:** HIGH
**Auditors:** ERR-01
**CWE:** CWE-636 (Not Failing Securely / Failing Open)
**OWASP:** A10:2025 -- Mishandling of Exceptional Conditions

## Description

Fail-open error handling occurs when an application defaults to a permissive or insecure state upon encountering an error instead of denying access. This is the inverse of the "fail-closed" principle: when the authorization service is unreachable, the request is allowed through; when token validation throws, the user is treated as authenticated; when the rate limiter errors out, the request proceeds unchecked.

This pattern is pervasive because developers naturally want their systems to stay functional. The instinct is to catch exceptions and allow the operation to proceed, especially when the failing component is a "secondary" concern like logging, rate limiting, or permission checks. However, an attacker can deliberately trigger these error conditions -- by overwhelming an auth service, corrupting cache data, or inducing network timeouts -- to bypass security controls entirely.

The OWASP Top 10 2025 introduced A10: Mishandling of Exceptional Conditions, explicitly recognizing fail-open as a security vulnerability class. CWE-636 documents this as "Not Failing Securely." Squid Proxy CVE-2025-62168 demonstrated how error handling in a proxy could leak HTTP authentication credentials. The AuthZed engineering team has documented how fail-open in authorization systems is one of the most common design mistakes in permission-checking architectures.

## Detection

```
grep -rn "catch\s*(" --include="*.ts" --include="*.js" | grep -i "allow\|permit\|grant\|true\|next()"
grep -rn "catch\s*{" --include="*.ts" --include="*.js" -A 3 | grep "return true\|return null\|isAuthorized = true"
grep -rn "|| true" --include="*.ts" --include="*.js"
grep -rn "catch.*return\s*true" --include="*.ts" --include="*.js"
grep -rn "isAuthenticated\s*=\s*true" --include="*.ts" --include="*.js" -B 5 | grep "catch"
```

Look for: catch blocks that set authorization booleans to `true`, `return next()` in catch blocks of middleware, default values that grant access, `|| true` fallbacks after security checks.

## Vulnerable Code

```typescript
import { Request, Response, NextFunction } from "express";

async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    const user = await authService.validateToken(token);
    req.user = user;
    next();
  } catch (error) {
    // VULNERABLE: Fail-open -- if auth service is down, let everyone through
    console.warn("Auth service unavailable, allowing request:", error.message);
    req.user = { id: "anonymous", role: "user" };
    next(); // Request proceeds without authentication
  }
}

async function checkRateLimit(req: Request, res: Response, next: NextFunction) {
  try {
    await rateLimiter.consume(req.ip);
    next();
  } catch (error) {
    // VULNERABLE: Rate limiter failure = no rate limiting
    next();
  }
}
```

## Secure Code

```typescript
import { Request, Response, NextFunction } from "express";

async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }
    const user = await authService.validateToken(token);
    req.user = user;
    next();
  } catch (error) {
    // SECURE: Fail-closed -- deny access on any auth failure
    console.error("Auth validation failed:", error.message);
    return res.status(503).json({ error: "Authentication service unavailable" });
  }
}

async function checkRateLimit(req: Request, res: Response, next: NextFunction) {
  try {
    await rateLimiter.consume(req.ip);
    next();
  } catch (error) {
    if (error instanceof RateLimiterError) {
      return res.status(429).json({ error: "Too many requests" });
    }
    // SECURE: If rate limiter infrastructure fails, deny the request
    console.error("Rate limiter unavailable:", error.message);
    return res.status(503).json({ error: "Service temporarily unavailable" });
  }
}
```

## Impact

An attacker can bypass authentication, authorization, or rate limiting by inducing failures in the security infrastructure. This may involve overwhelming the auth service with requests, poisoning DNS to make the auth service unreachable, or triggering edge cases that cause exceptions. The result is complete circumvention of access controls, enabling unauthorized data access, privilege escalation, or abuse of protected endpoints.

## References

- CWE-636: Not Failing Securely ('Failing Open') -- https://cwe.mitre.org/data/definitions/636.html
- OWASP A10:2025 -- Mishandling of Exceptional Conditions
- CVE-2025-62168: Squid Proxy credential disclosure via error handling
- AuthZed: Understanding "Fail Open" and "Fail Closed" -- https://authzed.com/blog/fail-open
- CWE-755: Improper Handling of Exceptional Conditions -- https://cwe.mitre.org/data/definitions/755.html
