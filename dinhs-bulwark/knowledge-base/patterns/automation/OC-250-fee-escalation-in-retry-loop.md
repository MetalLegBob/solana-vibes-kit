# OC-250: Fee Escalation in Retry Loop

**Category:** Automation & Bots
**Severity:** HIGH
**Auditors:** BOT-01
**CWE:** CWE-400 — Uncontrolled Resource Consumption
**OWASP:** N/A — Domain-specific

## Description

When a transaction fails to land on Solana, a common bot strategy is to increase the priority fee (compute unit price) on each retry, hoping to outbid other transactions for block space. Without a maximum fee cap, this escalation can cause the bot to pay orders of magnitude more in fees than the operation is worth, effectively burning its own funds.

This pattern is particularly dangerous during network congestion events, where many bots simultaneously escalate fees in a bidding war. MEV bots are especially susceptible: the April 2023 Flashbots exploit showed how bots racing to capture MEV opportunities can have their profits entirely consumed by escalating gas costs. On Solana, the introduction of priority fees (via compute budget instructions) created a similar dynamic where bots can outbid each other to the point of negative expected value.

Fee escalation becomes catastrophic when combined with infinite retries (OC-249). A bot that retries forever while doubling the priority fee on each attempt can drain its wallet through fees alone, even if no transactions actually succeed.

## Detection

```
# Priority fee escalation patterns
grep -rn "computeUnitPrice\|priorityFee\|microLamports" --include="*.ts" --include="*.js"
grep -rn "fee.*\*.*2\|fee.*\+.*fee\|fee.*increase\|fee.*escalat" --include="*.ts" --include="*.js"
grep -rn "ComputeBudgetProgram\.setComputeUnitPrice" --include="*.ts" --include="*.js"

# Missing fee caps
grep -rn "MAX_FEE\|maxFee\|feeCap\|maxPriorityFee\|maxComputeUnitPrice" --include="*.ts" --include="*.js"
```

## Vulnerable Code

```typescript
import { ComputeBudgetProgram, Transaction } from '@solana/web3.js';

async function sendWithEscalation(connection: Connection, ix: TransactionInstruction, signer: Keypair) {
  let priorityFee = 1_000; // Start at 1000 microLamports

  // VULNERABLE: Fee doubles each retry with no cap
  while (true) {
    try {
      const tx = new Transaction()
        .add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: priorityFee }))
        .add(ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 }))
        .add(ix);

      const sig = await sendAndConfirmTransaction(connection, tx, [signer]);
      return sig;
    } catch (err) {
      priorityFee *= 2; // Doubles every retry: 1K -> 2K -> 4K -> 8K -> ...
      console.log(`Bumping priority fee to ${priorityFee}`);
      await sleep(200);
    }
  }
}
```

## Secure Code

```typescript
import { ComputeBudgetProgram, Transaction } from '@solana/web3.js';

const FEE_CONFIG = {
  initialMicroLamports: 1_000,
  maxMicroLamports: 100_000,     // Hard cap: 100K microLamports
  escalationMultiplier: 1.5,
  maxRetries: 5,
  maxTotalFeeLamports: 50_000,   // Never spend more than 0.00005 SOL in fees per operation
};

async function sendWithEscalation(
  connection: Connection,
  ix: TransactionInstruction,
  signer: Keypair
): Promise<string> {
  let priorityFee = FEE_CONFIG.initialMicroLamports;
  let totalFeesSpent = 0;

  for (let attempt = 0; attempt < FEE_CONFIG.maxRetries; attempt++) {
    // Calculate estimated fee for this attempt
    const estimatedFee = Math.ceil((priorityFee * 200_000) / 1_000_000) + 5_000;

    if (totalFeesSpent + estimatedFee > FEE_CONFIG.maxTotalFeeLamports) {
      throw new Error(`Fee budget exhausted: ${totalFeesSpent} lamports spent`);
    }

    try {
      const tx = new Transaction()
        .add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: priorityFee }))
        .add(ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 }))
        .add(ix);

      const sig = await sendAndConfirmTransaction(connection, tx, [signer]);
      return sig;
    } catch (err) {
      totalFeesSpent += estimatedFee;
      priorityFee = Math.min(
        Math.ceil(priorityFee * FEE_CONFIG.escalationMultiplier),
        FEE_CONFIG.maxMicroLamports
      );
      logger.warn({ attempt, priorityFee, totalFeesSpent }, 'Escalating priority fee');
      await sleep(1000 * (attempt + 1)); // Linear backoff
    }
  }

  throw new Error('Transaction failed after all retry attempts with fee escalation');
}
```

## Impact

- Wallet drained through transaction fees alone, without any successful operations
- Negative expected value: fees exceed the profit from the operation being attempted
- Fee wars between competing bots create a race-to-the-bottom that benefits only validators
- During congestion events, exponential fee escalation can cost thousands of dollars in minutes

## References

- Flashbots relay exploit (April 2023): MEV bots lost $25M partly due to uncontrolled fee bidding
- Solana Compute Budget Program documentation on priority fees
- Jito bundle tips and priority fee best practices for Solana MEV
- PumpSwap SDK: configurable COMPUTE_UNIT_PRICE with default caps
