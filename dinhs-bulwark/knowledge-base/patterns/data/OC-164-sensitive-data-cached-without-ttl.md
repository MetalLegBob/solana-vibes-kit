# OC-164: Sensitive Data Cached Without TTL

**Category:** Data Security
**Severity:** MEDIUM
**Auditors:** DATA-02
**CWE:** CWE-524 (Use of Cache Containing Sensitive Information)
**OWASP:** A04:2021 – Insecure Design

## Description

Caching sensitive data (sessions, tokens, PII, financial data) without a Time-To-Live (TTL) means the data persists in the cache indefinitely. This violates the principle of data minimization and creates an ever-growing attack surface. If the cache is compromised, the attacker gains access to a historical accumulation of sensitive data rather than only recently active records.

This pattern is especially dangerous for session tokens and authentication data. Without TTL, revoked sessions, expired tokens, and outdated permissions remain accessible in the cache. An attacker who obtains a leaked session token can use it indefinitely because the cache never expires it. Similarly, PII cached for a single operation (e.g., a payment flow) remains in the cache long after the operation completes, violating GDPR's storage limitation principle (Article 5(1)(e)).

The Redis CVE-2025-21605 (DoS via unlimited output buffer) highlighted how unbounded cache growth creates operational risks beyond security. Caches without TTL also grow unboundedly, consuming memory and eventually causing out-of-memory failures or eviction of critical data when the cache reaches its memory limit.

## Detection

```
grep -rn "\.set\(.*[^,]*\)\s*$\|\.set\(.*[^,]*\);" --include="*.ts" --include="*.js"
grep -rn "redis\.set\|cache\.set\|memcached\.set" --include="*.ts" --include="*.js"
grep -rn "session\|token\|password\|ssn\|credit" --include="*.ts" --include="*.js"
grep -rn "EX\|PX\|EXAT\|PXAT\|ttl\|expire\|maxAge" --include="*.ts" --include="*.js"
```

Look for: `redis.set()` calls with only key and value (no TTL argument), cache.set without `EX`, `PX`, or `ttl` parameter, session stores configured without `maxAge` or `ttl`, sensitive data types being cached.

## Vulnerable Code

```typescript
import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL!);

// VULNERABLE: Session stored without TTL — never expires
async function createSession(userId: string, sessionData: object) {
  const sessionId = crypto.randomUUID();
  await redis.set(
    `session:${sessionId}`,
    JSON.stringify({ userId, ...sessionData, createdAt: Date.now() })
    // No TTL — session persists forever
  );
  return sessionId;
}

// VULNERABLE: PII cached without TTL
async function cacheUserProfile(userId: string, profile: UserProfile) {
  await redis.set(`profile:${userId}`, JSON.stringify({
    name: profile.name,
    email: profile.email,
    ssn: profile.ssn,        // PII cached indefinitely
    address: profile.address,
  }));
}
```

## Secure Code

```typescript
import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL!);

const SESSION_TTL = 3600;       // 1 hour
const PROFILE_CACHE_TTL = 300;  // 5 minutes
const PAYMENT_CACHE_TTL = 60;   // 1 minute for financial data

// SECURE: Session with explicit TTL
async function createSession(userId: string, sessionData: object) {
  const sessionId = crypto.randomUUID();
  await redis.set(
    `session:${sessionId}`,
    JSON.stringify({ userId, ...sessionData, createdAt: Date.now() }),
    "EX", SESSION_TTL
  );
  return sessionId;
}

// SECURE: PII cached with short TTL, sensitive fields excluded
async function cacheUserProfile(userId: string, profile: UserProfile) {
  await redis.set(
    `profile:${userId}`,
    JSON.stringify({
      name: profile.name,
      displayEmail: maskEmail(profile.email),
      // SSN and address NOT cached
    }),
    "EX", PROFILE_CACHE_TTL
  );
}

// SECURE: Explicit deletion when no longer needed
async function invalidateSession(sessionId: string) {
  await redis.del(`session:${sessionId}`);
}
```

## Impact

Indefinitely cached sensitive data increases the blast radius of any cache compromise. Leaked session tokens remain valid forever, enabling persistent unauthorized access. PII accumulation in cache violates data minimization requirements under GDPR, CCPA, and HIPAA. Unbounded cache growth can cause memory exhaustion and service outages.

## References

- CVE-2025-21605: Redis DoS via unlimited output buffer growth
- CWE-524: Use of Cache Containing Sensitive Information — https://cwe.mitre.org/data/definitions/524.html
- GDPR Article 5(1)(e): Storage Limitation Principle
- OWASP A04:2021 – Insecure Design
- Redis documentation: SET with EX/PX options
