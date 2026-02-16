---
pack: solana
confidence: 8/10
sources_checked: 18
last_updated: "2026-02-16"
---

# How do I build data pipelines for Solana?

Building production-grade data pipelines for Solana requires understanding streaming architectures, database choices, and backfill strategies. This guide covers real-world patterns used by Helius, Triton, and other infrastructure providers.

## Core Architecture: Geyser → Queue → Database

The standard Solana data pipeline follows this pattern:

```
Validator (Geyser Plugin) → Stream/Queue → Parser → Database → API/Application
```

**Geyser Plugin** is Solana's low-latency streaming interface that provides real-time access to accounts, transactions, blocks, and slots without overloading validators. It's the foundation of all modern Solana indexing.

**Yellowstone gRPC** is the high-performance gRPC interface built on Geyser that most production pipelines use. It leverages Protocol Buffers for serialization and HTTP/2 for transport, providing efficient streaming connections.

### Key Components

1. **Data Source**: Yellowstone Geyser gRPC streams from validators or commercial providers (Helius, Quicknode, Alchemy, Triton)
2. **Message Queue** (optional): Kafka, RabbitMQ, or Redis Streams for buffering and backpressure handling
3. **Parser/Transformer**: Decode instructions, filter relevant data, enrich with off-chain metadata
4. **Database**: Postgres, ClickHouse, or TimescaleDB for storage and querying
5. **Application Layer**: APIs, dashboards, or event-driven workflows

## Yellowstone gRPC: The Streaming Layer

Yellowstone gRPC is the de facto standard for streaming Solana data. It's open source (maintained by Triton/rpcpool) and supported by all major RPC providers.

### Setup and Configuration

```typescript
// TypeScript example with Yellowstone gRPC
import { Client, SubscribeRequest } from "@triton-one/yellowstone-grpc";

const client = new Client(grpcEndpoint, token);

const request: SubscribeRequest = {
  accounts: {
    "my-account-sub": {
      account: ["TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"],
      owner: [],
      filters: []
    }
  },
  transactions: {
    "my-tx-sub": {
      vote: false,
      failed: false,
      accountInclude: ["YourProgramId..."],
      accountRequired: []
    }
  }
};

const stream = await client.subscribe(request);
```

### Key Features

- **Account Subscriptions**: Watch specific accounts or all accounts owned by a program
- **Transaction Subscriptions**: Filter by program, success/failure, vote/non-vote
- **Slot and Block Updates**: Track chain progression and finality
- **Historical Replay**: Quicknode supports `fromSlot` parameter to replay up to 3000 recent slots (~20 minutes)

### Streaming Best Practices

1. **Filter Aggressively**: Only subscribe to data you need. Broad subscriptions can overwhelm your pipeline.
2. **Handle Reconnections**: gRPC streams can disconnect. Implement exponential backoff and checkpoint recovery.
3. **Use Dedicated Connections**: Don't share a single gRPC connection across multiple workflows.
4. **Monitor Lag**: Track slot lag between the stream and your processing to detect bottlenecks.

## Database Selection

Your database choice depends on query patterns, scale, and team expertise.

### PostgreSQL

**Best for**: General-purpose indexing, complex relational queries, small-to-medium scale

**Advantages**:
- Rich SQL ecosystem and tooling
- ACID guarantees
- Battle-tested reliability
- Good for < 10M transactions/day

**Reference Implementation**: Solana Labs maintains `solana-accountsdb-plugin-postgres` as the reference Geyser plugin for Postgres. It supports connection pooling with multiple threads for throughput.

**Optimization Tips**:
- Use BRIN or BTREE indexes on slot/timestamp columns
- Partition tables by time ranges (daily or weekly)
- Use materialized views for common aggregations
- Consider pg_partman for automatic partition management

### ClickHouse

**Best for**: Large-scale analytics, high-write throughput, time-series aggregations

**Advantages**:
- Column-oriented storage for fast analytical queries
- Excellent compression (3-10x better than Postgres)
- Handles 4M+ rows/second with large batches (>10k rows)
- Scales horizontally with distributed tables

**When to Use**:
- Processing > 50M transactions/day
- Heavy aggregation queries (daily volumes, protocol metrics)
- Long-term archival with efficient storage

**Community Plugin**: `Solana-Geyser-Plugin-for-ClickHouse` (maintained by Torrey.xyz)

### TimescaleDB

**Best for**: Time-series data with PostgreSQL compatibility

**Advantages**:
- Built on Postgres (familiar SQL, extensions work)
- Automatic time-based partitioning (hypertables)
- Continuous aggregates for pre-computed rollups
- Better than Postgres for time-series, better than ClickHouse for small batches

**When to Use**:
- You want Postgres features + time-series optimizations
- Query patterns involve time-based ranges
- You need sub-second query latency on recent data

### Database Comparison

