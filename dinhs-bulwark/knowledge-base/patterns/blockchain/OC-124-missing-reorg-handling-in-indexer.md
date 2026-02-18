# OC-124: Missing Reorg Handling in Indexer

**Category:** Blockchain Interaction
**Severity:** HIGH
**Auditors:** CHAIN-04
**CWE:** CWE-841 (Improper Enforcement of Behavioral Workflow)
**OWASP:** N/A — Blockchain-specific

## Description

While Solana's consensus mechanism makes deep reorgs extremely rare compared to proof-of-work chains, shallow reorganizations (1-2 slots) can occur when different validators produce competing blocks. An indexer that processes blocks at the chain tip without handling reorgs can end up with invalid data when the canonical chain switches to a different fork.

Solana's "optimistic confirmation" (confirmed commitment) means 66%+ of stake voted on the block, which provides high confidence but not absolute finality. Only "finalized" commitment (31+ confirmed blocks on top) guarantees irreversibility. Indexers that process data at "confirmed" or "processed" commitment must be prepared to roll back data if the block is orphaned.

The practical impact is most severe for indexers that track token transfers, account state changes, or program events. If a block is orphaned after the indexer has processed it, the indexed data includes transactions that never actually happened on the canonical chain. Envio's HyperIndex and QuickNode Streams both include built-in reorg handling for this reason.

## Detection

```
grep -rn "getBlock\|getBlocks\|getBlockSignatures" --include="*.ts" --include="*.js"
grep -rn "slot.*cursor\|lastProcessedSlot\|checkpoint" --include="*.ts" --include="*.js"
grep -rn "commitment.*confirmed\|commitment.*processed" --include="*.ts" --include="*.js"
```

Look for: block processing loops without reorg detection, indexers that process at non-finalized commitment without rollback logic, missing slot continuity checks (gap detection).

## Vulnerable Code

```typescript
// VULNERABLE: Linear indexer without reorg handling
async function indexBlocks(connection: Connection, startSlot: number) {
  let currentSlot = startSlot;
  while (true) {
    const block = await connection.getBlock(currentSlot, {
      commitment: "confirmed", // Can be reorged
      maxSupportedTransactionVersion: 0,
    });
    if (block) {
      for (const tx of block.transactions) {
        await processTransaction(tx);  // No rollback mechanism
      }
      await saveCheckpoint(currentSlot);
      currentSlot++;
    } else {
      await sleep(400); // Wait for next slot
    }
  }
}
```

## Secure Code

```typescript
// SECURE: Indexer with reorg detection and rollback capability
async function indexBlocks(connection: Connection, startSlot: number) {
  let currentSlot = startSlot;
  let lastBlockhash: string | null = null;

  while (true) {
    const block = await connection.getBlock(currentSlot, {
      commitment: "finalized", // Use finalized for safety
      maxSupportedTransactionVersion: 0,
    });
    if (block) {
      // Verify block continuity — detect reorgs via parent hash
      if (lastBlockhash && block.previousBlockhash !== lastBlockhash) {
        console.error(`Reorg detected at slot ${currentSlot}`);
        // Rollback: delete indexed data from the divergence point
        const rollbackSlot = await findDivergencePoint(connection, currentSlot);
        await rollbackIndexedData(rollbackSlot);
        currentSlot = rollbackSlot;
        continue;
      }
      // Process within a database transaction for atomicity
      await db.transaction(async (trx) => {
        for (const tx of block.transactions) {
          await processTransaction(tx, trx);
        }
        await saveCheckpoint(currentSlot, block.blockhash, trx);
      });
      lastBlockhash = block.blockhash;
      currentSlot++;
    } else {
      await sleep(400);
    }
  }
}
```

## Impact

An indexer that does not handle reorgs can display phantom transactions (from orphaned blocks), miss real transactions (on the canonical fork), or corrupt aggregated data (balances, volumes, counts). For DeFi dashboards or payment processors, this means showing incorrect balances or crediting phantom payments.

## References

- Envio docs: Chain Reorganization Support — automatic reorg handling
- Envio blog: Indexing & Reorgs — design patterns for reorg-safe indexing
- QuickNode docs: Reorg Handling in Streams
- Solana docs: Commitment Status — finalized vs confirmed
