---
pack: solana
type: topic-tree-extension
extends: "Tech Stack > On-Chain / Smart Contracts, External Integrations"
---

# AMM & Liquidity Pool Design

## Extension Point
Extends:
- Tech Stack > On-Chain / Smart Contracts > [DOMAIN_PACK] full on-chain architecture tree
- External Integrations > [DOMAIN_PACK] domain-specific integrations (oracles, bridges, etc.)

## Tree

```
AMM & Liquidity Pool Design
├── Curve Type & Pricing Model
│   ├── What pricing curve are you using?
│   │   ├── Constant Product (x * y = k, like Uniswap V2/Raydium)?
│   │   │   └── Is there concentrated liquidity (CLMM, like Uniswap V3/Orca Whirlpools)?
│   │   │       ├── How are price ranges determined? (user-defined, preset bins)
│   │   │       └── What tick spacing? (affects precision and gas)
│   │   ├── Stable Swap (low-slippage for like-kind assets, like Curve)?
│   │   │   └── What amplification coefficient (A)? (higher = more stable, lower = safer)
│   │   ├── Weighted Pool (constant mean, like Balancer)?
│   │   │   └── What are the asset weights? (50/50, 80/20, custom)
│   │   ├── Custom curve (specialized for specific asset behavior)?
│   │   │   └── Describe the curve function and rationale
│   │   └── Dynamic curve (adjusts based on conditions)?
│   │       └── What triggers curve parameter changes? (oracle price, utilization, time)
│   ├── Is the AMM a fork of existing protocol?
│   │   ├── If yes: Which protocol? (Orca, Raydium, Meteora, Lifinity)
│   │   └── What modifications did you make?
│   └── Do you support multiple pool types in one protocol?
│       └── How do users choose which pool type to create?
├── Fee Structure
│   ├── What is the swap fee model?
│   │   ├── Flat fee (e.g., 0.3% on all trades)?
│   │   ├── Tiered fees (different percentages for different pools)?
│   │   │   └── What determines the tier? (asset type, pool size, governance)
│   │   ├── Dynamic fees (adjust based on volatility or volume)?
│   │   │   └── What is the adjustment mechanism? (oracle-based, utilization curve)
│   │   └── Zero fees (revenue from elsewhere)?
│   ├── How are fees distributed?
│   │   ├── 100% to LPs (standard)?
│   │   ├── LP share + protocol treasury split?
│   │   │   └── What is the split ratio? (e.g., 83% LP / 17% protocol)
│   │   ├── LP + protocol + token buyback?
│   │   └── LP + stakers + governance?
│   ├── Are there withdrawal/deposit fees?
│   │   └── If yes: What is the purpose? (prevent JIT attacks, subsidize gas)
│   └── Do you charge flash loan fees?
│       └── What percentage? (typical: 0.05-0.1%)
├── LP Token & Position Mechanics
│   ├── How are LP positions represented?
│   │   ├── Fungible LP tokens (like Uniswap V2)?
│   │   │   └── What is the LP token mint authority? (pool program, no authority)
│   │   ├── NFT positions (like Uniswap V3 / Orca Whirlpools)?
│   │   │   └── How is position metadata stored? (on-chain, Metaplex, program account)
│   │   └── Account-based (no token, just program state)?
│   ├── Can LP tokens be staked for additional rewards?
│   │   ├── If yes: Single-sided staking or must be in pool?
│   │   └── What rewards are distributed? (protocol token, trading fees, partner tokens)
│   ├── Is there impermanent loss protection?
│   │   ├── If yes: How is it funded? (protocol reserves, insurance pool)
│   │   └── What is the coverage threshold? (after X days, up to Y%)
│   └── Can LPs lock liquidity for boosted rewards?
│       └── What lock periods are supported? (1 week, 1 month, 1 year)
├── Pool Creation & Configuration
│   ├── Who can create pools?
│   │   ├── Permissionless (anyone can create any pair)?
│   │   ├── Whitelisted tokens only?
│   │   │   └── Who maintains the whitelist? (governance, team, oracle)
│   │   └── Requires governance approval?
│   ├── What parameters can be customized per pool?
│   │   ├── Fee tier selection?
│   │   ├── Curve parameters (A, weights)?
│   │   ├── Oracle configuration?
│   │   └── Access controls (private pools, KYC gates)?
│   ├── What is the minimum initial liquidity requirement?
│   │   └── How is it enforced? (locked LP tokens, minimum deposit)
│   └── Are there pool lifecycle states?
│       └── What are they? (e.g., bootstrapping, active, paused, deprecated)
├── Price Oracle Integration
│   ├── Does the pool provide price oracle data?
│   │   ├── If yes: What type of oracle?
│   │   │   ├── Time-Weighted Average Price (TWAP)?
│   │   │   │   └── What observation window? (30 min, 1 hour, 24 hours)
│   │   │   ├── Exponential Moving Average (EMA)?
│   │   │   └── Median price over N trades?
│   │   └── How do other programs consume the oracle? (CPI query, account read)
│   ├── Does the pool consume external oracle data?
│   │   ├── If yes: Which oracle(s)? (Pyth, Switchboard, Chainlink)
│   │   ├── For what purpose? (peg stability, dynamic fees, circuit breakers)
│   │   └── What happens if oracle is stale or unavailable?
│   └── Are there price manipulation protections?
│       ├── Max price impact per trade?
│       ├── TWAP deviation limits?
│       └── Multi-block TWAP (harder to manipulate)?
├── Composability & CPI Interface
│   ├── What CPI instructions do you expose?
│   │   ├── Swap (exact-in vs exact-out)?
│   │   ├── Add liquidity (single-sided vs dual)?
│   │   ├── Remove liquidity (balanced vs single-asset)?
│   │   ├── Flash loan (borrow + callback + repay)?
│   │   └── Quote/simulate (read-only price query)?
│   ├── Can your pool be used as a routing hop?
│   │   ├── If yes: Do you integrate with Jupiter, Lifinity Router, etc.?
│   │   └── What is the CPI depth limit? (e.g., max 3 hops to prevent stack overflow)
│   ├── Do you support flash loans?
│   │   ├── Max flash loan size (% of pool reserves)?
│   │   ├── What is the callback mechanism? (CPI to borrower program)
│   │   └── How do you prevent re-entrancy? (reentrancy guard, one-per-tx limit)
│   └── Are there access controls on CPI calls?
│       └── Can any program call, or only whitelisted programs?
└── Monitoring & Circuit Breakers
    ├── Are there emergency pause mechanisms?
    │   └── Who can trigger a pause? (multisig, guardian, oracle-based)
    ├── What metrics trigger circuit breakers?
    │   ├── Price deviation beyond X% from oracle?
    │   ├── Volume surge (flash crash protection)?
    │   ├── Liquidity drain (rapid withdrawal)?
    │   └── Oracle staleness or failure?
    └── How do you handle pool migrations or deprecation?
        └── Can LPs withdraw without trading fees during migration?
```

## Pruning Rules

| User Says | Skip |
|-----------|------|
| "Not building an AMM/DEX" | Entire tree |
| "Forking Raydium/Orca without changes" | Detailed curve and fee customization |
| "Simple constant product, no concentrated liquidity" | CLMM branches |
| "No flash loans" | Flash loan branches |
| "Permissionless, no whitelist" | Pool approval and whitelist branches |
| "No oracle integration" | Oracle sections |

## Creative Doc Triggers

| Signal | Suggest |
|--------|---------|
| Custom curve function | Create "Curve Function Specification" with formula, graph, and edge case analysis |
| Concentrated liquidity (CLMM) | Create "Liquidity Range Strategy Guide" showing optimal range selection |
| Complex fee distribution (LP + protocol + buyback) | Create "Fee Flow Diagram" showing how fees are split and routed |
| Flash loan support | Create "Flash Loan Integration Example" with borrower program template |
| Dynamic fees based on volatility | Create "Dynamic Fee Adjustment Logic" with pseudocode and thresholds |
| Oracle-based circuit breakers | Create "Circuit Breaker Rules Table" with trigger conditions and responses |
| Multiple pool types | Create "Pool Type Comparison Matrix" showing when to use each type |
