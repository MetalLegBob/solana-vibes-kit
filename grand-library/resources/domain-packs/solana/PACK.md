---
pack: solana
version: "2.1.0"
description: >
  Comprehensive Solana domain pack for Grand Library. 85 knowledge files across
  18 categories covering the full builder journey — architecture, DeFi, transactions,
  dev workflow, infrastructure, frontend, NFTs, tokenomics, governance, cross-chain,
  data, compliance, RWA, social, optimization, and emerging patterns.
  5 topic trees for interview extensions.
domains:
  - solana
  - anchor
  - spl
  - token-2022
signals:
  - "Cargo.toml with anchor-lang"
  - "Cargo.toml with solana-program"
  - "Anchor.toml present"
  - "programs/ directory with Solana program structure"
  - "User mentions Solana, Anchor, or SPL"
---

# Solana Domain Pack

**85 knowledge files** | **5 topic trees** | **18 categories** | **Avg confidence: 8.2/10**

## Coverage

### Architecture Decisions (10 files)

| Topic | Knowledge File | Confidence |
|-------|---------------|-----------|
| Framework choice | anchor-vs-native.md | 8/10 |
| Fee collection | transfer-hooks-vs-cpi-tax.md | 7/10 |
| AMM design | bonding-curve-variants.md | 8/10 |
| Token Extensions | token-extensions-compatibility.md | 7/10 |
| Automation | clockwork-vs-automation.md | 6/10 |
| Oracles | oracle-comparison.md | 8/10 |
| PDA patterns | pda-design-patterns.md | 8/10 |
| Security | program-security-lessons.md | 9/10 |
| State compression | state-compression-tradeoffs.md | 7/10 |
| Upgradeability | program-upgrade-strategies.md | 8/10 |

### DeFi Building Blocks (10 files)

| Topic | Knowledge File | Confidence |
|-------|---------------|-----------|
| Lending protocols | lending-protocol-design.md | 8/10 |
| Perpetuals DEX | perpetuals-architecture.md | 8/10 |
| Liquidation engines | liquidation-engine-design.md | 8/10 |
| Staking rewards | staking-reward-math.md | 9/10 |
| Escrow patterns | escrow-patterns.md | 8/10 |
| Flash loans | flash-loan-patterns.md | 8/10 |
| Order books | order-book-design.md | 8/10 |
| Yield aggregation | yield-aggregation.md | 9/10 |
| Token vaults | vault-patterns.md | 8/10 |
| MEV protection | mev-protection.md | 8/10 |

### Transaction Engineering (5 files)

| Topic | Knowledge File | Confidence |
|-------|---------------|-----------|
| Compute optimization | compute-unit-optimization.md | 9/10 |
| Priority fees & Jito | priority-fees-and-jito.md | 9/10 |
| Versioned txns & ALTs | versioned-transactions-alts.md | 9/10 |
| Tx confirmation | transaction-confirmation.md | 9/10 |
| Tx simulation | transaction-simulation.md | 9/10 |

### Developer Workflow (5 files)

| Topic | Knowledge File | Confidence |
|-------|---------------|-----------|
| Testing strategies | testing-strategies.md | 9/10 |
| Debugging programs | debugging-solana-programs.md | 9/10 |
| Error handling | error-handling-patterns.md | 9/10 |
| Logging & events | logging-and-events.md | 9/10 |
| Local dev setup | local-development-setup.md | 9/10 |

### Infrastructure (5 files)

| Topic | Knowledge File | Confidence |
|-------|---------------|-----------|
| RPC providers | rpc-provider-comparison.md | 8/10 |
| Indexing strategies | indexing-strategies.md | 9/10 |
| Geyser plugins | geyser-plugin-patterns.md | 8/10 |
| Monitoring & alerting | monitoring-alerting.md | 8/10 |
| WebSocket patterns | websocket-patterns.md | 8/10 |

### Frontend & Client (6 files)

| Topic | Knowledge File | Confidence |
|-------|---------------|-----------|
| web3.js v1 vs v2 | web3js-v2-migration.md | 8/10 |
| Wallet integration | wallet-adapter-patterns.md | 9/10 |
| Transaction UX | transaction-ux.md | 8/10 |
| Next.js + Solana | nextjs-solana-patterns.md | 8/10 |
| Real-time updates | real-time-updates.md | 8/10 |
| Mobile dApps | mobile-dapp-patterns.md | 8/10 |

### NFT & Digital Assets (5 files)

| Topic | Knowledge File | Confidence |
|-------|---------------|-----------|
| NFT standards | nft-standard-comparison.md | 9/10 |
| On-chain randomness | on-chain-randomness.md | 8/10 |
| Dynamic NFTs | dynamic-nft-patterns.md | 8/10 |
| Royalty enforcement | royalty-enforcement.md | 9/10 |
| Gaming on Solana | gaming-on-solana.md | 8/10 |

### Economic Design (4 files)

| Topic | Knowledge File | Confidence |
|-------|---------------|-----------|
| Tokenomics modeling | tokenomics-modeling.md | 8/10 |
| Protocol fees | fee-optimization.md | 8/10 |
| Incentive design | incentive-mechanism-design.md | 8/10 |
| Anti-manipulation | anti-manipulation-patterns.md | 8/10 |

