---
pack: solana
confidence: 8/10
sources_checked: 18
last_updated: "2026-02-16"
---

# How do I model token economics?

Token economics (tokenomics) on Solana requires modeling supply schedules, emission curves, vesting contracts, and token sinks/sources. Here's how to design sustainable token economics based on real Solana protocols.

## Supply Schedule Models

### Fixed Supply
- **Total cap with no inflation** (e.g., BONK with 93 trillion fixed supply)
- All tokens minted at genesis or through defined events
- Scarcity increases over time as tokens are burned or lost
- Use case: Meme coins, governance tokens with clear utility

### Inflationary Supply
Solana itself uses a **disinflationary schedule**:
- Initial inflation rate: 8%
- Disinflation rate: -15% per year
- Long-term inflation rate: 1.5% (target)
- Current rate (2026): ~5.07%

This model balances:
- Staking rewards for validators/delegators
- Predictable supply growth
- Long-term sustainability

**Key parameters to define:**
1. Initial inflation rate
2. Disinflation rate (how fast inflation decreases)
3. Long-term steady-state inflation
4. Distribution mechanism (who receives new tokens)

### Deflationary Supply
- Tokens burned faster than emitted
- Common mechanisms on Solana:
  - Transaction fee burns (50% of Solana base fees)
  - Protocol fee burns (Pump.fun burns fees)
  - Buyback-and-burn (Jupiter's FLUID buybacks)

**Jupiter (JUP) Example:**
- Total supply: 10B JUP (reduced from 13B via burns)
- Max supply: 10B (after 3B burn)
- Current circulation: ~3.2B (45.7% of max)
- Emissions moving toward net-zero (2026 "Going Green" proposal)
- Burns from verification, litterbox, and protocol operations

## Emission Curves

### Linear Release
- Fixed amount per period
- Predictable, easy to model
- Used by: Team vesting, advisor allocations

**Example (Jito JTO):**
- Core contributors: 24.5% (245M JTO) with linear vesting
- Cliff period followed by monthly unlocks
- Typical schedule: 1-year cliff, 3-year linear vest

### Cliff Unlocks
- Large amounts unlock at specific dates
- Creates selling pressure if not managed
- **Risk:** Token price often drops 10-30% on major unlocks

**Jupiter unlock schedule:**
- Team: 38.89M JUP monthly unlocks
- Mercurial stakeholders: 14.58M JUP monthly unlocks
- Total unlock events create ~1.68% of float pressure

### Exponential/Decay Curves
- High initial emissions that decrease over time
- Attracts early users with high rewards
- Reduces long-term inflation

**Warning:** Can create "exit farming" where users farm early then leave.

## Vesting Contracts on Solana

### Primary Tools

**Streamflow** (most popular):
- 28.5K+ projects, $1.4B+ TVL, 1.3M+ users
- Features:
  - Linear, graded, or cliff vesting
  - Cancelable/non-cancelable options
  - Batch creation for multiple recipients
  - Real-time blockchain explorer visibility
  - Transfer or cancel contracts mid-vesting

**Bonfida** (established alternative):
- Native Solana vesting protocol
- Simpler interface for basic vesting
- Lower adoption than Streamflow

### Common Vesting Patterns

**Core Team (3-4 year vest):**
```
Allocation: 15-25% of supply
Cliff: 12 months
Vesting: 36 months linear after cliff
Cancelable: Usually no (aligned incentives)
```

**Investors (2-3 year vest):**
```
Allocation: 15-20% of supply
Cliff: 6-12 months
Vesting: 18-24 months linear
Early cliff unlock: 10-20% sometimes allowed
```

**Advisors (2 year vest):**
```
Allocation: 2-5% of supply
Cliff: 6 months
Vesting: 18 months linear
```

**BONK Case Study:**
- 20% of supply (core team) vested via Streamflow
- 3-year linear vesting for 22 early contributors
- Demonstrates long-term commitment
- Transparent on-chain verification

## Token Sinks (Deflationary Mechanisms)

### Transaction Fee Burns
- Solana burns 50% of base transaction fees
- Priority fees go to validators (not burned)
- At high transaction volumes, can be net deflationary

### Protocol Revenue Burns
**Pump.fun example:**
- $100M+ monthly revenue (Nov 2024)
- Fees burned rather than distributed
- Creates deflationary pressure

### Buyback Programs
**Jupiter FLUID model:**
- Protocol revenue funds buybacks
- Bought tokens support governance
- Accumulates treasury reserves

### Staking/Locking
- Marinade (mSOL): $1B+ TVL in staked SOL
- Jito (JitoSOL): Largest LST on Solana
- Locked tokens reduce circulating supply
- Creates yield opportunities

## Token Sources (Inflationary Mechanisms)

### Liquidity Mining
- High emissions to attract TVL
- **Warning:** Usually fails long-term (mercenary capital)
- Better approach: Sustainable yield from real fees

### Staking Rewards
**Solana validator rewards:**
- ~7-9% APY for stakers
- Funded by inflation + transaction fees
- Dilutes non-stakers by ~5% annually

**Marinade staking:**
- mSOL APY: 9.9% (Q4 2024)
- Funded by validator commission + MEV tips
- 98.7% of revenue from Stake Auction Marketplace

### Airdrop Emissions
**Jupiter "Jupuary" model:**
- Annual community airdrops
- Rewards active users
- Now considering reduction to net-zero emissions

## Real Protocol Examples

### Jupiter (JUP) - Disinflationary
- **Supply:** 10B max (down from 13B)
- **Allocation:** 48.1% airdrop, 40.1% insiders, 5.7% public sale
- **Emissions:** Moving to net-zero for 2026
- **Burns:** Verification, litterbox, protocol operations
- **Revenue:** $365M monthly (Nov 2024) from DEX aggregator fees

### Jito (JTO) - MEV-Funded
- **Supply:** 1B total
- **Allocation:** 24.5% core, 16.66% investors, community rest
- **Revenue model:** MEV tips from block building
- **Vesting:** 3-4 year schedules for core team
- **Staking:** JitoSOL is largest Solana LST

### Marinade (MNDE) - Fee-Based
- **Supply:** 1B MNDE
- **Revenue:** $3.05M (Q4 2024), +249% QoQ
- **Fee split:** 98.7% from Stake Auction Marketplace
- **Staking:** $1.7B TVL (35.6% increase Q4 2024)
- **No VC funding:** Pure community launch

## Modeling Framework

### 1. Define Total Supply
- Fixed cap or inflationary?
- Max supply ceiling?
- Initial circulating supply?

### 2. Allocation Breakdown
```
Community/Ecosystem: 40-50%
  - Airdrops: 10-20%
  - Liquidity mining: 10-20%
  - Ecosystem grants: 10-20%

Team/Core: 15-25%
  - Long vesting (3-4 years)
  - Cliff periods

Investors: 15-20%
  - Vesting (2-3 years)
  - Staged unlocks

Treasury/Reserve: 10-20%
  - DAO-controlled
  - Emergency funds
```

### 3. Emission Schedule Math
**Annual inflation rate formula (Solana model):**
```
Inflation_Year_N = max(
  Initial_Rate * (1 + Disinflation_Rate)^N,
  Long_term_Rate
)
```

**Staking yield formula:**
```
Staking_Yield = (Inflation_Rate / Staked_Percentage) * (1 - Validator_Commission)
```

### 4. Sink/Source Balance
**Target:** Sinks ≥ Sources for deflationary or neutral

**Calculate:**
- Monthly emissions (team unlocks, rewards, airdrops)
- Monthly burns (fees, buybacks, locks)
- Net inflation/deflation rate
- Impact on token holders

### 5. Stress Testing
**Model scenarios:**
- 50% TVL withdrawal
- Major unlock event
- Fee revenue drops 80%
- Token price drops 90%

**Ask:**
- Does protocol remain solvent?
- Are rewards sustainable?
- Will team/investors dump?

## Best Practices

1. **Use on-chain vesting** (Streamflow/Bonfida) - transparency builds trust
2. **Long team vesting** (3-4 years) - signals commitment
3. **Model at multiple price points** - don't assume token pumps
4. **Real yield > emissions** - sustainable fees beat liquidity mining
5. **Clear unlock calendar** - surprises destroy trust
6. **Buyback > staking emissions** - if revenue supports it
7. **Monitor FDV/MC ratio** - high FDV = future sell pressure
8. **Plan for bear markets** - emissions still happen, revenue might not

## Red Flags to Avoid

- Team allocation > 30%
- No vesting or <1 year vests
- Unlocks > 5% of float monthly
- Liquidity mining without real revenue
- Opaque emission schedule
- FDV > 10x market cap (huge dilution coming)
- No burn mechanism with high inflation
- Staking rewards without fee revenue

## Tools & Resources

**Vesting:**
- Streamflow: app.streamflow.finance
- Bonfida: vesting.bonfida.org

**Modeling:**
- TokenTerminal: Track protocol revenue
- DefiLlama: TVL and unlock schedules
- Tokenomist: Unlock calendars and FDV tracking
- Dropstab: Vesting schedule visualization

**Analytics:**
- Solana inflation tracker: solana.com/docs/economics
- Token unlocks: defillama.com/unlocks
- Protocol revenue: tokenterminal.com
