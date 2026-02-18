# OC-286: Math.random for Security Purposes

**Category:** Cryptographic Operations
**Severity:** HIGH
**Auditors:** CRYPTO-01
**CWE:** CWE-338 (Use of Cryptographically Weak Pseudo-Random Number Generator)
**OWASP:** A02:2021 – Cryptographic Failures

## Description

`Math.random()` uses a pseudo-random number generator (PRNG) that is not cryptographically secure. In V8 (Node.js/Chrome), it uses the xorshift128+ algorithm, which produces statistically distributed values but is fully deterministic given its internal state. An attacker who observes a small number of outputs can reconstruct the PRNG state and predict all future (and past) values.

CVE-2025-7783 (CVSS 9.4 Critical) demonstrated this vulnerability in the widely-used `form-data` npm package (millions of weekly downloads). The library used `Math.random()` to generate multipart boundary strings. An attacker observing boundary values could predict future boundaries and inject additional HTTP parameters, enabling request manipulation and data integrity bypasses. Affected versions included form-data <2.5.4, 3.0.0-3.0.3, and 4.0.0-4.0.3.

Similarly, CVE-2022-39218 affected Fastly's Compute@Edge JavaScript runtime, where the PRNG seed was baked into the compiled WebAssembly module, making `Math.random()` output completely predictable across all invocations. Any tokens, nonces, or identifiers generated with it were deterministic. The Betable incident (2015) also revealed that `Math.random()` in V8 produced colliding IDs at scale, leading the company to switch to `crypto.randomBytes()`.

## Detection

```
grep -rn "Math\.random" --include="*.ts" --include="*.js"
grep -rn "Math\.random.*token" --include="*.ts" --include="*.js"
grep -rn "Math\.random.*secret" --include="*.ts" --include="*.js"
grep -rn "Math\.random.*password" --include="*.ts" --include="*.js"
grep -rn "Math\.random.*nonce" --include="*.ts" --include="*.js"
grep -rn "Math\.random.*key" --include="*.ts" --include="*.js"
grep -rn "Math\.random.*salt" --include="*.ts" --include="*.js"
grep -rn "Math\.random.*boundary" --include="*.ts" --include="*.js"
grep -rn "Math\.random.*id" --include="*.ts" --include="*.js"
```

Any use of `Math.random()` in authentication, token generation, encryption, nonce creation, or identifier generation is a finding.

## Vulnerable Code

```typescript
import express from "express";

// VULNERABLE: Math.random for session token generation
function generateSessionToken(): string {
  let token = "";
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

// VULNERABLE: Math.random for API key generation
function generateApiKey(): string {
  return "ak_" + Math.random().toString(36).substring(2) +
         Math.random().toString(36).substring(2);
}

// VULNERABLE: Math.random for password reset token
function generateResetToken(): string {
  return Math.random().toString(16).slice(2) +
         Date.now().toString(16);
}
```

## Secure Code

```typescript
import { randomBytes, randomInt } from "crypto";

// SECURE: crypto.randomBytes for session tokens
function generateSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

// SECURE: crypto.randomBytes for API keys
function generateApiKey(): string {
  return "ak_" + randomBytes(24).toString("base64url");
}

// SECURE: crypto.randomBytes for password reset tokens
function generateResetToken(): string {
  return randomBytes(32).toString("hex");
}

// SECURE: crypto.randomInt for bounded random integers
function generateOtp(): string {
  return randomInt(100000, 999999).toString();
}
```

## Impact

An attacker who predicts `Math.random()` outputs can forge session tokens to hijack user accounts, predict API keys to gain unauthorized access, guess password reset tokens to perform account takeover, and predict any security-sensitive identifiers. With CVE-2025-7783, attackers could inject arbitrary parameters into HTTP requests affecting millions of applications.

## References

- CVE-2025-7783: form-data npm package predictable boundary via Math.random() (CVSS 9.4, July 2025)
- CVE-2022-39218: Fastly Compute@Edge baked-in PRNG seed making Math.random() deterministic
- CWE-338: Use of Cryptographically Weak PRNG — https://cwe.mitre.org/data/definitions/338.html
- OWASP A02:2021 – Cryptographic Failures
- Betable incident (2015): Math.random() collisions in V8 at scale
- Node.js security best practices: https://nodejs.org/en/learn/getting-started/security-best-practices
