# OC-179: IV/Nonce Reuse in Encryption

**Category:** Data Security
**Severity:** HIGH
**Auditors:** DATA-05
**CWE:** CWE-323 (Reusing a Nonce, Key Pair in Encryption)
**OWASP:** A02:2021 – Cryptographic Failures

## Description

Reusing an initialization vector (IV) or nonce with the same encryption key is a critical cryptographic failure that can completely compromise the confidentiality of encrypted data. The severity depends on the cipher mode: for AES-GCM, nonce reuse enables an attacker to recover the authentication key and forge ciphertexts (catastrophic failure). For AES-CBC, IV reuse enables detection of common plaintext prefixes. For AES-CTR, nonce reuse enables XOR of two ciphertexts to recover plaintext (equivalent to a two-time pad).

CVE-2021-22170 (GitLab 11.6+) demonstrated real-world impact: nonce reuse in GitLab's database encryption allowed an attacker with database access to decrypt encrypted content. The vulnerability affected all encrypted attributes stored in GitLab's database, and was disclosed as exploitable "assuming a database breach."

Nonce reuse commonly occurs when: IVs are generated from a counter that wraps around, IVs are derived from deterministic input (timestamps, record IDs), the application uses a static IV (see OC-178), or a random nonce generator uses insufficient entropy. For AES-GCM with 96-bit nonces, the birthday bound collision probability reaches 50% after approximately 2^48 encryptions with the same key — but deterministic nonce generation or low-entropy randomness reaches collision far sooner.

## Detection

```
grep -rn "createCipheriv\|randomBytes\|randomFill" --include="*.ts" --include="*.js"
grep -rn "iv\s*=\|nonce\s*=\|IV\s*=" --include="*.ts" --include="*.js"
grep -rn "Buffer\.alloc\|Buffer\.from\|new Uint8Array" --include="*.ts" --include="*.js"
grep -rn "counter\|sequence\|increment" --include="*.ts" --include="*.js"
```

Look for: IV/nonce variables set outside the encrypt function (shared state), IVs derived from timestamps or sequential counters, `Buffer.alloc()` or `Buffer.from("static")` for IV initialization, absence of `crypto.randomBytes()` in the encryption path.

## Vulnerable Code

```typescript
import crypto from "crypto";

const key = Buffer.from(process.env.ENCRYPTION_KEY!, "hex");

// VULNERABLE: Counter-based nonce that can overflow/reset
let nonceCounter = 0;
function encryptWithCounter(data: string): string {
  const nonce = Buffer.alloc(12);
  nonce.writeUInt32BE(nonceCounter++, 8);
  // Server restart resets counter → nonce reuse!
  const cipher = crypto.createCipheriv("aes-256-gcm", key, nonce);
  const enc = cipher.update(data, "utf8", "hex") + cipher.final("hex");
  return nonce.toString("hex") + cipher.getAuthTag().toString("hex") + enc;
}

// VULNERABLE: Nonce derived from timestamp (collisions at high throughput)
function encryptWithTimestamp(data: string): string {
  const nonce = Buffer.alloc(12);
  const now = Date.now();
  nonce.writeBigInt64BE(BigInt(now), 4);
  // Multiple encryptions in same millisecond → nonce reuse!
  const cipher = crypto.createCipheriv("aes-256-gcm", key, nonce);
  return cipher.update(data, "utf8", "hex") + cipher.final("hex");
}

// VULNERABLE: Static nonce (see also OC-178)
const NONCE = Buffer.from("000000000000", "hex");
```

## Secure Code

```typescript
import crypto from "crypto";

const key = Buffer.from(process.env.ENCRYPTION_KEY!, "hex");

// SECURE: Fresh random nonce for every encryption
function encrypt(plaintext: string): string {
  // 96-bit random nonce — safe for up to ~2^32 encryptions per key
  const nonce = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, nonce);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return `${nonce.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

// For very high-volume encryption, use AES-256-GCM-SIV (nonce-misuse resistant)
// or implement key rotation to keep per-key encryption count low

// SECURE: Key rotation to mitigate birthday bound
const KEY_ROTATION_INTERVAL = 2 ** 30; // Rotate well before 2^32 operations
let encryptionCount = 0;

function encryptWithRotation(plaintext: string): string {
  if (encryptionCount >= KEY_ROTATION_INTERVAL) {
    rotateEncryptionKey(); // Application-specific key rotation
    encryptionCount = 0;
  }
  encryptionCount++;
  return encrypt(plaintext);
}
```

## Impact

AES-GCM nonce reuse allows an attacker to recover the authentication key, forge arbitrary ciphertexts, and decrypt messages (via the Joux "forbidden attack"). AES-CTR nonce reuse produces a two-time pad enabling plaintext recovery via XOR analysis. AES-CBC IV reuse leaks information about common plaintext prefixes. In all cases, the encryption is effectively broken for any pair of messages encrypted with the same key/nonce combination.

## References

- CVE-2021-22170: GitLab nonce reuse enabling decryption of database-encrypted content
- CWE-323: Reusing a Nonce, Key Pair in Encryption — https://cwe.mitre.org/data/definitions/323.html
- OWASP A02:2021 – Cryptographic Failures
- NIST SP 800-38D: AES-GCM nonce requirements
- Joux (2006): "Authentication Failures in NIST GCM"
