# OC-123: Double-Processing of Blockchain Events

**Category:** Blockchain Interaction
**Severity:** HIGH
**Auditors:** CHAIN-04
**CWE:** CWE-675 (Multiple Operations on Resource in Single-Operation Context)
**OWASP:** N/A — Blockchain-specific

## Description

Solana applications that listen for on-chain events (account changes, log subscriptions, transaction confirmations) can process the same event multiple times due to WebSocket reconnections, RPC failover, application restarts, or the natural behavior of Solana's event delivery where the same event may be delivered at different commitment levels (processed, confirmed, finalized).

Double-processing a deposit event credits a user's account twice. Double-processing a withdrawal triggers two on-chain transfers. Double-processing a trade execution fills an order multiple times. In high-frequency Solana applications processing hundreds of events per second, duplicate detection is essential.

Solana's WebSocket subscriptions (`onAccountChange`, `onLogs`, `onSignature`) do not guarantee exactly-once delivery. When a WebSocket reconnects, it may redeliver events from the reconnection point. Applications using multiple RPC providers for redundancy will receive the same events from each provider.

## Detection

```
grep -rn "onAccountChange\|onLogs\|onSignature" --include="*.ts" --include="*.js"
grep -rn "logsSubscribe\|accountSubscribe" --include="*.ts" --include="*.js"
grep -rn "addEventListener.*slot\|addEventListener.*block" --include="*.ts" --include="*.js"
```

Look for: event handlers that modify state without idempotency checks, missing deduplication logic (e.g., checking if a transaction signature was already processed), event handlers that do not track the last processed slot or signature.

## Vulnerable Code

```typescript
import { Connection, PublicKey } from "@solana/web3.js";

// VULNERABLE: No deduplication — events processed multiple times
connection.onLogs(programId, async (logs, context) => {
  if (logs.logs.some((l) => l.includes("Deposit"))) {
    const sig = logs.signature;
    const amount = parseDepositAmount(logs.logs);
    // If WebSocket reconnects, this event fires again
    await db.query(
      "INSERT INTO deposits (signature, amount) VALUES ($1, $2)",
      [sig, amount]
    );
    await creditUser(amount);
  }
});
```

## Secure Code

```typescript
import { Connection, PublicKey } from "@solana/web3.js";

// SECURE: Idempotent processing with deduplication
connection.onLogs(
  programId,
  async (logs, context) => {
    if (logs.logs.some((l) => l.includes("Deposit"))) {
      const sig = logs.signature;
      const amount = parseDepositAmount(logs.logs);
      // Use signature as idempotency key — INSERT only if not already processed
      const result = await db.query(
        `INSERT INTO deposits (signature, amount, slot, status)
         VALUES ($1, $2, $3, 'pending')
         ON CONFLICT (signature) DO NOTHING
         RETURNING id`,
        [sig, amount, context.slot]
      );
      // Only credit if this is a new deposit (insert succeeded)
      if (result.rowCount > 0) {
        await creditUser(amount);
        await db.query(
          "UPDATE deposits SET status = 'credited' WHERE signature = $1",
          [sig]
        );
      }
    }
  },
  "confirmed"
);
```

## Impact

Double-processed deposits result in inflated balances that can be withdrawn as real funds. Double-processed withdrawals send funds twice, draining the application's treasury. Double-processed trades execute orders at incorrect volumes. The financial impact scales linearly with the number of duplicate events processed.

## References

- Solana docs: WebSocket subscriptions — no exactly-once delivery guarantee
- QuickNode: Streams reorg handling — sequential event delivery
- Envio: Indexing & Reorgs — idempotent event processing patterns
