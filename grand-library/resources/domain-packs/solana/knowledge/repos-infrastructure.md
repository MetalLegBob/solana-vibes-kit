---
pack: solana
topic: "Forkable Repos — Infrastructure"
type: repo-catalogue
confidence: 7/10
sources_checked: 20
last_verified: "2026-02-16"
---

# Infrastructure — Forkable Repo Catalogue

> **Verification status:** Live-verified on 2026-02-16 via GitHub API and Exa web search. Star/fork counts are approximate (±5%). License information confirmed against GitHub's license detection.

---

## Data Streaming / Geyser Plugins

### Yellowstone gRPC (Dragon's Mouth)

- **URL:** https://github.com/rpcpool/yellowstone-grpc
- **Framework:** Rust
- **License:** AGPL-3.0 (confirmed) — **copyleft, network-accessible derivatives must publish source**
- **Use cases:** Fork candidate (with AGPL compliance), Reference implementation
- **Category tags:** Data streaming, Geyser plugin, gRPC, real-time data

**Trust signals:**
- Maintained by Triton (rpcpool) — major Solana RPC infrastructure provider
- The backbone of Solana data streaming
- Production-proven at scale
- ~909 stars, ~336 forks. Latest release v12.0.0+solana.3.1.8 (Feb 2026). Very actively maintained.

**Builder notes:**
> The most important data streaming infrastructure on Solana. Streams account updates, transaction data, and slot notifications via gRPC from a Geyser-enabled validator. If you need real-time on-chain data, this is the standard. **AGPL-3.0 is a significant consideration** — if you build proprietary infrastructure on top, you must open-source it. For most builders, use a hosted Yellowstone service (Triton, Helius) rather than running your own. If self-hosting, budget for validator infrastructure.

**Complexity:** High — requires Geyser-enabled validator, gRPC client setup
**Confidence:** 8/10
**Last verified:** 2026-02-16

---

### Geyser Plugin Postgres

- **URL:** https://github.com/anza-xyz/agave-geyser-plugin-postgres (successor to solana-labs/solana-accountsdb-plugin-postgres)
- **Framework:** Rust
- **License:** Apache 2.0
- **Use cases:** Fork candidate, Reference implementation
- **Category tags:** Geyser plugin, PostgreSQL, indexing, data pipeline

**Trust signals:**
- Forked from official Solana Labs reference implementation for the Geyser plugin interface
- **⚠️ MOVED:** Original `solana-labs/solana-accountsdb-plugin-postgres` is stale/abandoned. Forked to `anza-xyz/agave-geyser-plugin-postgres` (16 stars, 7 forks) but low activity. The `solana-labs/solana` monorepo was archived Jan 2025.
- ~132 stars, ~131 forks (original repo). Successor has minimal traction.

**Builder notes:**
> Streams account and transaction data from a validator to PostgreSQL. The canonical example for implementing the Geyser interface. If building custom indexing, study this. **Limitations:** running a Geyser-enabled validator requires significant infrastructure, and the PostgreSQL plugin specifically may struggle with mainnet-beta volume. For most developers, use a third-party Geyser service instead of running your own.

**Complexity:** High — validator internals, Geyser plugin architecture
**Confidence:** 7/10
**Last verified:** 2026-02-16

---

### Yellowstone Faithful

- **URL:** https://github.com/rpcpool/yellowstone-faithful
- **Framework:** Rust, Go
- **License:** AGPL-3.0 (confirmed)
- **Use cases:** Reference implementation
- **Category tags:** Historical data, archive, CAR files, epoch data

**Trust signals:**
- Maintained by Triton (rpcpool)
- Provides access to historical Solana data
- Uses IPLD/CAR file format for efficient storage
- ~169 stars, ~45 forks. Latest release v0.7.15 (Jan 2026). Actively maintained.

**Builder notes:**
> Historical archive access for Solana data. Complementary to Yellowstone gRPC (which handles real-time streaming). If you need to query historical transactions or account states from past epochs, this is the infrastructure. Less commonly needed than real-time streaming, but essential for analytics, research, and compliance use cases.

**Complexity:** High — historical data formats, archive infrastructure
**Confidence:** 7/10
**Last verified:** 2026-02-16

---

## Indexing

### Metaplex DAS Infrastructure (Digital Asset Standard)

- **URL:** https://github.com/metaplex-foundation/digital-asset-rpc-infrastructure
- **Framework:** Rust, TypeScript
- **License:** AGPL-3.0 (confirmed) — **copyleft implications for proprietary infrastructure**
- **Use cases:** Fork candidate (with AGPL compliance), Reference implementation
- **Category tags:** Indexing, DAS API, NFT indexing, compressed NFTs

**Trust signals:**
- Metaplex Foundation — the DAS indexer standard
- Powers NFT/digital asset queries across the ecosystem
- Used by Helius, Triton, and other RPC providers
- ~117 stars, ~50 forks. 472 commits. Actively maintained.

