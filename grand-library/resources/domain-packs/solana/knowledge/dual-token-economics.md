---
pack: solana
confidence: 8/10
sources_checked: 12
last_updated: "2026-02-16"
---

# When should I use a dual-token model?

Dual-token models split protocol functions across two tokens: one for **utility/transactions** (in-game currency, fees, rewards) and one for **governance/value capture** (voting, staking, revenue share). When designed well, they align different user types (players vs investors, users vs governors) and prevent death spirals. When designed poorly, they create extractive pyramid schemes that collapse within months.

## The Core Pattern

### Token Roles

**Utility Token** (high velocity, high supply):
- Medium of exchange (pay for actions, fees, items)
- Earned through usage (play-to-earn, liquidity mining)
- Infinite or high-inflation supply
- Designed to be spent, not held

**Governance Token** (low velocity, low supply):
- Voting on protocol decisions
- Staking for revenue share / yield
- Fixed or low-inflation supply
- Designed to be held, not spent

### Why Separate Them?

**Single-token problem**: If one token does everything, you face conflicting incentives:
- **High supply for utility** → price drops → governance becomes cheap to attack
- **Low supply for governance** → too expensive for transactions → poor UX
- **Users must hold governance tokens** → friction for casual users
- **Inflationary rewards** → governors get diluted

**Dual-token solution**: Let each token optimize for its use case:
- Utility token can inflate to reward usage (doesn't matter if price drops, as long as it's stable enough for transactions)
- Governance token captures value from utility token activity (fees, burns, buybacks)
- Casual users never touch governance token (lower friction)
- Investors hold governance token for yield (aligned with protocol health)

## Real-World Implementations

### Star Atlas: ATLAS + POLIS

**Game**: Space MMO on Solana with NFT ships, resources, and territory control.

**Token Design**:
- **ATLAS** (utility): In-game currency for all transactions
  - Buy ships, fuel, resources, consumables
  - Earned from gameplay (mining, combat, trade)
  - Supply expands with player growth
  - Designed for high velocity (spend immediately)

- **POLIS** (governance): DAO control and economic policy
  - Vote on game mechanics, economic parameters, DAO treasury
  - Stake for marketplace fee discounts (e.g., 5% discount with 1,000 POLIS locked)
  - Earn POLIS rewards from staking (creating feedback loop)
  - Fixed supply (capped at 360M)

**Why it works**:
1. **Separation of concerns**: Players can enjoy game without caring about governance
2. **Value capture**: Every ATLAS transaction burns or taxes a % → DAO treasury holds POLIS
3. **Investor alignment**: POLIS holders benefit from ATLAS economy growing (more fees)
4. **Marketplace mechanics**: Locking POLIS for discounts creates demand beyond governance

**Risk**: If gameplay fails to retain users, ATLAS velocity drops → POLIS loses revenue source → both tokens collapse. The model only works if the utility token has real demand.

### Axie Infinity: SLP + AXS (Cautionary Tale)

**Game**: Pokemon-like battler where you earn tokens by playing.

**Original Design** (2020-2021):
- **SLP** (utility): Earned from winning battles
  - Used to breed new Axies (game NFTs)
  - Infinite supply (minted per win)
  - Initially burned via breeding demand

- **AXS** (governance): DAO voting, staking rewards, rare breeding
  - Stake for ~100% APY (paid in AXS)
  - Vote on governance proposals
  - Required (with SLP) for breeding rare Axies
  - Fixed supply (270M)

**What went wrong**:
1. **SLP inflation spiral** (2021-2022):
   - Players earned SLP faster than it was burned via breeding
   - SLP supply exploded (billions minted, millions burned)
   - SLP price: $0.40 → $0.004 (99% crash)
   - Players could no longer earn meaningful income

2. **Death spiral feedback**:
   - SLP crash → earnings worthless → players quit
   - Players quit → less breeding → less SLP burn → supply grows
   - Growing SLP supply → price tanks further → more players quit

3. **AXS collapse followed**:
   - AXS price: $160 → $5 (97% crash)
   - Staking rewards became worthless
   - No revenue for DAO (SLP economy dead)

**Lesson**: Dual tokens don't prevent death spirals if utility token supply isn't controlled. SLP was "designed to be spent" but lacked sufficient sinks.

## When Dual Tokens Make Sense

### ✅ Gaming: Separate Earn from Invest

**Why**: Games need high-velocity currencies that players earn and spend constantly. Mixing that with governance creates misaligned incentives (do you want players to hold or spend?).

