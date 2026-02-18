# OC-290: Weak Random Seed

**Category:** Cryptographic Operations
**Severity:** HIGH
**Auditors:** CRYPTO-01
**CWE:** CWE-335 (Incorrect Usage of Seeds in Pseudo-Random Number Generator)
**OWASP:** A02:2021 – Cryptographic Failures

## Description

A pseudo-random number generator (PRNG) is only as strong as its seed. If the seed is predictable, hardcoded, derived from a low-entropy source (such as `Date.now()`, process PID, or a short string), or reused across instances, then the entire output sequence is predictable. This applies to both application-level PRNGs and cases where developers manually seed cryptographic functions with weak input.

CVE-2022-39218 in Fastly's Compute@Edge JS runtime is a textbook example: the initial seed for the PRNG was baked into the compiled WebAssembly module at build time. Every execution of the module produced the identical sequence of "random" values, making all tokens, nonces, and cryptographic operations deterministic and exploitable. The vulnerability affected both `Math.random()` and `crypto.getRandomValues()`, demonstrating that even nominally secure APIs can fail when the underlying entropy source is compromised.

A common pattern in Node.js applications is seeding a userland PRNG (such as `seedrandom` or a custom linear congruential generator) with `Date.now()` or a fixed string for "reproducibility." When these seeded PRNGs are inadvertently used for security-sensitive operations, the output is trivially predictable. Even using `process.pid` (typically 1-65535) as a seed provides only ~16 bits of entropy, far below the 128+ bits required for cryptographic security.

## Detection

```
grep -rn "seed.*Date\.now\|seed.*process\.pid" --include="*.ts" --include="*.js"
grep -rn "seedrandom\|mersenne-twister\|prng" --include="*.ts" --include="*.js"
grep -rn "new Random\|createRng\|initRandom" --include="*.ts" --include="*.js"
grep -rn "seed\s*[:=]\s*['\"]" --include="*.ts" --include="*.js"
grep -rn "seed\s*[:=]\s*\d" --include="*.ts" --include="*.js"
grep -rn "srand\|setSeed\|randomSeed" --include="*.ts" --include="*.js"
```

Look for: imported PRNG libraries, manual seeding of any random generator, fixed string or numeric seeds, seeds derived from time or PID.

## Vulnerable Code

```typescript
import seedrandom from "seedrandom";

// VULNERABLE: Time-based seed — predictable within milliseconds
const rng = seedrandom(Date.now().toString());

function generateToken(): string {
  let token = "";
  for (let i = 0; i < 32; i++) {
    token += Math.floor(rng() * 16).toString(16);
  }
  return token;
}

// VULNERABLE: Hardcoded seed — deterministic output
const deterministicRng = seedrandom("my-app-secret-seed");

function generateInviteCode(): string {
  return Math.floor(deterministicRng() * 1000000).toString().padStart(6, "0");
}

// VULNERABLE: PID-based seed — only ~16 bits of entropy
function initializeRng(): () => number {
  const seed = process.pid * Date.now();
  return seedrandom(seed.toString());
}
```

## Secure Code

```typescript
import { randomBytes, randomInt } from "crypto";

// SECURE: OS-level entropy via crypto.randomBytes
function generateToken(): string {
  return randomBytes(32).toString("hex"); // 256 bits from OS CSPRNG
}

// SECURE: crypto.randomInt for bounded random values
function generateInviteCode(): string {
  return randomInt(100000, 999999).toString();
}

// SECURE: If a seeded PRNG is needed for non-security use (simulations),
// keep it entirely separate from security-sensitive code paths
import seedrandom from "seedrandom";

const simulationRng = seedrandom("deterministic-for-testing");
// NEVER use simulationRng for tokens, keys, nonces, or identifiers
```

## Impact

Weak seeding reduces the effective entropy of all generated values. An attacker can reconstruct the PRNG state from observed outputs and predict all past and future values. This enables session hijacking, token forgery, nonce prediction (leading to encryption breaks), and API key enumeration. In the Fastly case, all cryptographic operations on the platform were deterministic, meaning encryption provided no actual security.

## References

- CVE-2022-39218: Fastly Compute@Edge baked-in PRNG seed — https://nvd.nist.gov/vuln/detail/CVE-2022-39218
- CWE-335: Incorrect Usage of Seeds in PRNG — https://cwe.mitre.org/data/definitions/335.html
- CWE-336: Same Seed in PRNG — https://cwe.mitre.org/data/definitions/336.html
- OWASP A02:2021 – Cryptographic Failures
- NIST SP 800-90A: Recommendation for Random Number Generation Using Deterministic RBGs