**Builder notes:**
> The standard indexer for Solana digital assets (NFTs, cNFTs, fungible tokens). Implements the DAS API that Helius and other providers expose. If building an NFT marketplace, portfolio tracker, or any application that queries digital assets, this is the underlying infrastructure. **AGPL-3.0 limits proprietary use** — for most builders, use a hosted DAS API (Helius, Triton) rather than self-hosting. Fork candidate if building open-source indexing infrastructure.

**Complexity:** High — full indexing pipeline, Geyser integration, database management
**Confidence:** 8/10
**Last verified:** 2026-02-16

---

### Helius Photon (ZK Compression Indexer)

- **URL:** https://github.com/helius-labs/photon
- **Framework:** Rust
- **License:** Apache 2.0 (confirmed)
- **Use cases:** Fork candidate, Reference implementation
- **Category tags:** Indexing, ZK compression, state compression

**Trust signals:**
- Maintained by Helius Labs
- Forward-looking — ZK compression is an emerging Solana feature
- Active development
- ~97 stars, ~16 forks. 292 commits. Active PRs from Light Protocol contributors.

**Builder notes:**
> Indexer for ZK compressed accounts on Solana. If building on ZK compression (the next evolution beyond cNFTs — compressed arbitrary state, not just NFTs), this is the indexing infrastructure you'll need. Forward-looking technology — not yet widely adopted but positioned to be important. Study if you're building ahead of the curve on state compression.

**Complexity:** High — ZK compression concepts, custom indexing
**Confidence:** 7/10
**Last verified:** 2026-02-16

---

## Transaction Tooling

### Jito TypeScript SDK

- **URL:** https://github.com/jito-labs/jito-ts
- **Framework:** TypeScript
- **License:** Apache 2.0 (confirmed)
- **Use cases:** Reusable component
- **Category tags:** MEV, bundle submission, tips, transaction ordering

**Trust signals:**
- Jito Labs — dominant MEV infrastructure on Solana
- Essential for any MEV-aware application
- ~194 stars, ~77 forks. 52 total commits. Last npm publish v4.2.0 (~May 2025).
- **⚠️ Semi-stale:** Low commit count, last publish ~9 months ago. Consider `jito-labs/jito-js-rpc` (86 stars, Apache 2.0) as a more modern alternative for JSON-RPC integration.
- **Ecosystem note (Oct 2025):** Jito banned 15 validators from JitoSOL for performing sandwich attacks. Protocol-level MEV governance issue, not library vulnerability.

**Builder notes:**
> SDK for submitting transaction bundles to Jito's block engine. If your application needs transaction ordering guarantees, MEV protection, or tip-based priority, this is the standard integration. Bundle submission ensures atomic execution of multiple transactions. Essential for: arbitrage bots, liquidation bots, any DeFi protocol that needs reliable execution ordering.

**Complexity:** Low-Medium — SDK is straightforward, understanding MEV concepts takes time
**Confidence:** 8/10
**Last verified:** 2026-02-16

---

### Blockworks lite-rpc

- **URL:** https://github.com/blockworks-foundation/lite-rpc
- **Framework:** Rust
- **License:** AGPL-3.0 — **copyleft, network-accessible derivatives must publish source**
- **Use cases:** Fork candidate (with AGPL compliance), Reference implementation
- **Category tags:** RPC proxy, transaction submission, optimization

**Trust signals:**
- Blockworks Foundation (Mango team)
- Optimizes transaction submission and confirmation
- ~331 stars, ~92 forks. 1,199 commits.
- **⚠️ Reduced activity:** Last visible issue close Sep 2024. Blockworks Foundation appears to have shifted focus to other projects (autobahn, quic_geyser_plugin).

**Builder notes:**
> Lightweight RPC proxy that optimizes transaction submission. Sits between your application and Solana RPC nodes, adding: transaction retry logic, multi-node submission, confirmation tracking, and priority fee estimation. If you're building high-throughput applications (trading, liquidation) that need reliable transaction landing, study this architecture. Fork candidate for custom transaction submission infrastructure.

**Complexity:** Medium-High — RPC internals, transaction lifecycle management
**Confidence:** 7/10
**Last verified:** 2026-02-16

---

### DeBridge Transaction Parser

- **URL:** https://github.com/debridge-finance/solana-tx-parser-public
- **Framework:** TypeScript
- **License:** LGPL-2.1 — **weak copyleft (linking allowed, modifications must be shared)**
- **Use cases:** Reusable component, Reference implementation
- **Category tags:** Transaction parsing, instruction decoding

**Trust signals:**
- DeBridge Finance — cross-chain bridge protocol
- Purpose-built for parsing Solana transactions
- ~296 stars, ~82 forks. 77 commits, 18 npm versions. Latest v3.4.1 (~Sep 2025).
- Includes Halborn pentest report — positive security signal.

