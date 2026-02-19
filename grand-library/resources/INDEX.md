---
skill: grand-library
type: resource-index
version: "1.3.0"
---

# Grand Library Resources

## Files

| File | Purpose | When to Load |
|------|---------|--------------|
| topic-tree.md | General-purpose interview topic tree | Phase 0 (to plan interview), Phase 1 (to drive interview) |
| doc-catalog.md | Master list of document types GL can produce | Phase 0 (to build DOC_MANIFEST) |
| project-brief-template.md | Template for PROJECT_BRIEF.md | Phase 0 (greenfield mode) |
| decision-template.md | Template for DECISIONS/*.md files | Phase 1 (after each topic) |

## Templates

| File | Purpose | When to Load |
|------|---------|--------------|
| templates/project-overview.md | Wave 1 doc template | Phase 2 (doc generation) |
| templates/architecture.md | Wave 1 doc template | Phase 2 (doc generation) |
| templates/data-model.md | Wave 1 doc template | Phase 2 (doc generation) |
| templates/feature-spec.md | Wave 2 doc template | Phase 2 (doc generation) |
| templates/api-reference.md | Wave 2 doc template | Phase 2 (doc generation) |
| templates/frontend-spec.md | Wave 2 doc template | Phase 2 (doc generation) |
| templates/deployment-sequence.md | Wave 3 doc template | Phase 2 (doc generation) |
| templates/security-model.md | Wave 3 doc template | Phase 2 (doc generation) |
| templates/error-handling-playbook.md | Wave 3 doc template | Phase 2 (doc generation) |
| templates/test-plan.md | Wave 3 doc template | Phase 2 (doc generation) |

## Domain Packs

| Pack | Directory | Knowledge Files | Topic Trees | Avg Confidence |
|------|-----------|----------------|-------------|----------------|
| Solana | domain-packs/solana/ | 85 | 5 | 8.2/10 |

Domain packs extend the topic tree with domain-specific branches and provide
pre-researched knowledge files. See design doc for domain pack architecture.

### Solana Pack (v1.0.0)

**Activates when:** `Cargo.toml` contains `anchor-lang` or `solana-program`, `Anchor.toml` present, or user mentions Solana/Anchor.

**18 categories, 85 knowledge files:**
- Architecture Decisions (10): anchor-vs-native, transfer-hooks, bonding-curves, token-extensions, automation, oracles, PDA patterns, security, state-compression, upgrades
- DeFi Building Blocks (10): lending, perpetuals, liquidation, staking, escrow, flash-loans, order-books, yield, vaults, MEV
- Transaction Engineering (5): compute optimization, priority fees, versioned txns, confirmation, simulation
- Developer Workflow (5): testing, debugging, error handling, logging, local dev
- Infrastructure (5): RPC providers, indexing, Geyser, monitoring, WebSockets
- Frontend & Client (6): web3.js v2, wallet adapter, transaction UX, Next.js, real-time, mobile
- NFT & Digital Assets (5): standards, randomness, dynamic NFTs, royalties, gaming
- Economic Design (4): tokenomics, fees, incentives, anti-manipulation
- Governance & Operations (3): multisig, DAO tooling, incident response
- Cross-chain (3): bridges, messaging, multi-chain tokens
- Data & Analytics (3): pipelines, Helius DAS, transaction parsing
- Emerging (3): Blinks/Actions, AI agents, Solana Pay
- Tokenomics Deep Dives (6): veToken, dual-token, fair launch, POL, distribution, restaking
- Advanced Solana Patterns (4): clock/slot, rent optimization, composability, parallel txns
- Compliance & Legal (3): token compliance, geo-blocking, privacy
- Real-World Assets (2): RWA tokenization, permissioned tokens
- Social & Identity (2): social protocols, reputation/soulbound
- Developer Tooling & Optimization (6): advanced Anchor, IDL/codegen, binary size, instruction design, memory/stack, serialization

**Topic trees:** token-model, amm-design, cpi-architecture, account-structure, deployment
