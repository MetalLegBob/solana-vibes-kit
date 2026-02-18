# OC-291: Non-Constant-Time Comparison

**Category:** Cryptographic Operations
**Severity:** MEDIUM
**Auditors:** CRYPTO-01, AUTH-01
**CWE:** CWE-208 (Observable Timing Discrepancy)
**OWASP:** A02:2021 – Cryptographic Failures

## Description

When comparing secret values such as HMAC digests, authentication tokens, API keys, or password hashes using standard string equality operators (`===`, `==`, or `Buffer.equals()`), the comparison typically short-circuits at the first mismatched byte. This creates a timing side-channel: an attacker can measure response time differences to determine how many leading bytes of their guess match the actual secret. By iterating byte-by-byte, they can reconstruct the entire secret value.

CVE-2016-1000236 in the `cookie-signature` npm package demonstrated this vulnerability in the Express.js ecosystem. The package used JavaScript's `===` operator to compare HMAC signatures, enabling timing attacks against cookie authentication. The fix was to use `crypto.timingSafeEqual()`, which performs bitwise XOR across all bytes regardless of match position, ensuring constant execution time.

The Snyk blog documented a practical timing attack against a Node.js application during the Chaos Computer Club CTF, leveraging Node.js's single-threaded event loop to amplify timing differences. Because Node.js processes requests sequentially in the event loop, even microsecond-level timing differences become measurable and exploitable over the network. The attack successfully recovered a secret token byte-by-byte. Node.js's official security best practices documentation explicitly warns against this pattern and recommends `crypto.timingSafeEqual()` for all secret comparisons.

## Detection

```
grep -rn "===.*token\|token.*===" --include="*.ts" --include="*.js"
grep -rn "===.*hmac\|hmac.*===" --include="*.ts" --include="*.js"
grep -rn "===.*signature\|signature.*===" --include="*.ts" --include="*.js"
grep -rn "===.*digest\|digest.*===" --include="*.ts" --include="*.js"
grep -rn "===.*apiKey\|apiKey.*===" --include="*.ts" --include="*.js"
grep -rn "===.*secret\|secret.*===" --include="*.ts" --include="*.js"
grep -rn "\.equals\(.*secret\|\.equals\(.*token" --include="*.ts" --include="*.js"
```

Any comparison of secret cryptographic material using `===`, `==`, `!==`, `!=`, `.equals()`, or `.indexOf()` is a potential finding.

## Vulnerable Code

```typescript
import { createHmac } from "crypto";

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET!;

// VULNERABLE: Standard equality comparison leaks timing information
function verifyWebhookSignature(payload: string, signature: string): boolean {
  const expected = createHmac("sha256", WEBHOOK_SECRET)
    .update(payload)
    .digest("hex");
  return expected === signature; // Short-circuits on first mismatch
}

// VULNERABLE: Buffer.equals is also not constant-time in all implementations
function verifyApiKey(provided: Buffer, stored: Buffer): boolean {
  return provided.equals(stored);
}

// VULNERABLE: indexOf-based check
function verifyToken(token: string, expected: string): boolean {
  return expected.indexOf(token) === 0;
}
```

## Secure Code

```typescript
import { createHmac, timingSafeEqual } from "crypto";

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET!;

// SECURE: Constant-time comparison with crypto.timingSafeEqual
function verifyWebhookSignature(payload: string, signature: string): boolean {
  const expected = createHmac("sha256", WEBHOOK_SECRET)
    .update(payload)
    .digest();

  // timingSafeEqual requires equal-length buffers
  const provided = Buffer.from(signature, "hex");
  if (expected.length !== provided.length) {
    return false;
  }
  return timingSafeEqual(expected, provided);
}

// SECURE: Hash both values to ensure equal length, then compare
function verifyApiKey(provided: string, stored: string): boolean {
  const a = createHmac("sha256", WEBHOOK_SECRET).update(provided).digest();
  const b = createHmac("sha256", WEBHOOK_SECRET).update(stored).digest();
  return timingSafeEqual(a, b);
}
```

## Impact

A timing attack allows an attacker to recover secret tokens, HMAC signatures, and API keys byte-by-byte without brute-forcing. Depending on the target, this enables webhook signature bypass (accepting forged webhook payloads), API key theft, session token recovery, and HMAC forgery. The single-threaded nature of Node.js makes these attacks particularly practical compared to multi-threaded environments.

## References

- CVE-2016-1000236: cookie-signature timing attack in Express.js ecosystem
- CWE-208: Observable Timing Discrepancy — https://cwe.mitre.org/data/definitions/208.html
- Snyk Blog: "Using Node.js event loop for timing attacks" — https://snyk.io/blog/node-js-timing-attack-ccc-ctf/
- Node.js Security Best Practices — https://nodejs.org/en/learn/getting-started/security-best-practices
- Node.js crypto.timingSafeEqual() documentation — https://nodejs.org/api/crypto.html
- Coda Hale: "A Lesson In Timing Attacks" — https://codahale.com/a-lesson-in-timing-attacks/
