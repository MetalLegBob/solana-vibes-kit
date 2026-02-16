---
pack: solana
topic: "Bonding Curve Variants"
decision: "Which bonding curve math for my AMM/token launch?"
confidence: 8/10
sources_checked: 53
last_updated: "2026-02-15"
---

# Bonding Curve Variants

> **Decision:** Which bonding curve math for my AMM/token launch?

## Context

Bonding curves are mathematical functions that determine token pricing based on supply, enabling automated market making without traditional order books or external liquidity providers. On Solana, the choice of bonding curve fundamentally shapes your protocol's capital efficiency, slippage characteristics, vulnerability to manipulation, and implementation complexity.

The decision matters because different curves optimize for different trade-offs. Constant product (x*y=k) provides predictable pricing but suffers from capital inefficiency at price extremes. Concentrated liquidity maximizes capital efficiency but requires active position management. Linear bonding curves enable fair token launches but are susceptible to flash loan manipulation. StableSwap curves minimize slippage for pegged assets but break down when assets de-peg. Each variant also presents unique integer math challenges on Solana's u64/u128 constraint environment.

Recent exploits highlight the stakes: Pump.fun lost $2M to a bonding curve flash loan attack in May 2024, Mango Markets suffered $116M in oracle manipulation that exploited pricing mechanics, and numerous rug pulls leverage bonding curve characteristics to extract value from retail traders. Understanding the mathematical and security properties of each curve type is essential for building robust DeFi protocols on Solana.

## Options

### Option A: Constant Product (x*y=k)

**What:** Uniswap V2-style AMM where the product of two token reserves remains constant, resulting in a hyperbolic price curve.

**Pros:**
- Battle-tested design with 5+ years of production usage across multiple chains
- Simple implementation reduces audit surface area and compute unit consumption
- Predictable slippage model (price impact scales with trade size)
- Natural arbitrage incentives keep prices aligned with external markets
- Works for any token pair regardless of correlation

**Cons:**
- Capital inefficient — most liquidity sits far from current price and is never used
- High slippage for large trades (price impact = trade_size / reserves)
- Impermanent loss for LPs when prices diverge from initial ratio
- Liquidity spreads evenly across 0 to infinity, wasting capital on unlikely prices

**Best for:** General-purpose DEX pools for uncorrelated token pairs (SOL/USDC, RAY/USDC) where simplicity and security outweigh capital efficiency concerns.

**Real-world examples:** Raydium standard pools, Orca classic pools (pre-Whirlpools), Saber's fallback for non-stable pairs

**Solana considerations:** Formula `x * y = k` requires careful overflow prevention. Use u128 for intermediate calculations even when reserves are u64. Raydium's implementation uses checked multiplication and division to prevent panics during high-volume swaps.

---

### Option B: Concentrated Liquidity (CLMM)

**What:** Uniswap V3-style AMM where liquidity providers choose specific price ranges, concentrating capital around the current price for higher capital efficiency.

**Pros:**
- 100-1000x capital efficiency compared to constant product (LPs earn more fees per dollar)
- Lower slippage for trades within concentrated ranges
- Flexible fee tiers (1bps to 400bps on Raydium) allow customization per volatility profile
- Full-range positions possible (emulates constant product if desired)
- Supports asymmetric liquidity (bullish/bearish positioning)

**Cons:**
- Complex tick math increases compute unit consumption (3-5x vs constant product)
- Requires active management — positions go "out of range" when price moves
- Higher implementation risk — Orca Whirlpools audit found integer overflow in swap calculations
- Tick array initialization costs gas, making full-range positions expensive
- Impermanent loss concentrated within narrow ranges (worse than constant product if wrong)

**Best for:** Stablecoin pairs, high-volume pairs with predictable ranges (SOL/USDT, USDC/USDT), or sophisticated LPs willing to actively manage positions.

**Real-world examples:** Orca Whirlpools (launched March 2022), Raydium CLMM (supports Token-2022), integrates with Kamino/Krystal for automated rebalancing

**Solana considerations:** Tick spacing creates discrete price points. Common tick spacings: 1 for stables (0.01% steps), 64 for volatile pairs. Uses u128 sqrt price representation to avoid precision loss. Neodyme's Orca audit revealed overflow in `checked_mul_shift_right_round_up_if` requiring careful fixed-point math.