**Pattern**:
- **Earn token** (SLP, ATLAS): Reward gameplay, infinite supply, spent on in-game items
- **Invest token** (AXS, POLIS): Governance, staking yield, fixed supply, held for appreciation

**Critical requirement**: Earn token must have robust sinks (burns, taxes, required expenditures) that scale with minting.

**Example architectures**:
1. **Marketplace taxes**: 5% of all trades → DAO treasury (which buys back governance token)
2. **Breeding/crafting burns**: Earn token required to create valuable NFTs (Axie model, but needs higher burn rate)
3. **Consumables**: Earn token spent on fuel, ammo, energy (real demand, not speculative)

### ✅ DeFi: Separate Yield from Governance

**Why**: Users want yield without governance friction. Governance token holders want value capture without providing liquidity.

**Pattern**:
- **Yield token** (farming rewards, high inflation): Incentivize liquidity, high supply
- **Governance token** (revenue share, low inflation): Vote on emissions, earn protocol fees

**Example**: Sushi's xSUSHI (staked SUSHI earns fees) vs SUSHI (used for liquidity mining)

**Better examples** (non-Solana):
- **SNX + sUSD** (Synthetix): SNX stakers mint sUSD (stablecoin), earn fees from sUSD trading
- **MKR + DAI** (Maker): MKR governs DAI stability, earns fees from DAI minting
- **GMX + GLP**: GMX governance, GLP liquidity provision (earn fees from trades)

**Solana context**: Most Solana DeFi uses single tokens (JUP, ORCA, MNGO) because:
- Retail users prefer simplicity
- Single token = better price action (all value in one asset)
- Staking mechanisms achieve governance without second token

### ✅ L1/L2 Chains: Gas Token + Governance Token

**Why**: You need a stable-ish gas token for transactions (too volatile = bad UX), but you also need a governance token to control chain parameters.

**Pattern**:
- **Gas token** (ETH, SOL): Pay for transactions, validator rewards
- **Governance token** (rare on L1s): Vote on chain upgrades, parameter changes

**Note**: Most L1s (Ethereum, Solana, Bitcoin) use a single token for both. Dual tokens are more common on L2s or sidechains.

**Example**: Polygon (MATIC for gas + governance) vs Metis (METIS for governance, ETH for gas on L2).

### ❌ When Dual Tokens DON'T Make Sense

1. **Simple protocols**: If your protocol has one use case (e.g., lending, swapping), one token is cleaner.
2. **Early-stage projects**: Dual tokens add complexity that confuses users. Bootstrap with single token, split later if needed.
3. **No clear separation**: If both tokens do "similar things," users won't understand the difference.
4. **Weak utility token sinks**: If the utility token has no real burn/demand, it will spiral to zero.

## Token Interaction Design

### Value Flow: Utility → Governance

The governance token must capture value from utility token activity. Common mechanisms:

#### 1. **Transaction Taxes → Buyback & Burn**

**Example**: 5% of all ATLAS transactions:
- 3% sent to DAO treasury
- Treasury uses funds to buy POLIS from open market
- Bought POLIS is burned (reducing supply) or distributed to stakers

**Math**:
- Daily ATLAS volume: $1M
- 5% tax: $50k/day
- POLIS buy pressure: $50k/day
- If POLIS market cap = $10M, buyback is 0.5%/day (18%/month)

**Effect**: Healthy ATLAS economy directly increases POLIS demand.

#### 2. **Utility Token Sinks Require Governance Token**

**Example**: Breeding in Axie Infinity
- Costs 300 SLP + 1 AXS
- Burns both tokens
- Creates AXS demand beyond governance

