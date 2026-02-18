# OC-294: PBKDF2 with Insufficient Iterations

**Category:** Cryptographic Operations
**Severity:** MEDIUM
**Auditors:** CRYPTO-01
**CWE:** CWE-916 (Use of Password Hash With Insufficient Computational Effort)
**OWASP:** A02:2021 – Cryptographic Failures

## Description

PBKDF2 (Password-Based Key Derivation Function 2) is a key-stretching algorithm designed to make brute-force attacks on passwords computationally expensive. Its security directly depends on the iteration count: more iterations mean more CPU work per guess. However, many applications use dangerously low iteration counts, sometimes as few as 1,000 or 10,000, which were considered adequate when PBKDF2 was standardized in 2000 but are trivially crackable with modern GPUs.

OWASP's Password Storage Cheat Sheet recommends a minimum of 600,000 iterations for PBKDF2-HMAC-SHA256 as of 2023, targeting a hash computation time of 200-500ms per password. NIST SP 800-63B (Digital Identity Guidelines, revised July 2025) requires at least 10,000 iterations but acknowledges this as a floor — OWASP's higher recommendation reflects the dramatic increase in GPU compute power. The 2025 Hive Systems Password Table shows that modern GPUs can test over 180 billion MD5 hashes per second and billions of low-iteration PBKDF2 hashes per second.

For new applications, Argon2id is strongly recommended over PBKDF2. Argon2id is memory-hard, making it resistant to both GPU and ASIC attacks. Bcrypt (cost factor >= 12) remains a solid alternative. PBKDF2 should only be chosen when FIPS-140 compliance mandates it, and in that case, iteration counts must be at the OWASP-recommended minimums. The key insight is that PBKDF2 is CPU-hard only — it can be parallelized trivially on GPUs because it has minimal memory requirements.

## Detection

```
grep -rn "pbkdf2\|PBKDF2" --include="*.ts" --include="*.js"
grep -rn "iterations.*[=:]\s*\d" --include="*.ts" --include="*.js"
grep -rn "pbkdf2Sync\|pbkdf2(" --include="*.ts" --include="*.js"
grep -rn "createHash.*password\|\.digest.*password" --include="*.ts" --include="*.js"
```

When PBKDF2 is found, check the iteration count. Anything below 600,000 for HMAC-SHA256 is a finding. Also look for plain SHA-256/SHA-512 used directly for password hashing (which effectively means 1 iteration).

## Vulnerable Code

```typescript
import { pbkdf2Sync, randomBytes } from "crypto";

// VULNERABLE: Only 1,000 iterations — crackable in seconds on modern GPUs
function hashPassword(password: string): { hash: string; salt: string } {
  const salt = randomBytes(16).toString("hex");
  const hash = pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return { hash, salt };
}

// VULNERABLE: 10,000 iterations — below OWASP recommendation
function hashPasswordV2(password: string): { hash: string; salt: string } {
  const salt = randomBytes(16).toString("hex");
  const hash = pbkdf2Sync(password, salt, 10000, 64, "sha256").toString("hex");
  return { hash, salt };
}

function verifyPassword(password: string, hash: string, salt: string): boolean {
  const computed = pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return computed === hash; // Also vulnerable to timing attack (see OC-291)
}
```

## Secure Code

```typescript
import { pbkdf2Sync, randomBytes, timingSafeEqual } from "crypto";
import { hash as argon2Hash, verify as argon2Verify } from "argon2";

// PREFERRED: Argon2id for new applications
async function hashPasswordArgon2(password: string): Promise<string> {
  return argon2Hash(password, {
    type: 2,           // argon2id
    memoryCost: 65536, // 64 MB
    timeCost: 3,       // 3 iterations
    parallelism: 4,
  });
}

async function verifyPasswordArgon2(password: string, hash: string): Promise<boolean> {
  return argon2Verify(hash, password);
}

// ACCEPTABLE: PBKDF2 with OWASP-recommended iterations (FIPS compliance)
function hashPasswordPbkdf2(password: string): { hash: string; salt: string } {
  const salt = randomBytes(32).toString("hex");
  const hash = pbkdf2Sync(password, salt, 600000, 64, "sha256").toString("hex");
  return { hash, salt };
}

function verifyPasswordPbkdf2(password: string, hash: string, salt: string): boolean {
  const computed = pbkdf2Sync(password, salt, 600000, 64, "sha256");
  return timingSafeEqual(computed, Buffer.from(hash, "hex"));
}
```

## Impact

Low iteration counts make password databases vulnerable to offline brute-force attacks. With modern GPUs, an attacker who obtains a database dump can crack PBKDF2 with 1,000 iterations at billions of guesses per second. Even complex passwords fall quickly under these conditions. Compromised passwords lead to account takeover, and given password reuse, often extend to other services. The 8.2 billion credentials compromised in 2024 underscore the scale of this problem.

## References

- CWE-916: Use of Password Hash With Insufficient Computational Effort — https://cwe.mitre.org/data/definitions/916.html
- OWASP Password Storage Cheat Sheet: 600,000 iterations minimum for PBKDF2-HMAC-SHA256
- NIST SP 800-63B / SP 800-63-4: Digital Identity Guidelines (July 2025)
- 2025 Hive Systems Password Table: GPU cracking benchmarks
- OWASP A02:2021 – Cryptographic Failures
- RFC 8018: PKCS #5 — Password-Based Cryptography Specification v2.1
