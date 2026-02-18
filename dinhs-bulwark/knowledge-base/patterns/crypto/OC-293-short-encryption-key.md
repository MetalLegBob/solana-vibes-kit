# OC-293: Short Encryption Key (< 256 bits)

**Category:** Cryptographic Operations
**Severity:** MEDIUM
**Auditors:** CRYPTO-01
**CWE:** CWE-326 (Inadequate Encryption Strength)
**OWASP:** A02:2021 – Cryptographic Failures

## Description

The strength of symmetric encryption is directly determined by the key length. AES-128 provides 128 bits of security, which is currently considered adequate, but AES-256 (256-bit keys) is strongly recommended for new systems and required by many compliance standards (FIPS 140-3, PCI DSS 4.0). Keys shorter than 128 bits (such as DES at 56 bits, 3DES at 112 effective bits, or truncated AES keys) are considered broken or insufficient by modern standards.

The danger extends beyond the algorithm's nominal key size. Developers frequently introduce key weaknesses by deriving keys from short passwords or passphrases without proper key derivation functions, truncating keys to fit an algorithm's requirements, using the raw output of a hash function as a key (e.g., MD5 producing only 128 bits), or hardcoding short keys as readable strings (where "mysecretkey123" is only 14 bytes = 112 bits, and has far less entropy than 112 random bits due to character-set bias).

NIST's post-quantum cryptography transition guidance recommends AES-256 for long-term data protection, as Grover's algorithm on a quantum computer could reduce AES-128's effective security to 64 bits. For data with a long confidentiality requirement (medical records, financial data, legal documents), AES-256 provides the necessary security margin.

## Detection

```
grep -rn "aes-128\|aes128\|AES128" --include="*.ts" --include="*.js"
grep -rn "aes-192\|aes192\|AES192" --include="*.ts" --include="*.js"
grep -rn "des\b\|des-ede\|des3\|3des\|DES" --include="*.ts" --include="*.js"
grep -rn "rc4\|RC4\|arcfour" --include="*.ts" --include="*.js"
grep -rn "blowfish\|bf-\|bf_" --include="*.ts" --include="*.js"
grep -rn "key.*=.*['\"].\{1,31\}['\"]" --include="*.ts" --include="*.js"
grep -rn "createCipheriv.*aes-128\|createCipheriv.*des" --include="*.ts" --include="*.js"
```

Look for: DES/3DES usage, AES-128 in new code, RC4 stream cipher, Blowfish, and key strings shorter than 32 characters (256 bits).

## Vulnerable Code

```typescript
import { createCipheriv, createHash, randomBytes } from "crypto";

// VULNERABLE: DES with 56-bit key — trivially brute-forceable
function encryptLegacy(plaintext: string): string {
  const key = Buffer.from("mysecret", "utf8"); // 8 bytes = 64 bits (56 effective for DES)
  const iv = randomBytes(8);
  const cipher = createCipheriv("des-cbc", key, iv);
  return cipher.update(plaintext, "utf8", "hex") + cipher.final("hex");
}

// VULNERABLE: Key derived from short password via simple hash
function deriveWeakKey(password: string): Buffer {
  return createHash("md5").update(password).digest(); // Only 128 bits, no stretching
}

// VULNERABLE: String key shorter than required
function encryptShortKey(plaintext: string): string {
  const key = Buffer.from("short-key-value!", "utf8"); // 16 bytes = 128 bits for AES-256? No, truncated or padded incorrectly
  const iv = randomBytes(16);
  const cipher = createCipheriv("aes-256-cbc", key, iv); // Will throw or silently fail
  return cipher.update(plaintext, "utf8", "hex") + cipher.final("hex");
}
```

## Secure Code

```typescript
import { createCipheriv, randomBytes, scryptSync } from "crypto";

// SECURE: AES-256 with full 256-bit random key
function encryptWithRandomKey(plaintext: string): { ciphertext: string; key: string } {
  const key = randomBytes(32); // 256 bits of cryptographic randomness
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, nonce);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    ciphertext: Buffer.concat([nonce, tag, encrypted]).toString("base64"),
    key: key.toString("hex"),
  };
}

// SECURE: Key derived from password using scrypt with proper parameters
function deriveKey(password: string, salt: Buffer): Buffer {
  return scryptSync(password, salt, 32, {
    N: 16384, // CPU/memory cost
    r: 8,     // Block size
    p: 1,     // Parallelization
  }); // Returns 32 bytes = 256 bits
}
```

## Impact

Short keys can be brute-forced. DES (56-bit) can be cracked in hours with specialized hardware (the EFF's DES Cracker demonstrated this in 1998). 3DES has an effective key length of 112 bits and is vulnerable to the Sweet32 birthday attack on 64-bit blocks. Keys derived from short passwords without proper KDFs have far less entropy than their bit length suggests — a 10-character password from the ASCII printable set has approximately 65 bits of entropy, well below the 256-bit target.

## References

- CWE-326: Inadequate Encryption Strength — https://cwe.mitre.org/data/definitions/326.html
- NIST SP 800-131A Rev 2: Transitioning the Use of Cryptographic Algorithms and Key Lengths
- Sweet32 attack on 3DES/Blowfish 64-bit block ciphers (CVE-2016-2183)
- EFF DES Cracker: 56-bit DES broken in 22 hours (1998)
- OWASP A02:2021 – Cryptographic Failures
- PCI DSS 4.0 — Strong Cryptography requirements