**Builder notes:**
> Library for parsing raw Solana transactions into structured, readable data. If building transaction UIs, analytics dashboards, or debugging tools, this saves significant effort. Handles instruction decoding, account resolution, and inner instruction parsing. Less comprehensive than Helius's enhanced API but fully open-source and doesn't require an API dependency.

**Complexity:** Medium — transaction parsing has many edge cases
**Confidence:** 7/10
**Last verified:** 2026-02-16

---

## Automation

### Helium Tuktuk

- **URL:** https://github.com/helium/tuktuk
- **Framework:** Rust / Anchor
- **License:** Apache 2.0 (confirmed)
- **Use cases:** Fork candidate, Reference implementation
- **Category tags:** Automation, cron jobs, scheduled transactions

**Trust signals:**
- Built by Helium (major Solana protocol)
- Positioned as Clockwork replacement
- ~90 stars, ~15 forks. 138 commits. Presented at Solana Accelerate 2025. Website: tuktuk.fun.
- **⚠️ Unaudited:** tuktuk.fun states "Smart contracts currently being audited. Use at your own risk."

**Builder notes:**
> On-chain automation for Solana — scheduled/recurring transactions. Positioned to fill the gap left by Clockwork's shutdown. If you need cron-like functionality on Solana (periodic reward distribution, auto-compounding, scheduled governance execution), this is the emerging option. Newer and less proven than Clockwork was, but backed by a serious team (Helium). Evaluate carefully for production use.

**Complexity:** Medium-High — automation scheduling, keeper infrastructure
**Confidence:** 6/10
**Last verified:** 2026-02-16

---

## Monitoring

### Solana Watchtower (Agave)

- **URL:** https://github.com/anza-xyz/agave (under `watchtower/`, now renamed to `agave-watchtower`)
- **Framework:** Rust
- **License:** Apache 2.0
- **Use cases:** Reference implementation
- **Category tags:** Monitoring, alerting, validator health

**Trust signals:**
- Part of the official Agave validator client (successor to solana-labs/solana, archived Jan 2025)
- Maintained by Anza
- Agave repo: ~1,679 stars, ~916 forks. 31,183 commits. Very actively maintained (pushed daily).

**Builder notes:**
> Built-in monitoring tool in the Solana validator client. Monitors validator health, delinquency, and cluster status. Study for understanding what metrics matter for Solana infrastructure monitoring. For production monitoring, most teams use custom Grafana/Prometheus setups with RPC health checks rather than this tool directly.

**Complexity:** Medium — focused scope but requires understanding validator metrics
**Confidence:** 7/10
**Last verified:** 2026-02-16

---

### Solana Explorer

- **URL:** https://github.com/solana-foundation/explorer (moved from solana-labs/explorer)
- **Framework:** Next.js, TypeScript
- **License:** MIT
- **Use cases:** Fork candidate, Reference implementation
- **Category tags:** Explorer, debugging, visualization

**Trust signals:**
- Official Solana Foundation
- Production deployment at explorer.solana.com
- ~610 stars, ~530 forks. 2,664 commits. Actively maintained.

**Builder notes:**
> Fork for custom block explorers or internal dashboards. Transaction parsing, account rendering, and program log display are production-proven. The instruction decoding patterns show how to parse and display arbitrary Solana program interactions.

**Complexity:** Medium-High — full Next.js application
**Confidence:** 8/10
**Last verified:** 2026-02-16

---

## Builder Recommendations

**Need real-time on-chain data:**
Use Yellowstone gRPC via a hosted provider (Helius, Triton). Self-host only if you need custom processing and can handle AGPL compliance.

**Building an NFT/digital asset app:**
Use hosted DAS API (Helius). Study DAS infrastructure source for understanding.

**Need reliable transaction landing:**
Integrate Jito TS SDK for bundle submission (or newer jito-js-rpc). Study lite-rpc for custom transaction infrastructure (AGPL-3.0).

**Need scheduled/automated transactions:**
Evaluate Helium Tuktuk as the Clockwork successor. Still early and unaudited — may need custom keeper infrastructure.

**Building custom indexing:**
Fork Geyser Postgres plugin as starting point. Study Yellowstone gRPC for the streaming interface.

## License Summary

| License | Repos | Fork-Friendly? |
|---|---|---|
| Apache 2.0 | Geyser Postgres, Agave/Watchtower, Helius Photon, Jito TS, Helium Tuktuk | **Yes** |
| AGPL-3.0 | Yellowstone gRPC, Yellowstone Faithful, DAS Infrastructure, lite-rpc | **Conditional** — derivatives must be open-sourced |
| LGPL-2.1 | DeBridge Transaction Parser | **Conditional** — modifications must be shared, linking OK |
| MIT | Explorer | **Yes** |
