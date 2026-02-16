---
pack: solana
confidence: 8/10
sources_checked: 15
last_updated: "2026-02-16"
---

# How do veTokenomics work on Solana?

Vote-escrowed (ve) tokenomics is a governance and incentive mechanism where token holders lock governance tokens for a fixed duration to receive time-decaying voting power. The longer the lock, the greater the initial voting power. This model, pioneered by Curve Finance with veCRV in September 2020, has become a cornerstone of DeFi governance—though adoption on Solana remains nascent compared to EVM chains.

## Core Mechanics: The Curve Model

### Lock Duration → Voting Power Math

The canonical implementation (Curve veCRV) uses linear time-weighting:

- **Maximum lock**: 4 years → 1 veCRV per 1 CRV locked
- **Minimum lock**: 1 week → ~0.005 veCRV per 1 CRV locked
- **Linear decay**: veCRV balance decays to zero at unlock

**Formula**: `veCRV = CRV_locked × (lock_time_remaining / MAX_LOCK_TIME)`

**Example**:
- Lock 100 CRV for 4 years = 100 veCRV initially
- After 2 years: 100 CRV × (2 years / 4 years) = 50 veCRV remaining
- After 3.5 years: 100 CRV × (0.5 years / 4 years) = 12.5 veCRV remaining
- At unlock (4 years): 0 veCRV

### Non-Transferable Design

veCRV tokens are **non-transferable**. This prevents:
- **Governance mercenaries**: Borrowing tokens to influence votes, then returning them
- **Flash loan governance**: Leveraging temporary capital for proposals
- **Sybil attacks**: Buying voting power, passing proposals, then dumping

Lock requirements force skin-in-the-game: you must commit capital for months/years to govern.

### Economic Incentives

Beyond voting, veToken holders earn:

1. **Protocol revenue share**: 50% of Curve swap fees → veCRV holders
2. **Boosted yields**: Up to 2.5x CRV emissions on your own liquidity
3. **Bribe income**: Third parties pay you to vote for their pools (see below)

**Boost formula** (simplified):
```
boost_multiplier = min(
  1 + (your_vecrv / total_vecrv) × (your_liquidity / total_liquidity) × 1.5,
  2.5
)
```

You need proportionally more veCRV as your liquidity share increases to maintain max boost.

## Gauge Voting & Bribe Markets

### Gauge Voting Mechanics

**Gauge** = pool-specific emission controller. veToken holders allocate their voting power across gauges weekly to determine which liquidity pools receive the most token emissions.

**Curve example**:
- Total CRV emissions: 750k CRV/week
- Gauge A receives 30% of votes → 225k CRV
- Gauge B receives 10% of votes → 75k CRV
- Gauge C receives 5% of votes → 37.5k CRV

Liquidity providers in Gauge A earn 3x the emissions of Gauge B, creating strong incentives to direct votes.

### Bribe Markets

**Problem**: Projects with low liquidity can't attract votes organically.

**Solution**: Pay veToken holders directly to vote for your pool.

**Platforms**: Votium (Convex), Warden (Paladin), Hidden Hand, Votemarket

**Mechanics**:
1. Project deposits $10k USDC as bribes for Gauge X
2. veToken holders who vote for Gauge X claim pro-rata share of $10k
3. If you control 5% of votes → you earn $500

**ROI calculation**:
- Pay $10k in bribes → Gauge receives $1M in liquidity incentives
- Effective cost: 1% of incentive value
- Projects get 100x leverage on their capital

This creates "Curve Wars" dynamics where protocols compete to accumulate veCRV (or delegate wrappers like Convex vlCVX) to control emissions.

## ve(3,3) Model

**Innovation**: Andre Cronje's ve(3,3) model (Solidly, Velodrome, Thena) extends veCRV with:

### Key Differences from Curve

1. **Rebase incentives**: veToken holders earn emissions proportional to their voting power (not just fees)
2. **NFT representation**: ve positions are NFTs (tradable or used as collateral)
3. **Vote-earn alignment**: Voters earn emissions from the gauges they vote for
4. **Permissionless pools**: Anyone can create pools and gauges (no whitelist)

### The (3,3) Game Theory

Borrowed from OlympusDAO's bonding mechanism:

| Your Action | Others' Action | Outcome |
|-------------|---------------|---------|
| Lock & vote | Lock & vote | (3,3) Everyone wins via emissions |
| Lock & vote | Sell | (1,-1) You win, they lose value |
| Sell | Sell | (-3,-3) Death spiral |

**Goal**: Incentivize locking over selling by making locked positions more profitable than liquid ones.

### Real Implementations

- **Velodrome (Optimism)**: $200M+ TVL, active bribe market
- **Thena (BNB Chain)**: $50M TVL, ve(3,3) fork
- **Equalizer (Fantom)**: Post-Solidly collapse revival

