---
pack: solana
topic: "Logging & Events"
decision: "How do I emit events and structure logs?"
confidence: 9/10
sources_checked: 14
last_updated: "2026-02-16"
---

# Logging & Events on Solana

## The Decision

**Should I use `emit!`, `emit_cpi!`, `sol_log_data`, or `msg!` for events? How do I design for indexing?**

Solana's event system differs fundamentally from Ethereum. Events are primarily for frontend communication, not historical querying. Choose your approach based on reliability needs, compute budget, and indexing strategy.

## Three Event Patterns

### 1. Anchor `emit!` — Base64 logs (simple, can be truncated)

```rust
#[event]
pub struct SwapEvent {
    pub amount_in: u64,
    pub amount_out: u64,
    pub token_in: Pubkey,
    pub token_out: Pubkey,
}

#[program]
pub mod my_dex {
    pub fn swap(ctx: Context<Swap>, amount: u64) -> Result<()> {
        // ... swap logic ...

        emit!(SwapEvent {
            amount_in: amount,
            amount_out: result,
            token_in: ctx.accounts.token_in.key(),
            token_out: ctx.accounts.token_out.key(),
        });
        Ok(())
    }
}
```

**How it works:**
- `emit!` calls `sol_log_data()` syscall
- Event data is Borsh-serialized, base64-encoded, prefixed with `Program data:`
- Appears in transaction logs as: `Program data: Zb1eU3aiYdwOAAAASGVsbG8sIFNvbGFuYSE=`
- 8-byte discriminator derived from event name
- No special accounts needed

**Parse in TypeScript:**
```typescript
import { EventParser, BorshCoder } from "@coral-xyz/anchor";

const eventParser = new EventParser(program.programId, new BorshCoder(program.idl));
const events = eventParser.parseLogs(tx.meta.logMessages);

for (let event of events) {
    if (event.name === "SwapEvent") {
        console.log("Swap:", event.data);
    }
}
```

**Live listening:**
```typescript
const listener = program.addEventListener('SwapEvent', (event, slot) => {
    console.log(`Swap at slot ${slot}:`, event.amountIn, event.amountOut);
});
```

**Pros:**
- Simple developer experience
- Low CU cost (~1000 CU per event)
- Client libraries parse automatically

**Cons:**
- **Log truncation risk**: Solana limits logs to ~10KB per transaction. If your transaction or a malicious co-bundled transaction fills logs, your events get silently dropped with just `Log truncated`
- **No historical queries**: Can only subscribe to events as they happen, not scan past blocks
- **Spoofable**: Other programs can emit fake events with matching discriminators

**When to use:**
- Development and testing
- Low-stakes events (UI notifications, non-critical logging)
- When combined with state accounts for ground truth

### 2. Anchor `emit_cpi!` — Self-CPI events (reliable, higher cost)

```rust
// In Cargo.toml
[features]
event-cpi = ["anchor-lang/event-cpi"]

#[derive(Accounts)]
#[event_cpi(authority = authority)]  // Required attribute
pub struct Swap<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    // ... other accounts
}

#[program]
pub mod my_dex {
    pub fn swap(ctx: Context<Swap>, amount: u64) -> Result<()> {
        // ... swap logic ...

        emit_cpi!(SwapEvent {
            amount_in: amount,
            amount_out: result,
            token_in: ctx.accounts.token_in.key(),
            token_out: ctx.accounts.token_out.key(),
        });
        Ok(())
    }
}
```

**How it works:**
- Program invokes itself via CPI
- Event data stored in CPI instruction data (base58-encoded)
- 16-byte prefix: 8-byte instruction discriminator + 8-byte event discriminator
- Event authority account validates only the program can emit

**Parse from transaction:**
```typescript
const tx = await connection.getTransaction(signature, {
    maxSupportedTransactionVersion: 0
});

// Find self-CPI in inner instructions
const innerInstructions = tx.meta.innerInstructions;
for (let ixSet of innerInstructions) {
    for (let ix of ixSet.instructions) {
        if (ix.programIdIndex === /* your program */) {
            // Decode base58 data, skip first 16 bytes
            const eventData = bs58.decode(ix.data).slice(16);
            const event = borsh.deserialize(schema, eventData);
        }
    }
}
```

