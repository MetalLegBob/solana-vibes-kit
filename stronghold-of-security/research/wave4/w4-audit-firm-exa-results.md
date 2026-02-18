# Wave 4: Audit Report Mining — Exa Search Results

**Date:** 2026-02-06
**Sources:** OtterSec, Neodyme, Zellic, Halborn, Sec3/Soteria, Trail of Bits
**Method:** Exa MCP deep searches from main thread

---

## OtterSec

### Blog Posts (Solana-specific)
- **"Solana: The hidden dangers of lamport transfers"** (May 14, 2025)
- **"Solana Multisig Security"** (Feb 22, 2025)
- **"Solana: Jumping Around in the VM"** (Dec 11, 2023) — VM-level security
- **"Solana Formal Verification: A Case Study"** (Jan 26, 2023)
- **"Rust, Realloc, and References"** (Dec 9, 2022) — subtle Solana SDK bug
- **"Reverse Engineering Solana with Binary Ninja"** (Aug 27, 2022)
- **"The Story of the Curious Rent Thief"** (Aug 19, 2022) — rent exploitation
- **"Becoming a Millionaire, 0.000150 BTC at a Time"** (Apr 26, 2022)

### Public Audit Reports
- **Hylo** (May 2025): 7 findings including **2 Critical**
  - OS-HYL-ADV-00 (Critical): **Collateral Ratio Manipulation** — missing validation in `LstRegistry::load` allowed attacker to omit or duplicate LST blocks, artificially altering collateral ratio
  - Second critical not detailed in search results