**Solana status**: No major ve(3,3) implementations yet. Most Solana DeFi uses simpler staking models (e.g., Jupiter's JUP staking for governance).

## Solana-Specific Implementations

### ME Foundation veToken

**GitHub**: [me-foundation/vetoken](https://github.com/me-foundation/vetoken)

**Features**:
- Simplified vote-escrow staking for SPL Token / Token-2022
- Different voting power & rewards multipliers per lockup tier
- Proposal creation and voting based on lockup voting power
- Built on Anchor framework

**Status**: Open-source toolkit, not a live protocol. Developers can fork for custom implementations.

### Governance Alternative: JUP DAO

Jupiter uses **non-locked staking**:
- Stake JUP → voting power (no lock requirement)
- Unstake anytime (no decay or penalty)
- Vote on DAO proposals and gauge voting

**Why not veTokenomics?**
- Solana's retail-heavy user base prefers liquidity over lock commitments
- Faster iteration speed → governance must be more flexible
- Lower capital efficiency (can't bootstrap emissions like Curve)

## When veTokenomics Works

### ✅ Good Use Cases

1. **High liquidity protocols** (DEXs, lending): Curve, Balancer, Frax
2. **Long-term capital formation**: Protocol-owned liquidity (POL) strategies
3. **Emission control needed**: Preventing token dumping from LPs
4. **Strong fee revenue**: Must reward lockers beyond governance rights

### ❌ Bad Use Cases

1. **Low liquidity / early-stage**: Lock requirements kill growth
2. **High volatility tokens**: Locking risky assets = poor UX
3. **Fast-moving markets**: Retail users won't lock for months on Solana
4. **No fee revenue**: Without economic incentive, locking is pure speculation

## Governance Capture Risks

### Whale Domination

**Convex case study**: Convex Finance accumulated >50% of all veCRV via aggregation.

**Result**:
- Individual users delegate to Convex to maximize yields
- Convex controls Curve governance despite being a meta-protocol
- Original "decentralized governance" vision compromised

**Mitigation**:
- Voting delegation caps (e.g., max 10% per entity)
- Quadratic voting (diminishing returns on large stakes)
- Time-weighted average locks (prevents flash accumulation)

### Bribe Market Manipulation

**Problem**: High-value bribes can override economic logic.

**Example**:
- Project pays $100k in bribes for a worthless pool
- Voters accept bribes despite low TVL/volume
- Emissions wasted on mercenary capital that exits immediately

**Mitigation**:
- Minimum gauge requirements (TVL, volume, duration)
- Penalty for voting on "graduated" pools that exit
- Reputation systems for bribe payers

## Why veTokenomics Fails

### Death Spiral Mechanics

1. **Token price drops** → veToken holders unlock early (if possible)
2. **Unlocked supply hits market** → price drops further
3. **Yield farmers exit** → TVL collapses
4. **Protocol revenue tanks** → no reason to lock
5. **Governance dies** → protocol becomes zombie

**Historical examples**:
- Solidly (Andre Cronje's ve(3,3)): Collapsed within weeks due to mercenary TVL
- Olympus (OHM): (3,3) meme couldn't sustain when APY dropped from 8,000% to 10%

### Capital Inefficiency

Locking $100M in governance tokens for 4 years has opportunity cost:
- Could earn yield elsewhere (staking, LPing, lending)
- Locked during bear market = unrealized losses
- veToken may lose value faster than fee income compensates

### UX Friction

Retail users don't think in 4-year timeframes:
- "Why can't I sell?"
- "What if I need the capital?"
- "4 years in crypto = 10 lifetimes"

**Solana context**: The ecosystem skews younger, more retail, and more memecoin-oriented than Ethereum L2s. Lock requirements contradict "degen" culture.

## Solana Outlook: Will veTokenomics Thrive?

### Arguments FOR

1. **Maturation**: As Solana DeFi grows, long-term capital will demand governance models
2. **LST composability**: Locked tokens can become liquid via derivatives (e.g., stSOL for veSOL)
3. **Emissions control**: Protocols like Meteora or Orca could adopt to stabilize token emissions

### Arguments AGAINST

1. **Cultural mismatch**: Solana users prioritize speed and liquidity over lock commitments
2. **Existing alternatives**: JUP staking, SPL Governance work without locks
3. **MEV environment**: Solana's high MEV makes locked capital riskier (can't exit during exploits)

### Most Likely Outcome

**Hybrid models** will dominate:
- Optional locks (e.g., lock for 1 year = 2x voting power, or stake flexibly for 1x)
- NFT-wrapped ve positions (tradable via lending protocols)
- Liquid wrappers (deposit veTOKEN, get lvTOKEN that's tradable)

Think "ve-lite": the economic alignment of locks without the full UX penalty.

## Further Reading

- [Curve veCRV Docs](https://resources.curve.finance/vecrv/overview/)
- [Nansen: Curve Finance and veCRV Tokenomics](https://research.nansen.ai/articles/curve-finance-and-vecrv-tokenomics)
- [Mitosis University: veTokenomics & Bribe Markets](https://university.mitosis.org/vetokenomics-bribe-markets-gauge-voting-incentives-and-curve-wars-mechanics/)
- [Outlier Ventures: veGood, veBad, and veUgly](https://outlierventures.io/article/vegood-vebad-and-veugly/)
- [ME Foundation veToken (GitHub)](https://github.com/me-foundation/vetoken)
- [CoinGecko: What are veTokens?](https://www.coingecko.com/learn/vetokens-and-vetokenomics)

---

**Bottom line**: veTokenomics is a powerful tool for aligning long-term stakeholders in DeFi protocols, but it requires deep liquidity, strong fee revenue, and a user base willing to lock capital for months/years. Solana's retail-heavy, high-velocity culture makes adoption challenging—expect hybrid or "ve-lite" models to emerge rather than pure Curve-style implementations.