**Pros:**
- **Immune to log truncation**: Data in instruction, not logs
- **Verifiable**: Can't be spoofed by other programs
- **Persistent**: Always in transaction data, retrievable via RPC

**Cons:**
- Higher CU cost (~5000 CU per event vs ~1000 for `emit!`)
- No native client subscription (must poll or use Geyser)
- More complex parsing

**When to use:**
- Production DeFi protocols (DEXs, lending, derivatives)
- Events that must be indexed reliably
- When events are critical for protocol security/auditing

### 3. Raw `msg!` / `sol_log` — Debug logging (unstructured)

```rust
use anchor_lang::prelude::*;

pub fn process(ctx: Context<MyCtx>, amount: u64) -> Result<()> {
    msg!("Processing with amount: {}", amount);  // Simple string

    // Or raw syscall
    solana_program::log::sol_log("Custom log message");

    Ok(())
}
```

**Pros:**
- Lowest CU cost
- Human-readable in explorers
- Good for debugging

**Cons:**
- Unstructured, hard to parse
- Still subject to log truncation
- No type safety

**When to use:**
- Development debugging
- Human-readable status messages
- Non-critical informational logs

## Event Serialization

All Anchor events use **Borsh** serialization:

```rust
#[event]
pub struct DetailedSwapEvent {
    pub user: Pubkey,              // 32 bytes
    pub input_amount: u64,         // 8 bytes
    pub output_amount: u64,        // 8 bytes
    pub slippage_bps: u16,         // 2 bytes
    pub timestamp: i64,            // 8 bytes
    pub route: Vec<Pubkey>,        // 4 + (32 * route.len())
}
```

**Size considerations:**
- Each event has overhead (discriminator, encoding)
- `Vec` fields add 4-byte length prefix
- `String` fields are expensive (consider fixed-size arrays)
- Large events increase CU cost linearly

**Optimization tips:**
```rust
// ❌ Expensive
pub route_description: String,  // Variable, UTF-8 encoding

// ✅ Cheaper
pub route_hash: [u8; 32],  // Fixed size, just bytes
```

## Event Indexing: The Real Challenge

**Critical reality: Solana events are NOT designed for historical queries.** You cannot directly scan past events by block range like `eth_getLogs`. Events must be captured as they occur or reconstructed from transaction history.

### Real-Time Indexing with Geyser Plugins

The production solution is **Yellowstone gRPC** (Geyser plugin):

```typescript
import { GeyserGrpcClient } from "@triton-one/yellowstone-grpc";

const client = GeyserGrpcClient
    .build_from_shared("https://your-endpoint.rpcpool.com")
    .x_token("your-token")
    .connect();

const stream = await client.subscribe({
    slots: {},
    accounts: {},
    transactions: {
        "my_program": {
            vote: false,
            failed: false,
            accountInclude: [myProgramId],
        }
    },
    blocks: {},
    blocksMeta: {},
    accountsDataSlice: [],
    commitment: CommitmentLevel.CONFIRMED,
});

stream.on("data", (data) => {
    if (data.transaction) {
        // Parse events from logs or CPI data
        const logs = data.transaction.meta.logMessages;
        // Extract "Program data:" entries, decode, store in DB
    }
});
```

**Providers:**
- Triton One (creators, ~$200-1000/month)
- Helius ($149-449/month)
- Chainstack ($49+/month with limits)
- Quicknode (enterprise pricing)
- DIY: Run your own validator with Yellowstone plugin

**Geyser advantages:**
- <50ms latency from validator memory
- No RPC polling waste
- Filter by program, account, transaction type
- Structured, typed data (not raw strings)
- `from_slot` support for replay/recovery

### Python Geyser Example