| Database | Write Throughput | Query Latency | Compression | Best Use Case |
|----------|------------------|---------------|-------------|---------------|
| Postgres | Moderate (100k/s) | Low (ms) | 1x | General indexing |
| ClickHouse | Very High (4M/s) | Variable | 5-10x | Large-scale analytics |
| TimescaleDB | High (500k/s) | Very Low (ms) | 2-3x | Time-series queries |

## Historical Backfill Strategies

Streaming only captures new data. You need a backfill strategy for historical data.

### Approach 1: RPC-Based Backfill

Use Solana RPC methods to query historical data:

**getTransactionsForAddress (gTFA)** — Helius's optimized method that combines `getSignaturesForAddress` + `getTransaction` into a single call. Features:
- Reverse search (newest-first or oldest-first)
- Time, status, and slot-based filtering
- Pagination with cursor support
- 2-10x faster than traditional methods

**Example Use Case**: Backfill all transactions for a wallet or program address.

```typescript
// Helius getTransactionsForAddress example
const response = await helius.getTransactionsForAddress({
  address: "YourWalletAddress",
  before: "signature-cursor",
  limit: 100,
  type: "SWAP" // filter by transaction type
});
```

**Limitations**:
- Rate-limited (RPCs throttle heavy backfills)
- Expensive for large-scale backfills (API costs)
- Slower than streaming (serial queries vs. parallel processing)

### Approach 2: LaserStream gRPC

**LaserStream** is Helius's production-grade gRPC stream, recommended as the default for all production indexing use cases. It's purpose-built for:
- Ultra-low latency (sub-100ms from finality)
- Fault-tolerant reconnection
- Exactly-once delivery guarantees (with checkpointing)

**Key Advantage**: Works for both real-time streaming and near-term backfills (if provider supports historical replay).

### Approach 3: Parallel Historical Processing

For massive backfills (millions of blocks), use parallel block processing:

**Substreams** (by The Graph) processes historical blocks in parallel, resulting in:
- **72,000% faster indexing** vs. serial RPC queries
- **70% lower infrastructure costs**
- Built-in checkpointing and resumability

**Carbon Framework** (Rust) provides modular indexing with:
- 7 pre-built data source crates (RPC, WebSocket, gRPC)
- 40 pre-built decoder crates for common programs
- Parallel block processing out of the box

### Approach 4: Buy Historical Archives

For complete historical data, consider purchasing indexed archives:
- **Helius Historical Data API**: Pre-indexed, queryable transaction history
- **GetBlock Indexed Archive**: Full historical transaction database
- **SQD Network**: Decentralized block processing and storage

**Trade-off**: Higher cost, but eliminates backfill complexity and RPC rate limits.

## Real Pipeline Architectures

### Simple Pipeline (< 1M txs/day)

```
Yellowstone gRPC → Node.js Parser → PostgreSQL → REST API
```

**Use Case**: Track specific program activity (DEX, NFT marketplace)
**Cost**: $50-200/month (RPC + database)
**Latency**: 200-500ms from finality to API

### Medium Pipeline (1-50M txs/day)

```
Yellowstone gRPC → Kafka → Rust/Go Workers → ClickHouse → GraphQL API
```

**Use Case**: Multi-program analytics dashboard
**Components**:
- Kafka for buffering and replay (handles backpressure)
- Horizontal scaling (multiple worker pods)
- ClickHouse for fast aggregations

**Cost**: $500-2000/month
**Latency**: 500ms-2s

### Large Pipeline (50M+ txs/day)

```
Multiple Yellowstone Streams → Kafka Cluster → Spark/Flink → ClickHouse Cluster → Caching Layer → API
```

**Use Case**: Protocol-wide analytics (à la Dune, Flipside)
**Advanced Features**:
- Stream partitioning by program or account
- Real-time materialized views
- Multi-region replication
- Redis/Memcached for hot queries

**Cost**: $5k-50k/month
**Latency**: 1-5s (batch processing)

## Production Patterns and Gotchas

### Checkpoint and Resume

Always checkpoint your last processed slot. If your stream disconnects, resume from the checkpoint to avoid gaps or duplicates.

```typescript
// Example checkpointing pattern
async function processStream() {
  let lastProcessedSlot = await getCheckpoint();

  const stream = await client.subscribe({
    commitment: "finalized",
    slots: {}
  });

  for await (const update of stream) {
    if (update.slot) {
      await processSlot(update.slot);
      await saveCheckpoint(update.slot.slot);
      lastProcessedSlot = update.slot.slot;
    }
  }
}
```

### Handle Inner Instructions

Solana transactions contain inner instructions (from Cross-Program Invocations). Your parser MUST decode inner instructions to capture all token transfers, swaps, and state changes.

**Tools**:
- Helius Enhanced Transactions API (100+ parsers built-in)
- `@debridge-finance/solana-transaction-parser`
- `@shyft-to/solana-transaction-parser`

### Monitor Pipeline Health

Track these metrics:
1. **Stream Lag**: Current slot - last processed slot
2. **Processing Rate**: Transactions/second
3. **Error Rate**: Failed parses, DB write failures
4. **Queue Depth**: Messages waiting in Kafka/Redis

