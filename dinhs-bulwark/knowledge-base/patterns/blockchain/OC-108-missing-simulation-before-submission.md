# OC-108: Missing Simulation Before Submission

**Category:** Blockchain Interaction
**Severity:** MEDIUM
**Auditors:** CHAIN-01
**CWE:** N/A — Blockchain-specific
**OWASP:** N/A — Blockchain-specific

## Description

Solana RPC nodes provide a `simulateTransaction` method that dry-runs a transaction against current blockchain state without broadcasting it. Skipping simulation before submission means the application cannot detect errors, unexpected state changes, or potential fund losses before committing the transaction on-chain.

Developers frequently skip simulation by setting `skipPreflight: true` in `sendTransaction` options, believing it speeds up transaction landing. While this bypasses the RPC node's automatic preflight check, it also removes the safety net that would catch errors like insufficient funds, invalid account states, or program errors before the transaction is broadcast to validators. On Solana's high-throughput network, a failed transaction still consumes compute units and incurs fees.

Wallet applications like Phantom use simulation to show users a human-readable preview of what a transaction will do. Applications that bypass this by using `signTransaction` instead of `signAndSendTransaction` may skip the wallet's built-in simulation step, reducing the user's ability to detect malicious transactions.

## Detection

```
grep -rn "skipPreflight:\s*true" --include="*.ts" --include="*.js"
grep -rn "skipPreflight" --include="*.ts" --include="*.js"
grep -rn "sendRawTransaction" --include="*.ts" --include="*.js"
grep -rn "signTransaction" --include="*.ts" --include="*.js" | grep -v "signAndSend"
```

Look for: `skipPreflight: true` in send options, use of `sendRawTransaction` without prior simulation, `signTransaction` usage instead of `signAndSendTransaction`.

## Vulnerable Code

```typescript
import { Connection, Transaction } from "@solana/web3.js";

// VULNERABLE: Skipping preflight removes error detection before broadcast
async function sendSwap(connection: Connection, tx: Transaction, signer: any) {
  tx.sign(signer);
  const sig = await connection.sendRawTransaction(tx.serialize(), {
    skipPreflight: true,        // No simulation at all
    preflightCommitment: "processed",
  });
  return sig;
}
```

## Secure Code

```typescript
import { Connection, Transaction } from "@solana/web3.js";

// SECURE: Simulate first, validate result, then submit
async function sendSwap(connection: Connection, tx: Transaction, signer: any) {
  // Step 1: Simulate to catch errors before spending fees
  const simulation = await connection.simulateTransaction(tx, [signer]);
  if (simulation.value.err) {
    throw new Error(`Simulation failed: ${JSON.stringify(simulation.value.err)}`);
  }
  // Step 2: Check logs for unexpected program invocations
  const logs = simulation.value.logs || [];
  if (logs.some((log) => log.includes("Error"))) {
    throw new Error("Unexpected error in simulation logs");
  }
  // Step 3: Send with preflight enabled as additional safety check
  tx.sign(signer);
  const sig = await connection.sendRawTransaction(tx.serialize(), {
    skipPreflight: false,
    preflightCommitment: "confirmed",
  });
  return sig;
}
```

## Impact

Without simulation, transactions that would fail still consume fees. More critically, transactions that produce unexpected side effects (such as draining more tokens than intended or invoking malicious programs) proceed without any user-visible warning. In DeFi operations, missing simulation can lead to executing swaps at unfavorable prices or triggering program errors that leave accounts in inconsistent states.

## References

- Solana docs: simulateTransaction RPC method
- Solana docs: Transaction Confirmation & Expiration guide
- Phantom docs: signAndSendTransaction vs signTransaction security considerations
- Solana Stack Exchange: discussion on skipPreflight risks
