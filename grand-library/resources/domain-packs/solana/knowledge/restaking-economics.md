---
pack: solana
confidence: 8/10
sources_checked: 11
last_updated: "2026-02-16"
---

# How does restaking and LST yield stacking work?

## Overview

Liquid staking tokens (LSTs) and restaking represent the evolution of proof-of-stake economics on Solana. Instead of locking SOL with a single validator and earning ~7% base yield, users stake through liquid staking protocols (Jito, Marinade, Sanctum) to receive yield-bearing LST tokens (jitoSOL, mSOL, INF) that can be used across DeFi while continuing to earn staking rewards. Restaking extends this concept by allowing staked assets to secure multiple networks simultaneously, earning additional yield layers. As of October 2025, Solana's LST market holds $10.7B TVL with 13.3% of all staked SOL (57M SOL) now liquid, representing a 33% YoY growth from $2.7B in December 2024.

## Liquid Staking Token (LST) Landscape

### Major Solana LST Protocols

**1. Marinade Finance (mSOL)**
- **Launch**: 2021 (first Solana LST)
- **TVL**: ~$2.5B (42% LST market share as of 2024)
- **Validator Set**: 400+ validators via stake pool, stake-weighted for decentralization
- **Yield**: 6-7% APY from base staking rewards
- **Revenue Model**: Management fee on staking rewards (~3-6% of yield) + delayed unstake fee (0.3-1%)
- **Token**: MNDE for governance and liquidity mining incentives

**How mSOL Works:**
- User deposits SOL → receives mSOL (exchange rate increases over time as rewards accrue)
- mSOL appreciates in value: 1 mSOL = 1.05 SOL after 1 year (assuming 5% net APY)
- Instant unstake via liquidity pools or delayed unstake (1-2 epochs, ~2-4 days)

**2. Jito Network (jitoSOL)**
- **Launch**: 2022
- **TVL**: ~35% LST market share
- **Validator Set**: Jito-Solana client validators with MEV infrastructure
- **Yield**: 7-9% APY (6-7% base + 1-2% MEV rewards)
- **MEV Sharing**: ~94% of MEV tips distributed to stakers, ~$3.6M daily MEV tips in 2025
- **Revenue Model**: 6% fee on MEV tips + management fee on staking rewards

**How jitoSOL Works:**
- User stakes SOL → receives jitoSOL
- Validators run Jito-Solana client to capture MEV from transaction ordering
- MEV tips distributed to jitoSOL holders (adds 1-2% APY above mSOL)
- jitoSOL price appreciates: 1 jitoSOL = 1.08 SOL after 1 year (assuming 8% total APY)

**Why jitoSOL Outperforms:**
- MEV capture is exclusive to Jito validators
- Priority fees and arbitrage opportunities add 13-15% to validator rewards during peak activity
- Stakers receive most of this MEV upside (~94% passthrough rate)

**3. Sanctum (INF Token)**
- **Launch**: 2024
- **Model**: LST-of-LSTs (holds basket of high-performing LSTs)
- **TVL**: Growing rapidly, challenging Jito and Marinade
- **Yield Sources**:
  - Base staking rewards from underlying LSTs (6-7% APY)
  - Trading fees from Infinity pool (LST swap router) (0.5-1% APY)
  - Concentrated liquidity incentives
- **Total Yield**: 7-8% APY typical

**How INF Works:**
- User deposits any LST (mSOL, jitoSOL, bSOL, etc.) → receives INF
- INF holds diversified basket of LSTs (not directly staked SOL)
- Earns from both LST appreciation + trading fees from facilitating LST swaps
- Infinity pool provides unified liquidity for all Solana LSTs (reduces fragmentation)

**Why INF is Unique:**
- Diversification: holds multiple LSTs to reduce single-protocol risk
- Liquidity mining: INF becomes the universal LST for DeFi integrations
- Fee capture: benefits from LST market growth (more swaps = more fees)

**4. Other Notable LSTs**
- **bSOL (BlazeStake)**: 5-6% APY, community-focused, smaller market share
- **stSOL (Lido Solana)**: Lido's Solana offering, ~1-2% market share (Lido dominant on Ethereum, not Solana)
- **dSOL (Drift Protocol)**: Integrated with Drift perpetuals exchange

### LST Market Dynamics (2024-2025)

**Market Share:**
- Marinade (mSOL): 42%
- Jito (jitoSOL): 35%
- Sanctum (INF) + Others: 23%

