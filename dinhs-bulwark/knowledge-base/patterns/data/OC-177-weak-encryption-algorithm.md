# OC-177: Weak Encryption Algorithm (DES, RC4, ECB)

**Category:** Data Security
**Severity:** HIGH
**Auditors:** DATA-05
**CWE:** CWE-327 (Use of a Broken or Risky Cryptographic Algorithm)
**OWASP:** A02:2021 – Cryptographic Failures

## Description

Using weak, deprecated, or improperly configured encryption algorithms fails to protect data confidentiality even when encryption is nominally present. The most common mistakes are: using DES or 3DES (56/168-bit keys, known attacks), RC4 (multiple biases enabling plaintext recovery), AES in ECB mode (leaks plaintext patterns), and AES-CBC without authenticated encryption (vulnerable to padding oracle attacks).

CVE-2022-28382 demonstrated the real-world impact of ECB mode: Verbatim encrypted USB drives used AES-256 with ECB mode, which preserved plaintext patterns in the ciphertext. The classic "ECB penguin" example shows that encrypting a bitmap image with ECB produces a ciphertext image where the original penguin is still visible. CVE-2023-44690 (mycli) used AES-ECB for encrypting configuration files including database credentials.

The OWASP Top 10 lists Cryptographic Failures as the #2 risk (A02:2021), with CWE-327 being one of the most frequently mapped weaknesses. Prisma Cloud's SAST rules specifically flag `crypto.createCipheriv` calls using `aes-128-cbc`, `aes-128-ecb`, `des`, `des-ede3`, or `rc4` modes. Applications must use AES-256-GCM or ChaCha20-Poly1305 for authenticated encryption that provides both confidentiality and integrity.

## Detection

```
grep -rn "createCipher\b\|createCipheriv" --include="*.ts" --include="*.js"
grep -rn "aes.*ecb\|des\|rc4\|blowfish\|3des\|des-ede" --include="*.ts" --include="*.js"
grep -rn "aes-128-cbc\|aes-256-cbc" --include="*.ts" --include="*.js"
grep -rn "crypto\.createCipher\b" --include="*.ts" --include="*.js"
```

Look for: `crypto.createCipher()` (deprecated, uses ECB-like behavior), `crypto.createCipheriv()` with ECB or CBC mode, any use of DES, 3DES, RC4, or Blowfish, AES-CBC without HMAC for authentication.

## Vulnerable Code

```typescript
import crypto from "crypto";

// VULNERABLE: AES in ECB mode — preserves plaintext patterns
function encryptECB(data: string, key: Buffer): string {
  const cipher = crypto.createCipheriv("aes-256-ecb", key, null);
  return cipher.update(data, "utf8", "hex") + cipher.final("hex");
}

// VULNERABLE: Deprecated createCipher — uses MD5 for key derivation + ECB
function encryptLegacy(data: string, password: string): string {
  const cipher = crypto.createCipher("aes-256-cbc", password);
  return cipher.update(data, "utf8", "hex") + cipher.final("hex");
}

// VULNERABLE: DES — 56-bit key, brute-forceable
function encryptDES(data: string, key: Buffer): string {
  const cipher = crypto.createCipheriv("des", key, Buffer.alloc(8));
  return cipher.update(data, "utf8", "hex") + cipher.final("hex");
}

// VULNERABLE: AES-CBC without authentication — padding oracle risk
function encryptCBC(data: string, key: Buffer, iv: Buffer): string {
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  return iv.toString("hex") + cipher.update(data, "utf8", "hex") + cipher.final("hex");
  // No HMAC — attacker can modify ciphertext undetected
}
```

## Secure Code

```typescript
import crypto from "crypto";

const ALGORITHM = "aes-256-gcm"; // Authenticated encryption

function encrypt(plaintext: string, key: Buffer): string {
  const iv = crypto.randomBytes(12); // 96-bit nonce for GCM
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag(); // 128-bit authentication tag
  // Format: iv:tag:ciphertext (all hex)
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

function decrypt(ciphertext: string, key: Buffer): string {
  const [ivHex, tagHex, encHex] = ciphertext.split(":");
  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  return decipher.update(encHex, "hex", "utf8") + decipher.final("utf8");
  // Throws if ciphertext was tampered with (authentication failure)
}

// Key must be 32 bytes from a secure source
const key = Buffer.from(process.env.ENCRYPTION_KEY!, "hex");
```

## Impact

Weak encryption provides a false sense of security. DES can be brute-forced in hours. RC4 has known biases that leak plaintext bytes. ECB mode preserves data patterns, enabling visual analysis of encrypted images and statistical analysis of encrypted structured data. CBC without authentication enables padding oracle attacks that decrypt arbitrary ciphertext without the key. Regulatory frameworks (PCI DSS, HIPAA) mandate strong encryption; weak algorithms result in compliance failures.

## References

- CVE-2022-28382: Verbatim encrypted drives using AES-256-ECB
- CVE-2023-44690: mycli using AES-ECB for config encryption
- CWE-327: Use of a Broken or Risky Cryptographic Algorithm — https://cwe.mitre.org/data/definitions/327.html
- OWASP A02:2021 – Cryptographic Failures
- Prisma Cloud SAST: Encryption algorithm not using secure modes and padding
- NIST SP 800-131A: Transitioning the Use of Cryptographic Algorithms
