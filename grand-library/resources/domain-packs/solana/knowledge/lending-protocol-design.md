---
pack: solana
topic: "Lending Protocol Design"
decision: "How do I build a lending protocol on Solana?"
confidence: 8/10
sources_checked: 42
last_updated: "2026-02-16"
---

# Lending Protocol Design

> **Decision:** How do I build a lending protocol on Solana?

## Context

Lending protocols are the backbone of DeFi on Solana, enabling users to earn yield on deposited assets and borrow against collateral without intermediaries. As of December 2025, Solana's lending markets hold $3.6B in TVL—up 33% year-over-year—with protocols like Kamino ($2.8B), Marginfi ($1.4B), and Solend competing intensely. The sector has matured from early exploits and governance crises to institutional-grade sophistication, with Gauntlet managing $140M in model-tested strategies.

Building a lending protocol on Solana requires navigating critical architectural decisions around interest rate models, liquidation mechanics, oracle design, and risk management. The wrong choices have led to catastrophic failures: Solend's $1.26M oracle manipulation attack (Nov 2022), Marginfi's flash loan vulnerability ($160M at risk), and the infamous SLND1 governance crisis that nearly gave protocol developers emergency control over a whale's wallet. Meanwhile, successful protocols have demonstrated that battle-tested designs—Kamino's isolated markets, Marginfi's portfolio margin, and robust oracle aggregation—can achieve scale while maintaining security.

This decision matters because lending protocols face unique challenges on Solana: 400ms block times enable low-latency liquidations but also create oracle manipulation windows; network congestion can prevent timely liquidations during volatility; and the ecosystem's rapid innovation pace means new entrants can capture category leadership within six months. Understanding production-tested patterns—from interest curve kink points to health factor calculations—is essential for building protocols that survive both market crashes and adversarial attacks.

## Options

### Option A: Pooled Liquidity Model (Aave/Compound Style)

**What:** All lenders deposit into shared pools per asset; borrowers draw from aggregated liquidity; variable interest rates adjust algorithmically based on utilization.

**Pros:**
- Maximum capital efficiency—lenders not matched 1:1 to borrowers
- Deep liquidity enables large borrows without fragmentation
- Automatic interest rate discovery via utilization curves
- Battle-tested on Solana (Kamino Main Pool, Marginfi, Solend)
- Simpler UX—deposit and earn, no order matching

**Cons:**
- Shared risk across all users in a pool
- 100% utilization can freeze withdrawals (Solend SLND1 crisis)
- Bank run risk during volatility
- Single oracle failure affects entire pool
- Higher systemic risk vs. isolated markets

**Best for:** General-purpose lending with mainstream assets (SOL, USDC, USDT) where liquidity depth matters more than risk isolation.

**Real-world examples:**
- Marginfi's global lending context ($1.4B TVL)
- Solend Main Pool (pre-isolation)
- Early Kamino V1 architecture

### Option B: Isolated Markets Model

**What:** Each market pairs specific collateral and borrow assets with independent risk parameters, oracles, and interest curves; defaults don't spread across markets.

**Pros:**
- Risk isolation—one market's failure doesn't cascade
- Custom parameters per asset pair (LTV, liquidation threshold, IR curves)
- Enables long-tail assets without endangering core pools
- Permissionless market creation (Kamino Lend V2)
- Better handling of correlated asset risk

**Cons:**
- Liquidity fragmentation across markets
- More complex UX—users must choose markets
- Higher gas costs to interact with multiple markets
- Requires sophisticated risk parameter tuning per market
- Smaller markets more vulnerable to manipulation

**Best for:** Protocols supporting diverse assets (RWAs, LSTs, exotic pairs) or wanting strict risk compartmentalization.

**Real-world examples:**
- Kamino Lend V2 (launched Sept 2024): permissionless isolated markets with custom oracles
- Solend isolated pools (Stable, Coin98, Kamino pools attacked in Nov 2022)
- Morpho Markets on Solana

