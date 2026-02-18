# OC-261: Queue Without Authentication

**Category:** Automation & Bots
**Severity:** HIGH
**Auditors:** BOT-03
**CWE:** CWE-306 — Missing Authentication for Critical Function
**OWASP:** A07:2021 — Identification and Authentication Failures

## Description

Message queues used by keeper bots and trading systems to coordinate operations often lack authentication, allowing any network-adjacent process to publish messages, consume messages, or alter queue state. When an attacker can inject messages into an unauthenticated queue, they can trigger arbitrary operations such as unauthorized liquidations, token transfers, or swap executions.

Redis, which is commonly used as a message broker in crypto bot infrastructure, does not require authentication by default. RabbitMQ, when deployed with default credentials (guest/guest), is similarly exposed. The OpenStack Security Guide explicitly warns that "once access to the queue is permitted, no further authorization checks are performed" -- meaning queue-level authentication is the only barrier between an attacker and full control over the bot's operation pipeline.

In the Solana ecosystem, many keeper bot implementations use Redis-backed queues (BullMQ, bee-queue) or in-memory queues exposed via HTTP APIs for operational management. If these queues are accessible on the network without authentication, an attacker on the same network (or via an SSRF vulnerability) can inject messages that cause the bot to sign and submit arbitrary transactions.

## Detection

```
# Redis connections without password
grep -rn "new Redis\|createClient\|ioredis" --include="*.ts" --include="*.js"
grep -rn "redis://localhost\|redis://127\|redis://redis" --include="*.ts" --include="*.js" | grep -v "password\|auth"

# RabbitMQ with default credentials
grep -rn "amqp://guest:guest\|amqp://localhost" --include="*.ts" --include="*.js"

# Queue endpoints without auth middleware
grep -rn "app\.post.*queue\|app\.post.*job\|router.*queue" --include="*.ts" --include="*.js"

# Check for requirepass in Redis config
grep -rn "requirepass\|REDIS_PASSWORD\|redisPassword" --include="*.ts" --include="*.js" --include="*.conf"
```

## Vulnerable Code

```typescript
import Redis from 'ioredis';
import { Queue, Worker } from 'bullmq';

// VULNERABLE: Redis connection without password
const redis = new Redis({
  host: 'redis', // Docker service name, no auth
  port: 6379,
});

const operationQueue = new Queue('operations', { connection: redis });

// VULNERABLE: HTTP endpoint to add jobs without authentication
app.post('/api/queue/add', async (req, res) => {
  const { type, data } = req.body;
  await operationQueue.add(type, data); // Anyone can inject operations
  res.json({ status: 'queued' });
});
```

## Secure Code

```typescript
import Redis from 'ioredis';
import { Queue, Worker } from 'bullmq';
import { authMiddleware } from './middleware/auth';

// Redis with authentication and TLS
const redis = new Redis({
  host: process.env.REDIS_HOST!,
  port: parseInt(process.env.REDIS_PORT!),
  password: process.env.REDIS_PASSWORD!, // requirepass configured
  tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
  enableReadyCheck: true,
  maxRetriesPerRequest: 3,
});

const operationQueue = new Queue('operations', { connection: redis });

// Authenticated endpoint with validation
app.post('/api/queue/add',
  authMiddleware,  // Require authenticated operator
  validateBody(queueJobSchema), // Schema validation
  async (req, res) => {
    const { type, data } = req.body;

    // Validate operation type against allowlist
    const ALLOWED_TYPES = ['liquidation', 'crank', 'rebalance'];
    if (!ALLOWED_TYPES.includes(type)) {
      return res.status(400).json({ error: `Invalid operation type: ${type}` });
    }

    // Validate data fields based on type
    const validated = validateOperationData(type, data);
    if (!validated.ok) {
      return res.status(400).json({ error: validated.error });
    }

    await operationQueue.add(type, validated.data);
    logger.info({ type, operator: req.user.id }, 'Operation queued');
    res.json({ status: 'queued' });
  }
);
```

## Impact

- Attacker injects messages that cause the bot to execute arbitrary transactions
- Queue poisoning creates a denial of service against the bot's legitimate operations
- Message tampering alters pending operations (amounts, targets, parameters)
- Data exfiltration by consuming messages intended for the bot

## References

- OpenStack Security Guide: "Once access to the queue is permitted, no further authorization checks are performed"
- OpenStack Messaging Security: TLS and authentication requirements for AMQP queues
- IBM MQ: Dead-letter queue security and access control configuration
- AWS SQS: Security best practices including IAM-based queue access control
- CWE-306: Missing Authentication for Critical Function