---

### Option C: Linear / Exponential Bonding Curve

**What:** Price increases deterministically as supply grows, typically `price = m * supply + b` (linear) or `price = a * supply^n` (polynomial), eliminating need for initial liquidity.

**Pros:**
- Fair launch mechanism — no pre-seeded liquidity or insider advantage
- Instant liquidity from token creation (no waiting for LPs)
- Guaranteed buy/sell at any time (no liquidity crisis)
- Transparent price discovery (formula publicly known)
- Low deployment cost (Pump.fun charges 0.02 SOL to create token)

**Cons:**
- Highly susceptible to flash loan manipulation (borrow, pump, dump, repay in single tx)
- Pump and dump economics — early buyers profit from later buyers by design
- No external arbitrage (price only responds to buys/sells on this curve)
- Linear curves create predictable exit liquidity (enables MEV extraction)
- Front-running risk due to predictable price impact

**Best for:** Meme coin launches, community token distributions, NFT bonding curves, or any scenario prioritizing fair launch over long-term liquidity depth.

**Real-world examples:** Pump.fun (synthetic x*y=k with virtual reserves), Rally's linear price curve, Friend.tech (polynomial curve for social tokens)

**Solana considerations:** Pump.fun uses Uniswap V2 formula with synthetic reserves (virtual_sol_reserves * virtual_token_reserves = k) to simulate curve. At 69k market cap, migrates liquidity to PumpSwap/Raydium and burns LP tokens. May 2024 exploit: attacker used Marginfi flash loans to manipulate bonding curve pricing for $2M profit.

---

### Option D: Sigmoid / S-curve

**What:** S-shaped curve combining linear behavior at extremes with exponential growth in the middle, using formulas like `price = L / (1 + e^(-k*(supply - midpoint)))`.

**Pros:**
- Gradual price discovery at launch (prevents instant pump)
- Exponential middle section rewards early adopters without extreme speculation
- Flattens at high supply (prevents runaway price increases)
- Can reduce front-running compared to pure linear curves
- Models psychological adoption curves (slow start, rapid growth, plateau)

**Cons:**
- Rare in production (limited battle-testing compared to other curves)
- Complex math requires exponential/logarithmic functions (expensive on Solana)
- Difficult to parameterize correctly (wrong parameters break intended behavior)
- Still vulnerable to flash loan attacks during steep portion
- Not composable with existing AMM infrastructure

**Best for:** Token launches where you want controlled price discovery with early adopter rewards but less speculation than pure exponential curves. Theoretical use case.

**Real-world examples:** Limited production examples. Zealynx documentation mentions sigmoid curves but no major Solana protocols use them. Primarily seen in tokenomics whitepapers.

**Solana considerations:** Exponential calculations require fixed-point math libraries (e.g., brine-fp, ra-solana-math). Standard approach: use lookup tables or polynomial approximations to avoid expensive exp() calls. Compute unit budget likely 10-20k per swap vs 3-5k for constant product.

---

### Option E: Stable Swap (StableSwap invariant)

**What:** Curve Finance's StableSwap formula that interpolates between constant sum (x+y=k) and constant product (x*y=k) based on pool balance, optimized for pegged assets.

**Pros:**
- Minimal slippage for pegged asset swaps (0.01-0.1% vs 0.3-1% on constant product)
- Zero impermanent loss when assets maintain peg
- High capital efficiency for stablecoin pairs (USDC/USDT, SOL/stSOL)
- Mature design (Curve launched 2020, Saber forked to Solana in 2021)
- Amplification parameter (A) allows tuning between constant sum and constant product

**Cons:**
- Only works for pegged/correlated assets (breaks down completely if assets de-peg)
- Amplification parameter choice is critical — too high creates instability, too low loses efficiency
- Complex invariant calculation consumes 5-10k compute units per swap
- Severe impermanent loss if one asset permanently de-pegs (LPs hold the bad asset)
- Requires iterative Newton's method for swap calculations (precision loss risk)

