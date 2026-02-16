---
pack: solana
topic: "Indexing Strategies"
decision: "How do I index on-chain data efficiently?"
confidence: 9/10
sources_checked: 15
last_updated: "2026-02-16"
---

# Indexing Strategies

**Context:** You need to index Solana on-chain data for your application—tracking account changes, monitoring transactions, building dashboards, or powering analytics. Picking the wrong approach means either missing data, falling behind the network, or burning through your RPC budget.

**The decision:** Which indexing strategy fits your latency requirements, data volume, and infrastructure tolerance?

---

## The Core Problem: getProgramAccounts is Slow

### Why getProgramAccounts Doesn't Scale

`getProgramAccounts` (gPA) is the first method most developers discover. It queries a node to fetch all accounts owned by a program. The problems:

- **Requires constant polling** to detect changes
- **Fetches entire datasets repeatedly** even when nothing changed
- **Heavy RPC load** that can cause validators to fall behind
- **Rate-limited or banned** on large programs (e.g., Serum, Raydium)
- **2-10 second latencies** under normal conditions
- **Can timeout entirely** on programs with >10k accounts

**Real-world impact:** During network congestion, gPA calls can take 30+ seconds or fail outright. High-frequency polling will get your API key rate-limited. Many RPC providers cache results, meaning you see stale data.

**When it's still useful:**
- One-time data pulls (initial backfill)
- Small programs with <1000 accounts
- Infrequent queries where staleness is acceptable
- Combined with `memcmp` and `dataSize` filters to reduce payload

### gPA Performance Improvements (2024-2025)

Some providers now offer optimized gPA:

- **Helius:** 2-10x faster gPA with automatic indexing after first call
- **Triton Steamboat:** Custom indexes that accelerate gPA by up to 99%
- **Automatic caching:** Most providers cache common program queries

**Reality check:** Even with optimizations, gPA is fundamentally pull-based polling. For real-time needs, you need push-based streaming.

---

## Real-Time Indexing: Geyser Plugins & Yellowstone gRPC

### What is Geyser?

Geyser plugins tap directly into Solana validator memory to stream account, slot, block, and transaction data as it happens. This eliminates polling entirely.

**How it works:**
1. Validator processes transactions
2. Geyser plugin emits data from memory (not disk)
3. External systems receive structured updates in real-time
4. Data arrives at `Processed` commitment level (fastest, but not confirmed)

**Architecture shift:** Move from pull (RPC polling) to push (event streaming).

### Yellowstone gRPC: The Standard

Yellowstone is Triton's open-source gRPC implementation of Geyser, now the de facto standard across providers.

**Key features:**
- **Sub-second latency:** Data arrives 400ms-1s after on-chain event
- **Binary protocol (gRPC):** Compact, fast, persistent connections
- **Structured data:** Protobuf-encoded accounts, transactions, slots
- **Advanced filtering:** Subscribe to specific programs, accounts, transaction types
- **Commitment levels:** Choose between `Processed`, `Confirmed`, `Finalized`

**Performance characteristics:**
- **Bandwidth:** 1.6 TB/month for all token accounts, ~144 TB/month for all accounts
- **Latency:** P50 at <100ms from on-chain event (via dedicated nodes)
- **Throughput:** Handles 1.3 GB/s with Rust-powered SDKs

### Provider Options

| Provider | Solution | Key Features | Pricing Model |
|----------|----------|--------------|---------------|
| **Helius** | LaserStream | 24-hour historical replay, auto-reconnect, multi-region failover | Data add-ons: $500/mo (5TB), $900 (10TB), $2k (25TB) |
| **Triton** | Dragon's Mouth | Core Yellowstone gRPC, ultra-low latency | Custom enterprise pricing |
| **Triton** | Fumarole | Persistent streaming with 23-hour caching, automatic redundancy | Custom pricing |
| **Chainstack** | Yellowstone gRPC | Managed Geyser on Global/Dedicated nodes | Included in node plans |
| **QuickNode** | Geyser plugin | `fromSlot` parameter for 3000-slot (~20 min) replay | Marketplace add-on |

**Helius LaserStream advantages:**
- Drop-in Yellowstone replacement (same API)
- No dedicated node management required
- Automatic reconnection and slot-based replay
- Enhanced WebSockets use same backend (1.5-2x faster than standard WS)

**Triton Yellowstone advantages:**
- Pioneered gRPC for Solana streaming (2021)
- Multiple tools: Dragon's Mouth (core), Fumarole (persistent), Vixen, Steamboat
- Runs on dedicated non-voting validators (no resource contention)

