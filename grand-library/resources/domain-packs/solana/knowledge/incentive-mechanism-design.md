---
pack: solana
confidence: 8/10
sources_checked: 14
last_updated: "2026-02-16"
---

# How do I design sustainable incentives?

Most DeFi incentive programs fail because they attract mercenary capital that exits when rewards end. Here's how to design sustainable incentive mechanisms based on successful Solana protocols and failed experiments.

## Why Liquidity Mining Usually Fails

### The Mercenary Capital Problem

**Typical Failure Pattern:**
1. Protocol launches with 1000% APY liquidity mining
2. TVL spikes to $100M in first week
3. Rewards taper after 3 months
4. 90%+ of TVL exits within 30 days
5. Protocol left with no liquidity, wasted tokens

**Real Numbers:**
- Average retention after rewards end: 5-15%
- Cost per retained dollar of TVL: $0.50-$2.00 in token emissions
- Token price impact: -60% to -90% from farmer selling pressure

**Why It Fails:**
- Users optimize for rewards, not protocol utility
- No switching costs to leave
- Rewards rarely match actual protocol revenue
- Creates sell pressure without buying pressure
- Attracts professional farmers, not real users

### The Math Problem

**Unsustainable Equation:**
```
Protocol Revenue: $10K/month
Liquidity Mining Emissions: $500K/month (50x revenue)
Duration: 6 months
Total Cost: $3M
Result: Cannot sustain after emissions end
```

**Sustainable Equation:**
```
Protocol Revenue: $300K/month
Incentive Boost: $100K/month (33% of revenue)
Duration: Indefinite (revenue-funded)
Result: Sustainable, attracts sticky users
```

## Liquidity Mining Done Right

### Revenue-Funded Emissions