**Best for:** Stablecoin pairs (USDC/USDT, DAI/FRAX), liquid staking derivatives (SOL/mSOL/stSOL), wrapped asset pairs (WBTC/renBTC).

**Real-world examples:** Saber (Solana's primary StableSwap, launched 2021), Mercurial (multi-token stable pools), Lifinity (stable pools for pegged assets)

**Solana considerations:** Formula: `A * n^n * sum(x_i) + D = A * D * n^n + D^(n+1) / (n^n * product(x_i))` where A=amplification, D=invariant, n=num_tokens. Uses u128 fixed-point with 6-18 decimal precision. Saber's implementation uses checked arithmetic throughout. Newton iteration typically converges in 4-8 rounds. Critical: proper de-peg detection to pause swaps before cascading losses.

---

## Key Trade-offs

| Curve Type | Capital Efficiency | IL Risk | Manipulation Resistance | Integer Math Difficulty | Best Use Case |
|------------|-------------------|---------|------------------------|------------------------|---------------|
| **Constant Product** | Low (1x baseline) | Medium | High | Low (simple mul/div) | General DEX pairs |
| **Concentrated Liquidity** | Very High (100-1000x) | High (in range) | Medium | High (tick math, sqrt) | Stable pairs, active LPs |
| **Linear Bonding** | N/A (no LPs) | N/A | Very Low | Low | Token launches |
| **Sigmoid** | N/A (no LPs) | N/A | Low | Very High (exponentials) | Theoretical launches |
| **StableSwap** | High (10-50x for stables) | Very Low (if pegged) | Medium | High (Newton iteration) | Stablecoin swaps |

**Compute Unit Consumption (typical swap):**
- Constant Product: 3,000 - 5,000 CU
- CLMM: 10,000 - 20,000 CU (with tick crossing)
- Linear Bonding: 4,000 - 6,000 CU
- Sigmoid: 15,000 - 30,000 CU (if using full exp)
- StableSwap: 8,000 - 15,000 CU

---

## Recommendation

**For general DEX (uncorrelated pairs):** Start with **Constant Product (x*y=k)**. Use Raydium or Orca's audited contracts as reference. Only move to CLMM after proving product-market fit — the added complexity isn't worth it for low-volume pairs.

**For stablecoin/pegged asset pairs:** Use **StableSwap** (Saber's implementation). The slippage reduction is dramatic (10-50x better than constant product) and the de-peg risk is manageable with proper circuit breakers. Set amplification parameter conservatively (A=100-200 for stablecoins, A=50-100 for liquid staking derivatives).

**For high-volume established pairs:** Consider **CLMM** (Orca Whirlpools or Raydium CLMM) if you have professional LPs or automated vault integration (Kamino, Krystal). The capital efficiency enables tighter spreads and better routing. Require audits for any custom implementation.

**For token launches:** Use **Linear Bonding Curve** (Pump.fun model) with extreme caution. Accept that it's designed for speculation, not long-term liquidity. Implement migration to proper AMM at target market cap (Pump.fun migrates at $69k to Raydium). Consider adding:
- Flash loan protection (multi-transaction cooldowns)
- Per-address buy limits during launch phase
- Graduated bonding curve (starts linear, transitions to sqrt or constant product)

**Never use Sigmoid curves in production** — the exponential math complexity and lack of battle-testing make them impractical on Solana. If you want controlled launch dynamics, use a linear curve with graduated rate changes or migrate to CLMM after initial distribution.

---

## Lessons from Production

**Pump.fun Flash Loan Exploit (May 2024, $2M loss):**
- Attacker borrowed 12,300 SOL from Marginfi via flash loan
- Manipulated bonding curve prices by executing massive buys
- Exploited the deterministic price formula to extract value
- Returned flash loan, pocketed $2M profit
- **Lesson:** Linear bonding curves cannot resist flash loan attacks without multi-transaction time locks or borrowing restrictions.

**Mango Markets Oracle Manipulation (October 2022, $116M loss):**
- Attacker Avraham Eisenberg took massive long MNGO perp position on Mango
- Bought $4M MNGO on spot markets (FTX, Ascendex) to pump price 2300%
- Mango's oracle reflected inflated price, increasing collateral value
- Borrowed $116M in USDC/stables against unrealized profit, withdrew funds
- **Lesson:** Bonding curves + leverage + oracle pricing = manipulation vector. Always use time-weighted average prices (TWAP) or circuit breakers for collateral valuation. Single-point oracle prices are manipulable in low-liquidity markets.

**Orca Whirlpools Integer Overflow (March 2022, caught in audit):**
- Neodyme audit found overflow in `checked_mul_shift_right_round_up_if` helper function
- Tick math could overflow during large swaps with extreme price movements
- Also found lower_tick could be set larger than upper_tick, breaking invariants
- **Lesson:** CLMM tick math is complex. Use u128 for intermediate calculations, checked arithmetic everywhere, and extensive fuzzing. Never assume price bounds.

**Crema Finance Exploit (July 2022, $8.8M loss):**
- Not bonding curve specific, but relevant: attacker exploited missing signer checks
- Manipulated liquidity pool accounting to mint excess tokens
- Withdrew real assets against fake tokens
- **Lesson:** Even with correct curve math, missing account validation destroys security. Solana-specific: always verify signers, owners, and PDAs.

**Loopscale Price Manipulation (May 2025, 12% vault loss):**
- Flaw in RateX pricing mechanism allowed manipulation
- Attacker exploited bonding curve pricing to drain SOL/USDC vaults
- **Lesson:** Custom pricing mechanisms need extensive testing. Don't invent novel curves without formal verification.

**General Rug Pull Pattern on Pump.fun:**
- Solidus Labs 2025 report: bonding curve launches enable "soft rugs"
- Creator launches token, community pumps it on bonding curve
- Creator dumps entire position before Raydium migration
- Bonding curve provides guaranteed exit liquidity (design feature enables rug)
- **Lesson:** Bonding curves don't prevent rugs, they enable guaranteed exit liquidity. Consider vesting for creators or delayed exit mechanisms.

**Integer Math Incidents:**
- Solana programs use u64 for most token amounts (max ~18.4 quintillion)
- Price calculations often need u128 to prevent overflow: `price = (reserve_a * SCALE) / reserve_b`
- Fixed-point representation: most protocols use 6-18 decimal precision (1e6 to 1e18 scaling)
- **Common failure:** Multiplying two u64 reserves overflows u64, but fits in u128. Always upcast before multiplication.
- **Common failure:** Division before multiplication loses precision. Always multiply first: `(a * b) / c`, not `(a / c) * b`.
- **Recommendation:** Use libraries like `ra-solana-math` or `brine-fp` for standardized fixed-point operations. Helius guide recommends 1e18 precision for DeFi applications.

---

## Sources

- [Bonding Curves in Solana - Block Magnates](https://blog.blockmagnates.com/bonding-curves-in-solana-58082354b17d) — Comprehensive overview of bonding curve types and Pump.fun mechanics
- [The Math behind Pump.fun](https://medium.com/@buildwithbhavya/the-math-behind-pump-fun-b58fdb30ed77) — Detailed breakdown of Pump.fun's step function bonding curve implementation
- [Pump.fun Official Docs - Bonding Curve Program](https://github.com/pump-fun/pump-public-docs/blob/main/docs/PUMP_PROGRAM_README.md) — Official documentation of bonding curve formula and Raydium migration
- [Rally DFS Token Bonding Curve](https://github.com/rally-dfs/token-bonding-curve) — Open-source linear bonding curve implementation on Solana
- [Raydium Pool Types Documentation](https://docs.raydium.io/raydium/for-liquidity-providers/pool-types) — CLMM vs constant product comparison, fee tiers, tick arrays
- [Orca Whirlpools Security Audit - Neodyme](https://dev.orca.so/.audits/2022-05-05.pdf) — Integer overflow findings in CLMM tick math
- [Saber StableSwap GitHub](https://github.com/saber-hq/stable-swap) — Solana implementation of Curve's StableSwap invariant
- [Curve StableSwap Whitepaper Mathematical Guide - Xord](https://xord.com/research/curve-stableswap-a-comprehensive-mathematical-guide/) — Deep dive into StableSwap amplification and invariant calculation
- [Pump.fun Flash Loan Exploit - CryptoSlate](https://cryptoslate.com/pump-fun-halts-trading-after-suffering-flash-loan-exploit/) — May 2024 $2M Marginfi flash loan attack details
- [Mango Markets Oracle Manipulation - Blockworks](https://blockworks.co/news/mango-markets-mangled-by-oracle-manipulation-for-112m) — $116M cross-market manipulation via MNGO price pump
- [Mango Markets Exploit Analysis - Solidus Labs](https://www.soliduslabs.com/post/mango-hack) — Order book analysis of 2300% MNGO price pump in 10 minutes
- [Oracle Manipulation Attacks Rising - Chainalysis](https://www.chainalysis.com/blog/oracle-manipulation-attacks-rising/) — Overview of price oracle manipulation techniques in DeFi
- [Solana Hacks, Bugs, and Exploits - Helius](https://www.helius.dev/blog/solana-hacks) — Comprehensive history of 38 Solana security incidents, $600M total losses
- [Solana Rug Pulls & Pump-and-Dumps - Solidus Labs](https://www.soliduslabs.com/reports/solana-rug-pulls-pump-dumps-crypto-compliance) — 2025 report on bonding curve rug mechanics
- [Loopscale Price Manipulation Attack](https://blog.blockmagnates.com/attack-analysis-on-loopscale-price-manipulation-and-its-consequences-7c28e9bcf6d3) — 12% vault loss from RateX pricing flaw
- [Solana Arithmetic Best Practices - Helius](https://www.helius.dev/blog/solana-arithmetic) — Fixed-point math, precision loss prevention, u64/u128 guidelines
- [Understanding Arithmetic Overflow in Solana - Sec3](https://www.sec3.dev/blog/understanding-arithmetic-overflow-underflows-in-rust-and-solana-smart-contracts) — Rust integer overflow behavior in Solana programs
- [Solana Common Vulnerabilities - QuillAudits](https://github.com/OWASP/www-project-solana-programs-top-10/issues/1) — OWASP top 10 including integer overflow examples
- [brine-fp: Fixed-Point Math Library](https://github.com/zfedoran/brine-fp) — Logarithmic and exponential functions for blockchain applications
- [ra-solana-math](https://crates.io/crates/ra-solana-math) — High-performance fixed-point arithmetic for Anchor programs

---

## Gaps & Caveats

**Sigmoid curve production data is sparse.** No major Solana protocols use sigmoid curves in production as of February 2026. Mathematical properties are well-understood theoretically, but compute unit costs and parameterization guidance are based on extrapolation from exponential function implementations, not empirical production data.

**Flash loan defense mechanisms evolving.** This guide reflects February 2026 state of flash loan protections. New mitigation strategies (multi-block commitments, timelocks, borrow amount limits) are being researched but not yet standardized. Pump.fun has not publicly disclosed all post-exploit defenses.

**CLMM profitability for LPs uncertain.** While CLMM offers higher capital efficiency, whether this translates to higher LP returns depends on rebalancing frequency, gas costs, and market volatility. Kamino and Krystal vault performance data is limited to <2 years. Long-term (3-5 year) LP profitability comparison between constant product and CLMM unavailable.

**Integer precision loss research incomplete.** While general guidance exists (use u128, multiply before divide), comprehensive analysis of precision loss across different curve types and token decimal combinations is fragmented. No unified framework for precision loss testing exists in Solana ecosystem.

**Governance attack vectors underexplored.** Bonding curves interact with governance (e.g., Mango's MNGO voting power). Combination attacks using bonding curves to acquire governance tokens, manipulate votes, and extract value are theoretically possible but not well-documented in Solana context.

**Cross-program composability risks.** How bonding curves interact with lending protocols, vaults, and other DeFi primitives is not fully characterized. Flash loan + bonding curve + lending collateral = known dangerous pattern, but full taxonomy of multi-protocol attacks incomplete.

**Confidence score rationale (8/10):** High confidence in comparative analysis of major curve types (constant product, CLMM, StableSwap, linear bonding) due to extensive production history and public exploit data. Medium confidence in sigmoid curve implementation details due to lack of production examples. Medium confidence in future flash loan defenses due to evolving threat landscape. Research based on 53 sources including official documentation, security audits, and exploit post-mortems.
