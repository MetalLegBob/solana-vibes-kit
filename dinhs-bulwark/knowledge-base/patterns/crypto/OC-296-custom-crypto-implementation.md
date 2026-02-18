# OC-296: Custom Crypto Implementation

**Category:** Cryptographic Operations
**Severity:** HIGH
**Auditors:** CRYPTO-01
**CWE:** CWE-327 (Use of a Broken or Risky Cryptographic Algorithm)
**OWASP:** A02:2021 – Cryptographic Failures

## Description

"Don't roll your own crypto" is the most fundamental rule of applied cryptography. Custom cryptographic implementations — whether handwritten encryption algorithms, custom key exchange protocols, XOR-based "encryption," homegrown hash functions, or novel combinations of existing primitives — almost invariably contain fatal flaws. Professional cryptographers spend years designing and analyzing algorithms that undergo extensive peer review before standardization. A developer implementing their own scheme cannot match this rigor.

The Zerologon vulnerability (CVE-2020-1472, CVSS 10.0) is the canonical example. Microsoft's Netlogon protocol used a custom cryptographic scheme: AES-CFB8 with an all-zero IV, which violates a fundamental rule of the algorithm. This meant that for 1 in 256 random computer account passwords, the authentication challenge could be bypassed entirely with a zero-filled client credential. The flaw allowed unauthenticated attackers to become domain administrators within seconds — a direct consequence of rolling custom cryptography instead of using standard protocols.

Blessing, Specter, and Weitzner's 2021 study "You Really Shouldn't Roll Your Own Crypto" (published at ACM CCS 2024 as "Cryptography in the Wild") analyzed 4,000+ CVEs in cryptographic libraries and found that implementation bugs — not algorithm weaknesses — account for the majority of real-world cryptographic failures. The most common categories were incorrect parameter handling, misuse of APIs, and custom protocol design. Even experienced library maintainers make these mistakes; application developers working without cryptographic expertise face far greater risk.

## Detection

```
grep -rn "xor.*encrypt\|encrypt.*xor\|XOR" --include="*.ts" --include="*.js"
grep -rn "charCodeAt.*encrypt\|encrypt.*charCodeAt" --include="*.ts" --include="*.js"
grep -rn "function.*encrypt\|function.*decrypt\|function.*hash" --include="*.ts" --include="*.js"
grep -rn "caesar\|rot13\|ROT13\|vigenere\|base64.*encrypt" --include="*.ts" --include="*.js"
grep -rn "custom.*cipher\|homemade.*crypt\|my.*encrypt" --include="*.ts" --include="*.js"
grep -rn "atob.*decrypt\|btoa.*encrypt" --include="*.ts" --include="*.js"
```

Manual review flag: any encryption or hashing function that does not directly call an established library's API (`crypto`, `sodium`, `@noble/ciphers`). Pay special attention to "obfuscation" functions marketed as "encryption."

## Vulnerable Code

```typescript
// VULNERABLE: XOR "encryption" — trivially reversible, leaks key length
function xorEncrypt(plaintext: string, key: string): string {
  let result = "";
  for (let i = 0; i < plaintext.length; i++) {
    result += String.fromCharCode(
      plaintext.charCodeAt(i) ^ key.charCodeAt(i % key.length)
    );
  }
  return Buffer.from(result, "binary").toString("base64");
}

// VULNERABLE: Base64 is encoding, not encryption
function "encrypt"Data(data: string): string {
  return Buffer.from(data).toString("base64");
}

// VULNERABLE: Custom hash function — no collision resistance analysis
function customHash(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) - hash + input.charCodeAt(i)) | 0;
  }
  return hash.toString(16);
}

// VULNERABLE: Custom "HMAC" without proper construction
function customMac(message: string, key: string): string {
  return createHash("sha256").update(key + message).digest("hex");
  // Vulnerable to length extension attacks — not a real HMAC
}
```

## Secure Code

```typescript
import {
  createCipheriv, createDecipheriv, createHmac,
  randomBytes, scryptSync
} from "crypto";

// SECURE: Standard AES-256-GCM from Node.js crypto module
function encrypt(plaintext: string, key: Buffer): string {
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, nonce);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([nonce, tag, encrypted]).toString("base64");
}

// SECURE: Standard HMAC construction
function createMac(message: string, key: Buffer): string {
  return createHmac("sha256", key).update(message).digest("hex");
}

// SECURE: Key derivation using standard scrypt
function deriveKey(password: string): { key: Buffer; salt: Buffer } {
  const salt = randomBytes(32);
  const key = scryptSync(password, salt, 32, { N: 16384, r: 8, p: 1 });
  return { key, salt };
}
```

## Impact

Custom cryptographic implementations typically fail in predictable ways: XOR ciphers leak the key via known-plaintext attacks, Base64 "encryption" provides zero confidentiality, custom hash functions lack collision and preimage resistance, and ad-hoc MAC constructions are vulnerable to length extension or forgery. The Zerologon attack (CVE-2020-1472) led to complete Active Directory domain compromise in seconds. Custom crypto gives a false sense of security while providing little or none.

## References

- CVE-2020-1472: Zerologon — custom AES-CFB8 usage with zero IV (CVSS 10.0)
- Blessing, Specter, Weitzner: "You Really Shouldn't Roll Your Own Crypto" (arXiv:2107.04940, ACM CCS 2024)
- CWE-327: Use of a Broken or Risky Cryptographic Algorithm — https://cwe.mitre.org/data/definitions/327.html
- OWASP A02:2021 – Cryptographic Failures
- Schneier's Law: "Anyone can invent a security system so clever that they can't think of how to break it"
- NIST Cryptographic Standards and Guidelines — https://csrc.nist.gov/projects/cryptographic-standards-and-guidelines
