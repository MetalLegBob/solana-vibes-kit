---
pack: solana
topic: "Oracle Comparison"
decision: "Which oracle for price feeds?"
confidence: 8/10
sources_checked: 35
last_updated: "2026-02-15"
---

# Oracle Comparison

> **Decision:** Which oracle for price feeds?

## Context

Oracle choice is the single most consequential infrastructure decision in DeFi protocol design. The oracle determines security posture, operating costs, and user experience. A compromised or manipulated oracle can drain entire protocols—oracle manipulation attacks cost DeFi $403M in 2022 alone, with the Mango Markets exploit representing a watershed $116M loss.

The Solana oracle landscape underwent a fundamental architecture shift in 2024. Traditional "push" oracles—where operators continuously post price updates on-chain—created unsustainable transaction volume (Pyth accounted for 20% of all Solana transactions in early 2024). The industry pivoted to "pull" oracles, where users fetch signed price data off-chain and submit it on-demand. Pyth deployed its pull oracle to Solana mainnet in June 2024, while Switchboard launched its On-Demand model in March 2024 and Surge ultra-low-latency variant in August 2025.

This transition changed the economics: push oracles paid continuous fees regardless of demand; pull oracles shift costs to users who actually need fresh prices. For protocols, this means understanding when to pay for real-time data versus tolerating staleness, how to detect and handle oracle failures, and whether to trust a single source or aggregate multiple feeds.

## Options

### Option A: Pyth Network

**What:** Pull oracle network aggregating first-party data from 100+ institutional providers (exchanges, market makers, trading firms) across crypto, equities, FX, and commodities.

**Pros:**
- **High-fidelity data**: First-party feeds directly from Binance, OKX, CBOE, Jane Street reduce intermediary risk
- **Confidence intervals**: Pyth publishes price ± confidence, letting protocols reject stale/uncertain data
- **Speed**: Sub-second updates on Pythnet appchain; 400ms update cadence post-Perseus upgrade
- **Coverage**: 500+ price feeds across asset classes; dominant coverage for crypto assets
- **Adoption**: Powers Drift, Marginfi, Jupiter, Kamino, Jito—billions in TVL depend on Pyth
- **Compute efficiency**: Pull model dramatically reduced on-chain footprint vs. legacy push oracle

**Cons:**
- **Cost model**: Users pay gas to submit price updates (though multi-feed batching amortizes cost)
- **Centralization vector**: Pythnet appchain is a Solana fork operated by data providers (separate from mainnet consensus)
- **Integration complexity**: Pull model requires off-chain Hermes fetching + on-chain posting, multi-transaction flow on Solana
- **Fees coming**: Pyth DAO is discussing fee implementation across networks (currently free beyond gas)

**Best for:** Protocols requiring institutional-grade data quality, high update frequency, or non-crypto asset pricing (equities, FX, commodities). Mandatory for perps, strongly recommended for lending protocols with >$10M TVL.

**Real-world examples:** Drift Protocol (perps), Marginfi (lending), Jupiter (aggregator pricing), Kamino (leveraged yield vaults)

### Option B: Switchboard

**What:** Permissionless oracle allowing custom data feed configuration with TEE-based confidential compute. Switchboard On-Demand (March 2024) and Surge (August 2025, sub-100ms latency) compete directly with Pyth.

**Pros:**
- **Customizability**: Define your own data sources, aggregation logic, update triggers—no permission required
- **Fastest on Solana**: Surge claims sub-100ms latency, beating Pyth's 400ms for latency-critical applications
- **Free integration**: No oracle-specific fees, only Solana transaction costs
- **Multi-source flexibility**: Pull from multiple CEXs, DEXs, or custom APIs in a single feed
- **TEE security**: Confidential containers ensure oracles can't front-run their own data
- **Decentralization**: No separate appchain; uses Solana mainnet consensus

