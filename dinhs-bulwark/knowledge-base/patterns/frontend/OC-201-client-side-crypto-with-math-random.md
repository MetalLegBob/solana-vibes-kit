# OC-201: Client-Side Crypto with Math.random

**Category:** Frontend & Client
**Severity:** HIGH
**Auditors:** FE-01, CRYPTO-01
**CWE:** CWE-338
**OWASP:** A02:2021 - Cryptographic Failures

## Description

`Math.random()` is a pseudorandom number generator (PRNG) that is not cryptographically secure. Its output is deterministic given the seed, and modern browser implementations (V8's xorshift128+) can be reversed from a small number of observed outputs. Despite this, developers frequently use `Math.random()` for security-sensitive operations: generating nonces, creating session identifiers, producing wallet derivation paths, constructing challenge strings, or generating one-time codes.

In the context of Solana dApp frontends, `Math.random()` is particularly dangerous when used for generating nonces in Sign-In With Solana (SIWS) flows, creating unique identifiers for transactions, generating salt values for client-side encryption, or producing any value that an attacker could predict. An attacker who can observe a few outputs of `Math.random()` (e.g., from publicly visible random values in the UI) can predict all future outputs and all recent past outputs.

The Web Crypto API (`crypto.getRandomValues()`) provides cryptographically secure random numbers and is available in all modern browsers and React Native environments. There is no performance justification for using `Math.random()` in security contexts.

## Detection

```
# Math.random used in security contexts
grep -rn "Math\.random" --include="*.ts" --include="*.tsx" --include="*.js"

# Specific dangerous patterns
grep -rn "Math\.random.*nonce\|Math\.random.*token\|Math\.random.*secret\|Math\.random.*salt\|Math\.random.*key\|Math\.random.*id\|Math\.random.*session" -i --include="*.ts" --include="*.tsx"

# UUID generation without crypto
grep -rn "Math\.random.*toString(36)\|Math\.random.*toString(16)" --include="*.ts" --include="*.tsx"

# Check for secure alternatives (positive signal)
grep -rn "crypto\.getRandomValues\|crypto\.randomUUID\|randomBytes\|nanoid" --include="*.ts" --include="*.tsx"
```

## Vulnerable Code

```typescript
// Solana dApp using Math.random for security-sensitive operations
import { useWallet } from '@solana/wallet-adapter-react';

// VULNERABLE: Predictable nonce for SIWS
function generateNonce(): string {
  return Math.random().toString(36).substring(2, 15) +
         Math.random().toString(36).substring(2, 15);
}

// VULNERABLE: Predictable session ID
function createSessionId(): string {
  return 'sess_' + Math.random().toString(16).slice(2);
}

// VULNERABLE: Predictable CSRF token
function generateCsrfToken(): string {
  return Array.from({ length: 32 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
}

async function signInWithSolana(signMessage: SignMessageFn) {
  const nonce = generateNonce(); // Predictable!
  const message = `Sign in to MyDApp\nNonce: ${nonce}`;
  // Attacker can predict nonce and craft replay attacks
}
```

## Secure Code

```typescript
// Using Web Crypto API for all security-sensitive random values
function generateNonce(): string {
  const buffer = new Uint8Array(32);
  crypto.getRandomValues(buffer);
  return Array.from(buffer, (b) => b.toString(16).padStart(2, '0')).join('');
}

function createSessionId(): string {
  return 'sess_' + crypto.randomUUID();
}

function generateCsrfToken(): string {
  const buffer = new Uint8Array(32);
  crypto.getRandomValues(buffer);
  return Array.from(buffer, (b) => b.toString(16).padStart(2, '0')).join('');
}

async function signInWithSolana(signMessage: SignMessageFn) {
  const nonce = generateNonce(); // Cryptographically secure
  const message = `Sign in to MyDApp\nNonce: ${nonce}\nIssued At: ${new Date().toISOString()}`;
  // Nonce is unpredictable, replay attacks are prevented
}
```

## Impact

An attacker who can observe outputs of `Math.random()` (e.g., from any random-looking values in the page's HTML, network responses, or timing) can reconstruct the PRNG state and predict all past and future values. This enables: predicting SIWS nonces (replay attacks), forging CSRF tokens, guessing session identifiers, and predicting any client-generated random value. In crypto contexts, predictable randomness can lead directly to key compromise or transaction replay.

## References

- CWE-338: Use of Cryptographically Weak Pseudo-Random Number Generator (PRNG)
- OWASP: Insecure Randomness
- V8 Blog: "Math.random() implementation details" -- xorshift128+ is reversible
- MDN: crypto.getRandomValues() -- the secure alternative
- OWASP ASVS V6.2: Cryptographic Random Number Generation
