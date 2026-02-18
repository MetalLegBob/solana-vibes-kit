# OC-252: Non-Idempotent Automated Operation

**Category:** Automation & Bots
**Severity:** HIGH
**Auditors:** BOT-01
**CWE:** CWE-841 — Improper Enforcement of Behavioral Workflow
**OWASP:** N/A — Domain-specific

## Description

Idempotency means that executing the same operation multiple times produces the same result as executing it once. When automated bots lack idempotency in their operations, retries, crashes, or network issues can cause the same action to execute multiple times, leading to double-spends, duplicate liquidations, or repeated swaps.

On Solana, transaction delivery is at-least-once rather than exactly-once. A bot may send a transaction, receive a timeout error, and retry -- but the original transaction may have already landed on-chain. Without idempotency tracking, the bot submits the same logical operation twice: once via the original transaction and once via the retry. For financial operations like liquidations or token transfers, this means double the intended amount is moved.

This is especially critical in keeper systems that process events from a queue or webhook. If the bot crashes mid-processing and restarts, it may reprocess events that were already handled. The ActiveMQ and AWS SQS documentation extensively covers this as the "poison message" and "at-least-once delivery" problem. In DeFi, the financial stakes make this a HIGH severity issue.

## Detection

```
# Check for deduplication/idempotency keys
grep -rn "idempotenc\|dedup\|processedIds\|alreadyProcessed\|nonce" --include="*.ts" --include="*.js"

# Look for tracking of processed operations
grep -rn "Set\(\)\|Map\(\)\|Redis.*processed\|db.*processed" --include="*.ts" --include="*.js"

# Check for at-most-once delivery patterns
grep -rn "acknowledgment\|ack\(\|commit\(\|markComplete" --include="*.ts" --include="*.js"

# Look for operations that modify state without checking prior execution
grep -rn "transfer\|liquidate\|swap\|execute" --include="*.ts" | grep -v "check\|exists\|processed\|dedup"
```

## Vulnerable Code

```typescript
async function processLiquidationEvents(events: LiquidationEvent[]) {
  // VULNERABLE: No deduplication -- replaying events causes double liquidation
  for (const event of events) {
    const ix = createLiquidationInstruction({
      target: event.account,
      amount: event.shortfall,
    });
    await sendAndConfirmTransaction(connection, new Transaction().add(ix), [botKeypair]);
    console.log('Liquidated:', event.account.toBase58());
  }
}

// On bot restart, all events from the queue are reprocessed
```

## Secure Code

```typescript
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL!);
const PROCESSED_KEY_PREFIX = 'liquidation:processed:';
const PROCESSED_TTL_SECONDS = 86400; // 24h

async function processLiquidationEvents(events: LiquidationEvent[]) {
  for (const event of events) {
    const idempotencyKey = `${PROCESSED_KEY_PREFIX}${event.account.toBase58()}:${event.slot}`;

    // Check if already processed
    const alreadyDone = await redis.get(idempotencyKey);
    if (alreadyDone) {
      logger.info({ account: event.account.toBase58(), slot: event.slot },
        'Skipping already-processed liquidation');
      continue;
    }

    // Attempt the operation
    const ix = createLiquidationInstruction({
      target: event.account,
      amount: event.shortfall,
    });

    try {
      const sig = await sendAndConfirmTransaction(connection, new Transaction().add(ix), [botKeypair]);

      // Mark as processed only after confirmed success
      await redis.setex(idempotencyKey, PROCESSED_TTL_SECONDS, sig);
      logger.info({ sig, account: event.account.toBase58() }, 'Liquidation processed');
    } catch (err) {
      // Check if the transaction actually landed despite the error
      if (await wasTransactionConfirmed(connection, event)) {
        await redis.setex(idempotencyKey, PROCESSED_TTL_SECONDS, 'confirmed-via-check');
        logger.warn('Transaction landed despite error, marking as processed');
      } else {
        logger.error({ err }, 'Liquidation failed, will retry');
      }
    }
  }
}
```

## Impact

- Double liquidations cause excessive losses for the targeted user and protocol
- Duplicate token transfers drain the bot wallet at 2x the intended rate
- Duplicate swap executions cause double the slippage impact
- Replayed crank operations waste SOL on fees for redundant state changes

## References

- AWS SQS documentation: at-least-once delivery and idempotency best practices
- ActiveMQ: Message Redelivery and DLQ Handling for ensuring exactly-once processing
- Azure Service Bus dead-letter queues: handling of duplicate message delivery
- Solana transaction confirmation model: "processed" vs "confirmed" vs "finalized" commitment
