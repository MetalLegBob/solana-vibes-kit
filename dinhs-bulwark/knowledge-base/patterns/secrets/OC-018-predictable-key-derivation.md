# OC-018: Key Derivation from Predictable Seed

**Category:** Secrets & Credentials
**Severity:** CRITICAL
**Auditors:** SEC-01, CRYPTO-01
**CWE:** CWE-330 (Use of Insufficiently Random Values)
**OWASP:** A02:2021 – Cryptographic Failures

## Description

Deriving cryptographic keys from predictable inputs — timestamps, sequential counters, usernames, low-entropy passwords, or JavaScript's `Math.random()` — produces keys that an attacker can reproduce or brute-force. The entire security of a cryptographic key depends on the entropy (randomness) of its generation. If the seed is predictable, the key is effectively public.

This pattern is particularly dangerous in the blockchain context where keys directly control funds. Historical incidents include the "blockchain bandit" who drained wallets generated from low-entropy private keys (keys like 0x01, 0x02, etc.), and repeated incidents where wallets generated from common brain wallet phrases were drained within seconds of receiving funds. The secp256k1-node vulnerability (GHSA-584q-6j8j-r5pm, 2024) showed how subtle cryptographic implementation flaws can enable key extraction.

In JavaScript, `Math.random()` uses a PRNG (pseudo-random number generator) that is not cryptographically secure — its output can be predicted after observing a small number of values. Node.js's `crypto.randomBytes()` and the Web Crypto API's `getRandomValues()` are the correct sources for key material.

## Detection

```
grep -rn "Math\.random\(\)" --include="*.ts" --include="*.js" | grep -i "key\|seed\|secret\|nonce\|salt"
grep -rn "Date\.now()\|new Date()" --include="*.ts" --include="*.js" | grep -i "seed\|key\|random"
grep -rn "generateKeypair\|createKey\|deriveKey\|fromSeed" --include="*.ts" --include="*.js"
grep -rn "pbkdf2.*password\|scrypt.*password" --include="*.ts" --include="*.js"
```

Look for: key generation using `Math.random()`, seeds based on timestamps, brain wallet implementations using user-chosen phrases, key derivation from short or predictable passwords.

## Vulnerable Code

```typescript
import { Keypair } from "@solana/web3.js";

// VULNERABLE: Key derived from predictable seed
function generateWalletForUser(userId: string): Keypair {
  // Using userId as seed — deterministic and guessable
  const seed = Buffer.alloc(32);
  Buffer.from(userId).copy(seed);
  return Keypair.fromSeed(seed);
}

// VULNERABLE: Math.random for key material
function generateRandomKey(): Uint8Array {
  const key = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    key[i] = Math.floor(Math.random() * 256); // NOT cryptographically secure
  }
  return key;
}

// VULNERABLE: Timestamp-based seed
function generateTimestampKey(): Keypair {
  const seed = Buffer.alloc(32);
  seed.writeBigInt64BE(BigInt(Date.now()), 0);
  return Keypair.fromSeed(seed);
}
```

## Secure Code

```typescript
import { Keypair } from "@solana/web3.js";
import { randomBytes } from "crypto";

// SECURE: Key generated from cryptographically secure random source
function generateWallet(): Keypair {
  // Keypair.generate() uses crypto.randomBytes internally
  return Keypair.generate();
}

// SECURE: If you need to derive from a password, use proper KDF
import { scryptSync } from "crypto";

function deriveFromPassword(password: string): Keypair {
  // Only for password-encrypted wallet files — not for hot wallets
  if (password.length < 16) {
    throw new Error("Password must be at least 16 characters for key derivation");
  }
  const salt = randomBytes(32); // Random salt, stored alongside encrypted key
  const derived = scryptSync(password, salt, 32, {
    N: 2 ** 20, // High work factor
    r: 8,
    p: 1,
  });
  return Keypair.fromSeed(derived);
  // Store salt separately for future derivation
}

// SECURE: Explicit use of crypto.randomBytes for any random key material
function generateSecureRandom(length: number): Uint8Array {
  return new Uint8Array(randomBytes(length));
}
```

## Impact

Keys derived from predictable seeds can be reproduced by an attacker who identifies or guesses the derivation method. This enables: wallet draining (if the attacker derives the same key), impersonation, and unauthorized signing. Attacks can be performed offline — the attacker brute-forces the seed space locally, then checks the blockchain for associated balances. The "blockchain bandit" demonstrated this by draining hundreds of wallets generated from weak keys.

## References

- GHSA-584q-6j8j-r5pm: secp256k1-node private key extraction (October 2024)
- "Blockchain Bandit": Systematic draining of wallets with weak/predictable keys
- CWE-330: Use of Insufficiently Random Values — https://cwe.mitre.org/data/definitions/330.html
- NIST SP 800-90A: Recommendation for Random Number Generation
- OWASP Cryptographic Failures: Weak key generation
