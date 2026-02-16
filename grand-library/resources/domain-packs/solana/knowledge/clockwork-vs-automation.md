---
pack: solana
topic: "On-Chain Automation"
decision: "How do I schedule automated on-chain actions?"
confidence: 6/10
sources_checked: 25
last_updated: "2026-02-15"
---

# On-Chain Automation

> **Decision:** How do I schedule automated on-chain actions?

## Context

On-chain automation is critical for protocols that need scheduled tasks (liquidations, yield harvesting, vault rebalancing, recurring payments) or event-driven actions (oracle price triggers, governance execution). Unlike Ethereum's established keeper networks (Chainlink Automation, Gelato), Solana's automation landscape remains fragmented and evolving.

Clockwork was Solana's first major automation primitive, launched in 2022. It allowed developers to schedule on-chain actions using "threads" that validator nodes would execute at specified intervals or triggers. However, in August 2023, the Clockwork team announced they would no longer support the platform, leaving the ecosystem without a clear successor. The project stopped at v2.0.19, with SDKs incompatible with newer Anchor and Solana versions.

Since Clockwork's shutdown, no single dominant solution has emerged. Instead, teams have fragmented across self-hosted keeper bots, event-driven architectures using Geyser plugins, MEV-optimized approaches with Jito bundles, and emerging protocols like TukTuk (Helium's successor to Clockwork). The automation space in early 2026 is characterized by trade-offs between decentralization, reliability, cost, and implementation complexity—with most production teams choosing pragmatic self-hosted solutions over waiting for a mature decentralized network.

## Options

### Option A: Self-hosted Keeper Bots

**What:** Run your own off-chain service that monitors conditions and submits transactions when triggers are met.

**Pros:**
- Full control over execution logic and timing
- No platform fees or rent costs (just compute + transaction fees)
- Can optimize for your specific use case (custom RPC endpoints, priority fees, retry logic)
- Works with any Solana program without modification
- Battle-tested approach used by major DeFi protocols

**Cons:**
- Infrastructure burden (uptime, monitoring, key management)
- Must handle RPC reliability, network congestion, and MEV considerations yourself
- No built-in decentralization—single point of failure unless you run redundant instances
- Requires off-chain infrastructure (servers, databases, alerting)

**Best for:** Production DeFi protocols with engineering resources for infrastructure ops. Teams that need custom logic or can't tolerate platform dependencies.

**Real-world examples:**
- Drift Protocol uses custom keeper bots for liquidations
- Mango Markets runs self-hosted keepers for funding rate updates and liquidations
- Major lending protocols (Kamino, MarginFi) operate their own keeper infrastructure
- The "Open Lotto" case study (Alexandre Russel, Dec 2024) details production keeper patterns for a lottery protocol

### Option B: Jito Bundles + MEV-aware Keepers

**What:** Combine self-hosted keepers with Jito's bundle submission system to guarantee atomic execution and transaction ordering, while earning MEV.

**Pros:**
- Guaranteed transaction inclusion and ordering (atomic bundle execution)
- Can front-run or back-run your own transactions strategically
- Tip validators for priority instead of blind priority fees
- Sub-100ms latency possible with proper setup
- Useful for liquidations, arbitrage, and time-sensitive automation

**Cons:**
- Adds complexity (bundle construction, tip optimization, leader schedule tracking)
- Only executes when Jito validators are leaders (~25% of slots currently)
- Requires understanding of MEV dynamics and bundle economics
- Higher implementation barrier than simple RPC transaction submission

**Best for:** High-value automation where transaction ordering matters (liquidations worth >$1k, critical vault operations, competitive arbitrage). Teams already doing MEV optimization.

**Real-world examples:**
- Liquidation bots on major lending platforms use Jito bundles to guarantee atomic multi-step liquidations
- Sniper bots for token launches (though ethically questionable) demonstrate the pattern
- Volume bots (automated market making) use bundles for guaranteed swap sequences

### Option C: Event-driven Architecture (Geyser Plugins / WebSocket Listeners)

**What:** Use Solana's Geyser plugin interface or WebSocket subscriptions to react to on-chain events in real-time, triggering automation based on account changes or program logs.

**Pros:**
- True reactive automation—responds to on-chain state changes instantly
- No polling required—validator pushes updates to you
- Sub-second latency (Yellowstone gRPC Geyser: ~8-100ms)
- Efficient for high-frequency monitoring (token mints, DEX trades, account updates)
- Can replay recent history (Yellowstone `fromSlot` allows 3000 slot backfill ~20min)