### When to Use Geyser/Yellowstone

**Perfect for:**
- Real-time trading bots (MEV, arbitrage)
- Live dashboards and analytics
- DEX order book monitoring
- Event-driven indexers
- Wallet activity tracking

**Not ideal for:**
- One-time historical backfills (use archival RPC)
- Simple read queries (use standard RPC)
- Projects with <10 req/min (webhooks may be simpler)

**Commitment level strategy:**
- Use `Processed` for lowest latency (but handle potential reorgs)
- Handle commitment promotion on client side (don't rely on Geyser to buffer)
- For finality guarantees, confirm at `Confirmed` or `Finalized` yourself

---

## Mid-Tier Solutions: WebSockets & Webhooks

### Enhanced WebSockets (Helius)

Helius Enhanced WebSockets are powered by LaserStream infrastructure (1.5-2x faster than standard Solana WebSockets).

**Comparison to standard WebSockets:**
- Standard WS: End-of-slot updates, frequent disconnections, no historical replay
- Enhanced WS: Intra-slot updates via Geyser backend, auto-reconnect, lower latency

**Supported methods:**
- `accountSubscribe`: Real-time account changes
- `logsSubscribe`: Program log streaming
- `signatureSubscribe`: Transaction confirmation tracking
- `slotSubscribe`: Slot progression monitoring

**When to use:**
- Front-end/browser apps (WebSocket-native)
- Moderate data volume (<10GB/month)
- Simpler than gRPC setup

### Webhooks (Server-to-Server Push)

Webhooks deliver HTTP POST requests to your endpoint when specific events occur.

**Helius webhook types:**
- **Discord webhooks:** Stream updates to Discord channels
- **Raw transaction webhooks:** All transactions for watched addresses
- **Enhanced transaction webhooks:** Parsed, human-readable data (NFT sales, swaps, transfers)
- **Token mint webhooks:** Track new token creation

**Pricing:** 1 credit per webhook event sent (charged regardless of endpoint success)

**Limitations:**
- **No filtering by transaction type** on raw webhooks
- **Potential duplicates** (Helius may retry failed deliveries)
- **25 address limit** via dashboard (use API/SDK for more)

**When to use:**
- Monitoring specific wallets/addresses
- Event-driven workflows (alerts, notifications)
- Simpler infrastructure than maintaining WebSocket/gRPC connections
- Backend services, not real-time front-ends

---

## Specialized APIs: DAS & Enhanced Transactions

### Digital Asset Standard (DAS) API

DAS provides a unified interface for querying NFTs, compressed NFTs, fungible tokens, and inscriptions.

**Key methods:**
- `getAsset`: Single asset by mint address
- `getAssetsByOwner`: All assets owned by wallet
- `searchAssets`: Complex filtered queries
- `getAssetsByGroup`: Query by collection
- `getAssetProof`: Merkle proofs for compressed NFTs

**What makes it special:**
- **Unified interface:** One API for all asset types (vs. multiple RPC calls)
- **Off-chain data:** Automatically indexes Arweave/IPFS metadata
- **Price data:** Top 10k tokens by 24h volume
- **Token-2022 support:** Including all extensions

**Performance:**
- Independent rate limits from RPC (e.g., 10 DAS RPS + 50 RPC RPS)
- Pagination: 100-1000 items per request
- Caching recommended for repeated queries

**When to use:**
- NFT marketplaces, explorers
- Wallet portfolio tracking
- Token-gated applications
- DeFi dashboards needing asset data

**When NOT to use:**
- Real-time trading (use Geyser)
- Historical transaction analysis (use archival RPC)
- Raw program account data (use standard RPC)

### Enhanced Transactions API (Helius)

Provides parsed, human-readable transaction data.

**What it parses:**
- NFT sales, listings, bids
- Token swaps (Jupiter, Raydium, Orca)
- DeFi protocol interactions
- Transfer events

**Benefit:** Skip custom transaction parsing logic.

---

## Historical Data & Backfills

### getTransactionsForAddress (Helius)

Helius-exclusive method that replaces the standard `getSignaturesForAddress` + `getTransaction` pattern.

**Key features:**
- **Single RPC call** for paginated transaction history
- **Time-based filtering:** Query by timestamp or slot range
- **Bidirectional sorting:** Oldest-first or newest-first
- **Token account filters:** `tokenAccounts: "all"` includes associated token accounts
- **10x faster** than chaining standard methods

**Example use case:**
Getting full wallet history that previously took 1000+ RPC calls now takes <60 seconds with slot-based filtering.

### Archival RPC Services

For comprehensive historical analysis, archival nodes store Solana's entire history since genesis.

**Helius archival:**
- **8ms P50 lookup times** under production load
- **Petabyte-scale NVMEs** on bare metal
- **Multi-region replication** for redundancy
- **10x lower latency** than standard archival solutions

**When to use:**
- Initial backfill for new indexes
- Compliance/regulatory reporting
- Historical analytics and research
- Testing trading algorithms on past data

**Strategy:** Backfill with archival RPC, then keep fresh with LaserStream/Geyser.

---

## Custom Indexers vs. Hosted Services

### Build Your Own Indexer

**When to build custom:**
- Unique data transformations not offered by providers
- Need full control over data storage schema
- Regulatory requirements for data custody
- Extremely high query volume that benefits from custom indexes

**Tech stack options:**
1. **Geyser plugin → PostgreSQL** (Solana's reference implementation)
2. **Geyser plugin → Kafka → ClickHouse** (high-throughput analytics)
3. **Geyser plugin → Redis → Application** (low-latency caching)
4. **Substreams** (The Graph protocol, parallel processing)

**Challenges:**
- **Infrastructure complexity:** Dedicated nodes, database management, backup/recovery
- **Missed data handling:** Reorg detection, commitment level promotion
- **Operational overhead:** Monitoring, version upgrades, network changes

### Hosted Indexer Services

**The Graph on Solana:**
- Subgraphs for custom data indexing
- GraphQL query interface
- Decentralized network of indexers
- **Status:** Still limited Solana support vs. EVM chains

**Hosted alternatives:**
- **Helius DAS + LaserStream:** Covers most NFT/token use cases
- **Triton Project Yellowstone suite:** Enterprise streaming infrastructure
- **Photon (Triton):** ZK compression indexer

**Cost comparison (approximate):**
- **DIY Geyser:** $500-2k/mo (dedicated node) + database + engineering time
- **Managed streaming:** $500-2k/mo (data add-ons, no infrastructure)
- **Hybrid:** Archival backfill + real-time streaming (most cost-effective for most teams)

---

## Account Filters: Making gPA Useful

When you must use `getProgramAccounts`, filters reduce payload and improve performance.

### memcmp (Memory Compare)

Filter accounts by matching bytes at specific offsets.

**Common patterns:**
```javascript
// Find all token accounts for a specific mint
{
  memcmp: {
    offset: 0, // Mint address location in token account
    bytes: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" // USDC mint
  }
}

// Find all token accounts with non-zero balance
{
  memcmp: {
    offset: 64, // Amount field location
    bytes: base58.encode(/* non-zero value */)
  }
}
```

**Performance impact:** Can reduce results from 100k accounts to <1k.

### dataSize

Filter accounts by exact data size.

```javascript
{
  dataSize: 165 // Standard SPL token account size
}
```

**Use case:** Exclude closed accounts or filter by account type.

### Combining Filters

```javascript
const filters = [
  { dataSize: 165 },
  { memcmp: { offset: 32, bytes: ownerPublicKey } }, // Owner filter
  { memcmp: { offset: 0, bytes: mintAddress } }       // Mint filter
];
```

**Best practice:** Most specific filters first to minimize data transfer.

---

## Latency & Cost Comparison

### Real-World Performance (Approximate)

| Method | Typical Latency | Cost Model | Data Freshness |
|--------|----------------|------------|----------------|
| `getProgramAccounts` | 2-10s (up to 30s) | Per RPC call | Polling interval |
| Optimized gPA (Helius/Triton) | 500ms-2s | Per RPC call | Polling interval |
| Standard WebSockets | 1-3s | Included in RPC plans | End-of-slot |
| Enhanced WebSockets | 500ms-1.5s | Streaming data quota | Intra-slot |
| Yellowstone gRPC (Dedicated) | 100-500ms | Node rental + bandwidth | 400ms (Processed) |
| LaserStream (Managed) | 200-800ms | Data add-on ($500+/mo) | 400ms (Processed) |
| Webhooks | 1-5s | Per event (1 credit) | Event-driven |
| DAS API | 100-500ms | Per API call | Indexed (slight lag) |

### Cost Scenarios (Monthly)

**Scenario 1: NFT marketplace tracking 10 collections**
- DAS API: ~$50/mo (moderate query volume)
- Webhooks for sales: ~$20/mo (event-based)
- **Total: ~$70/mo**

**Scenario 2: DEX aggregator monitoring AMM pools**
- LaserStream 5TB: $500/mo
- Archival backfill: $100/mo (one-time or periodic)
- **Total: $600/mo** (vs. $2k+ for dedicated node)

**Scenario 3: Analytics dashboard (1M accounts, hourly updates)**
- Optimized gPA with caching: ~$200/mo RPC credits
- **Total: $200/mo** (acceptable staleness)

**Scenario 4: High-frequency trading bot**
- LaserStream 10TB: $900/mo
- Helius Sender (transaction submission): $0 credits (tip-based)
- **Total: $900/mo** + SOL tips

---

## Decision Framework

### Choose Yellowstone gRPC / LaserStream if:
- Latency <1s is critical
- Real-time trading, MEV, or arbitrage
- Building event-driven systems
- Monitoring high-activity programs
- Budget supports $500+/mo streaming

### Choose Enhanced WebSockets if:
- Front-end/browser application
- Moderate data volume
- Simpler than gRPC integration
- Need specific account/log subscriptions

### Choose Webhooks if:
- Monitoring <100 addresses
- Event-driven workflows (alerts, notifications)
- Backend processing, not real-time UI
- Prefer HTTP over persistent connections

### Choose DAS API if:
- NFT/token metadata queries
- Portfolio tracking
- Don't need raw account data
- Unified interface preferred

### Choose gPA (with filters) if:
- Infrequent queries (hourly/daily)
- Small result sets (<1000 accounts)
- One-time data pulls
- Acceptable staleness

### Choose Archival RPC if:
- Historical analysis
- Initial backfill
- Compliance reporting
- Algorithm backtesting

---

## Production Indexing Patterns

### Pattern 1: Hybrid Archival + Real-Time

**Strategy:**
1. Backfill historical data via `getTransactionsForAddress` or archival gPA
2. Keep index fresh with LaserStream/Geyser
3. Use slot-based deduplication to avoid gaps

**Implementation:**
```typescript
// 1. Backfill from archival
const historicalData = await getTransactionsForAddress({
  address: programId,
  sortOrder: "asc",
  filters: { blockTime: { gte: startTimestamp, lte: nowTimestamp } }
});

// 2. Start real-time stream from current slot
const stream = laserStream.subscribe({
  programs: { myProgram: { account: [programId] } },
  commitment: CommitmentLevel.CONFIRMED
});

// 3. Handle overlap with slot-based deduplication
const processedSlots = new Set();
stream.on('account', (update) => {
  if (!processedSlots.has(update.slot)) {
    // Process new data
    processedSlots.add(update.slot);
  }
});
```

**Use case:** Building new indexes, recovering from downtime.

### Pattern 2: Multi-Commitment Reconciliation

**Strategy:**
1. Stream at `Processed` for lowest latency
2. Track commitment level promotions client-side
3. Reconcile on `Confirmed` or `Finalized`

**Implementation:**
```typescript
const pendingUpdates = new Map(); // slot -> update

stream.on('account', (update) => {
  if (update.commitment === 'Processed') {
    pendingUpdates.set(update.slot, update);
    // Optimistic UI update
  } else if (update.commitment === 'Confirmed') {
    const pending = pendingUpdates.get(update.slot);
    if (pending) {
      // Reconcile: check if data changed due to reorg
      if (pending.hash !== update.hash) {
        // Handle reorg
      }
      pendingUpdates.delete(update.slot);
    }
    // Persist to database
  }
});
```

**Use case:** Trading systems that need speed but must handle reorgs.

### Pattern 3: Circuit Breaker for Failed Streams

**Strategy:**
1. Monitor stream health (last update timestamp)
2. Fallback to RPC polling if stream fails
3. Automatic reconnection with replay

**Implementation:**
```typescript
const STREAM_TIMEOUT_MS = 10000; // 10s without updates = unhealthy
let lastUpdate = Date.now();

stream.on('account', () => { lastUpdate = Date.now(); });

setInterval(() => {
  if (Date.now() - lastUpdate > STREAM_TIMEOUT_MS) {
    console.warn('Stream unhealthy, falling back to RPC');
    // Fallback polling
    pollViaRPC();
    // Attempt reconnect
    stream.reconnect({ replayFromSlot: lastProcessedSlot });
  }
}, 5000);
```

**Use case:** High-availability systems that can't tolerate data loss.

### Pattern 4: Partitioned Indexing

**Strategy:**
1. Split program accounts by memcmp filter ranges
2. Run parallel indexers
3. Aggregate in final data store

**Example (token indexing):**
```typescript
// Indexer 1: Mints A-M
{ memcmp: { offset: 0, bytes: mintRange('A', 'M') } }

// Indexer 2: Mints N-Z
{ memcmp: { offset: 0, bytes: mintRange('N', 'Z') } }
```

**Use case:** Programs with >100k accounts where single indexer can't keep up.

---

## Gotchas & Anti-Patterns

### 1. Over-relying on Processed Commitment

**Problem:** Processed slots can be skipped if fork is abandoned.

**Solution:** Always promote to Confirmed for financial transactions. Use Processed only for UI previews.

### 2. Not Handling Geyser Reconnects

**Problem:** Network blips cause missed data.

**Solution:** Use providers with automatic reconnect + replay (LaserStream, Fumarole) or implement yourself.

### 3. Ignoring Commitment Level Buffering

**Problem:** Specifying `Confirmed` on Geyser stream adds latency.

**Solution:** Stream at `Processed`, handle promotion client-side for best performance.

### 4. Polling getProgramAccounts in Production

**Problem:** Rate limits, timeouts, stale data.

**Solution:** Use Geyser for real-time, gPA only for backfills or infrequent queries.

### 5. Not Filtering Geyser Subscriptions

**Problem:** Receiving all transactions/accounts burns through data quota.

**Solution:** Use `accountInclude`, `accountExclude`, program filters to reduce bandwidth.

### 6. Webhook Endpoint Failures

**Problem:** Helius retries failed webhooks, causing duplicates.

**Solution:** Make endpoints idempotent (check transaction signature before processing).

### 7. Assuming DAS Price Data is Real-Time

**Problem:** DAS only has price for top 10k tokens, and data can lag.

**Solution:** For trading, fetch prices from DEX directly via Geyser.

---

## Summary Table

| Indexing Method | Best For | Avoid For | Latency | Cost |
|----------------|----------|-----------|---------|------|
| **getProgramAccounts** | Backfills, infrequent queries | Real-time, large programs | 2-10s | Low (per call) |
| **Yellowstone gRPC** | Trading, real-time indexing | One-time queries | <500ms | $500+/mo |
| **LaserStream** | Managed real-time streaming | Budget <$500/mo | <800ms | $500+/mo |
| **Enhanced WebSockets** | Front-end apps, moderate volume | High-frequency trading | <1.5s | Data quota |
| **Webhooks** | Event-driven workflows | Real-time UI | 1-5s | Per event |
| **DAS API** | NFT/token metadata | Raw account data | 100-500ms | Per call |
| **Archival RPC** | Historical backfills | Real-time monitoring | Variable | Low-medium |

---

## References & Further Reading

**Official Documentation:**
- [Solana Geyser Plugin Interface](https://docs.solanalabs.com/validator/geyser)
- [Helius DAS API Docs](https://helius.dev/docs/das-api)
- [Helius LaserStream Docs](https://helius.dev/docs/grpc)
- [Triton Yellowstone Docs](https://blog.triton.one/complete-guide-to-solana-streaming-and-yellowstone-grpc/)

**Provider Comparisons:**
- [Best Solana RPC Providers 2026 (Chainstack)](https://chainstack.com/best-solana-rpc-providers-in-2026/)
- [Helius RPC Practical Overview (Chainstack)](https://chainstack.com/helius-rpc-provider-a-practical-overview/)

**Technical Guides:**
- [Solana Geyser Plugins Deep Dive (Helius)](https://helius.dev/blog/solana-geyser-plugins-streaming-data-at-the-speed-of-light)
- [WebSockets vs Yellowstone gRPC (Chainstack)](https://chainstack.com/real-time-solana-data-websocket-vs-yellowstone-grpc-geyser/)
- [High-Performance LaserStream SDKs (Helius)](https://www.helius.dev/blog/laserstream-sdks)
- [Monitor Solana Programs with Yellowstone (QuickNode)](https://www.quicknode.com/guides/solana-development/tooling/geyser/yellowstone)

**Performance Analysis:**
- [Faster getProgramAccounts (Helius)](https://helius.dev/blog/faster-getprogramaccounts)
- [7 Solana Indexing Stacks That Stay Real-Time (Medium)](https://medium.com/@Nexumo_/7-solana-indexing-stacks-that-stay-real-time-399b1f8c89db)
- [Real-Time RPC Infrastructure Gaps (RPC Fast)](https://rpcfast.com/blog/real-time-rpc-on-solana)

---

**The bottom line:** For production indexing, the modern stack is archival RPC for backfills + Yellowstone gRPC (or LaserStream) for real-time updates. Use DAS for asset queries, webhooks for low-volume event triggers, and optimized gPA only when streaming isn't an option. The days of polling `getProgramAccounts` in a loop are over.
