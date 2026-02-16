---
pack: solana
topic: "Liquidation Engine Design"
decision: "How do I build reliable liquidations on Solana?"
confidence: 8/10
sources_checked: 4
last_updated: "2026-02-16"
---

# Liquidation Engine Design

> **Decision:** How do I build reliable liquidations on Solana?

## Context

Liquidations are the critical safety valve of all collateralized DeFi protocols. When a borrower's collateral value falls below required thresholds, liquidation mechanisms kick in to sell that collateral and repay outstanding debt. This process protects lenders from capital loss and prevents systemic insolvency. Failed or delayed liquidations don't just hurt individual positions—they cascade into bad debt that threatens entire protocol solvency.

On Solana, liquidation design faces unique challenges. The network's high throughput (400ms block times, 65,000+ theoretical TPS) enables rapid price movements and position changes that can outpace traditional liquidation systems. Unlike Ethereum's public mempool where liquidators compete via gas auctions, Solana's architecture—especially with Jito's MEV infrastructure—creates a different competitive landscape. Liquidators must contend with parallel transaction processing, bundle-based transaction ordering, and millisecond-level latency requirements.

The stakes are substantial. Historical incidents demonstrate the cost of failure: Solend suffered a $1.26M exploit in November 2022 via oracle manipulation during liquidations; Loopscale lost $5.8M (~12% of TVL) in April 2025 just two weeks post-launch due to under-collateralization vulnerabilities in their PT token price feed. Across all Solana security incidents through Q1 2025, approximately $600M in gross losses occurred, with lending protocol exploits representing a significant portion. When liquidations fail, the protocol—and ultimately its lenders—absorb the bad debt.

## Options

### 1. Permissionless Liquidation (Open Keeper Model)

Any third party can call a liquidation function when a position becomes undercollateralized. The liquidator receives a bonus (typically 5-15% of collateral value) as incentive to execute quickly.

**Implementation:**
- Public `liquidate()` function callable by anyone when `health_factor < 1.0`
- Liquidator pays borrower's debt, receives collateral + liquidation bonus
- First-come-first-served execution (no queuing or priority)

**Examples:** Solend, Solera, most Solana lending protocols

**Pros:**
- Maximally decentralized—no special permissions required
- Natural economic incentives align liquidator profit with protocol health
- Competitive market drives efficiency

**Cons:**
- Vulnerable to MEV extraction (sandwiching, front-running)
- Gas wars during high volatility can delay executions
- No guaranteed execution during network congestion
- Liquidation bonus may be too high (punishes borrowers) or too low (delays execution)

### 2. Keeper Network (Designated Liquidators)

Protocol designates a set of registered keepers who are incentivized via structured rewards to monitor and execute liquidations.

**Implementation:**
- Keepers register and potentially stake collateral
- Off-chain keeper bots monitor all positions for liquidation eligibility
- On-chain execution still permissionless, but keepers get priority or enhanced rewards
- Drift Protocol's model: keepers fill orders "best effort" with economic incentives mimicking CLOB execution

**Examples:** Drift Protocol, MYX Finance keeper network

**Pros:**
- Higher reliability—dedicated actors with infrastructure
- Can implement SLA-based penalties for keeper failures
- Reduced "false positive" liquidation attempts
- Keepers can batch multiple liquidations for gas efficiency

**Cons:**
- More centralized—limited set of actors
- Requires keeper registration/reputation system
- Keepers may collude or censor certain liquidations
- Still vulnerable to keeper downtime or censorship

### 3. Dutch Auction Liquidation

Rather than fixed liquidation bonus, discount starts at 0% and increases over time until a liquidator executes.

**Implementation:**
- Position becomes eligible when health factor drops below threshold
- Liquidation bonus starts small (e.g., 2%) and increases linearly
- First liquidator to execute gets current bonus
- Euler Finance pioneered this for lending

**Pros:**
- More capital efficient—borrowers pay minimum necessary penalty
- Liquidators compete on speed vs. bonus size trade-off
- Reduces "race to bottom" gas wars
- Natural price discovery mechanism