**Key design detail:** Kamino V2's architecture separates Market Layer (isolated lending) from Vault Layer (automated strategies), enabling modular risk management.

### Option C: Peer-to-Peer Order Book Model

**What:** Lenders and borrowers matched via on-chain order book; fixed-rate or fixed-term loans; explicit matching rather than pooled liquidity.

**Pros:**
- No pooled risk—counterparty isolation
- Fixed-rate certainty for both parties
- Lower smart contract risk surface
- Useful for institutional fixed-income strategies
- Eliminates utilization-based rate volatility

**Cons:**
- Poor capital efficiency—requires exact matching
- Illiquid markets for most assets
- Complex UX—managing individual loans
- Doesn't leverage Solana's low-latency advantage
- Slower loan origination vs. instant borrow from pools

**Best for:** Institutional credit markets, RWA tokenization with known terms, or fixed-rate DeFi products.

**Real-world examples:**
- Kamino's upcoming Lending Orderbook (announced V2 roadmap)
- Rare in production on Solana; more common on Ethereum (Yield Protocol)

### Option D: Portfolio Margin / Cross-Collateralization

**What:** Users post collateral once and borrow multiple assets across protocols; unified risk calculation across all positions.

**Pros:**
- Maximum capital efficiency—one collateral pool, many borrows
- Supports complex strategies (delta-neutral, basis trading)
- Reduces fragmentation for power users
- Enables cross-protocol margin (Marginfi's vision)
- Better UX for advanced traders

**Cons:**
- Complex risk modeling—correlations, portfolio value-at-risk
- Higher smart contract complexity increases attack surface
- Liquidation logic more intricate
- Requires sophisticated oracle aggregation
- Harder to audit and reason about edge cases

**Best for:** Advanced trading platforms targeting institutional or sophisticated retail users executing multi-leg strategies.

**Real-world examples:**
- Marginfi V2: "Global borrowing and lending under unified context"
- Gauntlet's $140M managed strategies across Kamino
- Less common in pure lending; more in perp DEXs

## Key Trade-offs

| Dimension | Pooled Liquidity | Isolated Markets | P2P Order Book | Portfolio Margin |
|-----------|-----------------|------------------|----------------|------------------|
| **Capital Efficiency** | High | Medium | Low | Very High |
| **Risk Isolation** | Low | High | Very High | Low |
| **Liquidity Depth** | High | Medium-Low | Low | High |
| **Smart Contract Complexity** | Medium | Medium-High | Low-Medium | Very High |
| **Oracle Failure Impact** | Pool-wide | Market-specific | Per-loan | System-wide |
| **Long-tail Asset Support** | Risky | Safe | Safe | Risky |
| **UX Simplicity** | Simple | Medium | Complex | Complex |
| **Utilization Crisis Risk** | High (100% lockup) | Medium (per-market) | None | High |
| **Audit Difficulty** | Medium | High (many markets) | Low | Very High |
| **Solana Ecosystem Adoption** | High (80%+) | Growing (20%) | Rare (<5%) | Emerging |

## Recommendation

**For MVP or general-purpose protocol:** Start with **Pooled Liquidity Model** for 3-5 blue-chip assets (SOL, USDC, USDT, mSOL, JitoSOL). This path is proven, attracts TVL fastest, and leverages existing oracle infrastructure. Prioritize:
- Pyth + Switchboard dual-oracle setup for manipulation resistance
- Linear IR curve with kink at 80% utilization (industry standard)
- Conservative LTV ratios (70-75% for SOL, 85-90% for stablecoins)
- In-house liquidation bots + open liquidation incentives (5-10% bonus)

**For differentiated or institutional protocol:** Use **Isolated Markets Model** (Kamino V2 pattern) to:
- Support RWAs, LSTs, and exotic pairs safely
- Attract power users who want tailored risk parameters
- Enable permissionless market creation as growth moat
- Build modular vault layer on top for yield automation

**Avoid P2P Order Book** unless targeting fixed-rate institutional credit—capital efficiency is too poor for retail DeFi.

**Avoid Portfolio Margin** initially—complexity/risk ratio too high until you've proven core lending mechanics and accumulated security track record.

**Hybrid approach (recommended for scale):** Launch with pooled liquidity for mainstream assets, then add isolated markets as you mature. Kamino followed this exact path: V1 pooled → V2 isolated markets + vaults.

## Interest Rate Model Design

All Solana lending protocols use **utilization-based variable rates** with piecewise-linear curves:

### The Math

```
Utilization Ratio (U) = Total Borrowed / Total Supplied

// Standard kinked model (2 slopes):
if U < U_optimal:
    Borrow Rate = Base Rate + (U / U_optimal) × Slope1
else:
    Borrow Rate = Base Rate + Slope1 + ((U - U_optimal) / (1 - U_optimal)) × Slope2

Supply Rate = Borrow Rate × U × (1 - Reserve Factor)
```

### Real-World Parameters (Kamino/Marginfi)

**SOL:**
- U_optimal = 80%
- Base Rate = 0%
- Slope1 = 10% (gentle increase 0-80%)
- Slope2 = 300% (steep increase 80-100%)

**Stablecoins (USDC/USDT):**
- U_optimal = 90%
- Base Rate = 0%
- Slope1 = 4%
- Slope2 = 60%

**Why the kink?** At high utilization (90%+), steep rates:
1. Incentivize new lenders to deposit
2. Discourage additional borrowing
3. Preserve liquidity for withdrawals
4. Prevent 100% utilization lockup (Solend SLND1 lesson)

**Reserve Factor:** Protocols take 12.5-13.5% spread on interest (marginfi docs). This funds treasury, insurance, and development.

**Update frequency:** Rates recalculate every transaction (Solana's 400ms blocks enable near-real-time adjustment).

### Alternative: Semi-Log Model (Curve Finance style)

```
Borrow Rate = Rate_min × (Rate_max / Rate_min)^U
```

Smoother curve, no discontinuous kink. Rare on Solana; linear kinked model dominates due to simplicity and predictability.

## Health Factor & Liquidation Mechanics

### Health Factor Formula

```
Health Factor = (Collateral Value × Liquidation Threshold) / Borrowed Value

// Example:
// - Supply: $10,000 SOL (LT = 80%)
// - Borrow: $7,000 USDC
// HF = ($10,000 × 0.80) / $7,000 = 1.14

// Position liquidatable when HF < 1.0
```

**Critical thresholds:**
- **LTV (Loan-to-Value):** Maximum borrow at origination (e.g., 75% = can borrow $7,500 against $10,000)
- **Liquidation Threshold:** HF trigger point (e.g., 80% = liquidated when debt reaches $8,000)
- **Liquidation Penalty:** Discount for liquidators (5-10% typical)

**Real parameters (Kamino/Marginfi):**

| Asset | Max LTV | Liquidation Threshold | Liq Penalty |
|-------|---------|----------------------|-------------|
| SOL | 70-75% | 80% | 5-7% |
| mSOL/JitoSOL | 75-80% | 85% | 5% |
| USDC/USDT | 85-90% | 92.5% | 3-5% |
| Volatile alts | 50-60% | 70% | 10-15% |

### Liquidation Process

1. **Monitoring:** Off-chain bots query all positions every slot (400ms)
2. **Trigger:** When HF < 1.0, anyone can call `liquidate_account()`
3. **Partial liquidation:** Protocols limit single liquidation to 20-50% of debt (reduce market impact)
4. **Collateral seizure:** Liquidator repays debt, receives collateral at discount
5. **DEX routing:** Liquidator typically market-sells collateral on Jupiter/Orca

**Marginfi-specific innovation:** In-house liquidators + open marketplace. Protocol runs its own bots to guarantee baseline coverage, but external liquidators provide redundancy and competition.

**Kamino V2 upgrade:** "Next-Gen Liquidation Engine" with:
- Priority fee optimization during congestion
- Multi-hop DEX routing (Orca → Raydium fallback)
- Partial liquidation tuning per market

### Lessons from Production

**Solend SLND1 Crisis (June 2022):**
- **Problem:** Whale held 95% of SOL deposits ($170M), borrowed $108M USDC/USDT at 88% utilization
- **Risk:** If SOL hit $22.30 (only 15% drop), $21M liquidation would trigger
- **Potential chaos:** On-chain liquidation could spam network, cause Solana outage
- **Governance disaster:** SLND1 proposal passed to give Solend Labs "emergency powers" to control whale's wallet and execute OTC liquidation
- **Community backlash:** Vote passed in 6 hours with only 1 whale controlling outcome; reversed next day after outcry
- **Fix:** Implemented per-user borrow limits, diversified utilization across pools

**Key takeaway:** Never concentrate >20% of pool TVL in single user. Implement per-wallet deposit/borrow caps from day one.

**Solend Oracle Manipulation (Nov 2022):**
- **Attack:** Pumped USDH price on Saber DEX, prevented arbitrage by spamming Saber account so price couldn't update in same slot
- **Impact:** Attacker deposited inflated USDH as collateral, borrowed against fake value; $1.26M bad debt across Stable, Coin98, Kamino pools
- **Oracle used:** Switchboard (single source)
- **Root cause:** DEX-based pricing without TWAP, no multi-oracle validation, no liquidity depth checks
- **Fix:** Dual-oracle requirement (Pyth + Switchboard), price divergence alerts, minimum liquidity thresholds for DEX-derived prices

**Key takeaway:** Never use single oracle source. Always aggregate Pyth + Switchboard at minimum. For low-liquidity assets, use Pyth's EMA (5921 slot window ≈ 1 hour) to smooth manipulation.

**Marginfi Flash Loan Vulnerability (Sept 2025):**
- **Problem:** New instruction broke flash loan repayment logic; attacker could borrow without returning funds
- **Risk:** $160M deposits vulnerable
- **Response:** Disclosed via bug bounty, patched quickly, no funds lost
- **Root cause:** Adding new instruction without considering flash loan state machine invariants

**Key takeaway:** Flash loan logic is extremely fragile. Any new instruction interacting with user accounts needs formal verification of "borrow-within-transaction must be repaid" invariant.

**Kamino Precision Loss Bug (March 2025):**
- **Problem:** Rounding error in exchange rate calculation allowed redeeming more collateral than deposited (edge case, not yet exploitable)
- **Fix:** Certora formal verification caught issue before production impact
- **Method:** Prover verified invariant: `redeemed_value ≤ deposited_value` for all edge cases

**Key takeaway:** Formal verification isn't optional for lending protocols at scale. Audit + Certora/Runtime Verification combo is industry standard.

**Loopscale Exploit (April 2025):**
- **Attack:** Manipulated RateX PT token on-chain price feed
- **Impact:** $5.8M drained (12% of TVL) two weeks after launch
- **Lesson:** New protocols most vulnerable in first 30 days; oracle design is hardest to get right

**SPL Token-Lending Library Vulnerability (Dec 2021):**
- **Impact:** $350M TVL at risk across Solend, Tulip, Larix
- **Response:** Neodyme disclosed; protocols pooled $1.05M bug bounty (largest in Solana history at the time)
- **Fix:** All protocols using SPL library patched simultaneously

**Key takeaway:** Using shared open-source libraries increases eyes on code (good) but creates correlated failure risk (bad). Diversify codebases across ecosystem.

## Oracle Design

### Recommended Architecture: Dual-Oracle Aggregation

```rust
// Marginfi pattern (from docs)
fn get_price() -> Result<Price> {
    let pyth_price = pyth_oracle.get_price()?;
    let switchboard_price = switchboard_oracle.get_price()?;

    // Check divergence
    let divergence = abs(pyth_price - switchboard_price) / pyth_price;
    require!(divergence < MAX_DIVERGENCE, "Oracle price mismatch");

    // Use EMA from Pyth (5921 slot window ≈ 1 hour)
    // More resistant to manipulation than spot price
    Ok(pyth_price.ema)
}
```

**Pyth advantages:**
- 500+ price feeds (most comprehensive on Solana)
- Pull-based oracle (launched June 2024)—users pull prices on-demand, reduces congestion risk
- Confidence intervals published (can reject low-confidence prices)
- EMA smoothing (inverse confidence-weighted over 1-hour window)

**Switchboard advantages:**
- Decentralized oracle network (vs. Pyth's first-party publishers)
- Customizable update frequency per feed
- Can aggregate from multiple sources (Pyth, Chainlink, DEXs)

**Price staleness checks:**
```rust
const MAX_PRICE_AGE: i64 = 60; // seconds

let current_slot = Clock::get()?.slot;
let price_slot = oracle_account.last_update_slot;
let slot_age = current_slot - price_slot;

// Solana: ~2.5 slots/sec → 60s ≈ 150 slots
require!(slot_age < 150, "Oracle price stale");
```

**For low-liquidity assets:** Use Pyth Pull Oracle + circuit breakers. If price moves >20% in 5 minutes, pause borrowing/liquidations until governance review.

**Common mistakes:**
1. Using DEX spot prices directly (manipulation via flash loans/swaps)
2. Single oracle source (Solend 2022 attack)
3. No staleness checks (liquidations using outdated prices during outages)
4. No confidence interval filtering (accepting low-quality Pyth prices)

## Risk Management Features

### Circuit Breakers
- Pause new borrows if utilization >95%
- Pause liquidations if oracle price moves >X% in Y minutes (prevents oracle manipulation cascades)
- Governance multisig can emergency-pause contracts (6-hour timelock minimum)

### Per-Asset Risk Parameters
- Maximum total supply cap (e.g., max $50M USDC in pool)
- Per-wallet deposit/borrow caps (prevent whale concentration)
- Debt ceilings per asset (limit total borrowed amount)
- Isolated market listing requirements (minimum liquidity, oracle coverage)

### Liquidation Safeguards
- Partial liquidation limits (max 50% debt repaid per transaction)
- Liquidation penalty caps (max 15% to prevent predatory liquidations)
- Insurance fund (fee reserves used to cover bad debt before socializing losses)

### Governance & Upgrades
- **Timelock:** 3-7 days for risk parameter changes (Kamino, Marginfi use Realms.today)
- **Multisig threshold:** 4-of-7 or 5-of-9 for emergency actions
- **Immutable core:** Borrowing/lending logic should be non-upgradeable; only risk parameters via governance
- **SLND1 lesson:** Never give protocol team unilateral power to control user funds, even in "emergency"

## Architecture Patterns

### Program Structure (Anchor framework)

```
lending_protocol/
├── programs/
│   ├── marginfi-v2/          # Core lending logic
│   │   ├── instructions/
│   │   │   ├── lending_account_borrow.rs
│   │   │   ├── lending_account_deposit.rs
│   │   │   ├── lending_account_withdraw.rs
│   │   │   ├── liquidate.rs
│   │   ├── state/
│   │   │   ├── marginfi_group.rs      # Global config
│   │   │   ├── bank.rs                # Per-asset pool
│   │   │   ├── marginfi_account.rs    # User position
│   │   ├── utils/
│   │       ├── interest_rate.rs
│   │       ├── health_factor.rs
│   │       ├── oracle.rs
│   ├── liquidator/            # Optional: in-house liquidator
```

### Key Account Structure (Marginfi example)

```rust
// Global config
pub struct MarginfiGroup {
    pub admin: Pubkey,
    pub banks: Vec<Pubkey>,  // All asset pools
}

// Per-asset pool
pub struct Bank {
    pub asset_mint: Pubkey,
    pub liquidity_vault: Pubkey,
    pub total_deposits: u64,
    pub total_borrows: u64,
    pub ir_config: InterestRateConfig,
    pub oracle: OracleConfig,
    pub risk_params: RiskParams,
}

// User position
pub struct MarginfiAccount {
    pub authority: Pubkey,
    pub balances: Vec<Balance>,  // Array of (bank, deposit, borrow)
}

pub struct Balance {
    pub bank: Pubkey,
    pub deposit_shares: u64,  // Use share-based accounting
    pub borrow_shares: u64,   // Prevents rounding exploits
}
```

**Share-based accounting** (critical for security):
- Don't track raw token amounts—use shares of total pool
- Prevents rounding attacks where attackers deposit 1 wei, inflate exchange rate, steal funds
- Kamino precision loss bug was caught because Certora verified share → token conversion

### Testing & Security Checklist

**Pre-launch musts:**
1. **Audit:** Dual audit from reputable firms (OtterSec, Neodyme, Sec3 on Solana)
2. **Formal verification:** Certora/Runtime Verification for core invariants
3. **Stress testing:** Simulate liquidation cascades, 100% utilization, oracle failures
4. **Bug bounty:** $100K+ for critical findings (Immunefi standard)
5. **Liquidator testing:** Run liquidation bot on mainnet-fork for 1+ month
6. **Oracle failure drills:** Test price staleness, divergence, and manipulation scenarios

**Post-launch monitoring:**
1. Real-time health factor alerts for all positions
2. Oracle price divergence monitoring (Pyth vs. Switchboard)
3. Utilization rate alerts (>90% = warning, >95% = critical)
4. Anomaly detection (unusual borrow patterns, whale concentration)

## Lessons from Production

### What Works
- **Dual oracles (Pyth + Switchboard):** No successful oracle attacks since Solend 2022 adopted this
- **Isolated markets for long-tail assets:** Kamino's permissionless markets enable innovation without endangering core pools
- **Conservative LTVs:** 70-75% for volatile assets has prevented cascading liquidations
- **In-house + external liquidators:** Marginfi's hybrid model ensures coverage even during congestion
- **Slow governance:** 3-7 day timelocks prevented hasty decisions like SLND1

### What Doesn't Work
- **Single whale concentration:** Solend SLND1 near-disaster; implement caps from day one
- **100% utilization tolerance:** Freezes withdrawals, creates bank run panic; always keep kink <95%
- **DEX spot prices:** Trivially manipulated; use Pyth/Switchboard aggregates only
- **Fast governance for fund control:** SLND1 passed in 6 hours, nearly gave devs wallet access
- **Flash loan logic complexity:** Marginfi bug shows adding instructions breaks assumptions

### Security Hierarchy (Prioritize in Order)
1. **Oracle robustness:** Dual-source, staleness checks, confidence intervals
2. **Liquidation reliability:** In-house bots, partial liquidations, penalty caps
3. **Interest rate stability:** Proven kinked model, high utilization penalties
4. **Upgrade safety:** Timelocks, multisig, immutable core logic
5. **Governance legitimacy:** Sufficient vote duration, quorum requirements, no emergency fund access

## Gaps & Caveats

**Rapidly changing landscape:**
- Pyth switched from push to pull oracle in June 2024; integration patterns still evolving
- Cross-program composability (Kamino vaults calling Marginfi) creates complex interaction risk
- RWA tokenization (T-bills, real estate) on Solana is nascent; risk parameters unproven
- Institutional adoption (Gauntlet's $140M) may demand features like fixed-rate lending, which Solana protocols don't yet offer at scale

**Unknown unknowns:**
- No Solana lending protocol has survived a 2020-style DeFi Summer liquidation cascade (90%+ asset crashes in hours)
- Solana network outages (less common in 2024-25) still pose liquidation failure risk
- MEV on Solana (Jito bundles) may enable new liquidation frontrunning attacks
- Stablecoin depeg scenarios (USDC March 2023) not well-tested on Solana vs. Ethereum

**Missing in this analysis:**
- Regulatory compliance (MiCA, US securities law) for lending protocols
- Tax implications of auto-compounding interest (depends on jurisdiction)
- Cross-chain lending (Wormhole, Allbridge) security—Wormhole $326M hack was bridge, but would impact Solana lending if exploited today

**Where to go deeper:**
- Formal verification: Read Certora audit reports (Kamino case study)
- Oracle design: Pyth whitepaper, Switchboard docs on manipulation resistance
- IR model optimization: Gauntlet's risk modeling methodology (public research)
- Solana-specific: Helius blog's "Complete History of Solana Hacks" covers all major incidents

## Sources

- [Solana Lending Markets Report 2025 - RedStone](https://blog.redstone.finance/2025/12/11/solana-lending-markets/) — TVL data, market share, institutional adoption trends
- [Kamino: Solana's Battle-Tested Path to Institutional On-Chain Credit](https://www.linkedin.com/pulse/kamino-solanas-battle-tested-path-institutional-on-chain-chetan-kale-tw2vf) — Kamino architecture, TVL history, product evolution
- [Introducing Kamino Lend V2](https://blog.kamino.finance/introducing-kamino-lend-v2-08ad8f52855c) — Isolated markets design, liquidation engine, vault layer
- [marginfi v2 Program Documentation](https://docs.marginfi.com/mfi-v2) — Instruction architecture, account structure, technical implementation
- [marginfi Protocol Design](https://docs.marginfi.com/protocol-design) — Oracle usage (Pyth + Switchboard), risk management, interest mechanism
- [Protocol math (Solana) - Honey Finance](https://docs.honey.finance/lending-protocol/interest-rates/protocol-math-solana) — Linear interest rate formulas, real parameter examples
- [A Primer on Curve Lending - LlamaRisk](https://llamarisk.com/research/curve-lending) — Semi-log rate model alternative, LLAMMA mechanics
- [Aave Interest Rate Model Explained - Krayon Digital](https://www.krayondigital.com/blog/aave-interest-rate-model-explained) — Optimal utilization theory, kink point rationale
- [Interest Rates | Solera](https://docs.solera.market/overview/editor/interest-rates) — Two-phase linear curve with kink, U_optimal design
- [SLND1: Mitigate Risk From Whale - Solend](https://blog.solend.fi/slnd1-mitigate-risk-from-whale-1504285ab4d2) — Original governance proposal, whale position details
- [Solend Whale With $108M Loan Nearly Crashed Solana - Decrypt](https://decrypt.co/103489/solend-whale-108m-loan-nearly-crashed-solana) — SLND1 crisis timeline, community response
- [Solana DeFi Platform Votes to Control Whale Account - CoinDesk](https://www.coindesk.com/tech/2022/06/19/solana-defi-platform-votes-to-control-whale-account-in-bid-to-avoid-liquidation-chaos) — Emergency powers vote, DeFi governance implications
- [New Solend vote invalidates governance decision - The Block](https://www.theblock.co/post/153011/new-solend-vote-invalidates-governance-decision-to-take-over-whale-account) — Vote reversal, governance lessons
- [2022 Solana Hacks Explained: Solend - Ackee Blockchain](https://ackee.xyz/blog/2022-solana-hacks-explained-solend/) — Oracle manipulation attack details ($1.26M), USDH/Saber exploit
- [Loopscale Suspends Lending After $5.8M Exploit - CryptoNinjas](https://www.cryptoninjas.net/news/solanas-loopscale-suspends-lending-after-5-8m-exploit/) — RateX PT token oracle manipulation, April 2025
- [Loopscale $5.8M Exploit - The Block](https://www.theblock.co/post/352083/solana-defi-protocol-loopscale-hit-with-5-8-million-exploit-two-weeks-after-launch) — Post-launch vulnerability window
- [Threat Contained: marginfi Flash Loan Vulnerability](https://blog.asymmetric.re/threat-contained-marginfi-flash-loan-vulnerability/) — $160M at risk, bug bounty disclosure, Sept 2025
- [Solana Hacks, Bugs, and Exploits: A Complete History - Helius](https://www.helius.dev/blog/solana-hacks) — 38 incidents, $600M gross losses, categorization by type
- [History of Solana Security Incidents - CollinsDeFiPen](https://collinsdefipen.medium.com/history-of-solana-security-incidents-a-deep-dive-2332d17e6375) — Technical deep dive, all major exploits
- [Bug Bounty Response to SPL Lending Vulnerability - Solend](https://blog.solend.fi/bug-bounty-and-response-to-spl-lending-vulnerability-f4c8874342d0) — $350M at risk, $1.05M bounty, Dec 2021
- [Securing Kamino Lending - Certora](https://www.certora.com/blog/securing-kamino-lending) — Precision loss bug, formal verification case study
- [The $200m Bluff: Cheating Oracles on Solana - OtterSec](https://osec.io/blog/2022-02-16-lp-token-oracle-manipulation/) — Switchboard LP token vulnerability, $200M+ at risk
- [Pyth Pull Oracle Launches on Solana](https://pyth.network/blog/pyth-network-pull-oracle-on-solana) — Pull vs. push design, congestion resistance, June 2024 launch
- [Improving Lending Protocols with Liquidity Oracles - Pyth](https://pyth.network/blog/improving-lending-protocols-with-liquidity-oracles) — LTV calculation, market impact modeling
- [Best Practices - Pyth Developer Hub](https://docs.pyth.network/price-feeds/core/best-practices) — Fixed-point numerics, confidence intervals, staleness checks
- [DeFi Liquidation Protocols: How They Work - Krayon](https://www.krayondigital.com/blog/defi-liquidation-protocols-how-they-work) — Health factor formula, liquidation thresholds, comparison table
- [Collateral, LTV & Health - Morpho Docs](https://docs.morpho.org/build/borrow/concepts/ltv) — LTV calculation, LLTV (liquidation LTV), collateral valuation
- [Liquidations | Voltage Finance](https://docs.voltage.finance/voltage/the-platform/lend-and-borrow-beta/liquidations) — Health factor example, liquidation workflow
- [Liquidation Dynamics in DeFi and the Role of Transaction Fees - arXiv](https://arxiv.org/html/2602.12104v1) — Oracle manipulation math, CPMM fee security, Feb 2026
- [Optimal risk-aware interest rates for decentralized lending protocols - arXiv](https://arxiv.org/html/2502.19862v1) — Agent-based modeling, optimal IR curves, Riccati equations
- [Kamino vs Marginfi - Fensory](https://fensory.com/insights/compare/kamino-vs-marginfi) — Product comparison, feature matrix, user targeting
- [Solana's Lending Market: Kamino, Marginfi, Save - SolanaFloor](https://solanafloor.com/news/solanas-lending-market-onchain-insights-from-kamino-marginfi-and-save) — $826M loans in 30 days, on-chain metrics
- [Breaking the Oracle Bottleneck: Switchboard - Medium](https://medium.com/@AJOwolabi/breaking-the-oracle-bottleneck-how-switchboard-fixes-web3s-data-problem-b044f71ca6bb) — Mango Markets exploit, oracle problem overview
- [Oracle Aggregator - Switchboard Docs](https://docs.switchboard.xyz/product-documentation/data-feeds/designing-feeds/oracle-aggregator) — Multi-oracle aggregation, Pyth integration
- [Exploring Vulnerabilities in Solana Smart Contracts - arXiv](https://arxiv.org/html/2504.07419v1) — Security analysis tools, vulnerability taxonomy
- [Lending Pools & Interest Rates - Kevin Mooers (marginfi)](https://medium.com/@kevinmooers/lending-pools-interest-rates-7363b0f96770) — Pooled vs. matched lending, variable rates, Compound model
