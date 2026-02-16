---
pack: solana
topic: "Order Book Design"
decision: "How do I build an on-chain order book on Solana?"
confidence: 8/10
sources_checked: 42
last_updated: "2026-02-16"
---

# Building On-Chain Order Books on Solana

## Overview

On-chain order books (CLOBs - Central Limit Order Books) on Solana represent one of DeFi's most ambitious architectural challenges. Unlike AMMs which use algorithmic pricing, CLOBs match buyers and sellers directly through price-time priority, offering transparent price discovery and familiar trading UX from TradFi. However, maintaining a fully on-chain order book requires solving fundamental constraints around compute limits, shared state serialization, and economic viability.

**The core challenge**: Traditional order books require constant updates to shared state (bids, asks, order queues). On Solana, transactions must declare all accounts they'll read/write upfront, and writable accounts are locked during execution. This creates serialization bottlenecks that kill Solana's parallel execution advantage.

## Historical Context: Serum to Phoenix

### Serum (2020-2022)
- First successful on-chain CLOB on Solana
- Pioneered the account structure pattern still used today
- Centralization risk: FTX controlled program update keys
- Required **cranks** (off-chain workers) to process matches and settle trades asynchronously

### OpenBook (2022-present)
- Community fork created immediately after FTX collapse (November 2022)
- Removed centralization risks by transferring governance to DAO
- Largely identical architecture to Serum
- Still uses crank-based settlement model
- Program ID: `srmqPvymJeFKQ4zGQed1GFppgkRHL9kaELCbyksJtPX` (mainnet)

### Phoenix (2023-present)
- Revolutionary **crankless** design with atomic settlement
- Trades settle instantly in the same transaction
- Optimized account structure reduces compute requirements
- Program ID: `PhoeNiXZ8ByJGLkxNfZRnkUfjvmuYqLR89jjFHGqdXY`
- Reports 0.5 second average settlement time
- Protocol fees as low as 0.01%

### OpenBook v2 (2023-present)
- Complete rewrite based on Mango v4 architecture
- Improved capital efficiency and compute optimization
- Program ID: `opnb2LAfJYbRMAHHvqjCwQxanZn7ReEHp1k81EohpZb`

## Core Architecture Patterns

### Account Structure (OpenBook/Serum Model)

```
Market Account (shared state - serialization bottleneck)
├── Request Queue: Unprocessed order placements/cancellations
├── Event Queue: Outputs from order matching
├── Bids (Orderbook): All open buy orders (red-black tree)
├── Asks (Orderbook): All open sell orders (red-black tree)
└── Metadata: Market config, fees, coin/pc mints

OpenOrders Account (per-user)
├── User's open orders on this market
├── Locked base/quote token amounts
└── Settlement funds available for withdrawal
```

**Key insight**: The Market Account is the primary bottleneck. Every order placement, cancellation, or match must acquire a write lock on this account, forcing transactions to serialize.

### Phoenix Innovations

Phoenix eliminated cranks through several architectural breakthroughs:

1. **Atomic settlement**: Matches settle funds in the same transaction rather than queuing events
2. **Optimized account layout**: Reduced account sizes and compute requirements
3. **Seat-based access control**: Market makers can acquire "seats" for batch operations
4. **Batch order operations**: Place/cancel multiple orders in one transaction

**Performance claims**:
- 0.5 second block time (Solana network standard)
- $0.0002 network fees per transaction
- Instant fund availability after fills (no crank delay)
- FIFO matching with price-time priority enforcement

## Compute Budget Constraints

This is the primary limitation for on-chain order books.

### Current Limits (as of Feb 2026)
- **Per transaction**: 1.4M compute units (CU) max
- **Per block**: 50M CU (raised from 48M in April 2025)
- **Typical DEX swap**: ~200-400k CU (via Jupiter aggregator)
- **Order book operations**: Highly variable depending on matching complexity

### Why This Matters

Order matching is iterative. For each new order, the matching engine must:
1. Traverse the opposite side of the book to find matches
2. Execute each match (update order quantities, transfer funds)
3. Update the orderbook state (remove filled orders, adjust partially filled)
4. Emit events or settle funds

