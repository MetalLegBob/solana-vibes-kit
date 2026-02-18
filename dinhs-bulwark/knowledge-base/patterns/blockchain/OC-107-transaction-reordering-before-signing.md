# OC-107: Transaction Reordering Before Signing

**Category:** Blockchain Interaction
**Severity:** HIGH
**Auditors:** CHAIN-01
**CWE:** CWE-696 (Incorrect Behavior Order)
**OWASP:** N/A — Blockchain-specific

## Description

Transaction reordering before signing occurs when instructions within a Solana transaction are rearranged between the time the user reviews them and the time they are signed. Solana instructions execute sequentially within a transaction, and the order matters: a reordered transaction can produce dramatically different outcomes than what the user intended.

A common vector is middleware or library code that "optimizes" transaction instruction order (e.g., placing compute budget instructions first) but inadvertently or maliciously rearranges other instructions. Another vector is server-side transaction builders that return transactions with instructions in a different order than what the client-side code expects.

In the Solana wallet adapter ecosystem, the `signTransaction` method receives a fully constructed Transaction object. If any code between construction and signing modifies the instructions array, the user signs a different transaction than what was displayed. This is particularly dangerous in multi-instruction transactions where instruction order determines account state.

## Detection

```
grep -rn "transaction\.instructions" --include="*.ts" --include="*.js"
grep -rn "\.sort(" --include="*.ts" --include="*.js" | grep -i "instruction"
grep -rn "\.splice(" --include="*.ts" --include="*.js" | grep -i "instruction"
grep -rn "\.unshift(" --include="*.ts" --include="*.js" | grep -i "instruction"
```

Look for: manipulation of the `instructions` array after initial construction, instruction sorting/reordering logic, server-side transaction building with different instruction order than client display.

## Vulnerable Code

```typescript
import { Transaction, ComputeBudgetProgram } from "@solana/web3.js";

// VULNERABLE: Middleware reorders instructions after user-facing construction
function optimizeTransaction(tx: Transaction): Transaction {
  const computeIxs = tx.instructions.filter(
    (ix) => ix.programId.equals(ComputeBudgetProgram.programId)
  );
  const otherIxs = tx.instructions.filter(
    (ix) => !ix.programId.equals(ComputeBudgetProgram.programId)
  );
  // Reordering changes the transaction the user will sign
  tx.instructions = [...computeIxs, ...otherIxs];
  return tx;
}
```

## Secure Code

```typescript
import { Transaction, ComputeBudgetProgram } from "@solana/web3.js";

// SECURE: Build transaction in correct order from the start
function buildOptimizedTransaction(
  computeUnits: number,
  priorityFee: number,
  instructions: TransactionInstruction[]
): Transaction {
  const tx = new Transaction();
  // Compute budget instructions always go first, by construction
  tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: computeUnits }));
  tx.add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: priorityFee }));
  // Application instructions in intended order
  for (const ix of instructions) {
    tx.add(ix);
  }
  // Never mutate tx.instructions after construction
  Object.freeze(tx.instructions);
  return tx;
}
```

## Impact

Reordered instructions can cause state changes to occur in an unintended sequence, potentially allowing an attacker to extract funds before a safety check executes, or to change account authorities before a legitimate operation. In DeFi contexts, instruction ordering determines whether safety checks (like minimum output amounts) are enforced before or after a swap.

## References

- Solana Transaction documentation: instruction ordering semantics
- Phantom wallet: transaction simulation as user-facing safety check
- Wallet-standard specification: signTransaction must not modify instruction content
