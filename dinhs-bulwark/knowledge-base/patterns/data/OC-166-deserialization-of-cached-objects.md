# OC-166: Deserialization of Cached Objects

**Category:** Data Security
**Severity:** HIGH
**Auditors:** DATA-02, INJ-05
**CWE:** CWE-502 (Deserialization of Untrusted Data)
**OWASP:** A08:2021 – Software and Data Integrity Failures

## Description

When applications store serialized objects in caches (Redis, Memcached) and deserialize them upon retrieval without validation, an attacker who can write to the cache can inject malicious serialized payloads that execute arbitrary code upon deserialization. This is especially dangerous when using `JSON.parse()` on cached data that includes constructor or prototype properties, or when using libraries like `node-serialize`, `serialize-javascript`, or custom serialization formats.

In Node.js, while `JSON.parse()` is generally safe from code execution, the deserialized object can still exploit prototype pollution (via `__proto__` or `constructor.prototype` properties) in downstream code. More dangerous are cases where applications use `eval()` or `Function()` on cached data, or deserialize cached data with libraries that support code execution (e.g., `node-serialize` which has a known RCE via `_$$ND_FUNC$$_` markers).

CVE-2017-5941 demonstrated RCE through `node-serialize` deserialization. The Redis RCE vulnerability CVE-2025-49844 showed that if Redis itself is compromised (e.g., via unauthenticated access), all cached data becomes attacker-controlled, making deserialization the final link in the attack chain from cache access to code execution in the application.

## Detection

```
grep -rn "JSON\.parse\|deserialize\|unserialize\|decode" --include="*.ts" --include="*.js"
grep -rn "redis\.get\|cache\.get\|memcached\.get" --include="*.ts" --include="*.js"
grep -rn "node-serialize\|serialize-javascript\|php-serialize" --include="*.ts" --include="*.js" --include="package.json"
grep -rn "eval\|Function\(\|new Function" --include="*.ts" --include="*.js"
```

Look for: `JSON.parse()` of cached data without schema validation, use of `node-serialize` or similar libraries, `eval()` or `new Function()` applied to cached strings, absence of type checking after deserialization.

## Vulnerable Code

```typescript
import Redis from "ioredis";
import { unserialize } from "node-serialize";

const redis = new Redis(process.env.REDIS_URL!);

// VULNERABLE: Deserializing cached data without validation
async function getCachedUser(userId: string): Promise<User> {
  const cached = await redis.get(`user:${userId}`);
  if (cached) {
    return JSON.parse(cached) as User; // No validation of structure
    // Attacker-controlled cache could return: {"__proto__": {"isAdmin": true}}
  }
  return fetchUserFromDB(userId);
}

// VULNERABLE: Using node-serialize (known RCE vector)
async function getCachedConfig(key: string) {
  const cached = await redis.get(`config:${key}`);
  if (cached) {
    return unserialize(cached); // RCE via _$$ND_FUNC$$_ payload
  }
}

// VULNERABLE: eval on cached data
async function getCachedTemplate(name: string) {
  const cached = await redis.get(`template:${name}`);
  if (cached) {
    return eval(`(${cached})`); // Direct code execution
  }
}
```

## Secure Code

```typescript
import Redis from "ioredis";
import { z } from "zod";

const redis = new Redis(process.env.REDIS_URL!);

// Define expected schema
const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  role: z.enum(["user", "admin"]),
});

type User = z.infer<typeof UserSchema>;

// SECURE: Validate deserialized data against schema
async function getCachedUser(userId: string): Promise<User | null> {
  const cached = await redis.get(`user:${userId}`);
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      return UserSchema.parse(parsed); // Schema validation rejects unexpected fields
    } catch {
      // Invalid cached data — delete and fetch fresh
      await redis.del(`user:${userId}`);
      return null;
    }
  }
  return null;
}

// SECURE: Only cache plain data, never executable content
async function cacheUser(userId: string, user: User) {
  const safeData = UserSchema.parse(user); // Strip unknown fields
  await redis.set(`user:${userId}`, JSON.stringify(safeData), "EX", 300);
}
```

## Impact

An attacker who can write to the cache (via unauthenticated cache access, cache poisoning, or compromised cache server) can achieve remote code execution on the application server, bypass authorization by injecting elevated privileges into cached user objects, or corrupt application state by injecting malformed data that causes crashes or logic errors downstream.

## References

- CVE-2017-5941: node-serialize RCE via deserialization
- CVE-2025-49844: Redis RCE enabling attacker-controlled cache content
- CWE-502: Deserialization of Untrusted Data — https://cwe.mitre.org/data/definitions/502.html
- OWASP A08:2021 – Software and Data Integrity Failures
- OWASP Deserialization Cheat Sheet
