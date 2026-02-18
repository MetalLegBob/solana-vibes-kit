# OC-109: Simulation Result Not Validated

**Category:** Blockchain Interaction
**Severity:** HIGH
**Auditors:** CHAIN-01
**CWE:** CWE-754 (Improper Check for Unusual or Exceptional Conditions)
**OWASP:** N/A — Blockchain-specific

## Description

Even when a Solana transaction is simulated before submission, the simulation results must be validated to provide security value. A common mistake is calling `simulateTransaction` but ignoring or inadequately checking the response — proceeding to send the transaction regardless of errors, unexpected logs, or compute budget exhaustion.

Simulation responses contain critical fields: `err` (null on success), `logs` (program execution logs), `unitsConsumed` (compute units used), and optionally `accounts` (post-execution account states). Failing to check these fields means the application cannot detect program errors, unexpected token movements, or account state changes before committing the transaction.

In the Solana phishing campaigns of 2025, attackers deliberately crafted transactions that showed no visible balance changes during wallet simulation preview. The ownership reassignment instructions produced clean simulation results with no obvious token transfers, deceiving both automated checks and manual user review. This highlights that simulation validation must go beyond simple error checking to include verifying expected account state changes.

## Detection

```
grep -rn "simulateTransaction" --include="*.ts" --include="*.js" -A 5
grep -rn "simulation\.value\.err" --include="*.ts" --include="*.js"
grep -rn "simulation\.value\.logs" --include="*.ts" --include="*.js"
```

Look for: `simulateTransaction` calls where the result is not checked, missing validation of `simulation.value.err`, simulation logs not inspected for unexpected program invocations or errors.

## Vulnerable Code

```typescript
import { Connection, Transaction } from "@solana/web3.js";

// VULNERABLE: Simulation called but result ignored
async function executeTransaction(connection: Connection, tx: Transaction, wallet: any) {
  // Simulation result is not checked at all
  await connection.simulateTransaction(tx);
  const signed = await wallet.signTransaction(tx);
  return connection.sendRawTransaction(signed.serialize());
}
```

## Secure Code

```typescript
import { Connection, Transaction, PublicKey } from "@solana/web3.js";

// SECURE: Validate simulation result thoroughly before proceeding
async function executeTransaction(
  connection: Connection, tx: Transaction, wallet: any,
  expectedPrograms: PublicKey[]
) {
  const sim = await connection.simulateTransaction(tx);
  // Check for execution errors
  if (sim.value.err) {
    throw new Error(`Transaction simulation failed: ${JSON.stringify(sim.value.err)}`);
  }
  // Verify only expected programs were invoked
  const logs = sim.value.logs || [];
  const invokedPrograms = logs
    .filter((l) => l.startsWith("Program") && l.includes("invoke"))
    .map((l) => l.split(" ")[1]);
  for (const prog of invokedPrograms) {
    if (!expectedPrograms.some((p) => p.toBase58() === prog)) {
      throw new Error(`Unexpected program invoked: ${prog}`);
    }
  }
  // Check compute budget is within reasonable bounds
  if (sim.value.unitsConsumed && sim.value.unitsConsumed > 400_000) {
    console.warn("High compute usage detected — review transaction");
  }
  const signed = await wallet.signTransaction(tx);
  return connection.sendRawTransaction(signed.serialize());
}
```

## Impact

Ignoring simulation results means the application proceeds with transactions that contain errors, invoke unexpected programs, or produce unintended state changes. Attackers can exploit this to execute transactions that pass simulation (no error) but perform malicious actions the application does not detect, such as account ownership transfers or hidden token approvals.

## References

- SlowMist: Solana phishing attacks with clean simulation results (December 2025)
- Solana docs: simulateTransaction response fields (err, logs, unitsConsumed)
- Blockaid: Wallet simulation bypass techniques used by drainers