**Cons:**
- Still requires self-hosted execution infrastructure (just replaces polling with push)
- Geyser requires access to Geyser-enabled RPC providers (QuickNode, Helius, Triton)
- WebSockets can be unstable—`blockSubscribe` not supported by all providers
- You still need keeper logic to submit transactions after detecting events

**Best for:** Reactive automation triggered by state changes rather than time intervals. Real-time monitoring dashboards, sniper bots, liquidation detection systems.

**Real-world examples:**
- Pump.fun token monitors use Geyser to detect new token mints in microseconds
- High-performance sniper bots (70%+ use Geyser/WebSocket for sub-50ms detection)
- DeFi liquidation scanners that watch for undercollateralized positions
- Analytics platforms (Chainstack, Helius, Solscan) use Geyser for real-time indexing

### Option D: TukTuk (Helium's Clockwork Successor)

**What:** Permissionless on-chain cron service maintained by Helium Foundation, designed as Clockwork's spiritual successor.

**Pros:**
- Decentralized execution by permissionless "crankers" (anyone can run a crank-turner)
- On-chain scheduling primitive—endpoints are Solana program instructions
- Minimal dependencies for crankers (just RPC + lightweight Rust binary)
- Active development (released May 2025, ongoing updates through 2025)
- Closest thing to a Clockwork replacement architecturally

**Cons:**
- Very early stage—production readiness uncertain (launched Q2 2025)
- Requires programs to be "permissionless" (no strict signer requirements)
- Economic model for cranker incentives still maturing
- Limited documentation compared to mature ecosystems
- Unproven at scale—no major DeFi protocols using it yet (as of Feb 2026)

**Best for:** Projects willing to bet on emerging infrastructure. Use cases where decentralized execution matters more than proven reliability. Developers comfortable with experimental tooling.

**Real-world examples:**
- Helium's own infrastructure uses TukTuk for scheduled operations
- Early adopters experimenting with permissionless cron patterns
- No major DeFi blue-chips using it production yet (too new)

### Option E: Oracle-based Triggers (Switchboard / Pyth)

**What:** Use oracle networks like Switchboard or Pyth not just for price feeds, but as automation triggers—configure feeds to monitor conditions and trigger program execution.

**Pros:**
- Leverages existing oracle infrastructure (already integrated by most DeFi)
- Switchboard's new "Surge" network offers sub-100ms latency (8-25ms colocated)
- Can aggregate data from multiple sources (other oracles, APIs, on-chain state)
- Permissionless feed creation—build custom triggers without infrastructure
- Free to integrate for Switchboard Surge feeds

**Cons:**
- Limited to conditions that oracles can monitor (price thresholds, external API data)
- Not suitable for pure time-based scheduling (cron-style automation)
- Adds oracle dependency and potential centralization vector
- Switchboard still experimental for automation use cases (primarily a price oracle)
- Must structure program logic to be callable by oracle network

**Best for:** DeFi protocols already using oracles where automation can piggyback on price updates. Conditional automation based on external data (weather, sports scores, election results).

**Real-world examples:**
- Perpetuals protocols (Drift, Zeta) could use price oracles to trigger funding rate updates
- Prediction markets using Switchboard for event resolution
- Conditional payments triggered by API data (e.g., insurance payouts based on flight delays)

### Option F: Cross-chain Automation Services

**What:** Use established automation networks from other chains (Chainlink Automation, Gelato) if/when they expand to Solana.

**Pros:**
- Battle-tested infrastructure securing billions on Ethereum L1/L2s
- Professional operator networks with SLAs and uptime guarantees
- Extensive documentation and developer tooling

**Cons:**
- **Not available on Solana yet** (as of Feb 2026)—this is hypothetical
- Would require Solana-specific integrations and validator coordination
- Economic models designed for EVM may not translate to Solana's fee structure
- Dependency on external teams with uncertain Solana commitment

**Best for:** Future consideration only—not a practical option in 2026.

**Real-world examples:**
- N/A (Chainlink Automation is EVM-only; no concrete Solana plans announced)

## Key Trade-offs

