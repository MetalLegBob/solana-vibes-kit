---
pack: solana
type: topic-tree-extension
extends: "Tech Stack > On-Chain / Smart Contracts, Data Model > Core Entities"
---

# Token Model & Economics

## Extension Point
Extends:
- Tech Stack > On-Chain / Smart Contracts > [DOMAIN_PACK] full on-chain architecture tree
- Data Model > Core Entities > [DOMAIN_PACK] domain-specific data structures

## Tree

```
Token Model & Economics
├── Token Standard Selection
│   ├── Are you using SPL Token (classic) or Token-2022?
│   │   ├── If Token-2022: Which extensions are you using?
│   │   │   ├── Transfer fees (protocol revenue capture)?
│   │   │   ├── Transfer hooks (custom validation logic)?
│   │   │   ├── Confidential transfers (privacy layer)?
│   │   │   ├── Permanent delegate (recovery mechanism)?
│   │   │   ├── Interest-bearing (yield accrual)?
│   │   │   ├── Non-transferable (soulbound)?
│   │   │   ├── Metadata pointer (on-chain metadata)?
│   │   │   └── Default account state (frozen by default)?
│   │   └── If classic SPL: Why not Token-2022? (ecosystem compatibility, simplicity, etc.)
│   └── Are you using multiple token types? (governance, utility, LP receipt, etc.)
├── Supply Model & Economics
│   ├── What is the total supply model?
│   │   ├── Fixed supply (hard cap)?
│   │   ├── Inflationary (continuous minting)?
│   │   │   └── What is the inflation schedule? (linear, exponential decay, epochs)
│   │   ├── Deflationary (burning mechanisms)?
│   │   │   └── What triggers burns? (transaction fees, buyback, game mechanics)
│   │   └── Elastic (rebasing based on oracle price)?
│   ├── What is the initial supply distribution?
│   │   ├── Public sale allocation (IDO, LBP, bonding curve)?
│   │   ├── Team & investors allocation (vesting terms)?
│   │   ├── Treasury reserves (governance-controlled)?
│   │   ├── Liquidity mining / rewards pool?
│   │   └── Community airdrop (snapshot criteria)?
│   └── Is there a token generation event (TGE) or gradual unlock?
├── Mint Authority & Control
│   ├── Who controls the mint authority?
│   │   ├── Single keypair (temporary for testing)?
│   │   ├── Multisig (team consensus)?
│   │   │   └── What is the threshold? (m-of-n via Squads, Realm, custom)
│   │   ├── Program-controlled (algorithmic minting)?
│   │   │   └── What are the minting rules? (collateral ratio, time-based, governance)
│   │   └── No mint authority (supply locked forever)?
│   ├── Is there a freeze authority?
│   │   ├── If yes: Under what conditions would accounts be frozen?
│   │   └── If no: Why was it removed? (decentralization commitment)
│   └── Can mint/freeze authorities be revoked or transferred?
├── Token Distribution Mechanics
│   ├── How are tokens initially distributed?
│   │   ├── Direct airdrop (requires user interaction)?
│   │   ├── Claim interface (lazy distribution)?
│   │   │   └── What is the claim deadline? (time-bound or indefinite)
│   │   ├── Bonding curve launch (automated price discovery)?
│   │   │   └── Which curve implementation? (Pump.fun, Meteora DLMM, custom)
│   │   └── Centralized exchange listing (off-chain distribution)?
│   ├── Is there a vesting schedule for locked tokens?
│   │   ├── Linear vesting (monthly, daily unlock)?
│   │   ├── Cliff + vesting (initial lock period)?
│   │   ├── Milestone-based (performance triggers)?
│   │   └── How is vesting enforced? (program escrow, time-lock, off-chain)
│   └── Are there token lockup mechanisms?
│       ├── Staking lockup (earn yield, lose liquidity)?
│       ├── Governance lockup (vote weight vs liquidity)?
│       └── Loyalty lockup (bonus multipliers for duration)?
└── Token Account Management
    ├── Do you use Associated Token Accounts (ATA) everywhere?
    │   └── Or do you have custom token account derivation?
    ├── Do you support token wrapping or bridging?
    │   ├── Wormhole (cross-chain)?
    │   ├── Portal Bridge?
    │   └── Custom wrap/unwrap program?
    ├── How do you handle rent for token accounts?
    │   ├── User pays rent on their own ATAs?
    │   ├── Protocol pre-funds ATAs (better UX)?
    │   └── Token account reaper (close abandoned accounts)?
    └── Do you implement token account delegation?
        └── For what purpose? (DeFi automation, game actions, subscriptions)
```

## Pruning Rules

| User Says | Skip |
|-----------|------|
| "No token involved" / "NFT-only project" | Entire tree |
| "Using standard SPL Token" | Token-2022 extensions branch |
| "Fixed supply, no minting after TGE" | Mint authority control (except for documenting it's removed) |
| "Simple airdrop, no vesting" | Vesting schedule branches |
| "Standard ATA only" | Token account management complexity |

## Creative Doc Triggers

| Signal | Suggest |
|--------|---------|
| Token-2022 with transfer hooks | Create "Transfer Hook Integration Guide" showing hook logic and CPI patterns |
| Complex vesting schedule (cliff, milestones) | Create "Vesting Schedule Diagram" with timeline visualization |
| Multiple token types (governance + utility) | Create "Token Taxonomy Table" showing each token's purpose and mechanics |
| Elastic supply or rebasing | Create "Rebase Mechanism Explainer" with math and edge cases |
| Program-controlled minting with collateral | Create "Minting Rules & Constraints" document with formula and security bounds |
| Bonding curve launch | Create "Price Discovery Curve" chart showing initial AMM parameters |
