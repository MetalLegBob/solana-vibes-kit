# OC-288: UUID v1 for Security Identifiers

**Category:** Cryptographic Operations
**Severity:** MEDIUM
**Auditors:** CRYPTO-01
**CWE:** CWE-340 (Generation of Predictable Numbers or Identifiers)
**OWASP:** A02:2021 – Cryptographic Failures

## Description

UUID version 1 generates identifiers from a combination of the current timestamp (100-nanosecond intervals since October 15, 1582), a clock sequence, and the machine's MAC address. While these values produce globally unique identifiers, they are not unpredictable. An attacker who knows the approximate time of generation and the machine's MAC address can enumerate or predict UUID v1 values with high accuracy.

Security researcher Daniel Thatcher demonstrated "sandwich attacks" against UUID v1 tokens: by generating two UUID v1 values that bracket a target's token generation timestamp, an attacker can enumerate the narrow range of possible values between them. In practice, this reduces the brute-force space from 2^128 to as few as thousands of candidates. This technique has been used to exploit password reset tokens, session identifiers, and API keys built on UUID v1, achieving account takeover rates exceeding 90% in penetration tests.

UUID v1 also leaks privacy-sensitive information. The embedded MAC address uniquely identifies the generating machine, and the timestamp reveals exactly when the identifier was created. The TC39 UUID proposal (Issue #27) explicitly raised concerns about UUID v1 exposing client MAC addresses as stable cross-session identifiers. Even with the clock sequence providing some variability, the overall entropy available to an attacker is insufficient for security-sensitive applications.

## Detection

```
grep -rn "uuid.*v1\|uuidv1\|uuid\.v1" --include="*.ts" --include="*.js"
grep -rn "require.*uuid.*v1\|from.*uuid.*v1" --include="*.ts" --include="*.js"
grep -rn "uuid\.v1()" --include="*.ts" --include="*.js"
grep -rn "uuidv1()" --include="*.ts" --include="*.js"
```

Look for: UUID v1 generation in contexts involving tokens, session IDs, password reset links, API keys, or any security-sensitive identifiers.

## Vulnerable Code

```typescript
import { v1 as uuidv1 } from "uuid";

// VULNERABLE: UUID v1 for password reset token
async function createPasswordResetToken(userId: string): Promise<string> {
  const token = uuidv1(); // Timestamp + MAC address based — predictable
  await db.passwordResets.create({
    userId,
    token,
    expiresAt: new Date(Date.now() + 3600000),
  });
  return token;
}

// VULNERABLE: UUID v1 for API key
function generateApiKey(): string {
  return `key_${uuidv1()}`; // Predictable, leaks machine identity
}

// VULNERABLE: UUID v1 for session identifier
function createSessionId(): string {
  return uuidv1(); // Enumerable by sandwich attack
}
```

## Secure Code

```typescript
import { v4 as uuidv4 } from "uuid";
import { randomBytes } from "crypto";

// SECURE: UUID v4 (122 bits of randomness) for password reset token
async function createPasswordResetToken(userId: string): Promise<string> {
  const token = randomBytes(32).toString("base64url"); // 256 bits of entropy
  await db.passwordResets.create({
    userId,
    token,
    expiresAt: new Date(Date.now() + 3600000),
  });
  return token;
}

// SECURE: crypto.randomBytes for API key
function generateApiKey(): string {
  return `key_${randomBytes(24).toString("base64url")}`;
}

// SECURE: UUID v4 for non-security identifiers, randomBytes for security
function createSessionId(): string {
  return randomBytes(32).toString("hex"); // 256 bits of entropy
}
```

## Impact

An attacker can predict UUID v1 tokens to hijack password resets and take over user accounts, enumerate API keys to gain unauthorized access, and reconstruct session identifiers to impersonate users. The embedded MAC address and timestamp also leak operational intelligence about the target infrastructure, revealing server identities and the timing of security-sensitive operations.

## References

- Daniel Thatcher: "Sandwich Attacks — Exploiting UUIDv1" — https://realizesec.com/blog/sandwich-attacks-exploiting-uuid-v1
- Chaim Sanders: "Expanding on UUIDv1 Security Issues" — ITNEXT (October 2022)
- TC39 UUID Proposal Issue #27: UUID v1 Privacy Concerns
- CWE-340: Generation of Predictable Numbers or Identifiers — https://cwe.mitre.org/data/definitions/340.html
- OWASP A02:2021 – Cryptographic Failures
- RFC 4122: UUID specification — https://tools.ietf.org/html/rfc4122