**Cons:**
- Delayed execution during rapid price crashes
- Complexity in bonus curve calibration (too slow = bad debt; too fast = same as fixed)
- Requires more sophisticated keeper infrastructure
- May accumulate bad debt in extreme volatility

### 4. Partial Liquidation

Only liquidate enough collateral to bring position back above safe threshold rather than liquidating entire position.

**Implementation:**
- Calculate minimum debt repayment to restore health factor > 1.1
- Liquidate only corresponding collateral amount
- Position remains open with reduced debt
- Compound's RFC proposed this to reduce "liquidation spirals"

**Pros:**
- Reduces borrower impact—keeps positions alive
- Prevents cascade liquidations (where large liquidation dumps price, triggering more)
- Better UX—users less likely to lose entire position to small dips
- Smaller individual liquidations more capital-efficient for keepers

**Cons:**
- Multiple small liquidations may be less profitable (fixed gas costs)
- Requires more complex health factor tracking
- In rapid crashes, position may need multiple sequential liquidations
- Slightly higher protocol risk if partial liquidation is miscalculated

### 5. Socialized Loss / Insurance Fund

When liquidations fail to cover debt (position becomes insolvent), distribute losses across protocol participants or insurance pool.

**Implementation:**
- Insurance fund accumulates from protocol fees (e.g., portion of interest)
- When bad debt occurs: (1) liquidate what collateral remains, (2) cover shortfall from insurance fund
- If insurance fund depleted, socialize loss across all lenders pro-rata
- Circuit breakers pause borrowing during cascading insolvency events

**Pros:**
- Backstop against catastrophic scenarios
- Prevents individual lenders from bearing full brunt of bad debt
- Circuit breakers can halt cascade effects
- Aligns all participants in protocol health

**Cons:**
- Moral hazard—may reduce urgency of robust risk parameters
- Lenders subsidize risky borrowing behavior
- Insurance fund depletion during black swan events
- Socialized losses erode lender returns and trust

## Key Trade-offs

| Dimension | Permissionless | Keeper Network | Dutch Auction | Partial Liquidation | Insurance Fund |
|-----------|----------------|----------------|---------------|---------------------|----------------|
| **Decentralization** | High | Medium | High | High | Medium |
| **Execution Speed** | Variable (MEV-dependent) | Fast (dedicated infra) | Slower (price discovery) | Fast | N/A (backstop) |
| **Capital Efficiency** | Medium (fixed bonus) | Medium | High (min necessary bonus) | High | Low (idle capital) |
| **Borrower Impact** | High (full liquidation) | High | Medium (lower bonus) | Low (partial only) | Protects lenders |
| **Cascade Risk** | High | Medium | Medium | Low | Low (absorbs losses) |
| **Implementation Complexity** | Low | Medium | High | Medium | Medium |
| **MEV Exposure** | High | Medium | Low | Medium | N/A |
| **Keeper Profitability** | High variance | Predictable | Lower (competitive) | Lower (smaller trades) | N/A |
| **Bad Debt Risk** | Medium | Low | Medium-High | Medium | Explicitly managed |

## Recommendation

**Use a layered approach combining multiple mechanisms:**

### For Standard Lending Protocols (Solend-style)
1. **Primary:** Permissionless liquidation with **partial liquidation logic**
   - Set conservative LTV ratios (65-75% max)
   - Liquidate only 50% of collateral per call to prevent cascades
   - Fixed 5-8% liquidation penalty (low enough to attract keepers without punishing borrowers excessively)

2. **Enhancement:** Integrate **Jito bundles for liquidation priority**
   - Professional liquidators submit bundles with MEV tips for guaranteed inclusion
   - Reduces gas war waste, increases execution certainty
   - Tips go to validators/stakers, not extracted by protocol

3. **Backstop:** **Insurance fund + circuit breakers**
   - Reserve 10-20% of protocol revenue for bad debt coverage
   - Auto-pause new borrows when total bad debt > 2% of TVL or when oracle is stale
   - Socialize remaining losses if insurance fund depleted

### For Derivatives/Perps (Drift-style)
1. **Primary:** Dedicated keeper network with **JIT auction liquidations**
   - Registered keepers with reputation/stake requirements
   - Dutch auction for large positions (>$100k collateral)
   - Standard permissionless for small positions