**Growth Metrics:**
- Total LST TVL: $10.7B (October 2025)
- Liquid staked SOL: 57M SOL (13.3% of total staked SOL)
- YoY Growth: $2.7B (Dec 2024) → $3.6B (Dec 2025) = 33% in lending markets alone
- Institutional Holdings: 5.9M SOL (1% circulating supply) held by public companies

**Yield Comparison:**
| Protocol | Base APY | MEV APY | Total APY | TVL |
|----------|----------|---------|-----------|-----|
| Native Staking | 6-7% | 0% | 6-7% | N/A |
| mSOL (Marinade) | 6-7% | 0% | 6-7% | $2.5B |
| jitoSOL (Jito) | 6-7% | 1-2% | 7-9% | ~$3.7B |
| INF (Sanctum) | 6-7% | 0.5-1% | 7-8% | Growing |

## MEV Reward Sharing (Jito Focus)

### What is MEV on Solana?

**Maximal Extractable Value (MEV):**
- Profit extracted by reordering, inserting, or censoring transactions in a block
- Sources: arbitrage, liquidations, sandwich attacks, priority fees

**Solana MEV Characteristics:**
- Parallel transaction execution reduces some MEV opportunities vs. Ethereum
- Priority fees (introduced 2023) allow users to bid for block inclusion
- Jito-Solana client enables out-of-protocol MEV capture and redistribution

### How Jito MEV Sharing Works

**Traditional Staking (No MEV Sharing):**
- Validator earns MEV from transaction ordering
- Stakers only receive base staking rewards (~7% APY)
- Validator keeps 100% of MEV profits

**Jito Staking (MEV Sharing):**
1. **Validator Setup**: Validator runs Jito-Solana client (fork of Solana Labs client)
2. **MEV Capture**: Jito client optimizes transaction ordering to capture MEV opportunities
3. **Tip Distribution**: MEV profits distributed as "tips" to jitoSOL stakers
4. **Revenue Split**: ~94% to stakers, ~6% to Jito protocol

**MEV Sources on Jito:**
- **Priority Fees**: Users pay extra to be included in block (especially during NFT mints, token launches)
- **Arbitrage**: Reordering swaps to capture price discrepancies across DEXs
- **Liquidations**: Front-running liquidation transactions on lending protocols

**Real MEV Data (2025):**
- Daily MEV tips: ~$3.6M
- MEV boost to jitoSOL APY: 1-2% typical, 3-5% during high volatility
- Peak MEV: 13-15% of total validator rewards during market extremes

**Why Jito Dominates:**
- First mover advantage in Solana MEV infrastructure
- 35% LST market share means deep liquidity and DeFi integrations
- Validators prefer Jito client for higher total earnings (base + MEV)

## Validator Selection Economics

### Validator Performance Factors

**1. Commission Rate**
- Validators charge 0-10% commission on staking rewards
- Most competitive validators: 5-7% commission
- High commission (>8%) reduces staker yield

**2. Uptime & Performance**
- Validators must maintain >95% uptime to avoid penalties
- Missed votes reduce rewards proportionally
- Poor performance = lower APY for stakers

**3. MEV Infrastructure (Jito)**
- Validators running Jito client earn 1-2% additional MEV yield
- Non-Jito validators miss this upside entirely

**4. Hardware & Location**
- High-performance servers (128GB+ RAM, 10Gbps network) reduce latency
- Geographic diversity improves network resilience

**5. Stake Concentration**
- Solana penalizes over-concentrated validators (reduces rewards)
- Marinade and Sanctum spread stake across 400+ validators for decentralization

### How LST Protocols Select Validators

**Marinade's Strategy (mSOL):**
- Stake-weighted across 400+ validators
- Prioritize smaller validators to improve decentralization (Nakamoto coefficient)
- Automatic rebalancing to avoid concentration penalties
- Validators must meet minimum performance criteria (>95% uptime, <8% commission)

**Jito's Strategy (jitoSOL):**
- Only stake to Jito-Solana client validators (ensures MEV capture)
- ~150-200 validators in Jito pool
- Higher concentration but optimized for MEV yield

**Sanctum's Strategy (INF):**
- Doesn't stake directly to validators; holds diversified basket of LSTs
- Implicitly diversified through underlying LST protocols (mSOL, jitoSOL, etc.)

### Validator Economics (Solana 2024-2025)

**Inflation Schedule:**
- Started at 8% annual inflation (2020)
- Decreases 15% per year, targeting 1.5% long-term
- Current inflation (2024): 4.839%

