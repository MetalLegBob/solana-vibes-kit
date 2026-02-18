# OC-126: Commitment Level Mismatch Between Read and Act

**Category:** Blockchain Interaction
**Severity:** HIGH
**Auditors:** CHAIN-04
**CWE:** CWE-367 (Time-of-check Time-of-use Race Condition)
**OWASP:** N/A — Blockchain-specific

## Description

A commitment level mismatch occurs when a Solana application reads blockchain state at one commitment level but makes decisions or takes actions based on a different commitment level. For example, reading a balance at `processed` commitment (fast but potentially rolled back) and then sending a withdrawal at `finalized` commitment creates a TOCTOU (time-of-check, time-of-use) vulnerability.

This is a subtle bug because Solana's three commitment levels (`processed`, `confirmed`, `finalized`) represent fundamentally different guarantees about data finality. Code that reads state at `processed` level sees the most recent data, but that data may not persist. If the application acts on that data assuming finality, it can release value for transactions that are later rolled back.

Common mismatches include: the `Connection` object's default commitment set to `processed` while individual RPC calls assume `confirmed`, a balance check at `confirmed` followed by a withdrawal authorization verified at `processed`, or event subscriptions at `confirmed` feeding a database that is queried with `finalized` consistency assumptions.

## Detection

```
grep -rn "commitment" --include="*.ts" --include="*.js"
grep -rn "new Connection(" --include="*.ts" --include="*.js" -A 3
grep -rn "'processed'\|'confirmed'\|'finalized'" --include="*.ts" --include="*.js"
```

Look for: mixed commitment levels in the same workflow, `Connection` default commitment different from explicit RPC call commitment, balance/state checks at lower commitment than the operations they gate.

## Vulnerable Code

```typescript
import { Connection, PublicKey } from "@solana/web3.js";

// VULNERABLE: Reads at "processed" but acts as if data is finalized
const connection = new Connection("https://rpc.example.com", "processed");

async function processWithdrawal(userPubkey: PublicKey, amount: number) {
  // Check balance at "processed" — could be rolled back
  const balance = await connection.getBalance(userPubkey);
  if (balance >= amount) {
    // Authorize withdrawal based on potentially stale/rolled-back data
    await authorizeWithdrawal(userPubkey, amount);
    // Send withdrawal transaction — by the time it's finalized,
    // the "processed" balance check may have been invalidated
    await sendWithdrawalTx(userPubkey, amount);
  }
}
```

## Secure Code

```typescript
import { Connection, PublicKey } from "@solana/web3.js";

// SECURE: Consistent commitment level throughout the workflow
const connection = new Connection("https://rpc.example.com", "confirmed");

async function processWithdrawal(userPubkey: PublicKey, amount: number) {
  // All reads and verifications at the same commitment level
  const commitment = "confirmed" as const;
  const balance = await connection.getBalance(userPubkey, commitment);
  if (balance < amount) {
    throw new Error("Insufficient balance at confirmed commitment");
  }
  // For high-value operations, verify at finalized
  if (amount > HIGH_VALUE_THRESHOLD) {
    const finalizedBalance = await connection.getBalance(userPubkey, "finalized");
    if (finalizedBalance < amount) {
      throw new Error("Insufficient finalized balance for high-value withdrawal");
    }
  }
  // Send and confirm at the same commitment level
  const sig = await sendWithdrawalTx(userPubkey, amount);
  await connection.confirmTransaction(sig, commitment);
}
```

## Impact

Commitment level mismatches create race conditions where the application sees state that does not persist. This enables double-spend attacks (user's deposit is at `processed` but gets rolled back after the application credits their account), phantom balance exploitation (balance exists at `processed` but not at `finalized`), and transaction ordering attacks.

## References

- Solana docs: Commitment Status — processed vs confirmed vs finalized
- Helius blog: Solana Commitment Levels — consistency requirements
- Solana docs: Connection class — default commitment configuration
