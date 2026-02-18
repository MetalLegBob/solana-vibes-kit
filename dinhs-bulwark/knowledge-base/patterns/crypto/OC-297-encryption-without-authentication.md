# OC-297: Encryption Without Authentication (No AEAD)

**Category:** Cryptographic Operations
**Severity:** HIGH
**Auditors:** CRYPTO-01
**CWE:** CWE-353 (Missing Support for Integrity Check)
**OWASP:** A02:2021 – Cryptographic Failures

## Description

Encryption without authentication (using modes like AES-CBC or AES-CTR without a separate MAC) provides confidentiality but no integrity or authenticity guarantee. An attacker who can modify ciphertext can alter the underlying plaintext in predictable ways without detection. This enables padding oracle attacks, bit-flipping attacks, and ciphertext malleability exploits.

The padding oracle attack, first published by Serge Vaudenay in 2002 and refined by Juliano Rizzo and Thai Duong as the BEAST and POODLE attacks, demonstrates the devastating consequences of unauthenticated CBC encryption. By observing whether a modified ciphertext produces a valid or invalid padding error, an attacker can decrypt the entire ciphertext one byte at a time. This attack has been exploited against TLS (CVE-2014-3566 POODLE), ASP.NET (CVE-2010-3332), and countless applications using CBC without a MAC.

CVE-2023-42811 in the `aes-gcm` Rust crate showed that even when using AEAD, implementation bugs can undermine authentication: the `decrypt_in_place_detached` function exposed plaintext even when tag verification failed, enabling Chosen Ciphertext Attacks (CCAs). CVE-2023-26084 in Arm's AArch64 crypto library showed that the `armv8_dec_aes_gcm_full()` API failed to verify the GCM authentication tag at all. These cases demonstrate that AEAD must be both selected and correctly implemented — using an AEAD mode is necessary but not sufficient.

For AES-CTR (counter mode) without authentication, bit-flipping attacks are trivial: flipping a bit in the ciphertext flips the corresponding bit in the plaintext. An attacker who knows the structure of the plaintext can modify specific fields (e.g., changing `"admin":false` to `"admin":true`) without knowing the key.

## Detection

```
grep -rn "aes-.*-cbc\|aes-.*-ctr\|aes-.*-cfb\|aes-.*-ofb" --include="*.ts" --include="*.js"
grep -rn "createCipheriv.*cbc\|createCipheriv.*ctr" --include="*.ts" --include="*.js"
grep -rn "\.setAuthTag\|\.getAuthTag" --include="*.ts" --include="*.js"
grep -rn "createCipheriv" --include="*.ts" --include="*.js"
```

If `createCipheriv` is called with CBC/CTR/CFB/OFB mode, check whether a separate HMAC is computed over the ciphertext (encrypt-then-MAC). If no HMAC is found, the encryption is unauthenticated.

## Vulnerable Code

```typescript
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const key = Buffer.from(process.env.ENCRYPTION_KEY!, "hex");

// VULNERABLE: AES-CBC without any integrity check
function encrypt(plaintext: string): string {
  const iv = randomBytes(16);
  const cipher = createCipheriv("aes-256-cbc", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return Buffer.concat([iv, encrypted]).toString("base64");
}

function decrypt(encoded: string): string {
  const data = Buffer.from(encoded, "base64");
  const iv = data.subarray(0, 16);
  const ciphertext = data.subarray(16);
  const decipher = createDecipheriv("aes-256-cbc", key, iv);
  // No integrity check — attacker can modify ciphertext undetected
  // Padding errors leak information (padding oracle attack)
  return decipher.update(ciphertext, undefined, "utf8") + decipher.final("utf8");
}
```

## Secure Code

```typescript
import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from "crypto";

const key = Buffer.from(process.env.ENCRYPTION_KEY!, "hex");

// PREFERRED: AES-256-GCM provides built-in authentication (AEAD)
function encryptGcm(plaintext: string): string {
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, nonce);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag(); // 16-byte authentication tag
  return Buffer.concat([nonce, tag, encrypted]).toString("base64");
}

function decryptGcm(encoded: string): string {
  const data = Buffer.from(encoded, "base64");
  const nonce = data.subarray(0, 12);
  const tag = data.subarray(12, 28);
  const ciphertext = data.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", key, nonce);
  decipher.setAuthTag(tag); // Verification happens on .final()
  return decipher.update(ciphertext, undefined, "utf8") + decipher.final("utf8");
  // Throws if tag verification fails — ciphertext tampered
}

// ALTERNATIVE: Encrypt-then-MAC with AES-CBC + HMAC-SHA256
function encryptCbcHmac(plaintext: string, encKey: Buffer, macKey: Buffer): string {
  const iv = randomBytes(16);
  const cipher = createCipheriv("aes-256-cbc", encKey, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const payload = Buffer.concat([iv, encrypted]);
  const mac = createHmac("sha256", macKey).update(payload).digest();
  return Buffer.concat([mac, payload]).toString("base64");
}
```

## Impact

Unauthenticated encryption enables padding oracle attacks (full plaintext recovery in AES-CBC), bit-flipping attacks (targeted modification of plaintext fields in AES-CTR), ciphertext malleability (forging valid-looking encrypted payloads), and bypass of access controls embedded in encrypted data. In web applications, this typically means session hijacking, privilege escalation, or data exfiltration.

## References

- CVE-2023-42811: aes-gcm Rust crate plaintext exposed on tag verification failure
- CVE-2023-26084: Arm AArch64cryptolib fails to verify GCM authentication tag
- CVE-2014-3566: POODLE — padding oracle on SSLv3 CBC
- CVE-2010-3332: ASP.NET padding oracle (Rizzo and Duong)
- CWE-353: Missing Support for Integrity Check — https://cwe.mitre.org/data/definitions/353.html
- Vaudenay: "Security Flaws Induced by CBC Padding" (EUROCRYPT 2002)
- Google/Tink: "How to Abuse and Fix Authenticated Encryption Without Key Commitment" (2020)
- OWASP A02:2021 – Cryptographic Failures
