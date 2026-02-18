# OC-292: AES in ECB Mode

**Category:** Cryptographic Operations
**Severity:** HIGH
**Auditors:** CRYPTO-01
**CWE:** CWE-327 (Use of a Broken or Risky Cryptographic Algorithm)
**OWASP:** A02:2021 – Cryptographic Failures

## Description

Electronic Codebook (ECB) mode encrypts each block of plaintext independently with the same key, producing identical ciphertext blocks for identical plaintext blocks. This means patterns in the plaintext are directly visible in the ciphertext. The classic demonstration is the "ECB penguin" — encrypting a bitmap image in ECB mode produces ciphertext that still shows the penguin's outline, because identical pixel blocks produce identical cipher blocks.

Beyond pattern leakage, ECB mode is vulnerable to block manipulation attacks. An attacker can reorder, duplicate, or remove ciphertext blocks without detection (there is no chaining or authentication). In the CryptoHack "ECB Oracle" challenge and numerous CTF competitions, ECB's deterministic property enables byte-at-a-time plaintext recovery: by controlling part of the plaintext and observing which ciphertext blocks match, an attacker can recover unknown plaintext one byte at a time.

ECB mode also lacks semantic security. Given two messages, an attacker can always determine whether the same plaintext was encrypted twice, violating IND-CPA (indistinguishability under chosen plaintext attack). This makes ECB unsuitable for encrypting any data longer than a single block, and inappropriate for virtually all real-world applications. Despite these well-known weaknesses, ECB appears frequently in application code because it requires no IV, making it the "simplest" mode to implement — and it is often the default in some libraries.

## Detection

```
grep -rn "aes.*ecb\|AES.*ECB\|ecb.*aes\|ECB.*AES" --include="*.ts" --include="*.js"
grep -rn "createCipher\b[^i]" --include="*.ts" --include="*.js"
grep -rn "aes-128-ecb\|aes-192-ecb\|aes-256-ecb" --include="*.ts" --include="*.js"
grep -rn "algorithm.*ecb\|mode.*ecb\|ECB" --include="*.ts" --include="*.js"
grep -rn "AES\.MODE_ECB\|mode: 'ecb'" --include="*.ts" --include="*.js" --include="*.py"
```

Note: `crypto.createCipher()` (without the `iv` suffix) was deprecated in Node.js because it used a weak key derivation and did not accept an IV, making it equivalent to ECB in some configurations. Always use `createCipheriv()`.

## Vulnerable Code

```typescript
import { createCipheriv, createDecipheriv } from "crypto";

const key = Buffer.from(process.env.ENCRYPTION_KEY!, "hex"); // 32 bytes

// VULNERABLE: ECB mode — identical plaintext blocks produce identical ciphertext
function encrypt(plaintext: string): string {
  const cipher = createCipheriv("aes-256-ecb", key, null); // ECB has no IV
  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  return encrypted;
}

function decrypt(ciphertext: string): string {
  const decipher = createDecipheriv("aes-256-ecb", key, null);
  let decrypted = decipher.update(ciphertext, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

// PROBLEM: encrypt("AAAAAAAAAAAAAAAA") always produces the same ciphertext
// Repeated blocks in structured data (JSON, repeated fields) leak patterns
```

## Secure Code

```typescript
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const key = Buffer.from(process.env.ENCRYPTION_KEY!, "hex"); // 32 bytes

// SECURE: AES-256-GCM provides confidentiality, integrity, and authentication
function encrypt(plaintext: string): string {
  const nonce = randomBytes(12); // Random 96-bit nonce
  const cipher = createCipheriv("aes-256-gcm", key, nonce);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([nonce, tag, encrypted]).toString("base64");
}

function decrypt(encoded: string): string {
  const data = Buffer.from(encoded, "base64");
  const nonce = data.subarray(0, 12);
  const tag = data.subarray(12, 28);
  const ciphertext = data.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", key, nonce);
  decipher.setAuthTag(tag);
  return decipher.update(ciphertext, undefined, "utf8") + decipher.final("utf8");
}
```

## Impact

ECB mode leaks plaintext patterns through ciphertext analysis, enables block reordering and duplication attacks, allows byte-at-a-time plaintext recovery when the attacker controls part of the input, and provides no protection against ciphertext modification. An attacker can detect repeated data, identify known plaintext blocks, and manipulate encrypted records without detection.

## References

- CWE-327: Use of a Broken or Risky Cryptographic Algorithm — https://cwe.mitre.org/data/definitions/327.html
- CryptoHack ECB Oracle challenge — https://aes.cryptohack.org/ecb_oracle/
- "The ECB Penguin" — visual demonstration of ECB weakness
- OWASP A02:2021 – Cryptographic Failures
- NIST SP 800-38A: Recommendation for Block Cipher Modes of Operation
- Serge Vaudenay: "Security Flaws Induced by CBC Padding" (EUROCRYPT 2002)