2. **Enhancement:** Cross-margining and **dynamic health factors**
   - Allow positions across multiple assets to offset risk
   - Adjust liquidation thresholds based on market volatility (wider during calm, tighter during stress)

3. **Backstop:** P&L pools and **socialized liquidation losses**
   - Unsettled P&L pool absorbs initial losses
   - Revenue pool secondary backstop
   - Ultimate backstop: socialize across all market participants

### Universal Design Principles
- **Health Factor Calculation:** `health_factor = (collateral_value × liquidation_threshold) / debt_value`. Liquidatable when < 1.0; optimal to trigger at 1.02-1.05 buffer.
- **Oracle Resilience:** Use dual oracles (Pyth + Switchboard) with circuit breaker if price deviation > 5%
- **Gas Optimization:** Batch account updates, use lookup tables, minimize compute units (target <200k CU per liquidation)
- **Monitoring:** Off-chain keeper bots should scan all accounts every block (400ms), calculate health factors off-chain, submit liquidations via RPC with <50ms latency
- **MEV Strategy:** For liquidations >$50k, use Jito bundles with 0.01-0.05 SOL tip to validators for priority inclusion

## Lessons from Production

### Real Incidents & Bad Debt Events

**Solend Oracle Manipulation (November 2022, $1.26M loss)**
- Attacker deposited worthless SOLA token, manipulated oracle price upward via thin liquidity
- Borrowed stablecoins against inflated collateral, drained before liquidators could respond
- **Lesson:** Oracle manipulation is the primary attack vector. Require minimum liquidity thresholds, use TWAP prices, implement circuit breakers for abnormal price movements.

**Loopscale Under-Collateralization Exploit (April 2025, $5.8M loss)**
- Protocol launched with RateX PT token as collateral just 2 weeks prior
- Attacker manipulated on-chain price feed for PT token to borrow against under-collateralized position
- Liquidation system failed to execute because price oracle reported artificially high collateral value
- **Lesson:** New/exotic collateral types require extended observation periods, conservative LTV ratios (<50% initially), and isolated risk pools to prevent contagion.

**Drift Protocol Liquidation Competition Dynamics**
- Over 70% of Solana trading bots achieve <50ms RPC latency via dedicated infrastructure (RPC Fast)
- Only ~10% achieve sustainable profitability—speed alone insufficient
- Successful liquidators combine: (1) sub-50ms RPC latency, (2) Jito bundle submission for priority, (3) multi-market arbitrage to offset failed attempts, (4) liquidation opportunity aggregation across protocols
- **Lesson:** Liquidation keeper market is professionalized. Small protocols cannot rely on "hobbyist" liquidators—must actively incentivize professional infrastructure via sufficient bonuses and reliable execution.

### Cascade Incidents & Prevention

**March 2024: Jito Mempool Shutdown**
- Jito Labs shut down mempool after collecting >10,000 SOL ($1.5M+) in MEV tips in single day
- Shutdown triggered by excessive sandwich attacks harming user experience
- **Impact on liquidations:** Professional liquidators lost priority execution mechanism temporarily, falling back to standard RPC
- **Lesson:** Over-reliance on single MEV infrastructure creates systemic risk. Protocols should design liquidation systems that work with AND without Jito bundles.

**Liquidation Cascade Risk (General DeFi)**
- Large liquidation → collateral dumped on market → price drops → more positions become undercollateralized → cascade
- Ethereum DeFi saw cascades during March 2020 crash, May 2021 crash
- Partial liquidations reduce this: liquidate 25-50% of position rather than 100%
- Circuit breakers: pause new borrows if >10% of positions liquidated in 1 hour

### Keeper Competition & MEV Dynamics

**Jito Bundle Economics for Liquidators (2024-2025)**
- Standard liquidation profit margin: 5-8% of collateral value
- Jito tip range: 0.001-0.1 SOL depending on liquidation size
- For $10k liquidation (5% bonus = $500 profit), liquidator might tip 0.01 SOL (~$2-5) for guaranteed inclusion
- Net profit: $495-498 vs. $500 without tip BUT with execution certainty
- **Lesson:** MEV tips are insurance against failed transactions. Profitable liquidators pay tips to reduce variance, not maximize single-trade profit.

