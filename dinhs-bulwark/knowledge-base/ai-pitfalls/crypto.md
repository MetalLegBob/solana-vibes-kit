# AI-Generated Code Pitfalls: Cryptographic Operations
<!-- Domain: crypto -->
<!-- Relevant auditors: CRYPTO-01 -->

## Overview

Cryptographic operations are one of the most consistently dangerous areas for AI-generated code. LLMs reproduce patterns from tutorials, Stack Overflow answers, and documentation examples that prioritize simplicity and readability over security. The result is code that encrypts, hashes, and signs data in ways that appear functional but are cryptographically broken. AI generators default to `Math.random()` for randomness, choose ECB mode because it requires no IV, use MD5 because it is the most commonly referenced hash, hardcode keys and IVs as example values, and skip authentication because AEAD adds complexity. These patterns are especially dangerous because they produce code that runs without errors and passes basic tests — the cryptographic weakness is silent until exploited.

## Pitfalls

### AIP-149: Math.random() for Token and Secret Generation
**Frequency:** Very Frequent
**Why AI does this:** `Math.random()` is the first randomness function every JavaScript tutorial teaches. When asked to "generate a random token" or "create a unique ID," AI reaches for the familiar pattern. The code produces values that look random, pass uniqueness tests in development, and work correctly — the cryptographic weakness is invisible without specific knowledge.
**What to look for:**
- `Math.random()` near token, key, secret, nonce, salt, session, or id generation
- `Math.random().toString(36).substring(2)` — the classic "random string" one-liner
- `Math.floor(Math.random() * ...)` in any security-sensitive context

**Vulnerable (AI-generated):**
```typescript
function generateApiKey(): string {
  return 'ak_' + Math.random().toString(36).substring(2) +
         Math.random().toString(36).substring(2);
}
```

**Secure (corrected):**
```typescript
import { randomBytes } from 'crypto';
function generateApiKey(): string {
  return 'ak_' + randomBytes(24).toString('base64url');
}
```

---

### AIP-150: Static or Hardcoded Initialization Vectors
**Frequency:** Frequent
**Why AI does this:** AI generates complete, self-contained examples with all values filled in. IVs and nonces are represented as hex string literals or zero-filled buffers because the code needs to compile and run. Developers copy the example and replace the key (because that is obviously sensitive) but leave the IV unchanged because it appears to be a configuration constant rather than a security-critical random value.
**What to look for:**
- `const iv = Buffer.from('...')` with a hardcoded hex or string value
- `const iv = Buffer.alloc(16)` (zero-filled buffer)
- IV/nonce defined as a module-level constant rather than generated per encryption
- Same IV variable used across multiple `createCipheriv()` calls

**Vulnerable (AI-generated):**
```typescript
const iv = Buffer.from('0123456789abcdef0123456789abcdef', 'hex');
function encrypt(text: string, key: Buffer): string {
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  return cipher.update(text, 'utf8', 'hex') + cipher.final('hex');
}
```

**Secure (corrected):**
```typescript
function encrypt(text: string, key: Buffer): string {
  const iv = crypto.randomBytes(16); // Fresh IV per encryption
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  const encrypted = cipher.update(text, 'utf8', 'hex') + cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted; // Prepend IV for decryption
}
```

---

### AIP-151: AES-ECB Mode as Default Choice
**Frequency:** Common
**Why AI does this:** ECB mode is the simplest AES mode — it requires no IV, no authentication tag, and no additional state. When AI generates "encrypt this data with AES" without specific mode instructions, it sometimes defaults to ECB because tutorials on AES fundamentals often start with ECB to explain block cipher basics. The code is shorter and "cleaner" without IV management.
**What to look for:**
- `aes-256-ecb`, `aes-128-ecb` in `createCipheriv()` calls
- `createCipheriv()` with `null` as the IV parameter
- `crypto.createCipher()` (deprecated API, no IV support)
- Missing `getAuthTag()` / `setAuthTag()` calls (no authentication)

**Vulnerable (AI-generated):**
```typescript
const cipher = crypto.createCipheriv('aes-256-ecb', key, null);
const encrypted = cipher.update(data, 'utf8', 'hex') + cipher.final('hex');
```