### Governance & Operations (3 files)

| Topic | Knowledge File | Confidence |
|-------|---------------|-----------|
| Multisig governance | multisig-governance-patterns.md | 8/10 |
| DAO tooling | dao-tooling-comparison.md | 8/10 |
| Incident response | incident-response-playbook.md | 7/10 |

### Cross-chain (3 files)

| Topic | Knowledge File | Confidence |
|-------|---------------|-----------|
| Bridge integration | bridge-integration-patterns.md | 8/10 |
| Cross-chain messaging | cross-chain-messaging.md | 8/10 |
| Multi-chain tokens | multi-chain-token-design.md | 8/10 |

### Data & Analytics (3 files)

| Topic | Knowledge File | Confidence |
|-------|---------------|-----------|
| Data pipelines | on-chain-data-pipelines.md | 8/10 |
| Helius DAS & webhooks | helius-webhooks-das.md | 8/10 |
| Transaction parsing | transaction-parsing.md | 8/10 |

### Emerging (3 files)

| Topic | Knowledge File | Confidence |
|-------|---------------|-----------|
| Blinks & Actions | blinks-and-actions.md | 8/10 |
| AI agents | ai-agents-solana.md | 8/10 |
| Solana Pay | solana-pay-integration.md | 9/10 |

### Tokenomics Deep Dives (6 files)

| Topic | Knowledge File | Confidence |
|-------|---------------|-----------|
| veToken models | ve-token-models.md | 8/10 |
| Dual-token economics | dual-token-economics.md | 8/10 |
| Fair launch patterns | fair-launch-patterns.md | 8/10 |
| Protocol-owned liquidity | protocol-owned-liquidity.md | 8/10 |
| Token distribution | token-distribution-strategies.md | 8/10 |
| Restaking economics | restaking-economics.md | 8/10 |

### Advanced Solana Patterns (4 files)

| Topic | Knowledge File | Confidence |
|-------|---------------|-----------|
| Clock & slot patterns | clock-and-slot-patterns.md | 8/10 |
| Rent optimization | rent-optimization.md | 8/10 |
| Program composability | program-composability.md | 8/10 |
| Parallel tx design | parallel-transaction-design.md | 8/10 |

### Compliance & Legal (3 files)

| Topic | Knowledge File | Confidence |
|-------|---------------|-----------|
| Token compliance | token-compliance-patterns.md | 8/10 |
| Geo-blocking | geo-blocking-patterns.md | 7/10 |
| Privacy patterns | privacy-patterns.md | 8/10 |

### Real-World Assets (2 files)

| Topic | Knowledge File | Confidence |
|-------|---------------|-----------|
| RWA tokenization | rwa-tokenization.md | 8/10 |
| Permissioned tokens | permissioned-token-patterns.md | 8/10 |

### Social & Identity (2 files)

| Topic | Knowledge File | Confidence |
|-------|---------------|-----------|
| Social protocols | social-protocols.md | 8/10 |
| Reputation & soulbound | reputation-soulbound.md | 8/10 |

### Developer Tooling & Optimization (6 files)

| Topic | Knowledge File | Confidence |
|-------|---------------|-----------|
| Advanced Anchor | anchor-advanced-patterns.md | 8/10 |
| IDL & client generation | idl-client-generation.md | 8/10 |
| Binary size optimization | program-size-optimization.md | 8/10 |
| Instruction design | instruction-design-patterns.md | 8/10 |
| Memory & stack | memory-and-stack-optimization.md | 8/10 |
| Serialization | serialization-optimization.md | 8/10 |

## Topic Trees

| Topic Tree | Extends | Scope |
|-----------|---------|-------|
| token-model.md | On-Chain, Data Model | Token standard, supply, authority, extensions, distribution |
| amm-design.md | On-Chain, External Integrations | Curve math, fees, LP mechanics, oracle integration |
| cpi-architecture.md | On-Chain, Security | Trust boundaries, PDA signing, re-entrancy, validation |
| account-structure.md | On-Chain, Data Model | PDA derivation, sizing, serialization, lifecycle |
| deployment.md | Architecture, Backend, On-Chain | Deploy pipeline, upgrades, IDL, verification, monitoring |

## Doc Catalog Extensions

Domain-specific document types this pack adds:

| Doc ID | Title | Wave | Description |
|--------|-------|------|-------------|
| program-spec-{name} | Program Specification | 2 | Per on-chain program — instructions, accounts, constraints |
| account-layout | Account Layout Reference | 2 | All accounts, their fields, sizes, derivation |
| cpi-interface | CPI Interface Contract | 2 | Cross-program call interfaces and security |
| token-economics | Token Economics Model | 2 | Supply, distribution, mechanics, incentives |
| deployment-sequence | On-Chain Deployment Sequence | 3 | Program deployment, upgrade, and verification steps |

## Not Covered

Topics this pack does NOT cover (fall through to Tier 2 live research):

- Specific DeFi protocol internal implementations (Jupiter routing algo, Raydium fee math)
- Solana validator operation and economics
- SVM chain forks (Eclipse, Sonic, etc.) — architecture differences
- Solana governance proposals (SIMD) tracking