**Validator Revenue Breakdown:**
- **Staking Rewards**: 80-85% of revenue (from inflation)
- **MEV Tips** (Jito only): 13-15% of revenue during peak activity, 5-10% typical
- **Priority Fees**: 2-5% of revenue

**Cost to Run Validator:**
- Hardware: $3k-$10k upfront + $500-$1,500/month server costs
- Minimum stake: ~5,000 SOL (~$500k-$1M) to be economically viable
- Break-even: requires ~50,000-100,000 SOL delegated stake to cover costs

**Result:** Most individual users prefer LST protocols (Jito, Marinade) over running own validator due to capital requirements and operational complexity.

## Restaking Layers

### What is Restaking?

**Restaking Concept:**
- Use staked assets (LSTs) to secure multiple networks simultaneously
- Earn additional yield from providing security to Layer 2s, oracles, or cross-chain bridges
- Pioneered by EigenLayer on Ethereum, expanding to Solana

**Solana Restaking:**
- Stake SOL → receive jitoSOL (7-9% APY)
- Restake jitoSOL to secure additional protocols → earn extra yield (1-3% APY)
- Total yield: 8-12% APY from layered staking

**Example Flow:**
1. User stakes 100 SOL → receives 100 jitoSOL (earning 8% APY)
2. User deposits jitoSOL into Picasso Network (cross-chain restaking protocol)
3. jitoSOL secures Picasso's cross-chain bridge
4. User earns 8% from jitoSOL + 2% from Picasso = 10% total APY

### Yield Stacking Opportunities

**Layer 1: Native Staking**
- Stake SOL with validator → 6-7% APY
- **Limitation**: SOL locked, no DeFi utility

**Layer 2: Liquid Staking (LSTs)**
- Stake via Jito/Marinade → 7-9% APY (includes MEV)
- Receive LST tokens (jitoSOL, mSOL) → unlocked for DeFi
- **Benefit**: Staking yield + DeFi composability

**Layer 3: DeFi Yield (Lending, LPs)**
- Deposit jitoSOL into Kamino Finance → 8-12% APY (base + lending interest)
- Provide jitoSOL-SOL liquidity on Orca → 10-15% APY (base + trading fees + incentives)
- **Benefit**: Stack multiple yield sources

**Layer 4: Restaking**
- Restake jitoSOL to secure external protocols (oracles, L2s, bridges)
- Earn validation rewards from restaking layer → +1-3% APY
- **Benefit**: Additional yield without selling LSTs

**Total Yield Stack Example:**
- Base staking: 7% (jitoSOL)
- Kamino lending: +4% (supply jitoSOL, borrow USDC at 65% LTV, farm incentives)
- Restaking: +2% (secure cross-chain bridge)
- **Total**: 13% APY

**Risks:** Compounding leverage (liquidation risk), smart contract risk, restaking slashing risk (if protocols penalize poor performance).

## Yield Stacking Risks

### 1. Compounding Leverage Risk

**Scenario:**
- User deposits 100 SOL → receives 100 jitoSOL
- Deposits jitoSOL into Kamino → borrows 70 SOL (70% LTV)
- Stakes borrowed 70 SOL → receives 70 jitoSOL
- Repeats cycle: 100 + 70 + 49 + 34... = ~250 jitoSOL exposure with 100 SOL capital (2.5x leverage)

**Risk:**
- SOL price drops 15% → LTV exceeds 80% → liquidation
- Cascade effect: liquidation sells jitoSOL → price pressure → more liquidations
- User loses collateral and stacking gains

**Mitigation:**
- Use conservative LTV (<60%)
- Monitor positions daily
- Set up liquidation alerts (Kamino, MarginFi)
- Avoid recursive leverage beyond 1-2 loops

### 2. LST Depegging Risk

**Causes:**
- Validator slashing (rare on Solana, no slashing implemented yet)
- Smart contract exploit in LST protocol
- Mass exit event: users rush to unstake → liquidity crunch → LST trades below peg

**Historical Examples:**
- **mSOL December 2023**: Briefly depegged to 0.97 SOL during market panic (FTX ripples)
- **stETH (Ethereum)**: Depegged to 0.92 ETH during Terra/Luna collapse (May 2022)

**Solana LST Depegging Risk (2024-2025):**
- Lower risk than Ethereum due to no slashing yet
- Liquidity depth improving: $10.7B TVL means better exit liquidity
- Sanctum Infinity pool reduces fragmentation (easier to swap LSTs without depegging)

