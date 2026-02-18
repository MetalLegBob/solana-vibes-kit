# OC-249: Infinite Retry on Failed Operations

**Category:** Automation & Bots
**Severity:** MEDIUM
**Auditors:** BOT-01
**CWE:** CWE-835 — Loop with Unreachable Exit Condition
**OWASP:** N/A — Domain-specific

## Description

Automated bots and keepers frequently implement retry logic to handle transient Solana network errors such as blockhash expiry, RPC timeouts, or dropped transactions. When this retry logic has no maximum attempt count or exponential backoff, the bot enters an infinite retry loop that consumes resources, burns SOL on transaction fees, and potentially submits the same failed operation thousands of times.

On Solana, each retry attempt costs transaction fees (typically 5000 lamports per signature). An infinite retry loop on a consistently failing instruction can drain the bot's SOL balance purely through fees. Worse, if the instruction is partially succeeding (e.g., the transaction lands but reverts on-chain), the bot may be paying fees for transactions that systematically fail due to a permanent condition such as a closed account or changed program state.

This pattern is especially common in crank turner implementations (like Helium's TukTuk) where the bot must process a queue of tasks. A single poison task that always fails can block the entire queue if retries are unbounded, creating a denial-of-service condition for all subsequent tasks.

## Detection

```
# Infinite retry patterns
grep -rn "while.*retry\|while.*true.*send\|for.*retry.*=.*0" --include="*.ts" --include="*.js"
grep -rn "catch.*retry\|catch.*continue\|catch.*await.*send" --include="*.ts" --include="*.js"

# Missing max retry constants
grep -rn "MAX_RETRIES\|maxRetries\|retryLimit\|maxAttempts" --include="*.ts" --include="*.js"

# Retry without backoff
grep -rn "retry.*sleep\|retry.*delay\|retry.*wait" --include="*.ts" --include="*.js"
```

## Vulnerable Code

```typescript
async function submitCrankTransaction(
  connection: Connection,
  tx: Transaction,
  signers: Keypair[]
) {
  // VULNERABLE: Retries forever, no backoff, no max attempts
  while (true) {
    try {
      const sig = await sendAndConfirmTransaction(connection, tx, signers);
      return sig;
    } catch (err) {
      console.log('Transaction failed, retrying...', err);
      await sleep(500); // Fixed short delay
    }
  }
}
```

## Secure Code

```typescript
interface RetryConfig {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

const DEFAULT_RETRY: RetryConfig = {
  maxAttempts: 5,
  initialDelayMs: 1000,
  maxDelayMs: 30_000,
  backoffMultiplier: 2,
};

async function submitCrankTransaction(
  connection: Connection,
  tx: Transaction,
  signers: Keypair[],
  config: RetryConfig = DEFAULT_RETRY
): Promise<string> {
  let lastError: Error | undefined;
  let delay = config.initialDelayMs;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      // Refresh blockhash on each retry
      tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
      const sig = await sendAndConfirmTransaction(connection, tx, signers);
      return sig;
    } catch (err) {
      lastError = err as Error;
      logger.warn({ attempt, maxAttempts: config.maxAttempts, err: lastError.message },
        'Transaction failed, retrying with backoff');

      // Check if error is permanent (not worth retrying)
      if (isPermanentError(lastError)) {
        logger.error({ err: lastError.message }, 'Permanent error detected, aborting retries');
        throw lastError;
      }

      await sleep(delay);
      delay = Math.min(delay * config.backoffMultiplier, config.maxDelayMs);
    }
  }

  throw new Error(`Transaction failed after ${config.maxAttempts} attempts: ${lastError?.message}`);
}

function isPermanentError(err: Error): boolean {
  const permanent = ['AccountNotFound', 'InstructionError', 'ProgramFailedToComplete'];
  return permanent.some(p => err.message.includes(p));
}
```

## Impact

- SOL balance drained through accumulated transaction fees on failed retries
- Bot becomes unresponsive, stuck retrying a single failing operation
- Queue starvation: other pending operations never get processed
- Cascading resource exhaustion (RPC rate limits, CPU, memory from error logging)

## References

- Helium TukTuk crank-turner: permissionless task queue with retry configuration on Solana
- ActiveMQ documentation: Message Redelivery and DLQ Handling patterns for poison messages
- Redis distributed lock expiration bug (Crunz scheduler): infinite retry due to lock contention (2026)
- Drift Protocol keeper-bots-v2: retry configuration with exponential backoff
