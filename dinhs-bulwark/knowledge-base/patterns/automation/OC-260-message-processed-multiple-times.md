# OC-260: Message Processed Multiple Times

**Category:** Automation & Bots
**Severity:** HIGH
**Auditors:** BOT-03
**CWE:** CWE-841 — Improper Enforcement of Behavioral Workflow
**OWASP:** N/A — Domain-specific

## Description

Most message queue systems provide at-least-once delivery semantics, meaning a message may be delivered to a consumer more than once. This occurs due to network timeouts, consumer crashes before acknowledgment, queue failovers, or visibility timeout expiry. When a bot's message handler is not designed for duplicate delivery, the same operation executes multiple times.

In Solana keeper and trading bot systems, duplicate message processing has direct financial consequences. A liquidation instruction processed twice means double the intended liquidation amount. A token transfer processed twice sends tokens to the recipient a second time. A swap executed twice doubles the position size and slippage exposure. Unlike web application idempotency (where the worst case might be a duplicate email), DeFi duplicate processing can result in significant fund loss.

This vulnerability is closely related to OC-252 (Non-Idempotent Automated Operation) but focuses specifically on the message queue delivery mechanism rather than the operation logic. Even if the operation itself is idempotent at the application level, the queue infrastructure must be configured to minimize duplicates, and consumers must be designed to handle them.

## Detection

```
# Check for message acknowledgment patterns
grep -rn "ack\(\|acknowledge\|deleteMessage\|complete\(\|remove\(" --include="*.ts" --include="*.js"

# Check for visibility timeout configuration
grep -rn "visibilityTimeout\|lockDuration\|processTimeout" --include="*.ts" --include="*.js"

# Check for exactly-once or deduplication configuration
grep -rn "dedup\|idempoten\|MessageDeduplicationId\|contentBasedDedup" --include="*.ts" --include="*.js"

# Processing without pre-check for prior execution
grep -rn "worker\.\|consumer\.\|process\(" --include="*.ts" | grep -v "dedup\|exists\|processed"
```

## Vulnerable Code

```typescript
import { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } from '@aws-sdk/client-sqs';

const sqs = new SQSClient({ region: 'us-east-1' });

async function pollQueue() {
  while (true) {
    const result = await sqs.send(new ReceiveMessageCommand({
      QueueUrl: QUEUE_URL,
      MaxNumberOfMessages: 10,
      // VULNERABLE: Default visibility timeout may be too short
      // If processing takes longer, message becomes visible again -> duplicate
    }));

    for (const msg of result.Messages ?? []) {
      try {
        const event = JSON.parse(msg.Body!);
        // VULNERABLE: No deduplication check before processing
        await executeTransfer(event.to, event.amount, event.token);

        await sqs.send(new DeleteMessageCommand({
          QueueUrl: QUEUE_URL,
          ReceiptHandle: msg.ReceiptHandle!,
        }));
      } catch (err) {
        console.error('Failed:', err);
        // Message remains in queue and will be redelivered -> duplicate risk
      }
    }
    await sleep(1000);
  }
}
```

## Secure Code

```typescript
import { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } from '@aws-sdk/client-sqs';
import Redis from 'ioredis';

const sqs = new SQSClient({ region: 'us-east-1' });
const redis = new Redis(process.env.REDIS_URL!);
const DEDUP_TTL = 86400; // 24 hours

async function pollQueue() {
  while (isRunning) {
    const result = await sqs.send(new ReceiveMessageCommand({
      QueueUrl: QUEUE_URL,
      MaxNumberOfMessages: 10,
      VisibilityTimeout: 300, // 5 minutes -- must exceed max processing time
      WaitTimeSeconds: 20,     // Long polling to reduce empty receives
    }));

    for (const msg of result.Messages ?? []) {
      try {
        const event = JSON.parse(msg.Body!);
        const messageId = msg.MessageId!;

        // Deduplication check: skip if already processed
        const dedupKey = `processed:${messageId}`;
        const alreadyProcessed = await redis.get(dedupKey);
        if (alreadyProcessed) {
          logger.info({ messageId }, 'Duplicate message detected, skipping');
          // Still delete from queue to prevent further redelivery
          await deleteMessage(msg.ReceiptHandle!);
          continue;
        }

        // Process the operation
        const txSig = await executeTransfer(event.to, event.amount, event.token);

        // Mark as processed BEFORE deleting from queue (crash safety)
        await redis.setex(dedupKey, DEDUP_TTL, txSig);

        // Delete from queue after successful processing and dedup marking
        await deleteMessage(msg.ReceiptHandle!);

        logger.info({ messageId, txSig }, 'Message processed successfully');
      } catch (err) {
        logger.error({ messageId: msg.MessageId, err }, 'Processing failed');
        // Message will become visible after VisibilityTimeout for retry
        // DLQ (configured on queue) handles repeated failures
      }
    }
    await sleep(1000);
  }
}

async function deleteMessage(receiptHandle: string) {
  await sqs.send(new DeleteMessageCommand({
    QueueUrl: QUEUE_URL,
    ReceiptHandle: receiptHandle,
  }));
}
```

## Impact

- Double token transfers drain the bot wallet at twice the intended rate
- Double liquidations harm the targeted user and create excess risk
- Double swaps double the slippage exposure and position size
- Cumulative financial damage grows linearly with duplicate count

## References

- AWS SQS documentation: at-least-once delivery model and deduplication
- Azure Service Bus: duplicate detection with MessageId
- WCF Poison Message Handling: transaction-based message retry and deduplication
- Solana transaction model: confirmed vs finalized commitment for dedup checks
