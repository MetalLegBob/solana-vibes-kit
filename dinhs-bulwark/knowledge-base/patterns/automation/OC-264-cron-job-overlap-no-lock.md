# OC-264: Cron Job Overlap (No Lock)

**Category:** Automation & Bots
**Severity:** HIGH
**Auditors:** BOT-01
**CWE:** CWE-362 — Concurrent Execution using Shared Resource with Improper Synchronization
**OWASP:** N/A — Domain-specific

## Description

Cron-scheduled tasks in keeper and trading bots can overlap when a previous execution has not completed before the next scheduled invocation fires. Without distributed locking, two or more instances of the same task run concurrently, leading to duplicate operations, race conditions on shared state, and double-spending.

In Solana keeper systems, a common pattern is a cron job that runs every 30 seconds to scan for liquidation opportunities. If a liquidation scan takes 45 seconds due to network latency or high load, the next cron invocation starts while the first is still processing. Both instances may identify the same liquidation opportunity and submit competing transactions. Even if only one transaction succeeds on-chain (due to account locking), the bot wastes SOL on fees for the duplicate, and the internal state tracking may become inconsistent.

The problem is amplified in horizontally-scaled deployments where multiple bot instances run the same cron schedule. Strapi's GitHub issue #15634 documents this exact problem: in horizontally scaled deployments, all instances fire the same cron job simultaneously. The Redis Redlock algorithm and database advisory locks are the standard solutions, but many bot implementations use simple `setInterval` without any concurrency protection.

## Detection

```
# Cron and interval scheduling without locks
grep -rn "cron\|setInterval\|schedule\.\|node-cron\|agenda\|@Cron" --include="*.ts" --include="*.js"
grep -rn "Redlock\|redlock\|advisory.*lock\|distributedLock\|flock\|mutex" --include="*.ts" --include="*.js"

# setInterval without guard
grep -rn "setInterval" --include="*.ts" --include="*.js" | grep -v "lock\|mutex\|running\|busy"

# Check for "isRunning" guard patterns
grep -rn "isRunning\|isBusy\|isProcessing\|lockAcquired" --include="*.ts" --include="*.js"
```

## Vulnerable Code

```typescript
import cron from 'node-cron';

// VULNERABLE: No lock -- overlapping executions if scan takes too long
cron.schedule('*/30 * * * * *', async () => {
  console.log('Starting liquidation scan...');
  const opportunities = await scanForLiquidations(connection);
  for (const opp of opportunities) {
    await executeLiquidation(connection, opp);
  }
  console.log('Scan complete');
});

// If scanForLiquidations takes >30s, the next invocation runs concurrently
// Both instances process the same opportunities -> double liquidation attempts
```

## Secure Code

```typescript
import cron from 'node-cron';
import Redlock from 'redlock';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL!);
const redlock = new Redlock([redis], {
  driftFactor: 0.01,
  retryCount: 0,      // Don't retry -- if lock is held, skip this run
  retryDelay: 200,
});

const LOCK_KEY = 'keeper:liquidation-scan';
const LOCK_TTL_MS = 120_000; // 2 minutes -- must exceed max scan duration

cron.schedule('*/30 * * * * *', async () => {
  let lock: Awaited<ReturnType<typeof redlock.acquire>> | null = null;

  try {
    // Attempt to acquire distributed lock (non-blocking)
    lock = await redlock.acquire([LOCK_KEY], LOCK_TTL_MS);
    logger.info('Acquired lock, starting liquidation scan');

    const opportunities = await scanForLiquidations(connection);
    for (const opp of opportunities) {
      // Extend lock if processing takes longer than expected
      await lock.extend(LOCK_TTL_MS);
      await executeLiquidation(connection, opp);
    }

    logger.info({ count: opportunities.length }, 'Scan complete');
  } catch (err) {
    if ((err as Error).name === 'LockError') {
      logger.debug('Lock held by another instance, skipping this run');
    } else {
      logger.error({ err }, 'Liquidation scan error');
    }
  } finally {
    if (lock) {
      try {
        await lock.release();
      } catch {
        // Lock may have expired, which is safe
      }
    }
  }
});

// Alternative: Simple single-instance guard (non-distributed)
let isScanning = false;

cron.schedule('*/30 * * * * *', async () => {
  if (isScanning) {
    logger.debug('Previous scan still running, skipping');
    return;
  }
  isScanning = true;
  try {
    await runLiquidationScan();
  } finally {
    isScanning = false;
  }
});
```

## Impact

- Duplicate liquidations cause double the intended effect on target accounts
- Duplicate trades double position sizes and slippage exposure
- Wasted SOL on transaction fees for duplicate operations
- Inconsistent internal state when concurrent instances update shared data

## References

- Redis: Distributed Locks with Redis (Redlock algorithm) -- official documentation
- Strapi GitHub Issue #15634: "Preventing race conditions with CRON jobs" in horizontally scaled instances
- Crunz scheduler: Redis lock expiration bug causing overlapping cron execution (2026)
- Stack Overflow: "How can I prevent overlapping cron jobs with Rails?" -- flock-based approach
- CWE-362: Concurrent Execution using Shared Resource with Improper Synchronization
