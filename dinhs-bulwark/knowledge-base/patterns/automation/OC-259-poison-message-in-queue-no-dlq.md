# OC-259: Poison Message in Queue (No DLQ)

**Category:** Automation & Bots
**Severity:** MEDIUM
**Auditors:** BOT-03
**CWE:** CWE-400 — Uncontrolled Resource Consumption
**OWASP:** N/A — Domain-specific

## Description

A poison message is a message in a processing queue that consistently causes the consumer to fail. Without a Dead Letter Queue (DLQ) to capture these unprocessable messages, the consumer enters an infinite retry loop, blocking all subsequent messages in the queue and consuming resources without making progress.

In Solana bot infrastructure, keeper and crank systems often use message queues (Redis, BullMQ, AWS SQS, or custom in-memory queues) to manage pending operations such as liquidations, order fills, or state updates. A poison message might contain a reference to a closed account, an instruction with an invalid program ID, or data that triggers a parsing error. Without a DLQ, this single message can halt the entire processing pipeline.

The impact in DeFi is time-critical. If a liquidation queue is blocked by a poison message, the protocol cannot process liquidations during a market crash, potentially resulting in bad debt. IBM's MQ documentation and AWS SQS best practices both emphasize DLQ configuration as a fundamental requirement for reliable message processing, yet many crypto bot implementations skip this entirely.

## Detection

```
# Queue processing without max delivery count or DLQ
grep -rn "queue\|Queue\|bull\|BullMQ\|amqp\|rabbitmq\|SQS\|Redis.*queue" --include="*.ts" --include="*.js"
grep -rn "deadLetter\|dlq\|DLQ\|maxReceiveCount\|maxRetries.*queue\|maxDeliveryCount" --include="*.ts" --include="*.js"

# Message processing loops without failure counters
grep -rn "process.*message\|consume\|onMessage\|worker\(" --include="*.ts" --include="*.js"

# BullMQ or similar without dead letter configuration
grep -rn "new Queue\|new Worker\|new Bull" --include="*.ts" --include="*.js"
```

## Vulnerable Code

```typescript
import { Queue, Worker } from 'bullmq';

const liquidationQueue = new Queue('liquidations', { connection: redisConfig });

// VULNERABLE: No maxRetries, no DLQ -- poison message loops forever
const worker = new Worker('liquidations', async (job) => {
  const { accountAddress, amount } = job.data;
  const ix = createLiquidationInstruction({
    target: new PublicKey(accountAddress), // Might be closed/invalid
    amount,
  });
  await sendAndConfirmTransaction(connection, new Transaction().add(ix), [botKeypair]);
}, { connection: redisConfig });

worker.on('failed', (job, err) => {
  console.log(`Job ${job?.id} failed:`, err);
  // Job will be retried infinitely
});
```

## Secure Code

```typescript
import { Queue, Worker } from 'bullmq';

const liquidationQueue = new Queue('liquidations', { connection: redisConfig });
const deadLetterQueue = new Queue('liquidations-dlq', { connection: redisConfig });

const worker = new Worker('liquidations', async (job) => {
  const { accountAddress, amount } = job.data;

  // Validate account exists before attempting liquidation
  const accountInfo = await connection.getAccountInfo(new PublicKey(accountAddress));
  if (!accountInfo) {
    throw new Error(`Account ${accountAddress} not found -- possibly closed`);
  }

  const ix = createLiquidationInstruction({
    target: new PublicKey(accountAddress),
    amount,
  });
  await sendAndConfirmTransaction(connection, new Transaction().add(ix), [botKeypair]);
}, {
  connection: redisConfig,
  limiter: { max: 10, duration: 1000 },
});

worker.on('failed', async (job, err) => {
  if (!job) return;

  const attempts = job.attemptsMade;
  const MAX_ATTEMPTS = 3;

  logger.warn({ jobId: job.id, attempts, err: err.message }, 'Job failed');

  if (attempts >= MAX_ATTEMPTS) {
    // Move to dead letter queue for manual inspection
    await deadLetterQueue.add('failed-liquidation', {
      originalJobData: job.data,
      error: err.message,
      attempts,
      failedAt: new Date().toISOString(),
    });
    logger.error({ jobId: job.id }, `Moved to DLQ after ${MAX_ATTEMPTS} attempts`);
    await job.remove(); // Remove from main queue
  }
});

// Monitor DLQ size for alerting
setInterval(async () => {
  const dlqSize = await deadLetterQueue.getWaitingCount();
  if (dlqSize > 0) {
    logger.warn({ dlqSize }, 'Messages in dead letter queue require attention');
    await alertOperator(`DLQ has ${dlqSize} unprocessed messages`);
  }
}, 60_000);
```

## Impact

- Entire processing queue blocked by a single unprocessable message
- Keeper bot stops processing liquidations during market volatility
- Resource exhaustion from infinite retry of failing messages
- Silent failure: queue appears to be "running" but makes no progress

## References

- AWS SQS documentation: Using dead-letter queues for poison message handling
- Azure Service Bus: Overview of dead-letter queues for undeliverable messages
- IBM MQ documentation: Dead-letter queue security and configuration
- ActiveMQ: Message Redelivery and DLQ Handling best practices
- SystemOverflow: Dead Letter Queues and Poison Message Handling fundamentals