| Approach | Reliability | Cost | Decentralization | Latency | Implementation Complexity |
|----------|-------------|------|------------------|---------|---------------------------|
| **Self-hosted Keepers** | High (if redundant) | Medium (infra + tx fees) | Low | 50-500ms | Medium |
| **Jito Bundles** | High | Medium-High (tips) | Low | <100ms | High |
| **Geyser/WebSocket** | Medium | Medium | Low | 8-100ms | Medium-High |
| **TukTuk** | Unknown (new) | Low (permissionless) | High | Unknown | Medium |
| **Oracle Triggers** | Medium-High | Low-Medium | Medium | 8-100ms (Surge) | Low-Medium |

**Cost breakdown:**
- Self-hosted: Server costs ($50-500/mo) + tx fees + priority fees during congestion
- Jito: Tx fees + validator tips (0.001-0.01 SOL/bundle depending on competition)
- Geyser: RPC provider fees (Helius/QuickNode premium tiers) + tx fees
- TukTuk: On-chain rent + cranker rewards (economics still TBD)
- Oracles: Feed creation/update costs (varies by oracle) + tx fees

## Recommendation

**For production DeFi in 2026, use self-hosted keepers** (Option A) with event-driven triggers (Option C) for monitoring:

1. **Start pragmatic:** Run a self-hosted keeper bot. It's what all major Solana DeFi protocols do.
2. **Optimize detection:** Use Geyser/WebSocket to detect trigger conditions instantly instead of polling.
3. **Add Jito bundles** for high-value operations (liquidations >$1k, critical rebalancing) to guarantee execution.
4. **Monitor TukTuk** as it matures—if it proves reliable by late 2026, consider migrating for decentralization.
5. **Oracle integration:** If you already use Switchboard/Pyth, explore Surge for conditional automation, but don't build solely on it.

**Conditional guidance:**
- **If you need decentralization now:** TukTuk is your only option, but expect rough edges.
- **If latency is critical (<100ms):** Geyser + Jito bundles, colocated with RPC nodes.
- **If you're a small team:** Start with simple WebSocket listeners + basic keeper scripts. Don't over-engineer.
- **If this is a side project:** Wait 6-12 months for TukTuk or another solution to mature. The ecosystem is in flux.

## Lessons from Production

**Why Clockwork failed:**
- **Sustainability:** Unclear economic model for validator incentives. Running automation nodes was costly with no revenue.
- **Adoption chicken-and-egg:** Required validator operators to run Clockwork plugin, but few did without clear demand.
- **Alternative dominance:** Major protocols built self-hosted keepers anyway for reliability and control.
- **Team resources:** Maintaining complex infrastructure without a business model is hard.

**Real keeper bot architectures (from DeFi protocols):**
- **Redundancy:** Run multiple keeper instances in different regions with leader election (Redis/etcd).
- **RPC failover:** Use multiple RPC providers (QuickNode, Helius, Triton, self-hosted) with automatic failover.
- **Priority fee logic:** Dynamic priority fees based on network congestion and transaction urgency.
- **Monitoring:** Alert on missed executions, RPC failures, balance drops, unexpected errors.
- **Simulation first:** Always simulate transactions before submission to catch failures early.

**Jito bundle strategies:**
- **Leader schedule tracking:** Only submit bundles when Jito validators are leaders (check epoch leader schedule).
- **Tip optimization:** Start with min tip (0.0001 SOL), increase on retry. Monitor successful tip percentiles.
- **Bundle timeout:** Set 5-10 slot expiry, retry with higher tip if not included.
- **Atomic operations:** Bundle multi-step operations (e.g., borrow + swap + repay for liquidations).

**Geyser patterns:**
- **Filter aggressively:** Subscribe only to accounts/programs you need to reduce bandwidth.
- **Handle reconnects:** Geyser streams disconnect—implement exponential backoff reconnection.
- **Deduplicate events:** Use transaction signatures to avoid processing duplicate notifications.
- **Backfill gaps:** Use `fromSlot` parameter to replay missed events after disconnection.

## Sources

