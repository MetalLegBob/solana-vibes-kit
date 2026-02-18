# OC-013: Key Material Not Zeroized After Use

**Category:** Secrets & Credentials
**Severity:** MEDIUM
**Auditors:** SEC-01
**CWE:** CWE-244 (Improper Clearing of Heap Memory Before Release)
**OWASP:** A02:2021 – Cryptographic Failures

## Description

When cryptographic key material (private keys, seeds, mnemonics) is loaded into memory for signing operations, it should be explicitly cleared (zeroized) after use. In JavaScript/TypeScript, this is particularly challenging because garbage collection is non-deterministic, strings are immutable (cannot be overwritten in place), and Buffer/Uint8Array contents may be copied during operations.

Failure to zeroize means sensitive key material persists in memory longer than necessary, increasing exposure to memory dumps, heap inspection (via Chrome DevTools or core dumps), and cold boot attacks on servers. The secp256k1-node library vulnerability (GHSA-584q-6j8j-r5pm, October 2024) demonstrated how cryptographic key material can be extracted through side channels when key operations are improperly handled.

While JavaScript's runtime makes true zeroization difficult, best-effort clearing of typed arrays and buffers significantly reduces the attack window compared to leaving key material indefinitely in memory.

## Detection

```
grep -rn "fromSecretKey\|fromSeed\|mnemonicToSeed\|privateKey" --include="*.ts" --include="*.js"
grep -rn "\.fill(0)\|\.fill(0x00)\|zeroize\|wipe\|clear.*key" --include="*.ts" --include="*.js"
```

Look for: secret key loading without corresponding cleanup, keypair variables with module-level scope (never garbage collected), Buffer.from() on key material without subsequent Buffer.fill(0).

## Vulnerable Code

```typescript
import { Keypair, Transaction } from "@solana/web3.js";
import { readFileSync } from "fs";

// VULNERABLE: Key material persists in multiple variables indefinitely
async function signTransaction(tx: Transaction): Promise<Transaction> {
  const keyData = JSON.parse(readFileSync("/keys/signer.json", "utf-8"));
  const secretKey = Uint8Array.from(keyData);
  const keypair = Keypair.fromSecretKey(secretKey);

  tx.sign(keypair);
  return tx;
  // keyData, secretKey, and keypair.secretKey all remain in memory
  // until garbage collected at an unpredictable time
}
```

## Secure Code

```typescript
import { Keypair, Transaction } from "@solana/web3.js";
import { readFileSync } from "fs";

async function signTransaction(tx: Transaction): Promise<Transaction> {
  // Load key into typed array for controlled cleanup
  const rawKey = readFileSync("/keys/signer.json");
  const keyData: number[] = JSON.parse(rawKey.toString("utf-8"));
  const secretKey = new Uint8Array(keyData);
  const keypair = Keypair.fromSecretKey(secretKey);

  try {
    tx.sign(keypair);
    return tx;
  } finally {
    // Best-effort zeroization of typed arrays
    secretKey.fill(0);
    keyData.fill(0);
    // Note: keypair.secretKey is a Uint8Array — zero it too
    keypair.secretKey.fill(0);
    // rawKey is a Buffer — zero it
    rawKey.fill(0);
  }
}

// For long-running services, consider a signing service pattern
// where key material is loaded once into a restricted memory space
// and signing requests are made via IPC
```

## Impact

Unzeroized key material in memory can be extracted through heap dumps, core dumps, process memory inspection, or debugging tools. In a server compromise scenario, an attacker with process read access can scan memory for key patterns. In Node.js, heap snapshots taken for performance profiling may contain key material. While this is a lower-severity issue than hardcoded keys, it extends the window of vulnerability after a signing operation completes.

## References

- GHSA-584q-6j8j-r5pm: secp256k1-node private key extraction vulnerability (October 2024)
- CWE-244: Improper Clearing of Heap Memory — https://cwe.mitre.org/data/definitions/244.html
- OWASP Cryptographic Storage Cheat Sheet: memory cleanup recommendations
- NIST SP 800-57: Key Management — key destruction requirements