### Cost Optimization

- **Filter Early**: Don't stream data you won't use
- **Batch Writes**: Write to DB in batches (100-1000 rows) for better throughput
- **Use Compression**: ClickHouse/TimescaleDB compression can reduce storage costs 5-10x
- **Cache Aggressively**: Use Redis for hot queries (recent transactions, popular accounts)

## Recommended Stack by Use Case

| Use Case | Stream | Queue | Parser | Database | Cost |
|----------|--------|-------|--------|----------|------|
| Wallet Tracker | Helius gRPC | None | TypeScript | Postgres | $100/mo |
| DEX Analytics | Quicknode Yellowstone | Redis | Rust | TimescaleDB | $500/mo |
| Protocol Analytics | Triton Yellowstone | Kafka | Rust/Go | ClickHouse | $2k+/mo |
| Cross-chain Bridge | Self-hosted Yellowstone | Kafka | Rust | Postgres + ClickHouse | $5k+/mo |

## Tools and Libraries

**Streaming**:
- `@triton-one/yellowstone-grpc` (TypeScript)
- `yellowstone-grpc` (Rust crate)
- Helius LaserStream (via SDK)

**Parsing**:
- `@debridge-finance/solana-transaction-parser` (IDL-based, TypeScript)
- `@shyft-to/solana-transaction-parser` (TypeScript)
- `yellowstone-vixen` (Rust parsing toolkit)

**Geyser Plugins**:
- `solana-accountsdb-plugin-postgres` (official reference)
- `Solana-Geyser-Plugin-for-ClickHouse` (community)

**Frameworks**:
- **Carbon** (Rust, modular indexing)
- **Substreams** (parallel historical processing)
- **SQD Network** (decentralized indexing)

## Further Reading

- Yellowstone gRPC GitHub: https://github.com/rpcpool/yellowstone-grpc
- Solana Geyser Plugin Docs: https://docs.solana.com/developing/plugins/geyser-plugins
- Helius Indexing Guide: https://www.helius.dev/docs/rpc/how-to-index-solana-data
- Carbon Framework: https://solanacompass.com/learn/accelerate-25

## Sources

- [Yellowstone gRPC Overview | Alchemy Docs](https://www.alchemy.com/docs/reference/yellowstone-grpc-overview)
- [Yellowstone gRPC - Solana Geyser Streaming | Quicknode Docs](https://www.quicknode.com/docs/solana/yellowstone-grpc/overview)
- [Monitor Solana Programs with Yellowstone Geyser gRPC (TypeScript) | Quicknode Guides](https://www.quicknode.com/guides/solana-development/tooling/geyser/yellowstone)
- [GitHub - rpcpool/yellowstone-grpc: Triton's Dragon's Mouth Yellowstone gRPC service](https://github.com/rpcpool/yellowstone-grpc)
- [Solana Yellowstone gRPC: Real-Time Data Streaming - Helius Docs](https://www.helius.dev/docs/grpc)
- [Analyzing Solana On-chain Data: Tools & Dashboards](https://www.helius.dev/blog/solana-data-tools)
- [Historical Solana Data API for Indexing and Backfills](https://www.helius.dev/historical-data)
- [7 Reliable Solana Data Providers for Engineering Teams in 2025](https://theonchainquery.com/7-reliable-solana-data-providers-for-engineering-teams-in-2025/)
- [Solana Validator Geyser Plugins | Agave](https://docs.solana.com/developing/plugins/geyser-plugins)
- [GitHub - paahaad/Solana-Geyser-Plugin-for-ClickHouse](https://github.com/paahaad/Solana-Geyser-Plugin-for-ClickHouse)
- [GitHub - solana-labs/solana-accountsdb-plugin-postgres](https://github.com/solana-labs/solana-accountsdb-plugin-postgres)
- [How to Backfill Solana Transaction Data | Quicknode Guides](https://www.quicknode.com/guides/quicknode-products/streams/how-to-backfill-solana-tx-data)
- [How to Index Solana Data - Helius Docs](https://www.helius.dev/docs/rpc/how-to-index-solana-data)
- [How Substreams Solves Solana's 5 Indexing Pains | The Graph](https://thegraph.com/blog/solana-indexing-pains/)
- [getTransactionsForAddress & up to 10x Faster Archival Data](https://www.helius.dev/blog/introducing-gettransactionsforaddress)
- [Carbon: The Game-Changing Rust Framework for Indexing Solana Programs](https://solanacompass.com/solana-compass-learn/accelerate-25/scale-or-die-at-accelerate-2025-indexing-solana-programs-with-carbon)
- [The Problems with Solana Data Indexing | Astralane](https://medium.com/@astralaneio/the-problems-with-solana-data-indexing-580ecb73c402)
- [ClickHouse vs TimescaleDB: Best for real-time analytics](https://www.tinybird.co/blog/clickhouse-vs-timescaledb)