- [Alternative to clockwork? - Solana Stack Exchange](https://solana.stackexchange.com/questions/21375/alternative-to-clockwork) — Community discussion on Clockwork alternatives (April 2025)
- [How to Use Clockwork to Automate Solana Programs - QuickNode](https://www.quicknode.com/guides/solana-development/3rd-party-integrations/automation-with-clockwork) — Historical guide noting Clockwork shutdown and TukTuk as successor
- [Scale or Die at Accelerate 2025: Tuk Tuk: On-chain Cron Jobs](https://solanacompass.com/learn/accelerate-25/scale-or-die-at-accelerate-2025-tuk-tuk-on-chain-cron-jobs) — Noah Prince (Helium) introducing TukTuk at Solana Accelerate
- [GitHub - helium/tuktuk-fanout](https://github.com/helium/tuktuk-fanout) — TukTuk source code and documentation
- [is clockwork framework obsolete? - Solana Stack Exchange](https://solana.stackexchange.com/questions/17395/is-clockwork-framework-obsolete) — Developer confirming Clockwork abandonment (Nov 2024)
- [GitHub - wuwei-labs/antegen](https://github.com/wuwei-labs/antegen) — Alternative smart-contract automation project (experimental)
- [Building a Solana Lottery: Oracles, Keepers, and Production Infrastructure](https://medium.com/@arussel/building-a-solana-lottery-oracles-keepers-and-production-infrastructure-bba80d1e6cac) — Production case study of keeper bot architecture
- [Jito Bundles: What They Are and How to Use Them - QuickNode](https://www.quicknode.com/guides/solana-development/transactions/jito-bundles) — Comprehensive Jito bundle guide with code examples
- [Jito Bundling and MEV Optimization Strategies on Solana](https://medium.com/@gwrx2005/jito-bundling-and-mev-optimization-strategies-on-solana-an-economic-analysis-c035b6885e1f) — Economic analysis of Jito bundles for automation
- [Building Production-Grade Solana Sniper Bots: A 2026 Technical Blueprint](https://dysnix.com/blog/complete-stack-competitive-solana-sniper-bots) — Architecture for high-performance keepers using Geyser/Jito
- [How to use the Solana Geyser plugin to stream data with Yellowstone gRPC](https://chainstack.com/how-to-use-the-solana-geyser-plugin-to-stream-data-with-yellowstone-grpc/) — Geyser implementation guide
- [Monitor Solana Programs with Yellowstone Geyser gRPC (TypeScript)](https://www.quicknode.com/guides/solana-development/tooling/geyser/yellowstone) — Production Geyser patterns with code
- [Real-time Solana data: WebSocket subscriptions vs Yellowstone gRPC Geyser](https://chainstack.com/real-time-solana-data-websocket-vs-yellowstone-grpc-geyser/) — Performance comparison of monitoring approaches
- [Solana Geyser Plugins: Powering High-Speed Data Streaming Guide](https://extremelysunnyyk.medium.com/solana-geyser-plugins-powering-high-speed-data-streaming-guide-9ae2328b8454) — Geyser architecture and use cases
- [Switchboard launches Surge, Solana's fastest oracle yet](https://blockworks.co/news/fastest-oracle-on-solana-launches) — Switchboard Surge announcement (Aug 2025)
- [Breaking the Oracle Bottleneck: How Switchboard Fixes Web3's Data Problem](https://medium.com/@AJOwolabi/breaking-the-oracle-bottleneck-how-switchboard-fixes-web3s-data-problem-b044f71ca6bb) — Switchboard capabilities beyond price feeds
- [Switchboard Documentation - Integrating your Feed On-Chain](https://docs.switchboard.xyz/product-documentation/data-feeds/solana-svm/part-3-integrating-your-feed/integrating-your-feed-on-chain) — Using Switchboard for on-chain automation triggers

## Gaps & Caveats

- **No clear market leader:** Unlike Ethereum (Chainlink Automation dominates), Solana automation is fragmented. TukTuk may emerge as a leader, but it's too early to tell.
- **Economic sustainability unknown:** TukTuk's cranker incentive model is unproven. Will rewards be sufficient to ensure reliable execution?
- **Rapidly evolving space:** New solutions could emerge in 2026. Switchboard's Surge, additional oracle protocols, or native Solana validator features could change the landscape.
- **Limited research on TukTuk:** As of Feb 2026, no public case studies of major DeFi protocols using TukTuk in production. Risk tolerance required.
- **Jito centralization:** ~25% of stake is Jito validators, so bundle-dependent automation has availability limits. Non-issue for most use cases but relevant for high-frequency needs.
- **Geyser provider lock-in:** Yellowstone gRPC requires premium RPC providers (Helius, QuickNode, Triton). Cost scales with usage.
- **No standard interface:** Unlike EVM's Chainlink Automation interface, Solana has no de facto standard, making multi-solution hedging hard.

This space is actively evolving. Expect significant changes by late 2026 as TukTuk matures, oracle networks expand automation features, or new protocols launch. For critical production systems, assume you'll need to adapt your automation strategy 1-2 times per year.