```python
import grpc
from yellowstone_grpc_proto.geyser_pb2 import SubscribeRequest
from yellowstone_grpc_proto.geyser_pb2_grpc import GeyserStub

channel = grpc.secure_channel(
    "your-endpoint.rpcpool.com:443",
    grpc.ssl_channel_credentials()
)
stub = GeyserStub(channel)

request = SubscribeRequest(
    transactions={
        "my_program": SubscribeRequestFilterTransactions(
            account_include=[str(program_id)],
            vote=False,
        )
    }
)

for msg in stub.Subscribe(request, metadata=[("x-token", "YOUR_TOKEN")]):
    if msg.transaction:
        # Process transaction, extract events
        pass
```

### Alternative: Helius Webhooks (No Geyser)

For smaller projects, Helius offers webhook-based indexing:

```typescript
// Helius setup
const webhook = await helius.createWebhook({
    webhookURL: "https://your-api.com/webhook",
    accountAddresses: [programId],
    transactionTypes: ["ANY"],
});

// Your webhook endpoint
app.post('/webhook', (req, res) => {
    const txs = req.body;
    for (let tx of txs) {
        // Parse events from tx.meta.logMessages
        const events = parseAnchorEvents(tx.meta.logMessages);
        // Store in database
    }
    res.sendStatus(200);
});
```

### RPC Polling (Budget Option)

For low-throughput programs or development:

```typescript
let lastSignature = null;
setInterval(async () => {
    const signatures = await connection.getSignaturesForAddress(
        programId,
        { until: lastSignature, limit: 100 }
    );

    for (let sigInfo of signatures.reverse()) {
        const tx = await connection.getTransaction(sigInfo.signature);
        const events = parseEventsFromLogs(tx.meta.logMessages);
        // Process events
        lastSignature = sigInfo.signature;
    }
}, 5000);  // Every 5 seconds
```

**Limitations:**
- 5-60 second latency
- Rate limits (usually ~10 RPS)
- Expensive at scale
- Misses transactions if polling interval > finalization

## CPI Event Bubbling

When your program calls another program that emits events, those events appear in your transaction logs:

```rust
// Your program calls Raydium
raydium::cpi::swap(cpi_ctx, amount)?;

// Raydium's SwapEvent appears in YOUR transaction logs
```

**Parsing multi-program events:**
```typescript
const events = eventParser.parseLogs(tx.meta.logMessages);
for (let event of events) {
    console.log(`Event: ${event.name} from program ${event.programId}`);
    // Distinguish by program ID
}
```

**Filter by program in Geyser:**
```typescript
transactions: {
    "raydium_only": {
        accountInclude: [RAYDIUM_PROGRAM_ID],
    }
}
```

## Compute Unit Costs

Real-world benchmarks from production programs:

| Operation | CU Cost | Notes |
|-----------|---------|-------|
| `msg!("simple")` | ~100 CU | Plain string |
| `msg!("formatted: {}", value)` | ~200 CU | With formatting |
| `emit!(SmallEvent)` | ~1000 CU | 3-4 fields |
| `emit!(LargeEvent)` | ~2000 CU | 8+ fields, Vec |
| `emit_cpi!(SmallEvent)` | ~5000 CU | Includes CPI overhead |
| `sol_log_data()` | ~200 CU | Raw bytes |

**Optimization strategies:**

```rust
// ❌ Expensive: Multiple small events
emit!(UserAction { user: ctx.accounts.user.key() });
emit!(AmountInfo { amount: amount });
emit!(TokenInfo { token: token_mint });
// Total: ~3000 CU

// ✅ Cheaper: One consolidated event
emit!(SwapCompleted {
    user: ctx.accounts.user.key(),
    amount: amount,
    token: token_mint,
});
// Total: ~1000 CU
```

**When CU matters:**
- High-frequency programs (DEXs, bots)
- Composable programs called in complex transactions
- Programs approaching 1.4M CU transaction limit

**When to splurge on CUs:**
- Critical security events
- Audit trail requirements
- User-facing actions (UX > optimization)

## Structured vs Unstructured Logs

