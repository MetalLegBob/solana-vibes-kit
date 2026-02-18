# OC-112: Compute Budget Manipulation

**Category:** Blockchain Interaction
**Severity:** MEDIUM
**Auditors:** CHAIN-01
**CWE:** CWE-400 (Uncontrolled Resource Consumption)
**OWASP:** N/A — Blockchain-specific

## Description

Solana transactions can include compute budget instructions to set compute unit limits and priority fees. Misconfiguring these values can lead to transaction failures, excessive fee payments, or vulnerability to validator manipulation. The `ComputeBudgetProgram.setComputeUnitLimit` and `ComputeBudgetProgram.setComputeUnitPrice` instructions control execution resources and prioritization.

Setting compute units too low causes transactions to fail with "exceeded CUs" errors. Setting priority fees too high wastes SOL on unnecessary tips to validators. Applications that allow user-controlled or externally-influenced compute budget parameters can be exploited: an attacker could manipulate an API to return inflated priority fee recommendations, causing the application to overpay for transaction inclusion.

In the Solana MEV ecosystem, priority fees directly influence transaction ordering within a block. Applications that hardcode excessively high priority fees are effectively paying MEV tax unnecessarily, while those that set no priority fee may see transactions consistently delayed or dropped during network congestion.

## Detection

```
grep -rn "setComputeUnitLimit" --include="*.ts" --include="*.js"
grep -rn "setComputeUnitPrice" --include="*.ts" --include="*.js"
grep -rn "ComputeBudgetProgram" --include="*.ts" --include="*.js"
grep -rn "microLamports" --include="*.ts" --include="*.js"
```

Look for: hardcoded compute unit prices, missing compute budget instructions entirely, compute budget values sourced from untrusted external APIs without validation or caps.

## Vulnerable Code

```typescript
import { Transaction, ComputeBudgetProgram } from "@solana/web3.js";

// VULNERABLE: Hardcoded excessive priority fee and no compute limit
async function buildTransaction(instructions: TransactionInstruction[]) {
  const tx = new Transaction();
  // Wastefully high priority fee, no upper bound
  tx.add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1_000_000 }));
  // No setComputeUnitLimit — defaults to 200k per instruction
  for (const ix of instructions) {
    tx.add(ix);
  }
  return tx;
}
```

## Secure Code

```typescript
import { Transaction, ComputeBudgetProgram, Connection } from "@solana/web3.js";

// SECURE: Dynamic priority fee with caps, and explicit compute limit
async function buildTransaction(
  connection: Connection,
  instructions: TransactionInstruction[]
) {
  const tx = new Transaction();
  // Get recent priority fee estimates from the network
  const feeEstimate = await connection.getRecentPrioritizationFees();
  const medianFee = feeEstimate.length > 0
    ? feeEstimate.sort((a, b) => a.prioritizationFee - b.prioritizationFee)[
        Math.floor(feeEstimate.length / 2)
      ].prioritizationFee
    : 1000;
  // Cap priority fee to prevent excessive spending
  const MAX_PRIORITY_FEE = 100_000; // microLamports
  const cappedFee = Math.min(medianFee, MAX_PRIORITY_FEE);
  tx.add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: cappedFee }));
  tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 300_000 }));
  for (const ix of instructions) {
    tx.add(ix);
  }
  return tx;
}
```

## Impact

Excessive priority fees drain SOL from the application wallet. Missing compute limits can cause unexpected transaction failures during high-load operations. Externally manipulated fee recommendations can be used to grief an application by causing it to overspend on fees, effectively a denial-of-wallet attack.

## References

- Solana docs: Compute Budget instructions
- Helius: Priority Fee API and best practices
- QuickNode: MEV on Solana — priority fee dynamics and validator behavior
