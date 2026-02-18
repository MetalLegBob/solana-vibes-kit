# OC-287: Predictable Nonce/Salt

**Category:** Cryptographic Operations
**Severity:** HIGH
**Auditors:** CRYPTO-01
**CWE:** CWE-330 (Use of Insufficiently Random Values)
**OWASP:** A02:2021 – Cryptographic Failures

## Description

Nonces ("number used once") and salts serve distinct but critical cryptographic roles. A nonce prevents replay attacks and ensures ciphertext uniqueness; a salt prevents precomputation attacks on hashed values. Both must be generated from a cryptographically secure random source. When nonces or salts are derived from predictable values such as timestamps, counters without randomness, sequential IDs, or `Math.random()`, their security guarantees are nullified.

The importance of unpredictable nonces is well-established in cryptographic literature. NIST SP 800-38D (GCM specification) explicitly requires that IVs be either random (96-bit from an approved RNG) or constructed using a deterministic algorithm that guarantees uniqueness. CVE-2024-23688 in the Consensys Discovery service (versions < 0.4.5) demonstrated the impact: the implementation used the same AES/GCM nonce for an entire session, compromising the session key for peer communication. CVE-2026-22698 in the RustCrypto Elliptic Curves SM2 implementation showed that reduced entropy in nonce generation allowed attackers to decrypt ciphertexts.

Predictable salts are equally dangerous. If an attacker knows the salt, they can precompute rainbow tables specific to that salt, reducing password hashing to a lookup operation. Hardcoded or constant salts effectively reduce a salted hash to an unsalted one.

## Detection

```
grep -rn "nonce.*=.*0" --include="*.ts" --include="*.js"
grep -rn "nonce.*Date\.now" --include="*.ts" --include="*.js"
grep -rn "nonce.*counter" --include="*.ts" --include="*.js"
grep -rn "salt.*=.*['\"]" --include="*.ts" --include="*.js"
grep -rn "iv.*=.*Buffer\.from\s*(" --include="*.ts" --include="*.js"
grep -rn "iv.*=.*\[0" --include="*.ts" --include="*.js"
grep -rn "iv.*=.*\"0" --include="*.ts" --include="*.js"
grep -rn "nonce.*Math\.random" --include="*.ts" --include="*.js"
```

Look for: static salt strings, IVs constructed from timestamps, counters used directly as nonces, zero-filled buffers for IVs.

## Vulnerable Code

```typescript
import { createCipheriv, createHash, pbkdf2Sync } from "crypto";

// VULNERABLE: Predictable nonce derived from timestamp
function encryptData(key: Buffer, plaintext: string): Buffer {
  const nonce = Buffer.alloc(12);
  nonce.writeBigUInt64BE(BigInt(Date.now()), 0); // Predictable from clock

  const cipher = createCipheriv("aes-256-gcm", key, nonce);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([nonce, tag, encrypted]);
}

// VULNERABLE: Hardcoded salt for password hashing
function hashPassword(password: string): Buffer {
  const salt = "my-application-salt"; // Same salt for all users
  return pbkdf2Sync(password, salt, 100000, 64, "sha512");
}
```

## Secure Code

```typescript
import { createCipheriv, randomBytes, pbkdf2Sync } from "crypto";

// SECURE: Cryptographically random nonce
function encryptData(key: Buffer, plaintext: string): Buffer {
  const nonce = randomBytes(12); // 96-bit random nonce per NIST SP 800-38D

  const cipher = createCipheriv("aes-256-gcm", key, nonce);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([nonce, tag, encrypted]);
}

// SECURE: Random salt per password
function hashPassword(password: string): { hash: Buffer; salt: Buffer } {
  const salt = randomBytes(32); // Unique salt per user
  const hash = pbkdf2Sync(password, salt, 600000, 64, "sha512");
  return { hash, salt };
}
```

## Impact

Predictable nonces allow an attacker to perform nonce-reuse attacks (see OC-289), decrypt ciphertext, forge authentication tags, and mount replay attacks. Predictable salts enable precomputation attacks against password databases, making rainbow table and dictionary attacks feasible. In the Consensys Discovery case, the session key was fully compromised, allowing decryption of all peer communications.

## References

- CVE-2024-23688: Consensys Discovery < 0.4.5 same AES/GCM nonce for entire session
- CVE-2026-22698: RustCrypto Elliptic Curves reduced entropy in nonce generation
- CWE-330: Use of Insufficiently Random Values — https://cwe.mitre.org/data/definitions/330.html
- NIST SP 800-38D: Recommendation for Block Cipher Modes — GCM specification
- OWASP A02:2021 – Cryptographic Failures
