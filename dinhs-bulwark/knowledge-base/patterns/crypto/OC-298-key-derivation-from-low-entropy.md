# OC-298: Key Derivation from Low-Entropy Input

**Category:** Cryptographic Operations
**Severity:** HIGH
**Auditors:** CRYPTO-01
**CWE:** CWE-331 (Insufficient Entropy)
**OWASP:** A02:2021 – Cryptographic Failures

## Description

Encryption keys must have sufficient entropy (randomness) to resist brute-force attacks. AES-256 requires 256 bits of entropy; using a human-chosen password (typically 40-65 bits of entropy for common passwords) directly as a key, or deriving a key from low-entropy input without a proper key derivation function (KDF), means the effective security is only as strong as the input's entropy — not the algorithm's key length.

Common mistakes include using a short password directly as the encryption key (padding with zeros or truncating to fit), hashing a password with SHA-256 and using the digest as a key (fast hash, no stretching, still limited by password entropy), deriving keys from predictable values like user IDs, timestamps, or incrementing counters, and using the deprecated `crypto.createCipher()` API (removed in Node.js 22) which used a single MD5 iteration to derive keys from passwords.

The OWASP Top 10 lists CWE-331 (Insufficient Entropy) as a notable CWE under A02:2021 Cryptographic Failures. NIST SP 800-132 provides guidance on key derivation from passwords, mandating the use of an approved KDF (PBKDF2, scrypt, Argon2, or HKDF for high-entropy input) with appropriate parameters. The key insight is that a KDF cannot create entropy — it can only make brute-force more expensive through computational cost. If the input has 40 bits of entropy, even a perfect KDF produces a key with 40 bits of effective entropy.

## Detection

```
grep -rn "createCipher\b[^i]" --include="*.ts" --include="*.js"
grep -rn "Buffer\.from.*password.*key\|key.*Buffer\.from.*password" --include="*.ts" --include="*.js"
grep -rn "createHash.*key\|\.digest.*key" --include="*.ts" --include="*.js"
grep -rn "key.*=.*process\.env\.\w*PASSWORD" --include="*.ts" --include="*.js"
grep -rn "encryptionKey.*=.*['\"]" --include="*.ts" --include="*.js"
grep -rn "key.*=.*userId\|key.*=.*username" --include="*.ts" --include="*.js"
grep -rn "createCipheriv.*Buffer\.from\s*(" --include="*.ts" --include="*.js"
```

Look for: passwords used directly as keys, SHA-256(password) as a key, keys derived from user IDs or timestamps, string-to-buffer conversion as "key derivation," and the deprecated `createCipher()` API.

## Vulnerable Code

```typescript
import { createCipheriv, createHash, randomBytes } from "crypto";

// VULNERABLE: Password used directly as key — padded to 32 bytes with zeros
function encryptWithPassword(plaintext: string, password: string): string {
  const key = Buffer.alloc(32);
  Buffer.from(password, "utf8").copy(key);  // "mypassword" = 10 bytes, rest is zeros
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64");
}

// VULNERABLE: Single SHA-256 hash as key derivation — no salt, no stretching
function deriveKey(password: string): Buffer {
  return createHash("sha256").update(password).digest(); // Fast, unsalted, no iterations
}

// VULNERABLE: Key derived from predictable user-specific value
function getUserEncryptionKey(userId: string): Buffer {
  return createHash("sha256").update(`user-key-${userId}`).digest();
}
```

## Secure Code

```typescript
import { createCipheriv, randomBytes, scryptSync } from "crypto";

// SECURE: scrypt KDF with proper parameters for password-based key derivation
function encryptWithPassword(plaintext: string, password: string): string {
  const salt = randomBytes(32);
  const key = scryptSync(password, salt, 32, {
    N: 16384,  // CPU/memory cost parameter
    r: 8,      // Block size
    p: 1,      // Parallelization
  });
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, nonce);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Store salt alongside ciphertext for decryption
  return Buffer.concat([salt, nonce, tag, encrypted]).toString("base64");
}

// SECURE: For high-entropy input (e.g., shared DH secret), use HKDF
import { createHmac } from "crypto";

function hkdfExpand(prk: Buffer, info: string, length: number): Buffer {
  // HKDF-Expand (RFC 5869) — only appropriate for already-high-entropy input
  const infoBuffer = Buffer.from(info, "utf8");
  let output = Buffer.alloc(0);
  let t = Buffer.alloc(0);
  for (let i = 1; output.length < length; i++) {
    t = createHmac("sha256", prk)
      .update(Buffer.concat([t, infoBuffer, Buffer.from([i])]))
      .digest();
    output = Buffer.concat([output, t]);
  }
  return output.subarray(0, length);
}

// SECURE: Generate truly random keys when password derivation is not needed
function generateEncryptionKey(): Buffer {
  return randomBytes(32); // 256 bits from OS CSPRNG
}
```

## Impact

Keys derived from low-entropy input have an effective strength far below the algorithm's nominal security. An attacker who knows the key derivation method needs only to search the input space (e.g., common passwords, user IDs, timestamps) rather than the full 256-bit key space. For password-derived keys without a KDF, offline brute-force at billions of guesses per second makes decryption trivial. For keys derived from user IDs, the attacker can compute any user's key without even guessing.

## References

- CWE-331: Insufficient Entropy — https://cwe.mitre.org/data/definitions/331.html
- CWE-327: Use of a Broken or Risky Cryptographic Algorithm (covers createCipher deprecation)
- NIST SP 800-132: Recommendation for Password-Based Key Derivation
- NIST SP 800-108: Recommendation for Key Derivation Using Pseudorandom Functions
- RFC 5869: HMAC-based Extract-and-Expand Key Derivation Function (HKDF)
- OWASP A02:2021 – Cryptographic Failures
- Node.js crypto.createCipher() deprecation: single MD5 iteration for key derivation
