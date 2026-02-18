# OC-262: Unbounded Message Size

**Category:** Automation & Bots
**Severity:** MEDIUM
**Auditors:** BOT-03
**CWE:** CWE-770 — Allocation of Resources Without Limits or Throttling
**OWASP:** N/A — Domain-specific

## Description

When message queues used by keeper bots do not enforce maximum message size limits, an attacker or a buggy producer can submit oversized messages that exhaust the consumer's memory, crash the worker process, or fill up the queue storage, creating a denial-of-service condition.

In Solana bot architectures, messages typically contain transaction data, account addresses, and operation parameters. A well-formed message for a liquidation operation might be a few hundred bytes. However, without size validation at the queue or consumer level, a malicious or buggy message could contain megabytes of data -- perhaps a serialized transaction with thousands of instructions, an excessively large memo, or simply garbage data.

AWS SQS enforces a 256KB message size limit by default. Redis has no inherent message size limit. BullMQ (built on Redis) similarly allows arbitrarily large job payloads. When the consumer attempts to parse and process an oversized message, it can allocate excessive memory, trigger V8 heap exhaustion in Node.js, or cause the JSON parser to hang on deeply nested structures.

## Detection

```
# Check for message size validation at producer or consumer
grep -rn "maxMessageSize\|MAX_MESSAGE_SIZE\|messageSize\|payloadSize" --include="*.ts" --include="*.js"
grep -rn "Buffer\.byteLength\|JSON\.stringify.*length" --include="*.ts" --include="*.js" | grep -i "queue\|message\|job"

# Check for body size limits on HTTP queue endpoints
grep -rn "limit.*body\|bodyParser.*limit\|json.*limit" --include="*.ts" --include="*.js"

# Queue add operations without size checks
grep -rn "queue\.add\|publish\|sendMessage\|enqueue" --include="*.ts" --include="*.js"
```

## Vulnerable Code

```typescript
import { Queue, Worker } from 'bullmq';

const taskQueue = new Queue('tasks', { connection: redisConfig });

// VULNERABLE: No message size validation on producer side
async function queueTask(taskData: unknown) {
  // taskData could be arbitrarily large
  await taskQueue.add('process', taskData);
}

// VULNERABLE: Worker processes any size message
const worker = new Worker('tasks', async (job) => {
  const data = job.data; // Could be megabytes, causing OOM
  await processTask(data);
}, { connection: redisConfig });

// VULNERABLE: HTTP endpoint with no body size limit
app.post('/api/tasks', (req, res) => {
  queueTask(req.body);
  res.json({ ok: true });
});
```

## Secure Code

```typescript
import { Queue, Worker } from 'bullmq';
import express from 'express';

const MAX_MESSAGE_BYTES = 65_536; // 64KB max message size
const MAX_ARRAY_ITEMS = 100;      // Max items in any array field

const taskQueue = new Queue('tasks', { connection: redisConfig });

function validateMessageSize(data: unknown): void {
  const serialized = JSON.stringify(data);
  if (Buffer.byteLength(serialized, 'utf8') > MAX_MESSAGE_BYTES) {
    throw new Error(`Message too large: ${Buffer.byteLength(serialized)} bytes (max: ${MAX_MESSAGE_BYTES})`);
  }
}

function validateMessageStructure(data: Record<string, unknown>): void {
  // Prevent deeply nested or oversized arrays
  for (const [key, value] of Object.entries(data)) {
    if (Array.isArray(value) && value.length > MAX_ARRAY_ITEMS) {
      throw new Error(`Array field '${key}' too large: ${value.length} items (max: ${MAX_ARRAY_ITEMS})`);
    }
  }
}

async function queueTask(taskData: Record<string, unknown>) {
  validateMessageSize(taskData);
  validateMessageStructure(taskData);
  await taskQueue.add('process', taskData);
}

const worker = new Worker('tasks', async (job) => {
  // Double-check size at consumer (defense in depth)
  const jobSize = Buffer.byteLength(JSON.stringify(job.data), 'utf8');
  if (jobSize > MAX_MESSAGE_BYTES) {
    logger.error({ jobId: job.id, size: jobSize }, 'Oversized job rejected');
    throw new Error('Job data exceeds size limit');
  }
  await processTask(job.data);
}, {
  connection: redisConfig,
  limiter: { max: 10, duration: 1000 },
});

// HTTP endpoint with body size limit
app.use('/api/tasks', express.json({ limit: '64kb' }));
app.post('/api/tasks', authMiddleware, (req, res) => {
  queueTask(req.body);
  res.json({ ok: true });
});
```

## Impact

- Worker process crashes from out-of-memory on oversized message
- Redis memory exhaustion from storing oversized messages in queue
- Denial of service: legitimate messages cannot be processed while queue is full
- JSON parsing hangs on deeply nested or recursive structures

## References

- AWS SQS: 256KB maximum message size limit by default
- CWE-770: Allocation of Resources Without Limits or Throttling
- Node.js V8 heap limits: default ~1.5GB, oversized messages can exhaust available memory
- BullMQ documentation: no inherent payload size limit on Redis-backed queues