**The problem**: Complex matches can exceed compute limits. Solutions:

1. **Limit orders per transaction**: Phoenix/OpenBook limit how many orders can be placed/matched in one tx
2. **Partial fills**: Break large orders across multiple transactions
3. **Optimized matching algorithms**: Use efficient data structures (red-black trees, not arrays)
4. **Cranks** (OpenBook): Offload settlement to separate transactions

### Optimization: Proprietary AMMs vs CLOBs

Recent innovation (2025-2026): "Prop AMMs" like HumidiFi have optimized oracle updates to just **143 CU** - over 1,000x less than a typical swap. This enables sub-penny priority fees for quote refreshes. CLOBs can't compete with this efficiency for high-frequency market making.

## CLOB vs AMM Trade-offs

### When to Use CLOBs

**Advantages**:
- Transparent price discovery (real order book depth visible)
- No impermanent loss for liquidity providers (they're active market makers)
- Familiar UX for TradFi traders (limit orders, stop losses, market orders)
- Better for large trades (can see available liquidity at each price level)
- Composability: Other protocols can build on shared liquidity

**Best for**: Short-tail, high-liquidity assets (SOL/USDC, SOL/USDT)

### When to Use AMMs

**Advantages**:
- No shared state bottleneck (each pool is independent)
- Constant product formula is computationally cheap
- Passive liquidity provision (no active management required)
- Better for long-tail assets (can bootstrap liquidity easily)

**Best for**: Long-tail tokens, new token launches, low-frequency trading

### Hybrid Models

**Drift Protocol**: Combines CLOB for price discovery with virtual AMM for liquidity backstop. Cross-margined risk engine allows capital efficiency across positions.

**Current Market Reality (2026)**:
- Prop AMMs (HumidiFi, SolFi) dominate SOL/USDC pairs: ~65% market share
- AMMs handle 99%+ of aggregator flow (Pump, Raydium, Orca)
- CLOBs serve sophisticated traders wanting limit orders
- Most protocols are **vertically integrating** (Pump has PumpSwap, MetaDAO has Futarchy AMM)

## Practical Performance Numbers

### Phoenix (claimed)
- Settlement time: 0.5 seconds (1 block)
- Protocol fees: 0.01% (can be configured)
- Network fees: $0.0002 per transaction
- Orders per second: Not publicly disclosed, likely limited by block CU budget

### OpenBook
- Settlement time: Asynchronous (requires crank, typically seconds to minutes)
- Fees: Configurable per market, includes maker rebates
- Market count: Hundreds of markets deployed

### Real-World Constraints
- **Block CU limit**: 50M CU means ~125-250 simple DEX swaps per block
- **Serialization**: Order book markets serialize transactions, reducing effective throughput
- **Crank economics**: OpenBook cranks need incentives to process matches promptly
- **Front-running**: Transactions touching shared state are vulnerable to MEV

### Actual DEX Volume Distribution (2026)
- **Jupiter aggregator**: Dominant router, 40%+ of all Solana DEX volume flows through it
- **Prop AMMs**: 20-40% of weekly DEX volume, 80%+ of SOL-stablecoin pairs
- **Traditional CLOBs**: Declining share except for advanced traders

## Building Your Own: Decision Framework

### Choose CLOB If:
- You need transparent order book depth for traders
- Target audience expects limit orders and advanced order types
- You're targeting short-tail, high-liquidity pairs
- You can solve the crank problem (Phoenix's atomic settlement or incentivized cranks)
- You have sophisticated market makers ready to provide liquidity

### Choose AMM If:
- You're launching new tokens (long-tail assets)
- You want passive liquidity provision
- You need programmatic composability (routing, aggregation)
- You want to avoid shared state serialization issues
- Capital efficiency via concentrated liquidity is acceptable trade-off

### Architecture Recommendations

If building a CLOB:

1. **Study Phoenix's crankless design**: Atomic settlement eliminates cranks entirely
2. **Optimize for compute**: Every instruction counts. Use red-black trees for orderbook, not arrays
3. **Account structure**: Minimize shared state. Consider per-market-maker accounts
4. **Batch operations**: Allow market makers to place/cancel multiple orders in one tx
5. **Fee structure**: Consider maker rebates to incentivize liquidity provision
6. **Seat model**: Phoenix's seat-based access controls spam and enables batch ops

If building an AMM:

1. **Consider Prop AMM model**: Use oracle updates for active market making
2. **Optimize oracle refresh cost**: HumidiFi's 143 CU oracle updates enable high-frequency refreshes
3. **Integrate with Jupiter**: Single integration = instant distribution to retail flow
4. **Vertical integration**: Capture order flow at issuance (like Pump) or execution (like Nozomi)

## Code References

### OpenBook v2
- Repository: `https://github.com/openbook-dex/openbook-v2`
- License: MIT (with GPL-gated program compilation features)
- Language: Rust, Anchor framework (v0.28.0)
- Key modules:
  - Order matching engine
  - Account state management
  - Fee calculation and distribution

### Phoenix v1
- Repository: `https://github.com/Ellipsis-Labs/phoenix-v1`
- License: BUSL-1.1 (Business Source License)
- Audit: OtterSec audited
- Verifiable build: Can verify on-chain program matches source via `solana-verify`

### Example Order Types

```rust
// Phoenix order types
OrderPacket::Limit {
    side: Side::Bid,
    price_in_ticks: Ticks::new(1000),
    num_base_lots: BaseLots::new(100),
    self_trade_behavior: SelfTradeBehavior::CancelProvide,
    match_limit: None, // Match up to N orders before returning
}

OrderPacket::ImmediateOrCancel {
    side: Side::Ask,
    price_in_ticks: Ticks::new(1005),
    num_base_lots: BaseLots::new(50),
    num_quote_lots_to_fill: QuoteLots::new(25),
}
```

## Common Pitfalls

### 1. Underestimating Compute Requirements
- Don't assume simple trades. Edge cases (matching many small orders) can explode CU usage
- Test with worst-case scenarios: full orderbook, many partial fills

### 2. Ignoring Crank Economics
- If using asynchronous settlement, cranks need sustainable incentives
- Phoenix solved this by eliminating cranks entirely

### 3. Shared State Serialization
- The Market Account write lock kills parallel execution
- Consider alternative designs: per-market-maker accounts, batch operations

### 4. Not Planning for MEV
- Order book markets are MEV honeypots
- Phoenix's atomic settlement helps, but front-running is still possible
- Consider partnering with MEV protection services (Jito bundles, etc.)

### 5. Competing with Prop AMMs on Liquid Pairs
- Prop AMMs have 1,000x better quote refresh efficiency
- CLOBs need to differentiate on features (limit orders, depth visibility, advanced order types)

## Current State of the Ecosystem (Feb 2026)

### Dominant Players
1. **Phoenix**: Leading crankless CLOB, fastest settlement
2. **OpenBook v2**: Community-driven, widely integrated
3. **Drift**: Hybrid CLOB + vAMM for perpetuals
4. **Zeta Markets**: Options and perpetuals CLOB
5. **Prop AMMs** (HumidiFi, SolFi, Tessera): Dominating liquid pairs

### Trend Analysis
- **Passive AMM standalone model is obsolete**: Must vertically integrate with issuance or execution
- **Prop AMMs winning liquid pairs**: Superior capital efficiency, minimal CU for oracle updates
- **CLOBs serve advanced traders**: Limit orders, stop losses, depth analysis
- **Vertical integration is key**: Control order flow at issuance (Pump) or execution (Nozomi)

### Integration Considerations
- **Jupiter**: Must integrate to access retail order flow (40%+ of volume)
- **Wallets**: Phantom, Solflare integrations critical for user acquisition
- **Aggregators**: Beyond Jupiter, consider Birdeye, DEX Screener integrations

## Performance Benchmarks (Real-World)

### Order Book Operations
- **Place limit order**: ~50-200k CU (depends on matching)
- **Cancel order**: ~20-50k CU
- **Match orders** (OpenBook crank): 100k-400k CU (varies by matches processed)
- **Phoenix atomic trade**: ~100-300k CU (single transaction settlement)

### Comparison to AMMs
- **Constant product swap**: ~100-200k CU
- **Concentrated liquidity swap** (Orca Whirlpools): ~200-400k CU
- **Prop AMM oracle update**: ~143 CU (HumidiFi)
- **Prop AMM swap**: ~200-400k CU (similar to regular AMM)

### Throughput Implications
- **50M CU/block** = max ~125 complex CLOB trades per block (0.4 seconds)
- Real throughput is lower due to serialization on Market Account
- Prop AMMs achieve better effective throughput via lightweight oracle updates

## Security Considerations

### Audit Requirements
- Both Phoenix and OpenBook v2 are audited (OtterSec)
- Order matching logic is complex - extensive testing critical
- Edge cases: self-trading, overflow, partial fills, cancellations

### Governance Risks
- Serum's downfall: centralized upgrade authority
- OpenBook solved via DAO governance
- Phoenix uses time-locked upgrades with community oversight

### Economic Attacks
- **Spam attacks**: Filling request queues with junk orders
- **Grief attacks**: Placing/canceling orders to waste cranks' time
- **Front-running**: MEV bots can see pending orders and front-run
- **Solution**: Fees, rate limits, seat-based access (Phoenix model)

## Future Directions

### Solana Improvements
- **Increased compute limits**: Potential future increases beyond 50M CU/block
- **Better parallelization**: Account groups or other mechanisms to reduce serialization
- **Faster blocks**: Current 400ms could decrease further

### CLOB Evolution
- **More crankless designs**: Phoenix's model is superior, expect copycats
- **Hybrid models**: Combining CLOB price discovery with AMM liquidity backstops
- **Cross-chain order books**: Wormhole or other bridges enabling multi-chain CLOBs
- **Vertical integration**: DEXs controlling order flow from issuance to execution

### Competitive Landscape
- Prop AMMs will continue dominating liquid pairs (superior CU efficiency)
- CLOBs will focus on advanced traders and unique order types
- Standalone passive AMMs face structural decline
- Vertical integration (issuance platforms + DEXs) will be winning model

## Conclusion

Building an on-chain order book on Solana is technically feasible but requires careful architectural decisions:

1. **Crankless > Cranks**: Phoenix proved atomic settlement is superior
2. **Compute is precious**: Optimize every instruction, test worst-case scenarios
3. **Shared state is the enemy**: Minimize write locks on Market Account
4. **Don't compete with Prop AMMs on liquid pairs**: They have 1,000x better quote refresh efficiency
5. **Differentiate on features**: Limit orders, stop losses, advanced order types, transparent depth
6. **Vertical integration matters**: Control order flow to win in 2026+

For most new projects in 2026, the recommendation is:
- **If launching new tokens**: Use or build a Prop AMM with vertical integration at issuance
- **If targeting advanced traders**: Build a crankless CLOB following Phoenix's architecture
- **If targeting liquid pairs**: Expect fierce competition from Prop AMMs with superior CU efficiency

The era of standalone passive AMMs and cranked CLOBs is ending. The future belongs to vertically integrated platforms with either atomic settlement (CLOBs) or ultra-efficient oracle updates (Prop AMMs).

## Sources

- Phoenix Documentation & Source Code (GitHub: Ellipsis-Labs/phoenix-v1)
- OpenBook v2 Source Code (GitHub: openbook-dex/openbook-v2)
- Solana Program Limitations Documentation
- "Introducing Phoenix - The Fastest On-Chain Orderbook in DeFi" (December 2023)
- "Solana DEX Winners: All About Order Flow" - Blockworks Research (January 2026)
- "Solana's Proprietary AMM Revolution" - Helius (August 2025)
- "Inside Drift: Architecting a High-Performance Orderbook on Solana" (April 2025)
- Solana Compute Budget Documentation (48M → 50M CU increase, April 2025)
- "Understanding Proprietary AMMs" - Solana Media (January 2026)
- Multiple DEX comparison articles and technical deep dives (2023-2026)
