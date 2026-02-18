# OC-178: Hardcoded Encryption Key or IV

**Category:** Data Security
**Severity:** CRITICAL
**Auditors:** DATA-05
**CWE:** CWE-321 (Use of Hard-coded Cryptographic Key), CWE-329 (Generation of Predictable IV with CBC Mode)
**OWASP:** A02:2021 – Cryptographic Failures

## Description

Hardcoded encryption keys or initialization vectors (IVs) embedded in source code nullify the security provided by encryption. If the key is in the source, anyone with code access (developers, contractors, attackers who obtain the source) can decrypt all data encrypted with that key. Hardcoded IVs combined with a static key produce identical ciphertext for identical plaintext, enabling pattern analysis and potentially full plaintext recovery.

This is particularly insidious because the application appears to encrypt data properly — all the encryption API calls are present and correct — but the security is illusory. CVE-2023-39250 (Dell Compellent) demonstrated this with a hardcoded encryption key used across all installations, meaning data encrypted by any customer could be decrypted by anyone who extracted the key from the software. GitGuardian's 2025 report found that cryptographic keys are among the fastest-growing categories of leaked secrets.

In Node.js applications, hardcoded keys appear as Buffer literals, hex strings, base64 strings, or fixed Uint8Arrays in encryption utility modules. Hardcoded IVs are even more common, often set to `Buffer.alloc(16)` (all zeros) or a fixed string repeated to fill the required length.

## Detection

```
grep -rn "createCipheriv\|createDecipheriv" --include="*.ts" --include="*.js"
grep -rn "Buffer\.from.*hex\|Buffer\.from.*base64\|Buffer\.alloc" --include="*.ts" --include="*.js"
grep -rn "ENCRYPTION_KEY\s*=\s*['\"]" --include="*.ts" --include="*.js"
grep -rn "const.*iv\s*=\s*Buffer\|const.*key\s*=\s*Buffer" --include="*.ts" --include="*.js"
grep -rn "0000000\|aaaaaaa\|deadbeef" --include="*.ts" --include="*.js"
```

Look for: encryption keys defined as string/Buffer literals rather than loaded from environment or secrets manager, IVs created with `Buffer.alloc()` or `Buffer.from("fixed_string")`, same key/IV pair used across all encrypt operations, encryption utility files containing both key definition and encryption logic.

## Vulnerable Code

```typescript
import crypto from "crypto";

// VULNERABLE: Hardcoded encryption key
const ENCRYPTION_KEY = Buffer.from("0123456789abcdef0123456789abcdef", "hex");

// VULNERABLE: Hardcoded IV — identical plaintext produces identical ciphertext
const FIXED_IV = Buffer.alloc(16, 0); // All zeros

function encrypt(data: string): string {
  const cipher = crypto.createCipheriv("aes-256-cbc", ENCRYPTION_KEY, FIXED_IV);
  return cipher.update(data, "utf8", "hex") + cipher.final("hex");
}

function decrypt(data: string): string {
  const decipher = crypto.createDecipheriv("aes-256-cbc", ENCRYPTION_KEY, FIXED_IV);
  return decipher.update(data, "hex", "utf8") + decipher.final("utf8");
}

// encrypt("hello") === encrypt("hello") — always produces same output
// Anyone with source code can call decrypt() on any ciphertext
```

## Secure Code

```typescript
import crypto from "crypto";

// SECURE: Key loaded from environment / secrets manager
function getEncryptionKey(): Buffer {
  const keyHex = process.env.ENCRYPTION_KEY;
  if (!keyHex || keyHex.length !== 64) {
    throw new Error("ENCRYPTION_KEY must be a 64-character hex string (32 bytes)");
  }
  return Buffer.from(keyHex, "hex");
}

// SECURE: Random IV per encryption operation (GCM nonce)
function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12); // Unique per operation
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

function decrypt(ciphertext: string): string {
  const key = getEncryptionKey();
  const [ivHex, tagHex, encHex] = ciphertext.split(":");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  return decipher.update(encHex, "hex", "utf8") + decipher.final("utf8");
}

// Key generation command for initial setup:
// node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Impact

Hardcoded encryption keys allow anyone with source code access to decrypt all protected data. This includes developers (current and former), anyone who obtains the source through a breach or leak, and anyone who reverse-engineers the application. Hardcoded IVs additionally enable chosen-plaintext attacks, frequency analysis on encrypted data, and detection of duplicate values in encrypted fields.

## References

- CVE-2023-39250: Dell Compellent hardcoded encryption key
- CWE-321: Use of Hard-coded Cryptographic Key — https://cwe.mitre.org/data/definitions/321.html
- CWE-329: Generation of Predictable IV with CBC Mode — https://cwe.mitre.org/data/definitions/329.html
- OWASP A02:2021 – Cryptographic Failures
- GitGuardian 2025: Cryptographic keys as growing leaked secret category
