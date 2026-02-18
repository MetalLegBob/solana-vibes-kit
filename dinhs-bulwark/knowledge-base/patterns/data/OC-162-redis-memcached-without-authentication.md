# OC-162: Redis/Memcached Without Authentication

**Category:** Data Security
**Severity:** HIGH
**Auditors:** DATA-02
**CWE:** CWE-306 (Missing Authentication for Critical Function)
**OWASP:** A07:2021 – Identification and Authentication Failures

## Description

Redis and Memcached instances deployed without authentication allow any client with network access to read, modify, or delete all cached data. Redis without a password (or with `requirepass` unset) accepts commands from any connecting client, while Memcached has no native authentication mechanism in older versions and relies entirely on network-level access control.

CVE-2025-49844 (October 2025, CVSS 10.0) demonstrated the catastrophic risk of exposed Redis instances: a critical remote code execution vulnerability in Redis's Lua scripting engine affected all Redis versions released in the preceding 13 years. An attacker with access to an unauthenticated Redis instance could execute arbitrary code on the host system. Even without this specific CVE, unauthenticated Redis instances are routinely exploited for cryptomining (writing crontab entries), SSH key injection (writing to authorized_keys), and data exfiltration. Shodan regularly indexes tens of thousands of exposed Redis instances.

In 2019, over 36,000 unauthenticated Redis instances were found publicly accessible. The Acunetix vulnerability database classifies Redis unauthorized access as a standalone vulnerability class (CWE-200). Applications must enforce authentication on all cache instances and restrict network access using firewalls or security groups.

## Detection

```
grep -rn "redis://localhost\|redis://127\|redis://redis\|createClient" --include="*.ts" --include="*.js"
grep -rn "new Redis\|new Memcached\|createClient\|ioredis" --include="*.ts" --include="*.js"
grep -rn "password.*undefined\|auth.*undefined" --include="*.ts" --include="*.js"
grep -rn "requirepass\|bind\s" --include="*.conf" --include="redis.conf"
```

Look for: Redis client creation without `password` or `auth` options, Redis connection URLs without credentials (`redis://host:6379` instead of `redis://:password@host:6379`), Memcached connections without SASL authentication, Redis config with `protected-mode no`.

## Vulnerable Code

```typescript
import Redis from "ioredis";
import Memcached from "memcached";

// VULNERABLE: Redis without authentication
const redis = new Redis({
  host: "cache.production.internal",
  port: 6379,
  // No password configured — any client can connect
});

// VULNERABLE: Redis URL without credentials
const redis2 = new Redis("redis://cache.production.internal:6379");

// VULNERABLE: Memcached with no access control
const memcached = new Memcached("cache.internal:11211");

// Attacker with network access can:
// - Read all cached data: redis.get("session:admin-user-id")
// - Write malicious data: redis.set("session:victim", "{role: 'admin'}")
// - Flush everything: redis.flushall()
// - Execute Lua: redis.eval("os.execute('id')", 0)
```

## Secure Code

```typescript
import Redis from "ioredis";

// SECURE: Redis with authentication and TLS
const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: 6380,                    // TLS port
  password: process.env.REDIS_PASSWORD,
  tls: {
    rejectUnauthorized: true,
    ca: [fs.readFileSync("/etc/ssl/certs/redis-ca.pem")],
  },
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => Math.min(times * 200, 5000),
});

// SECURE: Redis URL with credentials and TLS
const redis2 = new Redis(process.env.REDIS_TLS_URL!);
// Expected format: rediss://:password@host:6380

// SECURE: Connection validation
redis.on("error", (err) => {
  console.error("Redis connection error:", err.message);
});

redis.on("connect", () => {
  console.log("Redis connected with authentication");
});
```

## Impact

An attacker with access to an unauthenticated Redis instance can read all cached data (sessions, tokens, PII), modify cached values to hijack sessions or poison application data, execute arbitrary Lua scripts on the Redis server (CVE-2025-49844 enables full RCE), delete all data causing application outage, and use Redis as a pivot point for writing to the host filesystem (SSH keys, crontab).

## References

- CVE-2025-49844: Redis RCE via Lua scripting — CVSS 10.0, affects 13 years of versions
- CVE-2025-21605: Redis DoS via unlimited output buffer by unauthenticated client
- CWE-306: Missing Authentication for Critical Function — https://cwe.mitre.org/data/definitions/306.html
- Acunetix: Redis Unauthorized Access Vulnerability classification
- OWASP A07:2021 – Identification and Authentication Failures