**Solana gaming example** (hypothetical):
- Crafting legendary items requires 1,000 EARN + 10 GOV
- Both tokens burned
- High-level players must acquire governance token (even if they don't care about voting)

#### 3. **Staking Governance → Earn Utility**

**Example**: Stake POLIS → earn ATLAS rewards (from marketplace fees)

**Effect**: Governance holders earn the high-velocity token, which they can spend in-game or sell. This creates a natural pressure valve (governance holders extract value without dumping governance token).

#### 4. **Lock Governance → Boost Utility Earnings**

**Example**: Lock GOV for 6 months → 2x EARN rewards from gameplay

**Effect**: Locks up governance supply (price support) while rewarding power users. Common in DeFi (Curve's veCRV boost model).

## Preventing Death Spirals

### The Death Spiral Equation

```
Utility_Token_Price = (Demand_for_Utility / Supply_from_Rewards)
```

If supply grows faster than demand, price spirals to zero.

### Design Principles to Avoid Collapse

#### 1. **Dynamic Emission Rates**

Don't use fixed emission schedules. Adjust based on:
- **Token price**: If price drops 50%, cut emissions 50%
- **Usage metrics**: If DAUs drop, reduce rewards proportionally
- **Supply/demand**: If burn rate < mint rate, reduce minting

**Example** (Axie's attempted fix):
- Original: ~400M SLP/day minted
- After crash: Reduced to ~20M SLP/day (95% cut)
- Too late—damage already done

**Better approach**: Build dynamic adjustment into initial design (not emergency patch).

#### 2. **Robust Token Sinks**

Every utility token must have **mandatory expenditures** that scale with usage:

**Strong sinks** (high-demand, non-speculative):
- Consumables (fuel, ammo, energy) required for gameplay
- Marketplace taxes (unavoidable if you trade)
- NFT minting/crafting (creates valuable assets)

**Weak sinks** (speculative, optional):
- Staking (you stake to earn more tokens—Ponzi-adjacent)
- Breeding (demand collapses if NFT prices crash)
- Buybacks (market manipulation, not real demand)

**Rule of thumb**: Sinks should destroy ≥80% of minted tokens during steady-state.

#### 3. **Hard Supply Caps on Utility Token**

Controversial, but worth considering:
- Cap utility token supply (e.g., max 1 billion)
- Once cap is reached, rewards come from fees/burns (not new minting)
- Forces protocol to become self-sustaining

**Example**: Bitcoin (21M cap). No one worries about BTC death spiral because supply is fixed.

**Downside**: Can't bootstrap early growth with inflation. Only works for mature protocols.

#### 4. **Cross-Token Burn Mechanisms**

Burn both tokens in high-value activities:

**Example** (Star Atlas hypothetical):
- Buy a capital ship: costs 100k ATLAS + 500 POLIS (both burned)
- Effect: Links governance token demand to utility token activity

**Example** (DeFi hypothetical):
- Borrow stablecoin: pay interest in EARN, also burn GOV proportionally
- Effect: Heavy protocol usage reduces supply of both tokens

### 5. **Governance Token Shouldn't Have High Inflation**

Common mistake: Both tokens inflate rapidly.

**Bad design**:
- Earn token: 100M/day minted
- Governance token: 1M/day minted (10% APY staking)
- Result: Both spiral to zero (no scarcity)

**Good design**:
- Earn token: High inflation (needed for rewards)
- Governance token: Fixed supply or <3% annual inflation
- Result: Scarcity asymmetry creates value capture

## Real Design: Star Atlas ATLAS + POLIS (Deep Dive)

### Supply & Distribution

**ATLAS**:
- Max supply: 36 billion (inflationary during growth phase)
- Distribution: Gameplay rewards (60%), ecosystem fund (20%), team (10%), early sale (10%)
- Emission: Dynamic, adjusts based on DAUs and economic health

**POLIS**:
- Max supply: 360 million (10% of ATLAS supply)
- Distribution: Governance airdrop (35%), ecosystem (25%), team (15%), strategic sale (15%), early sale (10%)
- Emission: Low inflation from staking (~5% APY)

**Key ratio**: 100:1 ATLAS:POLIS supply ratio. This creates scarcity differential (POLIS is "hard money").

### Token Sinks

**ATLAS sinks**:
1. Fuel consumption (ships need ATLAS to move)
2. Repairs (damaged ships cost ATLAS to fix)
3. Crew salaries (NPC crew paid in ATLAS)
4. Marketplace fees (5% on trades, sent to DAO)
5. Crafting materials (resources cost ATLAS to refine)

**POLIS sinks**:
1. DAO proposal creation (costs POLIS to submit)
2. High-tier crafting (legendary ships require POLIS + ATLAS)
3. Political actions (declare war, claim territory, etc.)

**Feedback loop**:
- More gameplay → more ATLAS burned → marketplace fees grow → DAO buys POLIS → POLIS price rises → staking APY improves → more POLIS locked → reduced sell pressure

### Why This Design Could Work

1. **Real utility**: Ships genuinely need fuel (not speculative sink)
2. **Scarcity asymmetry**: POLIS is 100x scarcer than ATLAS
3. **Staking benefits**: Locking POLIS gives tangible benefits (fee discounts, rewards)
4. **DAO treasury**: Fees accumulate in DAO, creating buy pressure for POLIS
5. **MMO persistence**: Unlike P2E games where you "finish," MMOs run indefinitely (sustained demand)

### Why This Design Could Fail

1. **Gameplay risk**: If Star Atlas ships delayed/bad, all tokens worthless
2. **Cold start problem**: Economy needs critical mass of players to generate fees
3. **Inflation timing**: If rewards too high early, ATLAS spirals before sinks activate
4. **Whale dominance**: Large POLIS holders can control DAO, extract value from ATLAS economy

## Checklist: Should You Use Dual Tokens?

Ask yourself:

1. **Do you have two distinct user personas?** (e.g., players vs investors, users vs governors)
   - Yes → Dual token might make sense
   - No → Single token is cleaner

2. **Does your utility token have **mandatory, high-frequency sinks**?
   - Yes (consumables, fees, crafting) → Proceed
   - No (only speculative sinks) → Death spiral likely

3. **Can the governance token capture value from utility token activity?**
   - Yes (taxes, burns, buybacks) → Good
   - No (independent economies) → Why have two tokens?

4. **Is the utility token **stable enough** for transactions?**
   - Yes (low volatility, predictable purchasing power) → Good UX
   - No (wild swings) → Users won't hold it

5. **Are you willing to dynamically adjust emissions?**
   - Yes (algorithmic or governance-controlled) → Sustainable
   - No (fixed schedule) → High risk

6. **Do you have enough initial liquidity to support two tokens?**
   - Yes (strong treasury, market makers, exchange listings) → Feasible
   - No (scrappy startup) → Single token for simplicity

**If you answered "yes" to 1, 2, 3, and 5**: Dual token is worth exploring.

**If you answered "no" to 2 or 3**: Stick with single token (or redesign your economy).

## Alternatives to Dual Tokens

If you're unsure about dual tokens, consider these simpler models:

### 1. **Single Token with Internal Accounting**

Use one token, but track "locked" vs "liquid" internally:
- Locked tokens: Full voting power, staking rewards
- Liquid tokens: Can trade, but no governance rights

**Example**: JUP (Jupiter DAO) — stake JUP for voting, unstake anytime. One token, two states.

### 2. **Single Token + Wrapped Derivative**

Issue one token, let DeFi create wrappers:
- Base token: Full fungibility, used for transactions
- Wrapped token: Staked version (e.g., xTOKEN, stTOKEN)

**Example**: stSOL (Lido), mSOL (Marinade) — SOL derivatives that earn staking yield.

### 3. **Single Token + NFT Governance**

Use token for transactions, NFTs for governance:
- Token: High-velocity, spent on fees
- NFTs: Voting power, revenue share

**Example**: Zapper (NFT-based governance for DeFi aggregator), Braintrust (BTRST token + NFT voting).

## Conclusion: Dual Tokens Are High-Risk, High-Reward

**When they work**:
- Aligned incentives between different user types
- Clear value capture from utility → governance
- Sustainable emission + sink balance

**When they fail**:
- Utility token spirals to zero (no sinks)
- Governance token has no value capture (no link to utility)
- Overcomplicated for users (confusion kills adoption)

**Solana context**: Most successful Solana projects use single tokens (JUP, BONK, WIF, JTO). Dual tokens are rare because:
- Retail prefers simplicity
- Single token = better memes/price action
- Ecosystem still young (mature economies need dual tokens)

**Final advice**: Default to single token unless you have a **very strong reason** (distinct personas, proven sinks, complex economy). If you do go dual, study Star Atlas and avoid Axie's mistakes.

## Further Reading

- [Star Atlas: Intergalactic Economy 101](https://medium.com/star-atlas/intergalactic-economy-real-world-atlas-polis-utility-governance-f42d1889aea7)
- [CoinMarketCap: Axie Infinity Tokenomics](https://coinmarketcap.com/academy/article/what-is-axie-infinity-atlas-polis-the-next-generation-of-blockchain-gaming)
- [Chain Debrief: Axie Infinity Tokenomics Breakdown](https://pexx.com/chaindebrief/axie-infinity-difference-between-axs-slp/)
- [CryptoSlate: GameFi Tokenomics 101 - Dual Token Games](https://cryptoslate.com/gamefi-tokenomics-101-dual-token-blockchain-games/)
- [Tiger Research: The Comeback of Axie Infinity](https://reports.tiger-research.com/p/axie-infinity-eng)
- [CoinDesk: Axie Reduces SLP Emissions to Prevent Collapse](https://www.coindesk.com/tech/2022/02/08/axie-infinity-reduces-slp-emissions-to-prevent-collapse)

---

**Bottom line**: Use dual tokens when you have distinct user personas (players vs investors, users vs governors) and robust value capture from utility to governance. Otherwise, stick with a single token and let the market create derivatives (staked versions, wrapped versions) if needed. The complexity of dual tokens is only justified when the economic model requires it.