**Cons:**
- **Newer pull model**: Less battle-tested than Pyth (launched Q1 2024 vs. Pyth's 2022 Pythnet)
- **Data provider breadth**: Fewer institutional first-party sources than Pyth's 100+ providers
- **Integration adoption**: Smaller ecosystem footprint; major protocols still prefer Pyth
- **Documentation gaps**: More DIY; requires deeper understanding of oracle design tradeoffs

**Best for:** Protocols needing ultra-low latency (high-frequency perps), custom asset pairs not covered by Pyth, or teams with strong oracle engineering expertise who want configuration control.

**Real-world examples:** Kamino (uses both Pyth and Switchboard), Jito (MEV infrastructure), Drift (supplementary to Pyth), Marginfi (multi-oracle setup)

### Option C: TWAP from On-chain DEXes

**What:** Time-weighted average price derived from Orca Whirlpool or Raydium CLMM pool observations over a rolling window (typically 5-30 minutes).

**Pros:**
- **No external dependency**: Oracle is the DEX pool itself; no third-party trust assumption
- **Manipulation cost**: Requires sustained capital to move price over TWAP window (much harder than spot manipulation)
- **Free**: No oracle fees, only standard Solana transaction costs to read pool state
- **Proven design**: TWAP methodology pioneered by Uniswap v2/v3, well-understood security properties

**Cons:**
- **Manipulation risk**: Still vulnerable to sustained price manipulation, especially for low-liquidity pools
- **Liquidity dependency**: Shallow pools = easier manipulation; requires monitoring pool depth
- **Staleness**: TWAP lags market by design (smoothing = latency); unsuitable for perps or high-leverage systems
- **Limited assets**: Only works for tokens with deep Solana DEX liquidity
- **Volatility**: Real market moves look identical to manipulation; circuit breakers needed

**Best for:** Secondary price validation, less critical use cases (governance, staking rewards), or assets without Pyth/Switchboard coverage. Can be combined with external oracles for redundancy.

**Real-world examples:** Small lending markets use Orca TWAP for long-tail assets; larger protocols use TWAP as sanity check against Pyth (reject if deviation >5%)

### Option D: Custom Oracle / Multiple Oracles

**What:** Proprietary oracle infrastructure or aggregation layer combining Pyth + Switchboard + TWAP with custom fallback logic, circuit breakers, and staleness detection.

**Pros:**
- **No single point of failure**: If Pyth fails, fall back to Switchboard or TWAP; protocol stays operational
- **Attack resistance**: Manipulation requires compromising multiple independent sources
- **Configurable risk tolerance**: Per-asset staleness thresholds, confidence requirements, price deviation limits
- **Auditability**: Internal oracle adapter lets you add monitoring, alerting, and kill switches

**Cons:**
- **Development cost**: Building, testing, and maintaining oracle aggregation is non-trivial (estimate 2-4 eng-months)
- **Ongoing maintenance**: Oracle providers change APIs, fee structures; your adapter breaks
- **Latency**: Multi-source validation adds compute and clock time
- **Complexity risk**: More code = more attack surface; several exploits involved oracle adapter bugs

**Best for:** High-value protocols (>$100M TVL), protocols with novel asset types, or teams paranoid about single points of failure (justifiably so, given Mango).

**Real-world examples:** Large lending protocols often wrap Pyth in custom staleness checks; perps sometimes aggregate Pyth + Switchboard for critical price feeds

## Key Trade-offs

| Dimension | Pyth | Switchboard | DEX TWAP | Custom/Multi |
|-----------|------|-------------|----------|--------------|
| **Update frequency** | 400ms (Pythnet) | Sub-100ms (Surge) | 30-60s typical | Depends on sources |
| **Cost per update** | ~0.0001-0.0005 SOL (gas only, batching helps) | ~0.0001-0.0005 SOL | ~0.00005 SOL (read-only) | Varies |
| **Manipulation resistance** | Very High (100+ sources) | High (TEE + multi-source) | Medium (depends on liquidity) | Very High (if multi-oracle) |
| **Asset coverage** | 500+ (crypto, TradFi) | ~200+ (customizable) | Depends on DEX liquidity | Union of sources |
| **Compute cost (CU)** | ~50K CU for update + verification | ~40K CU | ~5K CU (pool read) | 100K+ CU (multi-verify) |
| **Confidence intervals** | Yes (native feature) | No (must implement) | No | If aggregating Pyth |
| **Latency sensitivity** | Good (400ms) | Best (sub-100ms) | Poor (TWAP window lag) | Depends on config |
| **Decentralization** | Medium (Pythnet appchain) | High (Solana mainnet) | High (DEX as oracle) | Medium to High |

## Recommendation

**Default choice for most protocols: Pyth Network.** The ecosystem has converged on Pyth for good reason—proven data quality, institutional sources, confidence intervals, and battle-tested integration patterns. Major protocols (Drift, Marginfi, Jupiter) standardized on Pyth, creating network effects for tooling and documentation.

**By protocol type:**

- **Lending (Aave/Compound-style):** Pyth with staleness detection (reject prices >60s old) + confidence interval filtering (reject if confidence >2% of price). Consider TWAP as secondary check for large positions.

- **Perpetuals/Derivatives:** Pyth or Switchboard Surge depending on latency requirements. Perps need sub-second updates; Surge's <100ms edge matters for high-frequency markets. Implement mark price = median(Pyth, Switchboard, index) to resist single-oracle manipulation.

- **Spot DEX/AMM:** DEXes don't need external oracles for swaps (they ARE the price discovery). If building advanced features (lending against LP positions), use Pyth for external validation.

- **Stablecoins (CDP-style):** Multi-oracle mandatory for >$50M TVL. Aggregate Pyth + Switchboard, reject outliers, maintain TWAP fallback. Mango Markets died from single oracle dependency—don't repeat that mistake.

**Critical implementation requirements (all protocols):**
1. **Staleness detection:** Reject prices older than `MAX_AGE` (30-120s depending on volatility). Pyth provides timestamp; check it.
2. **Confidence filtering:** If using Pyth, reject updates where `confidence / price > MAX_CONFIDENCE_RATIO` (typically 1-3%).
3. **Circuit breakers:** Pause protocol if price moves >X% in Y seconds (X=10-20%, Y=60-300s). False positives are better than liquidation cascades.
4. **Price sanity bounds:** Reject prices outside reasonable ranges (e.g., SOL not $0.01 or $10,000).
5. **Multi-transaction handling:** On Solana, Pyth pull oracles require posting update in one tx, consuming in next tx. Design for this.

## Lessons from Production

**Mango Markets oracle manipulation ($116M, October 2022):** Avi Eisenberg used flash loans to manipulate Mango's MNGO/USDC perpetual market. He borrowed large MNGO sums on Mango, then bought MNGO on spot markets (FTX, Ascendex) to pump the price. Mango's oracle used a combination of on-chain and off-chain sources but lacked sufficient manipulation resistance. Eisenberg inflated his collateral value, borrowed against it, and drained the protocol.

**Key failures:** (1) Insufficient liquidity depth in oracle source markets, (2) No circuit breakers on rapid price moves, (3) Single-block oracle updates enabled atomic manipulation, (4) Liquidation mechanism couldn't respond fast enough. Eisenberg was convicted of commodities fraud in April 2024—the first US criminal conviction for crypto oracle manipulation—and faces 20 years in prison. The case established legal precedent: "code is law" is not a valid defense for market manipulation.

**Solend oracle near-miss (May 2022):** During the May 2022 crash, Solend faced a whale position approaching liquidation that would have crashed Solana on-chain liquidity. The protocol nearly triggered a cascading liquidation event due to oracle lag during extreme volatility. Emergency DAO vote attempted to take over the whale's account (later reversed after community backlash).

**Lesson:** Even with Pyth, extreme volatility can create oracle-reality gaps. Protocols need backstop mechanisms beyond "liquidate instantly"—gradual liquidations, circuit breakers, or emergency pause.

**Pyth confidence interval saves (2023-2025):** Multiple protocols reported avoiding bad trades/liquidations by rejecting Pyth prices with excessive confidence intervals during:
- FTX collapse (November 2022): Confidence intervals spiked as CEX price sources went offline
- Binance USDC depeg (March 2023): Pyth flagged high uncertainty; protocols paused rather than liquidate at potentially wrong prices
- Solana network congestion (April 2024): Some Pyth feeds showed high confidence during congestion; protocols correctly waited

**Lesson:** Confidence intervals are not cosmetic—they're signal. Use them.

**Oracle staleness incidents (ongoing):** Protocols regularly discover their oracle integration doesn't actually check staleness. In 2024, a protocol launched on mainnet with Pyth integration but forgot `assert!(price.publish_time > now - MAX_AGE)`. During Solana network congestion, stale prices from cache got reused, causing pricing errors. No exploit occurred (whitehats disclosed), but demonstrates testing gaps.

**Lesson:** Oracle integration is high-stakes systems programming. Audit it specifically; don't assume wrapper libraries handle staleness.

**Switchboard Surge adoption (2025):** After Switchboard launched Surge with sub-100ms latency (August 2025), several high-frequency perps protocols migrated or added it alongside Pyth. Early reports suggest <100ms updates reduced funding rate arbitrage opportunities (good for LPs, bad for arbitrageurs). No major incidents yet, but smaller sample size than Pyth.

## Sources

- [Pyth Network Pull Oracle on Solana](https://pyth.network/blog/pyth-network-pull-oracle-on-solana) — Pull oracle architecture and deployment details
- [Pyth Network Perseus Upgrade](https://pyth.network/blog/perseus-network-upgrade) — 400ms update cadence, cost reductions
- [Pyth Best Practices](https://docs.pyth.network/price-feeds/core/best-practices) — Official integration guide with confidence intervals, staleness checks
- [Switchboard On-Demand Launch](https://switchboardxyz.medium.com/switchboard-on-demand-an-oracle-game-changer-d0e55c6a5c51) — On-demand oracle architecture
- [Switchboard Surge Launch](https://switchboardxyz.medium.com/introducing-switchboard-surge-the-fastest-oracle-on-solana-is-here-36ff615bfdf9) — Sub-100ms latency oracle for Solana
- [Switchboard vs Competition](https://switchboardxyz.medium.com/switchboard-vs-the-competition-why-we-are-the-everything-oracle-bbc27b967215) — Oracle comparison from Switchboard perspective
- [State of Pyth Q2 2025 - Messari](https://messari.io/report/state-of-pyth-q2-2025) — Pyth TVS growth, adoption metrics
- [CFTC Charges on Mango Markets Exploit](https://www.cftc.gov/PressRoom/PressReleases/8647-23) — Official charges against Avi Eisenberg for oracle manipulation
- [Mango Markets Conviction - TRM Labs](https://www.trmlabs.com/resources/blog/mango-markets-exploiter-avi-eisenberg-convicted-of-market-manipulation-and-fraud) — Legal outcome and forensic analysis
- [Mango Markets Conviction - Reuters](https://www.reuters.com/legal/trader-convicted-mango-markets-fraud-first-us-crypto-manipulation-case-2024-04-18/) — First US criminal case for crypto oracle manipulation
- [Oracle Manipulation Attacks - Chainalysis](https://www.chainalysis.com/blog/oracle-manipulation-attacks-rising/) — $403M+ lost in 2022, attack taxonomy
- [Oracle Manipulation DeFi Exploit List - ImmuneBytes](https://immunebytes.com/blog/list-of-oracle-manipulation-exploits-hacks-in-crypto/) — Comprehensive exploit database
- [Chainlink Oracle Best Practices](https://www.7blocklabs.com/blog/chainlink-oracle-security-best-practices-for-price-feeds-staleness-deviation-and-circuit-breakers) — Staleness, circuit breakers (applies to all oracles)
- [Why Oracle Staleness is Critical](https://www.chainscorelabs.com/en/blog/security-post-mortems-hacks-and-exploits/oracle-manipulation-attacks/why-oracle-data-freshness-is-a-critical-overlooked-metric) — Freshness as security primitive
- [Solana Hacks and Exploits - Helius](https://www.helius.dev/blog/solana-hacks) — Complete Solana security incident history including oracle failures
- [Solana Lending Protocol Security Best Practices](https://dev.to/ohmygod/solana-lending-protocol-security-a-deep-dive-into-audit-best-practices-32np) — Oracle integration patterns for lending
- [TWAP Oracle Security - Halborn](https://www.halborn.com/blog/post/why-twap-oracles-are-key-to-defi-security) — TWAP manipulation resistance properties
- [Uniswap V3 TWAP Market Risk - Chaos Labs](https://chaoslabs.xyz/posts/chaos-labs-uniswap-v3-twap-market-risk) — TWAP manipulation cost analysis
- [Common Oracle Vulnerabilities - Sigma Prime](https://blog.sigmaprime.io/oracles-and-pricing.html) — Spot pricing vs. TWAP vs. external oracles

## Gaps & Caveats

**Pull oracle cost model still evolving:** Both Pyth and Switchboard currently charge only Solana gas. Pyth DAO is discussing protocol fees; if implemented, economics shift. Monitor governance forums.

**Solana-specific challenges:** Multi-transaction oracle updates (fetch from Hermes → post to Solana → consume in protocol) create MEV opportunities and UX friction. Single-transaction solutions exist (price feed accounts) but require continuous background updates.

**Compute budget:** Complex protocols may hit Solana's 1.4M CU limit when combining oracle updates + verification + protocol logic. Test on mainnet with realistic transaction sizes.

**New oracle entrants:** RedStone (EVM-focused) exploring Solana; Chainlink has Data Streams but limited Solana traction. Landscape may shift.

**L2/SVM expansion:** As Solana apps migrate to Eclipse (SVM on Ethereum) or other SVM L2s, oracle infrastructure must follow. Pyth supports 50+ chains; Switchboard expanding. Plan for multi-chain oracle strategy if going multi-SVM.

**Confidence intervals underutilized:** Most protocols ignore Pyth's confidence intervals despite their value in filtering bad data. Education gap, not technical limitation.

**No silver bullet:** Even perfect oracle integration doesn't prevent all exploits. Protocols need defense-in-depth: conservative LTV ratios, position size limits, gradual liquidations, emergency pauses. Oracle is necessary but not sufficient for security.
