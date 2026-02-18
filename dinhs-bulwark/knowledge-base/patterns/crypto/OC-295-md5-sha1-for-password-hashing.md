# OC-295: MD5/SHA1 for Password Hashing

**Category:** Cryptographic Operations
**Severity:** HIGH
**Auditors:** CRYPTO-01, AUTH-01
**CWE:** CWE-328 (Use of Weak Hash), CWE-759 (Use of a One-Way Hash without a Salt)
**OWASP:** A02:2021 – Cryptographic Failures

## Description

MD5 and SHA-1 are fast general-purpose hash functions never designed for password storage. Their speed is the fundamental problem: modern GPUs can compute over 180 billion MD5 hashes per second and tens of billions of SHA-1 hashes per second (2025 Hive Systems benchmarks). Even SHA-256 and SHA-512, while cryptographically stronger, are equally unsuitable for passwords because they are designed to be fast.

MD5 has been cryptographically broken since 2004 when Xiaoyun Wang demonstrated practical collision attacks. SHA-1 was practically broken by the SHAttered attack in 2017 (CVE-2017-15361 in Infineon's TPM implementation, and Google/CWI's collision demonstration). For password hashing, the collision resistance properties are less relevant than the speed issue — but the broken collision resistance means MD5 and SHA-1 should not be used for any cryptographic purpose.

Numerous high-profile breaches have involved MD5-hashed passwords: LinkedIn (2012, 6.5 million SHA-1 hashes cracked), Adobe (2013, 153 million accounts with 3DES-ECB "encrypted" passwords and MD5 hints), and Dropbox (2016, 68 million bcrypt and SHA-1 hashes). The pattern is consistent: organizations that used fast hash functions for passwords suffered catastrophic credential exposure, while those using proper password hashing functions (bcrypt, scrypt, Argon2) limited the damage.

## Detection

```
grep -rn "createHash.*md5\|createHash.*sha1" --include="*.ts" --include="*.js"
grep -rn "md5.*password\|sha1.*password" --include="*.ts" --include="*.js"
grep -rn "password.*md5\|password.*sha1" --include="*.ts" --include="*.js"
grep -rn "createHash.*sha256.*password\|createHash.*sha512.*password" --include="*.ts" --include="*.js"
grep -rn "\.digest.*password" --include="*.ts" --include="*.js"
grep -rn "md5\|MD5" --include="*.ts" --include="*.js"
```

Any use of `createHash()` with a password as input is a finding. Password hashing must use a dedicated password hashing function (Argon2id, bcrypt, scrypt, or PBKDF2 with sufficient iterations).

## Vulnerable Code

```typescript
import { createHash } from "crypto";

// VULNERABLE: MD5 — 180 billion hashes/sec on modern GPU
function hashPassword(password: string): string {
  return createHash("md5").update(password).digest("hex");
}

// VULNERABLE: SHA-256 without salt or iterations — still too fast
function hashPasswordSha256(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

// VULNERABLE: SHA-1 with salt but no key stretching
function hashPasswordWithSalt(password: string, salt: string): string {
  return createHash("sha1").update(salt + password).digest("hex");
}

// VULNERABLE: Multiple SHA rounds is still weak — custom iteration is not PBKDF2
function hashPasswordMultiple(password: string): string {
  let hash = password;
  for (let i = 0; i < 1000; i++) {
    hash = createHash("sha256").update(hash).digest("hex");
  }
  return hash;
}
```

## Secure Code

```typescript
import { hash, verify } from "argon2";
import bcrypt from "bcrypt";

// PREFERRED: Argon2id — memory-hard, resistant to GPU/ASIC attacks
async function hashPasswordArgon2(password: string): Promise<string> {
  return hash(password, {
    type: 2,           // argon2id (hybrid: side-channel resistant + GPU resistant)
    memoryCost: 65536, // 64 MB memory
    timeCost: 3,       // 3 iterations
    parallelism: 4,    // 4 threads
  });
}

async function verifyPasswordArgon2(password: string, storedHash: string): Promise<boolean> {
  return verify(storedHash, password);
}

// ACCEPTABLE: bcrypt with cost factor >= 12
async function hashPasswordBcrypt(password: string): Promise<string> {
  return bcrypt.hash(password, 12); // 2^12 = 4096 iterations
}

async function verifyPasswordBcrypt(password: string, storedHash: string): Promise<boolean> {
  return bcrypt.compare(password, storedHash);
}
```

## Impact

MD5/SHA-1 hashed passwords can be cracked in seconds to minutes for most real-world passwords. Rainbow tables for common MD5 and SHA-1 hashes are freely available and cover billions of common passwords. An attacker who obtains a database dump will recover the vast majority of user passwords, leading to mass account takeover. Due to widespread password reuse, compromised credentials frequently enable access to other services (credential stuffing).

## References

- CWE-328: Use of Weak Hash — https://cwe.mitre.org/data/definitions/328.html
- CWE-759: Use of a One-Way Hash without a Salt — https://cwe.mitre.org/data/definitions/759.html
- 2025 Hive Systems Password Table: 180B+ MD5 hashes/sec on modern GPUs
- OWASP Password Storage Cheat Sheet — https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
- SHAttered: SHA-1 practical collision (Google/CWI, 2017)
- LinkedIn breach (2012): 6.5M SHA-1 hashed passwords cracked
- Adobe breach (2013): 153M accounts, 3DES-ECB + MD5 hints
- OWASP A02:2021 – Cryptographic Failures
