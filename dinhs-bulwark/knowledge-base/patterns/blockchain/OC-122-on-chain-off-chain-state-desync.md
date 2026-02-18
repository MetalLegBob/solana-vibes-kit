# OC-122: On-Chain/Off-Chain State Desync

**Category:** Blockchain Interaction
**Severity:** HIGH
**Auditors:** CHAIN-04
**CWE:** CWE-362 (Concurrent Execution Using Shared Resource with Improper Synchronization)
**OWASP:** N/A — Blockchain-specific

## Description

Off-chain systems (databases, caches, APIs) that mirror on-chain state can desynchronize from the Solana blockchain, creating a window where the application's view of reality diverges from the actual on-chain state. This desync can be exploited to double-spend, bypass balance checks, or trigger incorrect business logic.

Common sources of desync include: the off-chain system processing events faster than on-chain finality (acting on `processed` data that is later rolled back), missed events due to RPC disconnections or WebSocket drops, indexer lag during network congestion, and application restarts that skip events between the last checkpoint and the current block.

In Solana's high-throughput environment, hundreds of transactions can modify state within a single second. An off-chain database that updates balances based on observed transactions but does not handle reorgs, missed events, or duplicate deliveries will inevitably diverge from on-chain state. This is especially dangerous for payment processors, trading platforms, and any system that maintains an off-chain ledger.

## Detection

```
grep -rn "onAccountChange\|onProgramAccountChange" --include="*.ts" --include="*.js"
grep -rn "onLogs\|logsSubscribe" --include="*.ts" --include="*.js"
grep -rn "getTransaction.*confirmed\|getTransaction.*processed" --include="*.ts" --include="*.js"
```

Look for: event listeners that update off-chain state without finality checks, missing reconciliation logic between off-chain database and on-chain state, no mechanism to detect and repair state drift.

## Vulnerable Code

```typescript
import { Connection, PublicKey } from "@solana/web3.js";

// VULNERABLE: Updates database on "processed" events without reconciliation
async function watchDeposits(connection: Connection, vaultPubkey: PublicKey) {
  connection.onAccountChange(vaultPubkey, async (accountInfo, context) => {
    const newBalance = accountInfo.lamports;
    // Balance update at "processed" level — could be rolled back
    await db.query("UPDATE vault SET balance = $1 WHERE pubkey = $2", [
      newBalance,
      vaultPubkey.toBase58(),
    ]);
    // No check if this event is a duplicate or was rolled back
  });
}
```

## Secure Code

```typescript
import { Connection, PublicKey } from "@solana/web3.js";

// SECURE: Finalized events + periodic reconciliation
async function watchDeposits(connection: Connection, vaultPubkey: PublicKey) {
  // Use finalized commitment for state updates
  connection.onAccountChange(
    vaultPubkey,
    async (accountInfo, context) => {
      const slot = context.slot;
      // Idempotent update: only apply if slot is newer than last processed
      await db.query(
        `UPDATE vault SET balance = $1, last_slot = $2
         WHERE pubkey = $3 AND last_slot < $2`,
        [accountInfo.lamports, slot, vaultPubkey.toBase58()]
      );
    },
    { commitment: "finalized" }
  );

  // Periodic reconciliation: compare off-chain state with on-chain truth
  setInterval(async () => {
    const onChainBalance = await connection.getBalance(vaultPubkey, "finalized");
    const offChainRecord = await db.query(
      "SELECT balance FROM vault WHERE pubkey = $1",
      [vaultPubkey.toBase58()]
    );
    if (offChainRecord.rows[0]?.balance !== onChainBalance) {
      console.error("State desync detected — triggering reconciliation");
      await reconcileState(vaultPubkey, onChainBalance);
    }
  }, 60_000); // Every 60 seconds
}
```

## Impact

State desync enables double-spend attacks (user withdraws based on stale off-chain balance), incorrect pricing (trading engine uses outdated reserves data), phantom credits (off-chain database shows balance from rolled-back transaction), and data corruption in indexers. Financial losses scale with transaction volume and desync duration.

## References

- Envio: Indexing & Reorgs — handling chain reorganizations in off-chain indexers
- QuickNode: Reorg Handling in Streams — sequential data delivery patterns
- Solana docs: WebSocket subscriptions — commitment levels for real-time data
