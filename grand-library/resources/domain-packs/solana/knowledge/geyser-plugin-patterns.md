---
pack: solana
topic: "Geyser Plugin Patterns"
decision: "When and how should I use Geyser plugins?"
confidence: 8/10
sources_checked: 25
last_updated: "2026-02-16"
---

# Geyser Plugin Patterns: When and How to Use Validator-Side Streaming

## What Are Geyser Plugins?

Geyser plugins are validator-side streaming interfaces that transmit blockchain data (accounts, transactions, blocks, slots) directly from validator memory to external systems. Unlike RPC polling, Geyser taps into the validator's internal data structures through the `GeyserPlugin` trait interface, pushing updates the moment they occur.

**Core distinction:** Geyser is not an API you query—it's a plugin loaded into the validator binary that streams data out as the validator processes it.

## Architecture: How Geyser Works

### Validator Integration

Geyser plugins compile to dynamic shared libraries (`.so` files on Linux) loaded at validator startup via `--geyser-plugin-config` flag. Once loaded, the plugin becomes part of the validator process, registering callbacks with AccountsDB and the transaction processing pipeline.

**Key architectural points:**

- **Direct memory access**: Plugins read from validator memory before data reaches RPC layer
- **Callback-based**: Validator invokes plugin methods (`update_account`, `notify_transaction`, `notify_block_metadata`) as events occur
- **Non-blocking by design**: Plugins run asynchronously to avoid impacting consensus performance
- **No commitment delay**: Data streams at "processed" commitment immediately—before confirmation or finalization

### Infrastructure Separation

Production deployments **never** run Geyser on voting validators. Standard pattern:

```
Voting Validators (consensus only)
    ↓
Non-voting Follower Nodes (streaming dedicated)
    ↓ Geyser plugin loaded
External consumers (gRPC clients, databases, message queues)
```

This isolation ensures streaming load never competes with consensus operations.

## When to Use Geyser vs RPC Polling

### Use Geyser when:

1. **Latency is critical** (HFT, MEV, liquidations, arbitrage)
   - RPC polling: 150-500ms typical latency
   - Geyser: 5-50ms p90 latency
   - On 400ms block times, RPC often delivers data from N-1 blocks while Geyser streams current block

2. **Data completeness required** (indexers, analytics platforms)
   - RPC methods like `getProgramAccounts` can skip updates under load
   - RPC rate limits cause gaps during traffic spikes
   - Geyser guarantees every account/transaction update via persistent stream

3. **Predictable subscription pattern** (monitoring specific programs/accounts)
   - Constant polling for "has X changed?" wastes compute
   - Geyser subscriptions deliver only when state actually changes

4. **High-frequency updates needed** (trading bots, real-time dashboards)
   - Popular accounts (Token Program, major DEXs) update thousands of times per second
   - Polling creates thundering herd problems
   - Geyser streams updates without client-initiated requests

### Stick with RPC when:

- Queries are random/unpredictable (can't define subscription filters)
- One-time or infrequent lookups
- Simple applications where 200-500ms latency acceptable
- No infrastructure to manage streaming connections

## Yellowstone gRPC: The Standard Implementation

Yellowstone is the ecosystem-standard Geyser implementation, pioneered by Triton One and widely adopted. It provides typed gRPC interfaces over Geyser's raw callbacks.

### Core Components

**Dragon's Mouth (yellowstone-grpc)**: Ultra-low latency gRPC streaming
- Direct validator memory access via Geyser interface
- Protobuf-typed messages (accounts, transactions, blocks, slots)
- Sub-50ms p90 latency for account updates
- Use for: HFT, MEV bots, liquidation engines, RFQ desks

**Fumarole**: Reliability-focused with buffering
- Handles network instability and client disconnections
- Guarantees 100% data delivery for indexers
- Automatic replay from missed slots

**Whirligig**: WebSocket adapter
- Wraps Dragon's Mouth in familiar WebSocket interface
- Backward compatible with native Solana WebSockets
- Better for frontend/dApp UIs than gRPC

**Old Faithful**: Historical archive access
- Combines live streaming with historical queries
- Full backfill capabilities for indexers

### Protocol Characteristics

- **Transport**: HTTP/2 + gRPC (vs WebSocket's HTTP/1.1)
- **Serialization**: Protobuf (compact, typed) vs JSON (verbose, untyped)
- **Connection model**: Bidirectional streaming with flow control
- **Compression**: Built-in zstd support for reduced bandwidth

## Common Use Cases

### High-Frequency Trading / MEV

**Pattern**: Subscribe to specific DEX program accounts
```
Filter: accounts by owner = [Raydium AMM Program ID]
Receive: Every liquidity pool state change in real-time
Latency requirement: <10ms to execute profitable trades
```

Traditional RPC misses opportunities in the 150-500ms polling gap. Geyser delivers updates 10-30x faster.

### Indexing Platforms

**Pattern**: Subscribe to all transactions for program analysis
```
Filter: transactions with accountInclude = [your program IDs]
Receive: Complete transaction history with logs and account diffs
Completeness requirement: Cannot miss any transactions
```

Geyser guarantees sequential delivery. Fumarole variant adds replay buffers for network interruptions.

### Real-Time Analytics / Dashboards

**Pattern**: Monitor token mints, transfers, or program invocations
```
Filter: accounts matching specific memcmp conditions
Receive: Only matching account updates (e.g., mint authority changes)
Update frequency: Hundreds to thousands per second during peak activity
```

WebSocket-based approaches struggle with update volume; Geyser scales efficiently.

### Trading Bots / Wallet Notifications

**Pattern**: Track specific wallet addresses or token accounts
```
Filter: accounts = [user wallet addresses]
Receive: Balance changes, NFT transfers, transaction confirmations
User expectation: Instant notifications (<2s from on-chain event)
```

Polling creates notification delays of 5-30 seconds. Geyser enables sub-second alerts.

## Self-Hosted vs Provider-Hosted

### Self-Hosted Geyser

**Requirements:**
- Full Solana validator node (1-2TB storage, 256GB+ RAM)
- Dedicated non-voting follower for streaming isolation
- Yellowstone plugin compilation and configuration
- Infrastructure monitoring and maintenance

**When to self-host:**
- Maximum control over filtering and data routing
- Direct database integration needs (PostgreSQL, BigTable, Kafka)
- Cost optimization at very high throughput
- Specialized low-latency requirements (co-located infrastructure)

**Complexity:** High—validator management is non-trivial. Plugin configuration requires understanding Geyser interface internals.

### Provider-Hosted (Managed Geyser)

**Providers:** Helius, QuickNode, Triton One, Chainstack, Shyft, others

**Characteristics:**
- gRPC endpoints with authentication tokens
- Pre-configured filters for common use cases
- Built-in failover and load balancing
- Historical replay buffers (typically 3000 slots / ~20 minutes)

**Pricing patterns:**
- Entry tier: $49-150/month for single stream
- Mid-tier: $150-500/month for multiple streams
- Enterprise: $1000+/month for dedicated nodes and custom SLAs

**When to use providers:**
- Development/testing without infrastructure overhead
- Small to medium-scale applications
- Need for quick deployment without validator operations expertise
- Geographic distribution requirements (multi-region endpoints)

## Performance Characteristics

### Latency Comparison (p90)

| Method | Slot Updates | Account Updates | Transaction Notifications |
|--------|-------------|-----------------|--------------------------|
| RPC Polling | ~150ms | ~374ms | ~200ms |
| WebSocket | ~10ms | ~374ms | ~50ms |
| Geyser (Yellowstone) | ~5ms | ~215ms | ~15ms |
| Geyser (Dedicated) | ~2ms | ~50ms | ~5ms |

Source: Triton One benchmarks, Helius production metrics

### Throughput

- Single Geyser stream: 100K+ updates/second sustained
- Bottleneck: Network bandwidth and client processing, not plugin
- Filtering critical: Unfiltered streams can exceed 1M updates/second on busy programs

### Resource Usage

**Validator overhead:**
- CPU: ~5-10% additional load for Yellowstone plugin
- Memory: ~2-4GB for buffering and serialization
- Network: Depends on filter scope (MB/s to GB/s for unfiltered streams)

**Why dedicated nodes matter:** These resources compete with consensus if run on voting validators.

## Configuration and Filtering

### Filter Types

**Account filters:**
```json
{
  "accounts": {
    "my_filter": {
      "account": ["specific_pubkey"],
      "owner": ["program_id"],
      "filters": [
        { "memcmp": { "offset": 0, "bytes": "base58_encoded" } },
        { "dataSize": 165 }
      ]
    }
  }
}
```

**Transaction filters:**
```json
{
  "transactions": {
    "my_tx_filter": {
      "accountInclude": ["program_id", "token_program"],
      "accountExclude": ["spam_accounts"],
      "vote": false,
      "failed": false
    }
  }
}
```

**Commitment levels:** `processed`, `confirmed`, `finalized`
- Most applications use `confirmed` (balance between speed and safety)
- `processed` for maximum speed (risk of dropped transactions on minority forks)
- `finalized` for absolute safety (adds ~8-13 second delay)

### Filter Best Practices

1. **Be specific:** Narrow filters reduce bandwidth and processing overhead
2. **Use accountRequired:** Forces transactions to touch all specified accounts (stricter than accountInclude)
3. **Exclude high-volume programs:** Filter out vote transactions and known spam programs
4. **Memcmp for data matching:** More efficient than receiving and filtering client-side
5. **Test filter scope:** Start broad, measure update volume, then narrow to essential data

## Common Pitfalls

### 1. Not Handling Processed Commitment

Geyser streams at "processed" by default—transactions may be from minority forks that get dropped. Solutions:
- Wait for `confirmed` commitment in critical applications
- Track slot progression to detect forks
- Implement reconciliation logic for reverted transactions

### 2. Unfiltered Subscriptions

Subscribing without filters creates massive data streams:
- Token Program receives 100K+ updates/second
- System Program even higher
- Results: Client overwhelm, connection drops, excessive API charges

**Always filter to minimum required scope.**

### 3. Connection Management

gRPC connections can be terminated by load balancers during idle periods. Solutions:
- Send ping messages every 15 seconds (Yellowstone servers send pings; reply to them)
- Implement automatic reconnection with exponential backoff
- Use `fromSlot` parameter to replay missed data after reconnection

### 4. Assuming Sequential Slot Delivery

Validators process multiple slots concurrently. Update ordering:
- Within a slot: Sequential
- Across slots: Can arrive out of order during network congestion
- Track slot numbers explicitly; don't assume monotonic increment

### 5. Ignoring Resource Limits

Provider tiers often limit:
- Concurrent streams (1-25 depending on plan)
- Filter complexity (max accounts, max filters)
- Bandwidth (implicit throttling at high volume)

Understand tier limits before architecting system dependencies.

## Integration Patterns

### Pattern 1: Direct Database Streaming

For indexers and analytics platforms:
```
Geyser Plugin → PostgreSQL/BigTable/ClickHouse
```

Use open-source plugins:
- `solana-accountsdb-plugin-postgres` (streams to PostgreSQL)
- `solana-accountsdb-plugin-bigtable` (streams to Google Cloud Bigtable)
- Custom plugins for ClickHouse, MongoDB, etc.

Best for: Self-hosted validators with direct database integration needs

### Pattern 2: Message Queue Buffering

For distributed processing:
```
Geyser Plugin → Kafka/SQS/Redis Streams → Consumer Services
```

Benefits:
- Decouples streaming from processing
- Multiple consumers from single stream
- Built-in replay and persistence

Use: `solana-accountsdb-sqs-plugin`, `yellowstone-grpc-kafka`

### Pattern 3: gRPC Client Consumption

For application developers:
```
Managed Geyser Provider → gRPC Client (Rust/TypeScript/Go/Python) → Business Logic
```

Simplest pattern for most developers. Use provider SDKs:
- `@triton-one/yellowstone-grpc` (TypeScript)
- `yellowstone-grpc-client` (Rust)
- Community clients for Go, Python

### Pattern 4: Hybrid (Geyser + RPC)

Combine streaming with occasional RPC queries:
```
Geyser → Real-time updates for subscribed data
RPC → On-demand queries for historical or unsubscribed data
```

Example: Stream new token mints (Geyser), fetch token metadata (RPC)

## Alternatives and Complementary Technologies

### ShredStream (Jito)

Streams raw shreds (network-level data units) before block assembly. Even lower latency than Geyser but requires complex reconstruction logic.

**When to use:** Absolute minimum latency for block builders and searchers
**Tradeoff:** Complexity vs 2-5ms additional latency savings over Geyser

### Native WebSockets

Solana's built-in WebSocket methods (`accountSubscribe`, `logsSubscribe`, etc.)

**Advantages:**
- No infrastructure setup
- Built into every RPC node
- Familiar API for web developers

**Disadvantages:**
- JSON encoding overhead (10x larger payloads than Protobuf)
- Limited filter capabilities
- Connection stability issues under load
- Higher latency than Geyser

**Use when:** Building simple dApps with basic subscription needs, not production infrastructure

### Custom Geyser Plugins

Implementing your own `GeyserPlugin` trait for specialized data routing.

**Examples:**
- `quic_geyser_plugin`: Streams over QUIC protocol for UDP-like speed
- `waverider`: Streams to PostgREST servers
- Custom plugins for ML pipelines, monitoring systems

**When to build:** Very specific infrastructure requirements not met by existing plugins

## Decision Framework

**Use Geyser if:**
- Latency <50ms required ✓
- Need guaranteed data completeness ✓
- Subscription pattern is predictable ✓
- Update volume >100 requests/second ✓
- Budget allows provider fees OR team can manage validator ✓

**Choose provider-hosted if:**
- Latency <50ms required ✓
- No validator operations expertise ✗
- Development/testing phase ✓
- Geographic distribution needed ✓

**Self-host if:**
- Latency <10ms required (co-located infrastructure) ✓
- Very high throughput (cost optimization) ✓
- Custom data routing needs ✓
- Team has validator operations expertise ✓

**Stay with RPC/WebSocket if:**
- Simple dApp with modest real-time needs
- Budget <$50/month for infrastructure
- Queries are unpredictable/random
- Latency tolerance >200ms

## Production Checklist

Before deploying Geyser-based systems:

1. **Filter validation:** Test filter scope, measure update volume
2. **Commitment strategy:** Define processed vs confirmed handling
3. **Reconnection logic:** Implement automatic reconnection with `fromSlot` replay
4. **Monitoring:** Track connection uptime, data gaps, latency metrics
5. **Error handling:** Plan for plugin downtime, provider outages
6. **Cost modeling:** Estimate provider tier needs or self-hosting costs
7. **Data reconciliation:** Implement fork detection for processed commitment
8. **Rate limiting:** Respect provider tier limits on concurrent streams
9. **Compression:** Enable zstd compression for bandwidth optimization
10. **Testing:** Load test with production-volume data before launch

## Future Developments

**Emerging patterns (2025-2026):**
- Provider consolidation around Yellowstone standard
- Improved historical replay (beyond 3000 slots)
- Better client libraries for Python, Go, other languages
- Hybrid models (Geyser + RPC combined APIs)
- Lower entry pricing ($10-25/month tiers appearing)

**Watch:** Firedancer client (Anza) will have different Geyser implementation; plugin compatibility unknown as of early 2026.

## Summary: Architectural Decision Guide

| Requirement | Solution |
|-------------|----------|
| HFT / MEV bot (<10ms latency) | Dedicated Geyser node or premium provider with co-location |
| Indexer (completeness critical) | Fumarole or provider with replay guarantees |
| Real-time dashboard | Whirligig (WebSocket wrapper) or basic Yellowstone |
| Wallet notifications | Provider-hosted Yellowstone (account filters) |
| Development/testing | Provider entry tier ($49-150/month) |
| Simple dApp | Native WebSockets (no Geyser needed) |
| Cost-sensitive high throughput | Self-hosted Geyser + custom plugin |

Geyser plugins represent a fundamental architectural shift from request/response (RPC) to event streaming (push). Choose them when real-time data access is a competitive advantage, not just a nice-to-have feature. The complexity investment pays off in latency, reliability, and scalability for systems where timing matters.
