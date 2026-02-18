# OC-263: Message Ordering Assumption Violation

**Category:** Automation & Bots
**Severity:** MEDIUM
**Auditors:** BOT-03
**CWE:** CWE-696 — Incorrect Behavior Order
**OWASP:** N/A — Domain-specific

## Description

Many keeper bot and queue processing systems assume that messages will be delivered in the same order they were produced. Standard message queues (SQS standard, Redis pub/sub, most AMQP configurations) do not guarantee strict ordering. When a bot's logic depends on processing events in a specific sequence, out-of-order delivery can cause incorrect state transitions, skipped operations, or financial calculation errors.

In Solana bot architectures, ordering violations are common in several scenarios. A bot monitoring on-chain events via WebSocket might receive slot notifications out of order during RPC failover. A queue containing "update price" followed by "execute trade" operations could deliver the trade before the price update, causing the trade to execute at a stale price. A batch of liquidation events processed out of order could result in liquidating an account that was already repaid in a later (but earlier-queued) event.

The fundamental issue is that developers treat message queues as FIFO streams when they are actually best-effort unordered channels. AWS SQS Standard Queues explicitly document that ordering is "best effort" and not guaranteed. Even FIFO queues only guarantee ordering within a message group, not across the entire queue.

## Detection

```
# Check for ordering assumptions in processing logic
grep -rn "sequence\|seqNum\|ordering\|sorted\|sort(" --include="*.ts" --include="*.js" | grep -i "queue\|message\|event"

# Check for FIFO queue configuration
grep -rn "fifo\|FIFO\|MessageGroupId\|sequenceNumber" --include="*.ts" --include="*.js"

# Look for temporal dependencies between messages
grep -rn "previous\|after\|before\|depends\|prerequisite" --include="*.ts" --include="*.js" | grep -i "message\|job\|task"

# Slot-based ordering in Solana event processing
grep -rn "slot.*<\|slot.*>\|slot.*order\|slot.*sort" --include="*.ts" --include="*.js"
```

## Vulnerable Code

```typescript
// VULNERABLE: Assumes events arrive in slot order
async function processChainEvents(events: ChainEvent[]) {
  for (const event of events) {
    switch (event.type) {
      case 'price-update':
        currentPrice = event.price;
        break;
      case 'liquidation-check':
        // Depends on currentPrice being from a preceding event
        // If events arrive out of order, uses wrong price
        if (shouldLiquidate(event.account, currentPrice)) {
          await liquidate(event.account);
        }
        break;
      case 'account-closed':
        activeAccounts.delete(event.account);
        break;
    }
  }
}

// VULNERABLE: Processes queue messages assuming order
async function processTransferBatch(messages: QueueMessage[]) {
  for (const msg of messages) {
    // Assumes "deposit" message arrives before "invest" message
    // Out-of-order delivery causes invest to fail or use wrong balance
    await processMessage(msg);
  }
}
```

## Secure Code

```typescript
// Sort events by slot/timestamp before processing
async function processChainEvents(events: ChainEvent[]) {
  // Explicit ordering: sort by slot, then by transaction index within slot
  const sorted = [...events].sort((a, b) => {
    if (a.slot !== b.slot) return a.slot - b.slot;
    return a.txIndex - b.txIndex;
  });

  for (const event of sorted) {
    // Validate that we have not processed a newer event for this account
    const lastProcessedSlot = await getLastProcessedSlot(event.account);
    if (event.slot <= lastProcessedSlot) {
      logger.info({ event, lastProcessedSlot }, 'Skipping out-of-order or duplicate event');
      continue;
    }

    switch (event.type) {
      case 'price-update':
        await updatePrice(event.price, event.slot);
        break;
      case 'liquidation-check':
        // Fetch current on-chain state rather than depending on message order
        const freshPrice = await getOraclePrice(connection);
        const accountState = await getAccountState(connection, event.account);
        if (shouldLiquidate(accountState, freshPrice)) {
          await liquidate(event.account);
        }
        break;
    }

    await setLastProcessedSlot(event.account, event.slot);
  }
}

// Use self-contained messages that carry all necessary state
interface SelfContainedMessage {
  id: string;
  type: string;
  data: Record<string, unknown>;
  slot: number;
  timestamp: number;
  // Each message includes all data needed, not depending on prior messages
}

async function processTransferBatch(messages: SelfContainedMessage[]) {
  const sorted = [...messages].sort((a, b) => a.slot - b.slot);

  for (const msg of sorted) {
    // Verify current state on-chain instead of trusting message order
    const currentState = await fetchCurrentState(msg.data.account as string);
    await processWithState(msg, currentState);
  }
}
```

## Impact

- Operations execute against incorrect state due to out-of-order processing
- Liquidations triggered at wrong prices or against already-resolved positions
- Financial calculations use stale or future data depending on delivery order
- Race conditions between concurrent consumers exacerbate ordering issues

## References

- AWS SQS: Standard queues provide "best-effort ordering" with no FIFO guarantee
- Azure Service Bus: message ordering guarantees and sessions for ordered delivery
- Solana WebSocket API: slot notifications may arrive out of order during RPC failover
- CWE-696: Incorrect Behavior Order
