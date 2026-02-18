# OC-289: Nonce Reuse in Encryption

**Category:** Cryptographic Operations
**Severity:** CRITICAL
**Auditors:** CRYPTO-01
**CWE:** CWE-323 (Reusing a Nonce, Key Pair in Encryption)
**OWASP:** A02:2021 – Cryptographic Failures

## Description

Nonce reuse with the same encryption key is a catastrophic cryptographic failure. For stream ciphers and CTR-based modes (AES-CTR, AES-GCM, ChaCha20), reusing a nonce with the same key means the same keystream is XORed with different plaintexts. An attacker who obtains two ciphertexts encrypted with the same key and nonce can XOR them together to eliminate the keystream, leaving the XOR of the two plaintexts — a condition trivially exploitable with known-plaintext or crib-dragging techniques.

For AES-GCM specifically, nonce reuse is even more devastating. Beyond plaintext recovery, it enables recovery of the authentication hash subkey (H = AES_K(0)), which allows the attacker to forge authentication tags for arbitrary ciphertexts. This completely destroys both confidentiality and integrity. The IETF draft on AEAD usage limits (draft-irtf-cfrg-aead-limits) documents the mathematical bounds on how many messages can be safely encrypted before nonce collision becomes probable.

CVE-2025-61739 (CVSS 7.2) affected Johnson Controls PowerG, IQPanel, and IQHub security systems, where nonce reuse allowed attackers to perform replay attacks and decrypt captured packets. CVE-2024-23688 in Consensys Discovery showed the same AES/GCM nonce used for an entire session. CVE-2024-21530 in the Rust `cocoon` crate demonstrated nonce reuse in its encryption API. These are not theoretical attacks — the Elttam security blog documented full key recovery from GCM nonce reuse in a real-world web application assessment.

## Detection

```
grep -rn "createCipheriv" --include="*.ts" --include="*.js"
grep -rn "\.encrypt\s*(" --include="*.ts" --include="*.js"
grep -rn "iv\s*=\s*Buffer\.from" --include="*.ts" --include="*.js"
grep -rn "iv\s*=\s*Buffer\.alloc" --include="*.ts" --include="*.js"
grep -rn "nonce\s*=\s*[^r]" --include="*.ts" --include="*.js"
grep -rn "const iv" --include="*.ts" --include="*.js"
```

Manual review is essential. Verify that every call to `createCipheriv` uses a freshly-generated random nonce. Static nonces, global counter nonces without cryptographic guarantees, and nonces derived from non-unique inputs are all findings.

## Vulnerable Code

```typescript
import { createCipheriv, createDecipheriv } from "crypto";

const ENCRYPTION_KEY = Buffer.from(process.env.ENCRYPTION_KEY!, "hex");

// VULNERABLE: Static IV reused for every encryption
const STATIC_IV = Buffer.from("000102030405060708090a0b", "hex");

function encrypt(plaintext: string): string {
  const cipher = createCipheriv("aes-256-gcm", ENCRYPTION_KEY, STATIC_IV);
  let ciphertext = cipher.update(plaintext, "utf8", "hex");
  ciphertext += cipher.final("hex");
  const tag = cipher.getAuthTag().toString("hex");
  return `${ciphertext}:${tag}`;
}

// VULNERABLE: Counter-based IV without overflow protection
let nonceCounter = 0;
function encryptWithCounter(key: Buffer, plaintext: string): Buffer {
  const nonce = Buffer.alloc(12);
  nonce.writeUInt32BE(nonceCounter++, 8); // Wraps at 2^32, reuses nonces
  const cipher = createCipheriv("aes-256-gcm", key, nonce);
  return Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
}
```

## Secure Code

```typescript
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ENCRYPTION_KEY = Buffer.from(process.env.ENCRYPTION_KEY!, "hex");

// SECURE: Random nonce generated per encryption operation
function encrypt(plaintext: string): string {
  const nonce = randomBytes(12); // Fresh 96-bit random nonce every time
  const cipher = createCipheriv("aes-256-gcm", ENCRYPTION_KEY, nonce);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  // Prepend nonce and tag to ciphertext for decryption
  return Buffer.concat([nonce, tag, encrypted]).toString("base64");
}

function decrypt(encoded: string): string {
  const data = Buffer.from(encoded, "base64");
  const nonce = data.subarray(0, 12);
  const tag = data.subarray(12, 28);
  const ciphertext = data.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", ENCRYPTION_KEY, nonce);
  decipher.setAuthTag(tag);
  return decipher.update(ciphertext, undefined, "utf8") + decipher.final("utf8");
}
```

## Impact

Nonce reuse in AES-GCM enables full plaintext recovery via XOR of ciphertexts, authentication key (H) recovery enabling arbitrary ciphertext forgery, and replay attacks against encrypted communications. For IoT and physical security systems (as in CVE-2025-61739), this can mean bypassing alarm systems, unlocking doors, and intercepting surveillance data. In web applications, it means full decryption of encrypted user data and session tokens.

## References

- CVE-2025-61739: Johnson Controls PowerG/IQPanel nonce reuse (CVSS 7.2, December 2025)
- CVE-2024-23688: Consensys Discovery same AES/GCM nonce for entire session
- CVE-2024-21530: Rust cocoon crate nonce reuse vulnerability
- CWE-323: Reusing a Nonce, Key Pair in Encryption — https://cwe.mitre.org/data/definitions/323.html
- Elttam: "Attacks on GCM with Repeated Nonces" — https://www.elttam.com/blog/key-recovery-attacks-on-gcm/
- IETF draft-irtf-cfrg-aead-limits: Usage Limits on AEAD Algorithms
- NIST SP 800-38D: Recommendation for GCM Mode