### Structured (Recommended)

```rust
#[event]
pub struct OrderFilled {
    pub order_id: u64,
    pub trader: Pubkey,
    pub side: OrderSide,  // Enum
    pub price: u64,
    pub quantity: u64,
    pub fee: u64,
    pub timestamp: i64,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub enum OrderSide {
    Bid,
    Ask,
}
```

**Pros:**
- Type-safe parsing
- Easy to query in database
- Version control with discriminators
- Client libraries auto-decode

### Unstructured

```rust
msg!("Order filled: id={}, side={}, price={}, qty={}",
     order_id, side, price, quantity);
```

**Pros:**
- Human-readable in explorers
- Faster development
- No schema management

**Hybrid approach (best practice):**
```rust
pub fn fill_order(ctx: Context<FillOrder>, params: OrderParams) -> Result<()> {
    // Structured event for indexers
    emit!(OrderFilled {
        order_id: params.id,
        trader: ctx.accounts.trader.key(),
        // ... full details
    });

    // Human-readable log for debugging
    msg!("Order {} filled: {} @ {}", params.id, params.side, params.price);

    Ok(())
}
```

## Real Indexing Patterns

### Pattern 1: Memo Program for User Identification

**Problem:** Payments to a single address are hard to attribute.

**Solution:** Atomic transaction with memo:

```typescript
import { TransactionMessage } from "@solana/web3.js";

const tx = new Transaction().add(
    SystemProgram.transfer({
        fromPubkey: user,
        toPubkey: merchant,
        lamports: amount,
    }),
    // Atomic with transfer — can't be sniped
    new TransactionInstruction({
        keys: [],
        programId: MEMO_PROGRAM_ID,
        data: Buffer.from(`order:${orderId}`),
    })
);
```

**Index the memo:**
```typescript
if (ix.programId.equals(MEMO_PROGRAM_ID)) {
    const memo = ix.data.toString('utf-8');
    const orderId = memo.split(':')[1];
    // Match payment to order
}
```

### Pattern 2: State + Events Dual System

**Don't rely on events alone.** Combine with on-chain state:

```rust
#[account]
pub struct SwapState {
    pub total_swaps: u64,
    pub total_volume: u128,
    pub last_swap_slot: u64,
}

pub fn swap(ctx: Context<Swap>, amount: u64) -> Result<()> {
    let state = &mut ctx.accounts.state;

    // Update state (ground truth)
    state.total_swaps += 1;
    state.total_volume += amount as u128;
    state.last_swap_slot = Clock::get()?.slot;

    // Emit event (for real-time indexing)
    emit!(SwapEvent { /* ... */ });

    Ok(())
}
```

**Why both?**
- State: Queryable, immutable record
- Events: Real-time feed, efficient indexing
- If event indexing fails, state is ground truth

### Pattern 3: Sequential Event Numbering

Track event order and detect gaps:

```rust
#[account]
pub struct EventCounter {
    pub next_event_id: u64,
}

#[event]
pub struct SwapEvent {
    pub event_id: u64,  // Sequential
    pub slot: u64,
    // ... other fields
}

pub fn swap(ctx: Context<Swap>) -> Result<()> {
    let counter = &mut ctx.accounts.event_counter;
    let event_id = counter.next_event_id;
    counter.next_event_id += 1;

    emit!(SwapEvent {
        event_id,
        slot: Clock::get()?.slot,
        // ...
    });

    Ok(())
}
```

**Indexer validates:**
```typescript
let expectedId = 0;
stream.on("data", (event) => {
    if (event.event_id !== expectedId) {
        // Gap detected! Re-sync from state
        await resyncFromState();
    }
    expectedId = event.event_id + 1;
});
```

## Production Checklist

