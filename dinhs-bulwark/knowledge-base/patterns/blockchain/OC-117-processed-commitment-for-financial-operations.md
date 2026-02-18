# OC-117: Processed Commitment for Financial Operations

**Category:** Blockchain Interaction
**Severity:** HIGH
**Auditors:** CHAIN-02, CHAIN-04
**CWE:** N/A — Blockchain-specific
**OWASP:** N/A — Blockchain-specific

## Description

Solana has three commitment levels: `processed`, `confirmed`, and `finalized`. "Processed" means the transaction was received by a single validator but has not been voted on by the cluster. "Confirmed" means 66%+ of stake-weighted validators have voted on the block. "Finalized" means 31+ confirmed blocks have been built on top, making it irreversible.

Using `processed` commitment for financial operations is dangerous because processed transactions can be dropped or rolled back. A transaction that appears confirmed at the `processed` level may never achieve finality. This creates a window for double-spend attacks: an application credits a user's account based on a `processed` transaction, but the transaction is later dropped from the chain.

Many Solana applications default to `processed` or `confirmed` for performance reasons — these levels respond faster. However, for operations that release real value (payments, withdrawals, goods delivery), only `finalized` commitment provides the guarantee that the transaction is irreversible. The Helius blog notes that even `confirmed` has a theoretical (though rare) rollback risk.

## Detection

```
grep -rn "commitment.*processed" --include="*.ts" --include="*.js"
grep -rn "'processed'" --include="*.ts" --include="*.js"
grep -rn '"processed"' --include="*.ts" --include="*.js"
grep -rn "preflightCommitment" --include="*.ts" --include="*.js"
```

Look for: `"processed"` commitment level used in payment verification, balance checks for withdrawal authorization, or transaction confirmation for value release. Default commitment level set to `processed` on Connection objects.

## Vulnerable Code

```typescript
import { Connection, PublicKey } from "@solana/web3.js";

// VULNERABLE: Using "processed" commitment for payment verification
const connection = new Connection("https://rpc.example.com", "processed");

async function verifyDeposit(signature: string): Promise<boolean> {
  // "processed" means only one validator saw it — could be rolled back
  const status = await connection.getSignatureStatus(signature);
  if (status.value?.confirmationStatus === "processed") {
    // Crediting user based on unconfirmed transaction
    await creditUserAccount(signature);
    return true;
  }
  return false;
}
```

## Secure Code

```typescript
import { Connection, PublicKey } from "@solana/web3.js";

// SECURE: Use "finalized" for financial operations
const connection = new Connection("https://rpc.example.com", "confirmed");

async function verifyDeposit(signature: string): Promise<boolean> {
  // Wait for finalized commitment before crediting
  const tx = await connection.getTransaction(signature, {
    commitment: "finalized",
    maxSupportedTransactionVersion: 0,
  });
  if (!tx) {
    return false; // Not yet finalized
  }
  if (tx.meta?.err) {
    return false; // Transaction failed
  }
  // Parse transaction to verify it matches expected parameters
  const transferAmount = parseTransferAmount(tx);
  if (transferAmount >= MINIMUM_DEPOSIT) {
    await creditUserAccount(signature, transferAmount);
    return true;
  }
  return false;
}
```

## Impact

Using `processed` commitment for financial decisions enables double-spend attacks where a transaction appears to succeed but is later dropped. An attacker could submit a deposit transaction, receive credit at the `processed` level, then have the transaction fail at higher commitment levels. This is especially dangerous for exchanges, payment processors, and any service that releases value based on transaction confirmation.

## References

- Solana docs: Commitment Status — processed vs confirmed vs finalized
- Helius blog: Solana Commitment Levels (May 2025) — detailed security analysis
- Chainstack: Solana Transaction Commitment Levels — when to use each level
- Solana Validator docs: Commitment status properties table