- **Solana Stake Pool** (Jan 2023): OtterSec audit for Anza
- **Olympus DAO OFT** (Mar 2023): 1 High (Invalid Message Replay Design — failed messages can't be replayed, locking tokens)

### Tools
- **Solana Verified Programs API** — verification service for deployed Solana programs
- **otter-verify** — on-chain verification program
- **Sampled Public Reports** available on Notion (link found but content not extracted)

---

## Neodyme

### Blog Posts (Solana-specific)
- **"Riverguard: Mutation Rules for Finding Vulnerabilities"** (May 28, 2025) — [Solana] tagged
- **"Solana Consensus - From Forks to Finality"** (Dec 16, 2024) — consensus mechanism deep-dive
- **"SPL Token-2022: Don't shoot yourself in the foot with extensions"** (Sep 10, 2024) — Token extensions security
- **"Solana Smart Contracts: Common Pitfalls and How to Avoid Them"** (Aug 20, 2021) — foundational
  - 5 most common: missing ownership check, missing signer check, integer overflow/underflow, arbitrary CPI, missing initialization check
- **"Why Auditing the Code is Not Enough: Solana Upgrade Authorities"** (Jun 20, 2022)
  - Hot wallet, multisig, DAO — tradeoffs for upgrade authority management

### Public Audit Reports (Solana)
- **Firedancer v0.1** (Jul 2024): **2 high-severity** findings
  - One could allow attacker to **remotely crash Firedancer**
  - Most findings: DoS issues and behavioral mismatches with Agave validator
  - Generally well-designed with strong sandboxing
- Many others listed on reports page (Aug 2021 — Jan 2026):
  - Neon EVM, Marinade, Drift Protocol, and more
  - SHA256 hashes provided but findings not summarized

### Tools & Resources
- **Riverguard** — free automated vulnerability scanner for deployed Solana programs (mutation-based testing)
  - Supported by Solana Foundation
  - Simulates mutated transactions to find vulnerabilities
  - Findings reported to developers, not executed
- **solana-poc-framework** — framework for creating PoCs for Solana exploits
- **solana-ctf** — collection of CTF challenges
- **solana-security-txt** — standard for embedding security contact info in on-chain programs
- **Solana Security Workshop** — teaches exploitation from attacker's perspective

---

## Zellic

### Public Audit Reports (Solana)
- **p-token** (Anza, Oct 2025) — Solana
- **BPF Stake Program** (Anza, Mar 2025) — Solana
- **Pinocchio and p-token** (Anza, Jun 2025) — Solana
- **Claim and Rewards Programs** (Audius, Nov 2025) — Solana VM
- **Drift Protocol** (Jan 2025) — Solana
- **Chainflip Solana** (Aug 2024) — Solana
- **LayerZero Solana Endpoint** (Jul 2024) — Solana
- **Solana Single Pool** (Jan 2024) — Solana
- **SPL Token 2022** (Jul 2023) — Solana — **2 Critical, 1 High**
  - Critical issues in **extensions** themselves
  - Focused on protocol-breaking bugs, account serialization, mint accounting
- **Cega Vault** (Mar 2023) — Solana
- **N1 Bridge** (Apr 2025) — Solana
- **Audius Solana Programs** (Nov 2022) — Solana
- **Pyth Oracle** (Apr 2022), **Pyth Governance** (May 2022), **Pyth2Wormhole** (Apr 2022) — Solana

### Detailed Findings
- **Cytonic Network** (Jul 2024): 7 findings (0 Critical, 0 High, 1 Medium, 3 Low, 3 Info)
  - Medium: **DOS in claim/migrate due to unenforced ATA usage** — if users deposit to non-ATA accounts, migrate function breaks
- **SPL Token 2022** (Dec 2022): 2 Critical, 1 High, 3 Low, 1 Info
  - Critical issues were in the **extensions**, not the core token logic
  - Migration to support both legacy and extensible accounts was "relatively robust"

### Tools
- **SOLP** — stand-alone Solidity analysis library (EVM-focused, not directly Solana)
- **Publications repo** on GitHub with all audit PDFs

---

## Halborn

### Hack Analyses (Solana-related)
- **Loopscale Hack** (Apr 2025) — $5.8M oracle attack, RateX PT token mispricing
- **MetaWin Hack** (Nov 2024) — $4M frictionless withdrawal system exploit
- **Texture Finance Hack** (Jul 2025) — $2.2M weak access control in rebalance
- **DogWifTools Hack** (Jan 2025) — $10M supply chain RAT
- **CrediX Hack** (Aug 2025) — $4.5M admin compromise on Sonic
- Monthly hack round-ups with Solana incidents highlighted

### Public Audit Reports (Solana)
- **Blockstreet Solana Launchpad** (Aug-Sep 2025): **2 Critical, 2 High, 1 Medium, 4 Info**
  - Critical: Platform fees excluded from pool accounting calculations
  - Critical: (details not extracted)
- **Vaultka Solana Programs** (Jul-Aug 2024): **1 Critical, 1 High, 2 Medium, 3 Low, 2 Info**
  - Critical: **Withdraw fee transferred to user instead of fee vault** — fee routing error
  - High: **Inefficient slippage control**
  - Medium: Incorrect accounts mutability, incorrect token price conversion
- **ETH Liquid ETF Restaking Solana** (Aug 2024): 3 Informational only
- **deBridge Solana Contracts** — audit listed, details not extracted

### Ecosystem Engagement
- **Case Study: Solana Blockchain Ecosystem** — security partnership with Solana Foundation, Solana Labs, Anza
  - L1 security assessment of Solana validator and SPL programs since v1.9 (early 2022)
  - Incremental code review of validator updates before mainnet release
  - **40+ ecosystem project audits** (DeFi, infrastructure, P2E games)

---

## Sec3 (formerly Soteria)

### Tools
- **X-ray Security Scanner**: Detects **50+ vulnerability types** in Solana smart contracts
  - SVE (Solana Vulnerabilities and Exposures) classification system
  - GitHub CI integration, SARIF output
  - Free plan for Solana ecosystem
  - Works for both Anchor and non-Anchor programs
- **WatchTower** (Sep 2022): Real-time threat monitoring for Solana smart contracts
  - Detects, prevents, and stops security attacks in real-time
- **IDL Guesser** (Apr 2025): Recovers instruction definitions from closed-source Solana program binaries
  - Useful for auditing programs without source code

### Research & Blog
- Security caveats articles
- Common vulnerabilities in recent hacks (through Sep 2022)
- "Why Solana might be more secure from a smart contract perspective" (Jun 2022)

### SVE Categories (vulnerability types scanned)
- MissingSignerCheck
- MissingOwnerCheck
- IntegerAdd/Sub/Mul/Div overflow
- Arbitrary CPI
- Account confusion
- And 45+ more

---

## Trail of Bits

### Public Audit Reports (Solana)
- **Solang** (Solana compiler/toolchain) — audit report in solana-labs/security-audits repo
- **Squads Protocol v4** (Sep 2023) — multisig infrastructure on Solana
  - Focused on: approval requirements, fund withdrawal restrictions, multisig bricking, front-running
  - Static and dynamic testing, documentation review, manual code review
  - Fixes implemented and re-examined

### Publications
- **GitHub publications repo** has a dedicated **Solana** section under Blockchain Reviews
- **246 Findings from Smart Contract Audits** (2019) — foundational analysis:
  - Most common: **data validation flaws** (36%), **access control** (10%)
  - Reentrancy only 4 of 246 findings
  - **78% of high-severity flaws** potentially detectable by automated tools
- Supports Solana/Rust/Sealevel audits

### Ecosystem
- Reviewed as "Engineer's Choice" for audit quality
- Strong in formal verification, static analysis (Slither/Echidna for EVM, adapting for Solana)

---

## Key Findings to Extract for KB Updates

### Unique Vulnerability Patterns from Audits

1. **Collateral Ratio Manipulation via LST Registry** (OtterSec/Hylo) — Missing validation allows omitting/duplicating LST blocks to alter collateral ratio
2. **DOS via Unenforced ATA Usage** (Zellic/Cytonic) — Non-ATA deposits break migrate function
3. **Invalid Message Replay** (OtterSec/Olympus) — Failed cross-chain messages can't be replayed, locking tokens
4. **Withdraw Fee Routing Error** (Halborn/Vaultka) — Fee sent to user instead of fee vault
5. **Platform Fee Exclusion from Pool Accounting** (Halborn/Blockstreet) — Fees not tracked, breaking pool math
6. **Token-2022 Extension Critical Issues** (Zellic/SPL) — Extensions had protocol-breaking bugs
7. **Firedancer Behavioral Mismatches** (Neodyme) — New validator client has DoS vectors from divergent behavior vs Agave

### Blog Posts Worth Deep-Diving (Future Searches)
- OtterSec: "Hidden dangers of lamport transfers" — likely covers SOL transfer edge cases
- OtterSec: "Jumping Around in the VM" — VM-level exploitation
- Neodyme: "Token-2022: Don't shoot yourself in the foot with extensions" — extension security
- Neodyme: "Solana Consensus - From Forks to Finality" — consensus-level security
- Neodyme: "Upgrade Authorities" — admin authority management patterns

### Tools to Reference in SOS
- Sec3 X-ray (50+ vuln types, free plan)
- Neodyme Riverguard (free mutation testing)
- OtterSec Verify (program verification)
- Sec3 IDL Guesser (closed-source analysis)