- [ ] Use `emit_cpi!` for critical events (DeFi, security-sensitive)
- [ ] Use `emit!` for non-critical events (UX notifications)
- [ ] Keep event structs under 100 bytes when possible
- [ ] Add timestamp/slot to all events
- [ ] Include user/authority pubkey in events
- [ ] Store ground truth in on-chain state, not just events
- [ ] Set up Geyser or webhook-based indexing (not RPC polling)
- [ ] Add event sequence numbers to detect gaps
- [ ] Test log truncation scenarios (bundle with log-heavy txs)
- [ ] Version events (add `version: u8` field) for upgradability
- [ ] Document event schema in IDL
- [ ] Monitor CU usage in production
- [ ] Have rollback/re-sync plan if indexer fails

## Anti-Patterns

❌ **Relying on `emit!` for financial events**
```rust
emit!(WithdrawalEvent { amount, user });  // Can be truncated!
```
✅ **Use `emit_cpi!` + state**
```rust
emit_cpi!(WithdrawalEvent { event_id, amount, user });
state.record_withdrawal(amount, user);  // Ground truth
```

❌ **Parsing logs with regex/string matching**
```typescript
if (log.includes("Swap completed")) { /* fragile */ }
```
✅ **Use Anchor EventParser**
```typescript
const events = eventParser.parseLogs(logs);
```

❌ **Emitting massive events**
```rust
#[event]
pub struct HugeEvent {
    pub description: String,  // Variable size!
    pub route: Vec<Pubkey>,   // Could be 100+ items
}
```
✅ **Fixed-size or hash references**
```rust
#[event]
pub struct CompactEvent {
    pub route_hash: [u8; 32],  // Hash of full route
    pub route_length: u8,
}
```

❌ **No historical recovery strategy**
- Single point of failure: Only one indexer instance
- No checkpoint/resume logic

✅ **Fault-tolerant indexing**
- Use `from_slot` in Geyser to replay
- Store last indexed slot in DB
- Validate against on-chain state periodically

## Debugging Events

### View raw logs

```bash
solana logs -u mainnet-beta --program-id <YOUR_PROGRAM_ID>
```

### Decode base64 event in Anchor

```bash
anchor event-parser --program-id <ID> --event-data "Zb1eU3aiYdwOAAAASGVsbG8sIFNvbGFuYSE="
```

### Test log truncation

```rust
#[cfg(test)]
mod tests {
    #[test]
    fn test_log_truncation() {
        // Create transaction with 10KB of logs
        for i in 0..1000 {
            msg!("Spam log {}: {}", i, "x".repeat(100));
        }
        // Your event should still work with emit_cpi!
        emit_cpi!(CriticalEvent { /* ... */ });
    }
}
```

### Validate event schema

```typescript
import { Idl } from "@coral-xyz/anchor";

const idl: Idl = await Program.fetchIdl(programId);
const events = idl.events;
console.log("Available events:", events.map(e => e.name));
```

## The Bottom Line

1. **For production DeFi**: Use `emit_cpi!` + Geyser + on-chain state. Accept the CU cost for reliability.

2. **For user-facing apps**: Use `emit!` + Helius webhooks. Fast, cheap, good enough for UX.

3. **For debugging**: Use `msg!` liberally in development. Remove or gate behind `#[cfg(feature = "debug")]` for production.

4. **Always have a backup**: Never rely solely on events. Store critical data in accounts.

5. **Index correctly**: RPC polling is not production-grade. Budget for Geyser or webhook services.

The Solana event model forces you to think differently than Ethereum. Embrace the real-time streaming mindset and design for it from day one. Your indexer is as critical as your program.

## Further Reading

- [Anchor Events Documentation](https://www.anchor-lang.com/docs/features/events)
- [Yellowstone gRPC Repo](https://github.com/rpcpool/yellowstone-grpc)
- [Solana Geyser Plugin Interface](https://docs.solana.com/developing/plugins/geyser-plugins)
- [Andrew Hong's Solana Events Deep Dive](https://read.cryptodatabytes.com/p/solana-analytics-starter-guide-part)
- [Chainstack Yellowstone Tutorial](https://docs.chainstack.com/docs/yellowstone-grpc-geyser-plugin)
- [Helius Developer Portal](https://docs.helius.dev/)