**Jupiter's Approach:**
- $365M monthly revenue (Nov 2024)
- Can afford sustainable incentives
- Moving to net-zero emissions (doesn't need liquidity mining)
- Focuses on product quality over bribes

**Marinade's Model:**
- Revenue: $3.05M (Q4 2024)
- Emissions from real yield (staking rewards + MEV)
- No inflationary token rewards
- APY: 9.9% (all from productive activity)

**Key Principle:** Emissions ≤ 20-30% of protocol revenue for sustainability.

### Time-Locked Incentives

**Reduce Mercenary Behavior:**
```
Reward Structure:
├─ 30% Immediate (liquid rewards)
├─ 30% 3-month vest
└─ 40% 6-month vest

Effect:
- Farmers get 30% (not worth it for most)
- Real users get 100% (long-term aligned)
- Self-selecting mechanism
```

**Example Implementation:**
```rust
pub struct LiquidityReward {
    immediate: u64,      // 30% claimable now
    vested_3m: u64,      // 30% vests over 3 months
    vested_6m: u64,      // 40% vests over 6 months
    cliff_date: i64,     // When vesting starts
}
```

### Boosted Rewards for Commitment

**ve-Tokenomics (Vote-Escrowed):**
- Lock protocol tokens for governance power
- Locked tokens get higher reward multipliers
- Longer locks = bigger multipliers

```
Lock Duration     Reward Boost
No lock          1x (base APY)
3 months         1.5x
6 months         2x
1 year           2.5x
4 years          4x
```

**Curve's model (adapted for Solana):**
- Lock CRV for veCRV
- veCRV holders direct emissions
- Creates sticky liquidity in pools they care about
- Solana doesn't have major ve-token adoption yet (opportunity)

## Points Systems

### How Points Work

**Pre-Token Mechanism:**
1. Protocol tracks user activity off-chain or on-chain
2. Users earn points for desired behaviors
3. Points eventually convert to token airdrop
4. Creates anticipation and FOMO

**Popular on Solana:**
- Blur pioneered for NFTs
- Multiple Solana DeFi protocols adopted (2024-2025)
- Less direct sell pressure than token emissions
- Can measure activity before committing tokenomics

### Points Best Practices

**What to Track:**
```
Activity Types (weighted):
├─ Trading Volume: 1 point per $100
├─ LP Duration: 10 points per day per $1K
├─ Referrals: 500 points per active user
├─ Governance: 100 points per vote
└─ Social: 50 points per valid share
```

**Avoid Point Farming:**
- Cap daily points per user
- Require minimum hold periods
- Track wash trading (self-swaps)
- Penalize sybil attacks (same user, multiple wallets)
- Weight quality over quantity

**State of DeFi 2025 Insight:**
Points programs moved from "participation trophies" to "proof of contribution" - protocols now track long-term behaviors, not just initial deposits.

### Points to Token Conversion

**Transparent Formula:**
```
Your Airdrop = (Your Points / Total Points) * Airdrop Pool

Example:
Your points: 100,000
Total points: 10,000,000
Airdrop pool: 100M tokens
Your airdrop: (100K / 10M) * 100M = 1M tokens
```

**Tiered Conversion:**
```
Points Tier        Bonus Multiplier
0-1K points       1x (base)
1K-10K points     1.2x
10K-100K points   1.5x
100K+ points      2x
```

Rewards power users without ignoring small users.

### Points System Risks

**User Fatigue:**
- Too many protocols using points
- Users spread thin across platforms
- "Points are worthless until they're not"

**Token Dump Risk:**
- All points convert at once = massive sell pressure
- Better: Staggered unlock or vesting

**Opacity:**
- Users don't know conversion rate
- Feels like manipulation
- **Fix:** Publish point methodology and estimated conversion

## Retroactive Airdrops

### Why Retroactive Works

**No Announcement = Real Users:**
- Uniswap pioneered (400 UNI to all users)
- Rewards past behavior, not future farming
- Can't game what you don't know exists
- Attracts genuine users, not airdrop hunters

**Solana Examples:**
- Jupiter's Jupuary (annual surprise airdrop)
- Jito's JTO airdrop to early stakers
- Pyth's PYTH to oracle users

### Retroactive Parameters

**Time Windows:**
```
Snapshot Date: Unannounced (e.g., Nov 1, 2024)
Eligibility Period: Past 6-12 months before snapshot
Activity Threshold: Minimum $100 volume or 5 transactions
Distribution: 2-4 weeks after announcement
```

**Activity Weighting:**
```
User Segments:
├─ Power Users (top 10%): 40% of airdrop
├─ Active Users (next 30%): 35% of airdrop
├─ Regular Users (next 40%): 20% of airdrop
└─ Inactive (<min threshold): 5% or excluded
```

### Jupiter's Jupuary Model

**Annual Airdrop Ritual:**
- Surprise timing (but expected annually)
- Rewards active Jupiter users
- 40% of JUP supply allocated to community
- Builds brand loyalty and anticipation

**2026 Evolution:**
- Moving toward net-zero emissions
- May reduce Jupuary size or change model
- Balancing growth vs. dilution
- Community debate on sustainability

**Lesson:** Even successful models need to evolve based on market maturity.

## LP Incentive Math

### Impermanent Loss Compensation

**IL Basics:**
- LPs lose vs. holding when price diverges
- 2x price change = ~5.7% IL
- 4x price change = ~20% IL

**Incentive Requirement:**
```
Minimum LP APY = Trading Fees + IL Compensation + Risk Premium

Example (volatile pair):
Trading fees: 12% APY
Expected IL: 8% annually
Risk premium: 5%
Minimum incentive: 25% APY to attract LPs
```

**Stablecoin Pairs (Low IL):**
```
Trading fees: 3% APY
Expected IL: <1%
Risk premium: 2%
Minimum incentive: 6% APY
```

### Concentrated Liquidity Incentives

**Orca Whirlpools / Raydium CLMM:**
- LPs provide narrow price ranges
- Earn more fees per dollar (10-100x efficiency)
- But higher IL risk if price exits range

**Incentive Strategy:**
```
Wide Range (-20% to +20%): Lower IL, lower fees
├─ Base APY: 15%
├─ Incentive: None needed (safe, reasonable fees)

Narrow Range (-5% to +5%): Higher IL, higher fees
├─ Base APY: 40%
├─ Incentive: +10% bonus to compensate IL risk
├─ Total: 50% APY
```

**Active Management Required:**
- Range needs rebalancing
- Incentives for staying in-range
- Bonus for long-term positions

### LP Token Staking

**Two-Step Process:**
1. Provide liquidity → Get LP tokens
2. Stake LP tokens → Earn bonus rewards

**Benefits:**
- Tracks committed liquidity
- Can boost rewards for locked LPs
- Creates second layer of stickiness

**Example (Raydium):**
```
Step 1: Deposit SOL-USDC → Get RAY-LP tokens
Step 2: Stake RAY-LP → Earn RAY emissions

Rewards:
├─ Trading fees: 0.25% on swaps (from LP position)
└─ RAY emissions: 15% APY (from staking)
Total: ~18-25% APY depending on volume
```

## Sustainable Incentive Design

### Tier 1: Real Yield (Best)

**No Token Emissions Needed:**
- Marinade: 9.9% APY from staking rewards
- Jito: LST APY from MEV tips
- Orca: Trading fees to LPs (0.01-1%)

**Why It Works:**
- Revenue from real activity
- No dilution
- Sustainable indefinitely
- Attracts users who want the yield, not farmers

**Goal:** Get here as fast as possible.

### Tier 2: Revenue-Boosted Emissions

**Small Token Incentive on Top of Real Yield:**
```
Base APY (real yield): 8%
Token boost: +4%
Total APY: 12%

Boost as % of revenue: 50%
Sustainable if protocol growing
```

**Marinade's Model:**
- Real yield: 9%
- No token emissions
- Growth from product quality

**Alternative:**
- Real yield: 5%
- Strategic emission: +3%
- Total: 8% competitive APY
- Emission = 60% of revenue (manageable)

### Tier 3: Points Program (Transition)

**Pre-Token Launch:**
- Use points to bootstrap without emissions
- Test product-market fit
- Build community
- Convert to token later when sustainable

**Post-Token Launch:**
- Points for activities tokens can't incentivize
- Social engagement, governance, referrals
- Supplement token incentives

### Tier 4: Time-Limited Liquidity Mining (Last Resort)

**If You Must Do It:**
```
Rules:
├─ Duration: 3-6 months MAX
├─ Budget: <50% of treasury allocation
├─ Vest: 50%+ of rewards over 6-12 months
├─ Target: Bootstrap to profitability
└─ Exit Plan: Transition to real yield before end
```

**Metrics to Track:**
- Cost per dollar of sticky TVL (after 3 months post-program)
- Repeat user rate (not just one-time farmers)
- Revenue growth during program
- Path to sustainability without emissions

## Referral and Social Mechanisms

### Referral Programs

**Structure:**
```
Referrer: Gets 10% of referee's points/rewards
Referee: Gets 5% bonus on top of normal rewards

Example:
Referee earns 1000 points
├─ Referee keeps: 1050 points (1000 + 5% bonus)
└─ Referrer gets: 100 points (10% of base)
```

**Pump.fun Viral Growth:**
- No explicit referral program
- Organic sharing drove adoption
- Product-market fit > incentives
- $106M monthly revenue without referral bribes

**Lesson:** Great product spreads itself. Referrals boost good products but can't save bad ones.

### Social Incentives

**Points for Engagement:**
```
Activity              Points    Max/Day
Tweet about protocol  50        200
Discord participation 10        30
Tutorial creation     500       N/A (review-based)
Bug reports          1000       N/A (severity-based)
```

**Risks:**
- Spam and low-quality content
- Bot farms
- Alienates users who don't want to shill

**Mitigation:**
- Quality thresholds (engagement metrics)
- Manual review for high-value rewards
- Cap social points at 10-20% of total

## Case Study: What Works on Solana

### Jupiter - Product First

**Strategy:**
- Best-in-class DEX aggregator
- Minimal incentives (great product drives use)
- $365M monthly revenue (organic volume)
- Airdrop to reward users, not bribe them

**Lessons:**
- Product-market fit > incentives
- Revenue enables sustainable incentives later
- Community builds around utility, not rewards

### Marinade - Real Yield Only

**Strategy:**
- No token emissions
- 9.9% APY from real staking yield
- Revenue: $3.05M Q4 2024 (+249% QoQ)
- $1.7B TVL (sustainable, not mercenary)

**Lessons:**
- Real yield attracts real users
- No emissions = no dilution = better tokenomics
- Growth possible without liquidity mining

### Pump.fun - Minimal Friction

**Strategy:**
- Fixed fees (no complex incentives)
- Viral product (bonding curve token launcher)
- $106M monthly revenue (Nov 2024)
- No token, no points, just utility

**Lessons:**
- Simplicity wins
- Good UX > reward complexity
- Revenue proves product-market fit

### Points Programs (2024-2025)

**Trend:**
- Multiple Solana protocols launched points
- Mixed results: Some converted well, others disappointed users
- Shift toward transparent conversion formulas
- Integration with token launches

**Learning:**
- Points work for pre-token bootstrapping
- Must convert to real value eventually
- Transparency builds trust
- Avoid "infinite points, no token" trap

## Red Flags to Avoid

1. **Unsustainable APYs** - 100%+ APY not backed by revenue
2. **100% Emissions, 0% Revenue** - Recipe for death spiral
3. **No Lock Mechanism** - All mercenary capital
4. **Infinite Emissions** - Token dilutes to zero
5. **Complex Point Systems** - Users don't understand, don't trust
6. **No Exit Plan** - Liquidity mining forever = eventually fails
7. **Incentivizing Wrong Metrics** - Volume over retention, quantity over quality
8. **All Sell, No Buy Pressure** - Farmers dump rewards, who buys?

## Best Practices Summary

1. **Real Yield First:** Build revenue before emissions
2. **Revenue-Funded:** Keep emissions <30% of protocol revenue
3. **Vest Rewards:** 50%+ of rewards vest over 6-12 months
4. **Time-Limited:** Liquidity mining = temporary bootstrap, not permanent
5. **Track Retention:** Measure users 3+ months after incentives
6. **Quality over Quantity:** Reward depth (long-term use) not breadth (one-time farming)
7. **Transparent Points:** Publish methodology and conversion rates
8. **Product First:** No incentive salvages a bad product
9. **Sustainable Math:** Model at 50% volume drops, ensure survival
10. **Exit Strategy:** Plan to transition to real yield within 12 months

## Incentive Design Framework

### Phase 1: Pre-Launch (Months 1-3)
```
Mechanism: Points program
Budget: $0 (no token yet)
Goal: Test product-market fit
Metrics: DAU, retention, organic growth
```

### Phase 2: Launch (Months 4-6)
```
Mechanism: Token + points conversion
Budget: 10% of supply (vested)
Goal: Bootstrap liquidity
Metrics: TVL, revenue, cost per sticky user
```

### Phase 3: Growth (Months 7-12)
```
Mechanism: Revenue-boosted incentives
Budget: 20-30% of protocol revenue
Goal: Grow while staying sustainable
Metrics: Revenue growth, retention, unit economics
```

### Phase 4: Maturity (Year 2+)
```
Mechanism: Real yield only (or minimal boost)
Budget: <10% of revenue for strategic incentives
Goal: Self-sustaining growth
Metrics: Profitability, moat, competitive position
```

## Tools & Monitoring

**Points Tracking:**
- Custom dashboards (Dune Analytics)
- On-chain tracking via program logs
- Merkle tree snapshots for airdrops

**Emission Modeling:**
- Token Terminal: Revenue tracking
- Spreadsheet modeling: Emissions vs. revenue
- Retention analysis: Cohort tracking tools

**Benchmarking:**
- Compare APY to competitors
- Track cost per retained user
- Monitor mercenary capital (wallet behavior)