**Secure (corrected):**
```typescript
const nonce = crypto.randomBytes(12);
const cipher = crypto.createCipheriv('aes-256-gcm', key, nonce);
const encrypted = Buffer.concat([cipher.update(data, 'utf8'), cipher.final()]);
const tag = cipher.getAuthTag();
// Store nonce + tag + ciphertext together
```

---

### AIP-152: MD5 or SHA-1 for Password Hashing
**Frequency:** Common
**Why AI does this:** When asked to "hash a password," AI interprets the word "hash" literally and uses general-purpose hash functions. MD5 is the most-referenced hash algorithm in programming literature, and `crypto.createHash('md5')` is a one-liner. SHA-256 is also frequently suggested as an "upgrade" — but it is equally unsuitable for passwords because it is designed to be fast.
**What to look for:**
- `createHash('md5')` or `createHash('sha1')` near password variables
- `createHash('sha256').update(password)` — the "improved but still wrong" pattern
- Any password hashing without a salt parameter
- Password hashing without an iteration count or cost factor

**Vulnerable (AI-generated):**
```typescript
const hashedPassword = crypto.createHash('md5').update(password).digest('hex');
```

**Secure (corrected):**
```typescript
import { hash } from 'argon2';
const hashedPassword = await hash(password, {
  type: 2, memoryCost: 65536, timeCost: 3, parallelism: 4
});
```

---

### AIP-153: Encryption Without Authentication (CBC/CTR Without HMAC)
**Frequency:** Frequent
**Why AI does this:** AES-CBC is the mode most commonly shown in Node.js tutorials and Stack Overflow answers. AI generates CBC encryption because it has the most training examples. Adding HMAC-based authentication (encrypt-then-MAC) is an extra step that makes the code more complex, so AI omits it. The code encrypts and decrypts correctly without authentication — the vulnerability is only apparent to someone who understands padding oracle attacks.
**What to look for:**
- `aes-256-cbc` or `aes-256-ctr` without accompanying HMAC computation
- Decrypt functions that do not verify any MAC or authentication tag before decryption
- Missing `getAuthTag()` / `setAuthTag()` (indicates non-AEAD mode)

**Vulnerable (AI-generated):**
```typescript
function encrypt(text: string, key: Buffer): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  return iv.toString('hex') + cipher.update(text, 'utf8', 'hex') + cipher.final('hex');
}
```

**Secure (corrected):**
```typescript
function encrypt(text: string, key: Buffer): string {
  const nonce = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, nonce);
  const enc = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([nonce, tag, enc]).toString('base64');
}
```

---

### AIP-154: Hardcoded Encryption Keys in Example Code
**Frequency:** Very Frequent
**Why AI does this:** AI generates complete, runnable examples with all values filled in. Keys are represented as readable strings like `'my-secret-key-32-characters-long'` or hex literals. These look like placeholder values but are often left in code because they work — the application encrypts and decrypts with the hardcoded key, so no error occurs. The key is then committed to version control.
**What to look for:**
- `const key = 'my-secret-key...'` or similar readable string as encryption key
- `const key = Buffer.from('0123456789...')` with obviously non-random hex values
- Encryption keys defined as string literals rather than loaded from environment
- Keys stored alongside the code they protect

**Vulnerable (AI-generated):**
```typescript
const ENCRYPTION_KEY = 'my-super-secret-encryption-key!!'; // 32 chars for AES-256
const KEY_BUFFER = Buffer.from(ENCRYPTION_KEY, 'utf8');
```

**Secure (corrected):**
```typescript
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
if (!ENCRYPTION_KEY || Buffer.from(ENCRYPTION_KEY, 'hex').length !== 32) {
  throw new Error('ENCRYPTION_KEY must be a 64-char hex string (256 bits)');
}
const KEY_BUFFER = Buffer.from(ENCRYPTION_KEY, 'hex');
```

---

### AIP-155: String Equality for HMAC/Token Comparison
**Frequency:** Common
**Why AI does this:** JavaScript's `===` operator is the standard way to compare values. AI uses it everywhere because it is correct for most comparisons. When generating webhook signature verification or token comparison code, AI does not distinguish between regular equality and constant-time equality because the functional result is the same — the timing side-channel is an invisible concern that does not affect test outcomes.
**What to look for:**
- `expectedSignature === providedSignature` or `token === storedToken`
- HMAC `.digest('hex') === signature` comparisons
- Missing `crypto.timingSafeEqual()` in any secret comparison
- `Buffer.equals()` used for secret comparison (not guaranteed constant-time in all environments)