**Keeper Bot Architecture (Drift/Solend Model)**
1. **Monitoring:** Subscribe to WebSocket account updates for all user positions (thousands to millions)
2. **Health Calculation:** Off-chain compute health factor using latest oracle prices (Pyth streaming)
3. **Execution:** When health < threshold, construct liquidation transaction
4. **Routing:** Small liquidations via standard RPC; large (>$50k) via Jito bundle with tip
5. **Fallback:** If bundle rejected/timed out, retry via standard RPC (may fail to gas competition)

**Profitability Analysis (2025 Data)**
- Fixed costs: RPC infrastructure ($500-2000/month), Jito tips (variable), development/maintenance
- Variable costs: failed transaction fees (~0.000005 SOL/tx but adds up with competition)
- Revenue: liquidation bonuses (5-15% of collateral)
- Successful professional liquidators process >100 liquidations/day across multiple protocols
- Break-even typically requires >$500k monthly liquidation volume

## Sources

- [Building Production-Grade Solana Sniper Bots: A 2026 Technical Blueprint](https://dysnix.com/blog/complete-stack-competitive-solana-sniper-bots) — Infrastructure requirements for sub-50ms RPC latency and competitive bot architecture on Solana
- [Drift Protocol: Keepers & Decentralized Orderbook FAQ](https://docs.drift.trade/about-v2/keepers-decentralized-orderbook-faq) — Real-world keeper network design, best-effort execution guarantees, and economic incentives for decentralized orderbook liquidations
- [Euler Finance: Liquidation Mechanisms](https://docs.euler.finance/concepts/risk/liquidations/) — Dutch auction liquidation design, vault creator controls, and proportional discount mechanisms
- [How to Design a Lending Protocol to Prevent Liquidation Cascades](https://www.chainscorelabs.com/en/guides/risk-management-and-financial-security/cryptoeconomic-attack-vectors/how-to-architect-a-lending-protocol-against-liquidation-cascades) — Architectural patterns for preventing cascade liquidations in lending protocols
- [Compound RFC: Partial Liquidations](https://www.comp.xyz/t/rfc-partial-liquidations/6721) — Proposal and rationale for partial liquidation mechanisms to reduce borrower impact
- [Building a Decentralized Lending Protocol: Risk Management Logic](https://www.7blocklabs.com/blog/building-a-decentralized-lending-protocol-risk-management-logic) — Gas optimization, mispriced LTVs, oracle failures, and production risk engine design
- [DeFi Liquidation Vulnerabilities and Mitigation Strategies](https://www.cyfrin.io/blog/defi-liquidation-vulnerabilities-and-mitigation-strategies) — Common liquidation code vulnerabilities, exploit patterns, and security best practices
- [Solana MEV Economics: Jito, Bundles, and Liquid Staking](https://blog.quicknode.com/solana-mev-economics-jito-bundles-liquid-staking-guide/) — Jito bundle mechanics, MEV marketplace, tip economics, and validator interactions
- [Jito Foundation: Maximum Extractable Value](https://www.jito.network/docs/jitosol/jitosol-liquid-staking/maximum-extractible-value/) — Official Jito documentation on MEV infrastructure, bundle submission, and tip payment program
- [Solana MEV: An Introduction (Helius)](https://www.helius.dev/blog/solana-mev-an-introduction) — Overview of Solana MEV landscape, Jito mempool shutdown, and implications for liquidators
- [Jito Bundling and MEV Optimization Strategies on Solana](https://medium.com/@gwrx2005/jito-bundling-and-mev-optimization-strategies-on-solana-an-economic-analysis-c035b6885e1f) — Detailed economic analysis of Jito bundle auctions, searcher-validator interactions, and optimal bidding strategies
- [Solana MEV: A Deep Dive into Jito and the Future of Arbitrage](https://sanj.dev/post/solana-mev-jito-deep-dive) — Block Assembly Marketplace (BAM) mechanics, parallel transaction processing impact on MEV extraction
- [History of Solana Security Incidents: A Deep Dive](https://collinsdefipen.medium.com/history-of-solana-security-incidents-a-deep-dive-2332d17e6375) — Comprehensive chronology of all major Solana exploits through April 2025, categorized by attack type
- [Solana Hacks, Bugs, and Exploits: A Complete History (Helius)](https://www.helius.dev/blog/solana-hacks) — 38 verified security incidents, ~$600M gross losses, detailed breakdown of application exploits and bad debt events
- [Solana's Loopscale Suspends Lending After $5.8M Exploit](https://www.cryptoninjas.net/news/solanas-loopscale-suspends-lending-after-5-8m-exploit/) — April 2025 under-collateralization vulnerability via RateX PT token oracle manipulation
- [Solend Exploited for $1.26 Million in Market Manipulation Attack](https://www.theblock.co/post/182055/solend-exploited-attack) — November 2022 oracle manipulation exploit via SOLA token price inflation
- [Solera: Liquidations](https://docs.solera.market/protocol/risk-management/liquidations) — Production implementation of Morpho-based liquidations, health factor calculations, and bad debt risk mitigation
- [Solera: Operating a Liquidator Bot](https://docs.solera.market/developers/operating-a-liquidator-bot) — Practical guide for participating in open-source liquidation processes on Solana
- [Solera: Bad Debt Risk](https://docs.solera.market/protocol/integrations/bad-debt-risk) — Analysis of liquidation failure scenarios, slippage impact, and risk management frameworks
- [Mitigating Decentralized Finance Liquidations with Reversible Call Options](https://eprint.iacr.org/2023/254.pdf) — Academic research on Miqado protocol using reversible call options to prevent liquidation spirals
- [OECD: DeFi Liquidations - Volatility and Liquidity](https://www.oecd.org/content/dam/oecd/en/publications/reports/2023/07/defi-liquidations_89cba79d/0524faaf-en.pdf) — Macroeconomic analysis of liquidation mechanisms, volatility impact, and liquidity considerations

## Gaps & Caveats

**Oracle Latency on Solana**
- Pyth and Switchboard update frequencies vary by asset (some <1s, others 10s+)
- During extreme volatility, oracle updates may lag actual market prices by multiple blocks (400ms each)
- No comprehensive data on "optimal" oracle staleness thresholds for Solana vs. other chains
- **Gap:** Need empirical research on oracle lag impact during historical Solana volatility events

**Jito Bundle Rejection Rates**
- Limited public data on bundle rejection/timeout rates under network congestion
- Unclear what % of liquidation bundles fail during high-activity periods (e.g., token launches, major market moves)
- **Caveat:** Liquidation systems relying heavily on Jito may fail during peak MEV activity when bundle competition is highest

**Cross-Protocol Liquidation Coordination**
- If User A has positions on both Solend and Drift, optimal liquidation may involve coordination
- No standard exists for cross-protocol health monitoring or coordinated liquidations
- **Gap:** Future research needed on cross-margin systems that span protocols

**Bad Debt Socialization Economics**
- Unclear what % of bad debt is "acceptable" before lender flight occurs
- Historical data suggests even 0.1-1% bad debt can trigger bank runs on lending protocols
- Insurance fund sizing guidelines are heuristic (10-20% of revenue) rather than actuarially sound
- **Caveat:** Insurance funds provide psychological comfort more than mathematical protection against tail events

**Network Congestion Impact**
- During Solana congestion events (e.g., NFT mints, airdrops), transaction success rates drop to 60-80%
- Liquidations compete for same scarce block space as high-priority user transactions
- **Gap:** No published data on liquidation execution rates during historical Solana congestion vs. normal operation

**Liquidation Bot Centralization**
- If only 3-5 professional teams run 90% of liquidations, protocol at risk of keeper cartel
- No transparency into keeper market concentration on Solana protocols
- **Caveat:** "Permissionless" liquidations may be theoretically open but practically oligopolistic

**Partial Liquidation Optimal Parameters**
- No consensus on "right" % to liquidate (25%? 50%? 75%?)
- Trade-off between borrower protection and keeper profitability not well quantified
- **Gap:** Simulation studies needed using historical Solana price data to determine optimal partial liquidation ratios