**Mitigation:**
- Use battle-tested LSTs (Jito, Marinade) with deep liquidity
- Diversify across multiple LSTs (Sanctum's INF model)
- Maintain exit liquidity: ensure LST→SOL pools on DEXs (Raydium, Orca, Meteora)
- Monitor peg ratio daily (should stay 0.98-1.02 SOL)

### 3. Smart Contract Risk

**LST Protocols as Targets:**
- $10.7B TVL in LSTs makes protocols attractive targets for exploits
- Single smart contract bug could drain billions

**Past Solana Exploits:**
- Wormhole bridge hack: $326M (Feb 2022)
- Mango Markets exploit: $110M (Oct 2022)
- Solana LST protocols: no major hacks to date (as of Feb 2026)

**Mitigation:**
- Only use audited protocols (Jito, Marinade, Sanctum all have multiple audits)
- Diversify LST holdings across protocols
- Monitor protocol health (TVL changes, validator performance, governance activity)
- Use multisig wallets for large positions

### 4. Restaking Slashing Risk (Emerging)

**How Restaking Slashing Works:**
- User restakes jitoSOL to secure external protocol (e.g., oracle network)
- If validator misbehaves on restaking layer (bad data, downtime), user's jitoSOL is slashed
- Slashing penalties: typically 1-10% of restaked amount

**Current Status on Solana:**
- Solana native staking: no slashing implemented yet (planned for future)
- Restaking protocols: slashing not yet live, but coming with Solana restaking expansion

**Mitigation:**
- Only restake with reputable validator sets
- Start with small allocations (10-20% of LSTs)
- Monitor restaking protocol governance and slashing parameters
- Understand maximum slashing risk before opting in

### 5. Liquidity Risk in DeFi Yield Stacking

**Scenario:**
- User deposits jitoSOL into Kamino → borrows USDC → loops back
- User needs to exit quickly (emergency, market crash)
- Unwinding positions takes time: repay USDC loan → wait for borrow confirmation → withdraw jitoSOL → unstake to SOL (2-4 days)

**Risk:**
- Illiquidity during market stress: can't exit fast enough
- Forced liquidation if can't react quickly to price changes

**Mitigation:**
- Maintain 10-20% portfolio in liquid assets (SOL, USDC) for emergencies
- Use instant unstake pools (Sanctum, Marinade) for quick exits (small fee)
- Set stop-loss positions if platform supports (rare on Solana DeFi)

## Real Yield Data (2024-2025)

### LST Performance Comparison

**Base Staking (Native SOL):**
- APY: 6-7%
- Liquidity: Locked, 2-4 day unstake
- DeFi Composability: None

**Marinade (mSOL):**
- APY: 6-7%
- Liquidity: Instant via Mercurial/Sanctum pools (0.1-0.3% fee)
- DeFi Integrations: 100+ protocols (lending, LPs, derivatives)
- TVL: $2.5B

**Jito (jitoSOL):**
- APY: 7-9% (includes 1-2% MEV)
- Liquidity: Instant via Sanctum/Orca pools (0.1-0.3% fee)
- MEV Boost: +$3.6M daily tips distributed to stakers
- TVL: ~$3.7B (35% market share)

**Sanctum (INF):**
- APY: 7-8% (LST yields + trading fees)
- Liquidity: Best-in-class via Infinity pool
- Diversification: Holds basket of LSTs (reduced protocol risk)
- TVL: Growing, challenging Jito/Marinade

### DeFi Yield Stacking Returns (Real Data)

**Kamino Finance (jitoSOL Lending):**
- Supply jitoSOL: 4-6% APY
- Borrow USDC at 3-5% APY
- Farm KMNO incentives: 5-8% APY
- **Net Yield**: 8-12% APY (depending on leverage and incentives)

**Orca Whirlpools (jitoSOL-SOL LP):**
- Base APY from trading fees: 2-4%
- ORCA incentives: 5-10%
- Impermanent loss: minimal (correlated assets)
- **Net Yield**: 10-15% APY

**Meteora DLMM (mSOL-SOL):**
- Dynamic fees: 0.05-0.25% per swap (adjusts with volatility)
- Liquidity mining incentives: 3-5% APY
- **Net Yield**: 8-12% APY

**Restaking (Emerging, Estimated):**
- Picasso/EigenLayer Solana: +1-3% APY on top of LST yield
- **Total Yield**: 10-12% APY (jitoSOL 8% + restaking 2%)

**Realistic Yield Stacking:**
- Conservative (mSOL + Kamino lending, no leverage): 8-10% APY
- Moderate (jitoSOL + Orca LP, moderate leverage): 12-15% APY
- Aggressive (jitoSOL + recursive borrowing + restaking, 2x leverage): 18-25% APY (high risk)

### Institutional LST Adoption

**Corporate Treasury Use:**
- Public companies holding 5.9M SOL (1% of circulating supply)
- Primary motivation: 7-8% staking yield on idle treasury assets
- Preferred LSTs: jitoSOL (MEV boost), mSOL (decentralization)

**Crypto Asset Management Platforms:**
- Offering LST products to institutional clients
- Liquid staking yields (6-8% APY) beat traditional fixed income (2-4% on bonds)
- Growing trend: "staking-as-a-service" for corporate treasuries

## Practical Implementation

### Getting Started with LST Yield Stacking

**Step 1: Choose LST Protocol**
- **Best MEV Yield**: Jito (jitoSOL) → 7-9% APY
- **Best Decentralization**: Marinade (mSOL) → 6-7% APY
- **Best Diversification**: Sanctum (INF) → 7-8% APY

**Step 2: Stake SOL**
- Visit protocol website (jito.network, marinade.finance, sanctum.so)
- Connect wallet (Phantom, Backpack, Solflare)
- Deposit SOL → receive LST (jitoSOL, mSOL, INF)
- Hold LST to earn auto-compounding yield

**Step 3: Deploy LST into DeFi (Optional)**
- **Lending**: Kamino, MarginFi, Solend → supply jitoSOL, earn 8-12% APY
- **Liquidity Pools**: Orca, Meteora, Raydium → provide jitoSOL-SOL LP, earn 10-15% APY
- **Leverage**: Borrow against jitoSOL, reinvest into more LSTs (2-3x leverage possible)

**Step 4: Monitor & Rebalance**
- Check LTV ratios weekly (Kamino dashboard)
- Monitor LST peg ratio (should be 0.98-1.02 SOL)
- Rebalance if positions drift (take profits, reduce leverage)

**Step 5: Exit Strategy**
- **Instant Unstake**: Swap LST→SOL on Sanctum/Orca (0.1-0.3% fee)
- **Delayed Unstake**: Use protocol's unstake function (2-4 days, no fee)
- **Partial Exit**: Sell portion of LST holdings, keep rest staked for yield

## Conclusion

Liquid staking tokens and restaking represent a fundamental shift in Solana staking economics, unlocking $10.7B in previously idle capital for DeFi use while maintaining staking yields of 6-9% APY. Jito's MEV-sharing model (jitoSOL) adds 1-2% annual yield above traditional staking, while Sanctum's LST-of-LSTs approach (INF) provides diversification and unified liquidity. Yield stacking through lending (Kamino) and liquidity provision (Orca, Meteora) can achieve 12-15% APY, but introduces compounding leverage risk and potential liquidations. Real depegging risk remains low on Solana (no slashing yet), with mSOL only briefly dropping to 0.97 SOL during December 2023 market panic. As restaking protocols emerge, users can secure additional networks for +1-3% APY, though slashing risks will increase. The LST market grew 33% YoY (2024-2025), with institutional adoption driven by 7-8% yields beating traditional fixed income, making LSTs a core primitive for Solana DeFi infrastructure.

## Key Takeaways

- **LST Market**: $10.7B TVL, 13.3% of staked SOL is liquid (57M SOL), 33% YoY growth
- **Top Protocols**: Marinade (mSOL, 42% share, 6-7% APY), Jito (jitoSOL, 35% share, 7-9% APY with MEV), Sanctum (INF, 7-8% APY)
- **MEV Sharing**: Jito distributes 94% of MEV tips (~$3.6M daily in 2025), adding 1-2% APY above base staking
- **Yield Stacking**: Base 7% (jitoSOL) + 4-6% (lending) + 1-3% (restaking) = 12-15% APY typical
- **Validator Economics**: 4.839% Solana inflation (2024), MEV adds 13-15% to validator rewards during peaks
- **Depegging Risk**: Low on Solana (no slashing), mSOL briefly 0.97 SOL (Dec 2023), deepening liquidity reduces risk
- **Leverage Risk**: Recursive borrowing can achieve 2.5x exposure but risks liquidation if SOL drops 15%+
- **Institutional Adoption**: 5.9M SOL (1% supply) held by corporate treasuries for 7-8% staking yields
- **Implementation**: Stake SOL → receive LST → deploy into Kamino/Orca → earn 12-15% APY, monitor LTV weekly