**Vulnerable (AI-generated):**
```typescript
const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
if (expected === req.headers['x-signature']) {
  // Process webhook
}
```

**Secure (corrected):**
```typescript
const expected = crypto.createHmac('sha256', secret).update(payload).digest();
const provided = Buffer.from(req.headers['x-signature'] as string, 'hex');
if (expected.length === provided.length && crypto.timingSafeEqual(expected, provided)) {
  // Process webhook
}
```

---

### AIP-156: UUID v1 for Security-Sensitive Identifiers
**Frequency:** Occasional
**Why AI does this:** When asked to generate unique identifiers, AI sometimes imports `uuid` and uses `v1()` because v1 appears first in documentation and is "version 1" — which sounds like the default. AI does not distinguish between uniqueness (which v1 provides) and unpredictability (which v1 does not provide). For non-security uses like database primary keys, v1 is fine, but AI uses the same pattern for password reset tokens and session IDs.
**What to look for:**
- `uuid.v1()` or `uuidv1()` in token generation, password reset, or session creation
- `import { v1 } from 'uuid'` in authentication or security modules
- UUID v1 values used as bearer tokens or API keys

**Vulnerable (AI-generated):**
```typescript
import { v1 as uuidv1 } from 'uuid';
const resetToken = uuidv1(); // Timestamp + MAC address — predictable
await sendResetEmail(user.email, resetToken);
```

**Secure (corrected):**
```typescript
import { randomBytes } from 'crypto';
const resetToken = randomBytes(32).toString('base64url');
await sendResetEmail(user.email, resetToken);
```

---

### AIP-157: PBKDF2 with Low Iteration Count from Outdated Examples
**Frequency:** Common
**Why AI does this:** AI training data includes years of Stack Overflow answers and blog posts recommending 1,000, 10,000, or 100,000 PBKDF2 iterations — values that were adequate when written but are dangerously insufficient in 2025. AI reproduces the iteration count from its most-seen examples rather than applying current OWASP guidance (600,000 minimum for PBKDF2-HMAC-SHA256).
**What to look for:**
- `pbkdf2Sync(password, salt, N, ...)` where N < 600,000
- Iteration counts that are round numbers from outdated recommendations (1000, 10000, 100000)
- Comments like "// 100,000 iterations is secure" (was true in 2015, not in 2025)

**Vulnerable (AI-generated):**
```typescript
const key = crypto.pbkdf2Sync(password, salt, 10000, 32, 'sha256');
```

**Secure (corrected):**
```typescript
const key = crypto.pbkdf2Sync(password, salt, 600000, 32, 'sha256');
// Or better: use Argon2id or scrypt instead of PBKDF2
```

---

### AIP-158: Base64 Encoding Treated as Encryption
**Frequency:** Occasional
**Why AI does this:** When asked to "encrypt" or "protect" data in quick utility functions, AI sometimes generates Base64 encoding and labels it as encryption. The function name says "encrypt" but the body is `Buffer.from(data).toString('base64')`. This is especially common when AI generates client-side "encryption" where no crypto library is available. The code obscures data from casual inspection but provides zero cryptographic protection.
**What to look for:**
- Functions named `encrypt`/`decrypt` that use only `btoa`/`atob` or `Buffer.toString('base64')`
- `Buffer.from(data, 'base64')` presented as "decryption"
- Comments claiming Base64 "encrypts" or "secures" data
- ROT13 or character shifting presented as encryption

**Vulnerable (AI-generated):**
```typescript
function encryptSensitiveData(data: string): string {
  return Buffer.from(data).toString('base64'); // This is encoding, not encryption
}
function decryptSensitiveData(encoded: string): string {
  return Buffer.from(encoded, 'base64').toString('utf8');
}
```

**Secure (corrected):**
```typescript
import { createCipheriv, randomBytes } from 'crypto';
function encryptSensitiveData(data: string, key: Buffer): string {
  const nonce = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, nonce);
  const encrypted = Buffer.concat([cipher.update(data, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([nonce, tag, encrypted]).toString('base64');
}
```
