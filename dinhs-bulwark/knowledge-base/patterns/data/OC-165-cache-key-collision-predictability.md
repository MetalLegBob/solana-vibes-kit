# OC-165: Cache Key Collision / Predictability

**Category:** Data Security
**Severity:** MEDIUM
**Auditors:** DATA-02
**CWE:** CWE-330 (Use of Insufficiently Random Values), CWE-488 (Exposure of Data Element to Wrong Session)
**OWASP:** A04:2021 – Insecure Design

## Description

Cache key predictability occurs when cache keys are constructed from guessable or sequential values, enabling an attacker to enumerate or predict keys to access other users' cached data. Cache key collisions occur when different logical entities map to the same cache key due to insufficient key specificity, causing data leakage between users or contexts.

Common anti-patterns include using only a user ID or email in the cache key without a namespace or context qualifier, using sequential integer IDs that can be enumerated, or constructing keys from partial data that can collide. For example, caching user data under `user:123` allows any client who can call `redis.get("user:124")` to access the next user's data. When multi-tenant applications share a single cache, missing the tenant identifier in the key enables cross-tenant data leakage.

PortSwigger's web cache entanglement research demonstrated how cache key normalization and truncation create unexpected collisions that serve one user's data to another. The CVE-2023-30861 Flask vulnerability showed how missing `Vary: Cookie` headers caused a caching proxy to serve one user's session-specific response to other users, effectively leaking session data through cache key insufficiency.

## Detection

```
grep -rn "cache\.get\|redis\.get\|cache\.set\|redis\.set" --include="*.ts" --include="*.js"
grep -rn "cacheKey\|cache_key\|CACHE_KEY" --include="*.ts" --include="*.js"
grep -rn "userId\|user_id\|tenantId\|tenant_id" --include="*.ts" --include="*.js"
```

Look for: cache keys using sequential/guessable identifiers without authentication barriers, multi-tenant applications without tenant ID in cache keys, cache keys shorter than 8 characters or using predictable patterns, absence of cache key prefixing or namespacing.

## Vulnerable Code

```typescript
import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL!);

// VULNERABLE: Predictable sequential keys — easily enumerable
async function getUserProfile(userId: number) {
  const key = `user:${userId}`; // user:1, user:2, user:3...
  return redis.get(key);
}

// VULNERABLE: No tenant isolation in cache key
async function getDocument(docId: string) {
  const key = `doc:${docId}`; // Tenant A and Tenant B share keys
  return redis.get(key);
}

// VULNERABLE: Key collision via truncation
async function cacheSearch(query: string) {
  const key = `search:${query.substring(0, 10)}`; // "search:hello worl"
  // "hello world" and "hello worlds" collide
  return redis.get(key);
}
```

## Secure Code

```typescript
import Redis from "ioredis";
import crypto from "crypto";

const redis = new Redis(process.env.REDIS_URL!);

// SECURE: Include tenant context and use non-sequential IDs
async function getUserProfile(tenantId: string, userId: string) {
  const key = `tenant:${tenantId}:user:${userId}`;
  return redis.get(key);
}

// SECURE: Hash complex inputs to prevent collision
async function cacheSearch(tenantId: string, userId: string, query: string) {
  const queryHash = crypto.createHash("sha256").update(query).digest("hex");
  const key = `tenant:${tenantId}:search:${userId}:${queryHash}`;
  return redis.get(key);
}

// SECURE: Unpredictable cache keys for sensitive data
async function cachePaymentIntent(userId: string, paymentData: object) {
  const nonce = crypto.randomBytes(16).toString("hex");
  const key = `payment:${userId}:${nonce}`;
  await redis.set(key, JSON.stringify(paymentData), "EX", 300);
  return key; // Return the key to the caller — cannot be guessed
}
```

## Impact

An attacker can enumerate cache keys to access other users' cached data including PII, session information, and financial data. In multi-tenant applications, missing tenant isolation enables cross-tenant data leakage. Cache key collisions cause data from one user to be served to another, leading to information disclosure and potential account confusion.

## References

- CVE-2023-30861: Flask session cookie leakage via missing Vary: Cookie header
- PortSwigger: Web Cache Entanglement — cache key normalization collisions
- CWE-330: Use of Insufficiently Random Values — https://cwe.mitre.org/data/definitions/330.html
- CWE-488: Exposure of Data Element to Wrong Session — https://cwe.mitre.org/data/definitions/488.html
- OWASP A04:2021 – Insecure Design
