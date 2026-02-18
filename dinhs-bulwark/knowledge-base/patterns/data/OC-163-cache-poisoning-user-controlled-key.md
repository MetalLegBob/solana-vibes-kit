# OC-163: Cache Poisoning via User-Controlled Key

**Category:** Data Security
**Severity:** HIGH
**Auditors:** DATA-02
**CWE:** CWE-345 (Insufficient Verification of Data Authenticity)
**OWASP:** A08:2021 – Software and Data Integrity Failures

## Description

Cache poisoning via user-controlled keys occurs when an application uses untrusted user input to construct cache keys without proper validation or sanitization. An attacker can manipulate the cache key to store malicious data that is then served to other users, or read/overwrite cache entries belonging to other users by predicting or manipulating key structures.

PortSwigger's research on web cache poisoning and web cache entanglement has documented extensive real-world exploitation of this vulnerability class, including persistently poisoning every page on an online newspaper and compromising DoD administration interfaces. The fundamental issue is that caches use keys to look up stored responses, and if an attacker can influence what gets stored under a particular key, they can serve malicious content to any user who subsequently requests that key.

In application-level caching (Redis, Memcached), this manifests when user input like query parameters, headers, or path segments are directly concatenated into cache keys. An attacker can inject delimiter characters to create cache key collisions, store XSS payloads in cached HTML fragments, or overwrite another user's cached session data.

## Detection

```
grep -rn "cache\.get\|cache\.set\|redis\.get\|redis\.set\|memcached\.get" --include="*.ts" --include="*.js"
grep -rn "req\.params\|req\.query\|req\.headers" --include="*.ts" --include="*.js"
grep -rn "cacheKey.*req\.\|cache.*\$\{.*req\." --include="*.ts" --include="*.js"
grep -rn "\.get\(`\|\.set\(`" --include="*.ts" --include="*.js"
```

Look for: cache keys constructed from user input (query params, URL path, headers), key construction using string concatenation or template literals with request data, absence of input validation before key construction.

## Vulnerable Code

```typescript
import Redis from "ioredis";
import express from "express";

const redis = new Redis(process.env.REDIS_URL!);
const app = express();

// VULNERABLE: User input directly in cache key
app.get("/api/product/:id", async (req, res) => {
  const cacheKey = `product:${req.params.id}`; // Attacker controls :id
  // Attacker sends: /api/product/../../admin:session:abc123
  // Key becomes: product:../../admin:session:abc123

  let product = await redis.get(cacheKey);
  if (!product) {
    product = JSON.stringify(await fetchProduct(req.params.id));
    await redis.set(cacheKey, product, "EX", 3600);
  }
  res.json(JSON.parse(product));
});

// VULNERABLE: Header value in cache key (web cache poisoning)
app.get("/page", async (req, res) => {
  const lang = req.headers["accept-language"] || "en";
  const cacheKey = `page:home:${lang}`;
  // Attacker injects XSS via Accept-Language header
  // Cached response with XSS served to all users requesting same page
});
```

## Secure Code

```typescript
import Redis from "ioredis";
import express from "express";
import crypto from "crypto";

const redis = new Redis(process.env.REDIS_URL!);
const app = express();

// SECURE: Validate and normalize cache key input
function buildCacheKey(prefix: string, input: string): string {
  // Validate input format
  if (!/^[a-zA-Z0-9_-]+$/.test(input)) {
    throw new Error("Invalid cache key input");
  }
  return `${prefix}:${input}`;
}

// SECURE: Hash user input for cache keys
function buildHashedCacheKey(prefix: string, ...parts: string[]): string {
  const hash = crypto.createHash("sha256").update(parts.join(":")).digest("hex");
  return `${prefix}:${hash}`;
}

app.get("/api/product/:id", async (req, res) => {
  const productId = req.params.id;
  if (!/^\d+$/.test(productId)) {
    return res.status(400).json({ error: "Invalid product ID" });
  }

  const cacheKey = buildCacheKey("product", productId);
  let product = await redis.get(cacheKey);
  if (!product) {
    product = JSON.stringify(await fetchProduct(productId));
    await redis.set(cacheKey, product, "EX", 3600);
  }
  res.json(JSON.parse(product));
});
```

## Impact

An attacker can serve poisoned cached content to other users (XSS, phishing), read or overwrite other users' cached session data, cause cache key collisions that lead to data leakage between users, and potentially achieve persistent XSS that survives across user sessions for the cache TTL duration. In the worst case, cache poisoning can lead to account takeover by overwriting cached authentication data.

## References

- PortSwigger: Web Cache Entanglement — Novel Pathways to Poisoning (2020, updated 2025)
- PortSwigger: Exploiting cache implementation flaws — cache key injection labs
- CWE-345: Insufficient Verification of Data Authenticity — https://cwe.mitre.org/data/definitions/345.html
- OWASP A08:2021 – Software and Data Integrity Failures
- RFC 9111: HTTP Caching — cache key construction requirements
