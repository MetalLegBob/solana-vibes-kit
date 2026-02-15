# Aggregated Bug Bounty Findings
<!-- Notable bug bounty disclosures in the Solana ecosystem -->
<!-- Last updated: 2026-02-06 -->

## Overview

Bug bounty programs are a critical layer of Solana security. This file tracks notable bounty disclosures, active programs, and patterns discovered through bounty research. Solana's Immunefi-based bounty programs have caught 50+ bugs pre-exploit, saving millions.

---

## Major Bug Bounty Platforms for Solana

| Platform | Focus | Notable Programs |
|----------|-------|-----------------|
| Immunefi | DeFi/Web3 primary | Wormhole ($5M max), Raydium ($505K, $1.6M paid), Orca ($500K), Kamino ($1.5M), Firedancer ($500K) |
| Solana Foundation | Core protocol | Solana runtime, SPL programs (bounties in SOL since Feb 2024) |
| Code4rena | Competitive audits | Token-2022 |
| HackerOne | General + Web3 | Not used for Solana (Immunefi dominates) |

---

## Notable Bug Bounty Disclosures

### Critical Severity

**1. ZK ElGamal Proof Program Vulnerability (Apr 2025)**
- **Reporter:** LonelySloth (via Anza GitHub Security Advisory)
- **Bounty:** Not disclosed
- **Impact:** Forged zero-knowledge proofs could authorize confidential token transfers
- **Root cause:** Algebraic components missing from Fiat-Shamir transcript hash
- **Affected:** Token-2022 confidential transfers only
- **Response:** Patch in <24 hours; reviewed by Asymmetric Research, Neodyme, OtterSec
- **EP Reference:** Novel (ZK proof system vulnerability)
- **Lesson:** Even formally-verified crypto primitives need implementation audits

**2. Solana Durable Nonce Bug (2022)**
- **Reporter:** Neodyme (via bug bounty)
- **Bounty:** $50,000+
- **Impact:** Nonce account misuse could enable transaction replay
- **Root cause:** Insufficient validation in nonce state transitions
- **Affected:** Any program using durable nonces for offline transactions
- **Response:** Patched pre-exploit, no funds lost
- **EP Reference:** EP-011 (replay related)
- **Lesson:** Core protocol features need the same security scrutiny as applications

**3. Solana Duplicate Block Bug (2022)**
- **Reporter:** Security researcher (via coordinated disclosure)
- **Bounty:** Not disclosed
- **Impact:** Malicious leader could produce duplicate blocks, causing network fork
- **Root cause:** Incomplete duplicate detection in consensus
- **Response:** Patched in Solana v1.14.17 with improved shred deduplication
- **Lesson:** Consensus-level bugs can halt the entire network

**4. SPL Token-Lending Vulnerability**
- **Reporter:** Neodyme
- **Impact:** Potential fund drain from lending pools
- **Root cause:** Semantic inconsistency in lending market validation
- **Documentation:** Sec3 blog post + Neodyme PoC Framework demo
- **Lesson:** Even audited code (SPL Stake Pool had multiple prior audits) can contain vulnerabilities

**5. Solana JIT Cache Bug (Feb 2024)**
- **Reporter:** Internal / coordinated disclosure
- **Impact:** Infinite recompilation loop freezing entire network (~5 hours)
- **Root cause:** Bug in Agave validator JIT compilation of legacy programs
- **Response:** Pre-prepared patch deployed
- **Lesson:** JIT/runtime optimizations are a high-risk attack surface

**6. Raydium cp-swap Liquidity Drain (Mar 2025)**
- **Reporter:** @Lastc0de (via Immunefi)
- **Bounty:** $505,000 USDC
- **Impact:** Drain liquidity from cp-swap pools
- **Root cause:** `fn deposit()` with `RoundDirection::Ceiling` — tiny amounts round `token_1_amount` to 0, minting LP tokens for only one token type
- **Fix:** Added `require!()` checks ensuring all calculated amounts are non-zero
- **EP Reference:** EP-109
- **Lesson:** Integer rounding in financial math must always be checked for zero outputs
- **Source:** https://immunefi.com/blog/all/raydium-liquidity-drain-bug-fix-review/

**7. Raydium CLMM Tick Manipulation (Jan 2024)**
- **Reporter:** @riproprip (via Immunefi)
- **Bounty:** $505,000 RAY
- **Impact:** Drain funds from CLMM pools via tick bitmap manipulation
- **Root cause:** `increase_liquidity()` didn't validate `remaining_accounts[0]` as correct `TickArrayBitmapExtension` for the pool
- **Fix:** Added key equality check for remaining_accounts against expected PDA
- **EP Reference:** EP-108
- **Lesson:** `remaining_accounts` bypasses all Anchor validation — must be manually verified
- **Source:** https://immunefi.com/blog/bug-fix-reviews/raydium-tick-manipulation-bugfix-review/

**8. ZK ElGamal Proof Bug #2 (Jun 2025)**
- **Reporter:** zksecurityXYZ (via Anza GitHub Security)
- **Bounty:** Not disclosed
- **Impact:** Second Fiat-Shamir Transformation bug — same class as #1 (Apr 2025)
- **Root cause:** Component not included in hash for Fiat-Shamir Transformation
- **Response:** Confidential transfers disabled Jun 11; ZK ElGamal program disabled epoch 805 (Jun 19)
- **EP Reference:** EP-100
- **Lesson:** Same vulnerability class found TWICE in 2 months — ZK proof systems need continuous scrutiny

**9. Wormchain Single-Key Guardian Bypass (Jan 2024)**
- **Reporter:** marcohextor (via Immunefi)
- **Bounty:** $50,000 USDC
- **Impact:** Single genesis Guardian key could validate any VAA, bypassing 13/19 quorum
- **Root cause:** Genesis Guardian set had no expiration
- **Response:** Fixed to enforce only latest Guardian set validates VAAs
- **Lesson:** Legacy/genesis configurations must be expired or revoked
- **Source:** https://marcohextor.com/wormhole-one-key-vulnerability/

**10. Direct Mapping Validator RCE (2025)**
- **Reporter:** Anatomist Security
- **Bounty:** Not disclosed
- **Impact:** Validator RCE via Direct Mapping optimization (v1.16+) — $9B+ TVL at risk
- **Root cause:** Inadequate permission validation in host-to-VM memory mapping
- **Response:** Coordinated validator patch
- **Source:** https://anatomi.st/blog/2025_06_27_pwning_solana_for_fun_and_profit
- **Lesson:** Performance optimizations that change memory models are extremely high risk

### High Severity

**6. Jet Governance Vulnerability**
- **Reporter:** OtterSec
- **Impact:** Governance bypass allowing unauthorized treasury access
- **Root cause:** Insufficient proposal validation
- **EP Reference:** EP-008, EP-009
- **Documentation:** PoC available in sannykim/solsec

**7. Port Finance Max Withdraw Bug**
- **Reporter:** nojob (independent researcher)
- **Impact:** Withdrawal exceeding maximum allowed amount
- **Root cause:** Arithmetic edge case in withdraw calculation
- **EP Reference:** EP-015 to EP-020

**8. Solana ELF Address Alignment Vulnerability (2024)**
- **Reporter:** Coordinated disclosure
- **Impact:** Potential for validator crashes via malformed programs
- **Root cause:** ELF parser didn't enforce address alignment
- **Response:** Patched in validator updates

---

## Active Solana Bug Bounty Programs (Major)

### Tier 1: $500K+ Maximum Bounty

| Program | Max Bounty | Platform | Focus |
|---------|-----------|----------|-------|
| Kamino | $1,500,000 | Immunefi | Lending, Vaults, Limit Orders |
| 0x (Solana) | $1,000,000 | Immunefi | DEX aggregation, settlement |
| Wormhole | $2,500,000 | Immunefi | Cross-chain bridge |
| Solana Foundation | $1,000,000 | Direct | Core protocol, runtime |

### Tier 2: $50K-$500K Maximum Bounty

| Program | Max Bounty | Platform | Focus |
|---------|-----------|----------|-------|
| Pyth Network | $250,000 | Immunefi | Oracle price feeds |
| Light Protocol | $50,000 | Immunefi | ZK Compression |
| Jupiter | Varies | Direct | DEX aggregator |
| Marinade | Varies | Direct | Liquid staking |

### Bounty Payout Structure (Typical Immunefi)

| Severity | Typical Range | Calculation |
|----------|--------------|-------------|
| Critical | $50K - $1.5M | 10% of funds at risk (capped) |
| High | $10K - $100K | Proportional to impact |
| Medium | $1K - $35K | Flat or proportional |
| Low | $1K - $2.5K | Usually flat |

---

## Bug Bounty Patterns and Trends

### What Bounty Hunters Find Most Often

1. **Account validation gaps** — Missing owner/signer/PDA checks that audits missed
2. **Edge cases in math** — Overflow, precision loss, rounding at extreme values
3. **Oracle integration issues** — Staleness, confidence, edge cases during volatility
4. **State machine inconsistencies** — Sequences of operations that reach invalid states
5. **Cross-program interaction bugs** — CPI edge cases, account sharing between programs

### What Makes a Good Bounty Submission

From Immunefi guidelines and successful submissions:

1. **Proof of Concept required** — Must demonstrate the bug's impact
2. **Clear attack path** — Step-by-step reproduction, not just theoretical
3. **Impact quantification** — How much is at risk? Calculate TVL affected
4. **Primacy of Impact** — Some programs reward based on impact severity, not specific asset
5. **Known issues excluded** — Check prior audit reports before submitting

### Common Rejection Reasons

- **Already known** — Described in prior audit report
- **Theoretical only** — No PoC demonstrating actual impact
- **Out of scope** — Affecting testnet, deprecated code, or excluded components
- **User error** — Requires user to act irrationally (e.g., sending to wrong address)
- **DoS without economic impact** — Must show fund loss, not just disruption

---

## Bug Bounty Response Times (Solana Ecosystem)

| Incident | Detection → Patch | Notes |
|----------|------------------|-------|
| ZK ElGamal #1 (Apr 2025) | ~24 hours | Validator patch + coordinated upgrade (70%+ validators) |
| ZK ElGamal #2 (Jun 2025) | ~9 days | Disabled confidential transfers, then program at runtime level |
| Relay Protocol Ed25519 (Sep 2025) | Preemptive | Ed25519 offset bypass in $5B+ bridge, Asymmetric Research disclosure |
| marginfi Flash Loan (Sep 2025) | Preemptive | $160M at risk, Asymmetric Research via bug bounty (EP-118) |
| Agave rBPF (Aug 2024) | ~3 days | Network-halt vulnerability, 67%+ validators patched Aug 5-8 |
| Agave v3.0.14 (Jan 2026) | Ongoing | Validator crash + vote spam, only 18% upgraded promptly |
| Raydium CLMM (Jan 2024) | Preemptive | Bug bounty, patched before exploitation |
| Raydium cp-swap (Mar 2025) | Preemptive | Bug bounty, patched before exploitation |
| web3.js backdoor (Dec 2024) | ~5 hours | Detected, malicious versions removed |
| JIT Cache (Feb 2024) | ~5 hours | Pre-prepared patch deployed to validators |
| Durable Nonce (2022) | Pre-exploit | Neodyme reported, patched before any exploit |
| Wormhole (Feb 2022) | ~6 hours | Patch deployed, but attacker moved faster |
| Turbine Bug (Dec 2020) | ~6 hours | Network restart after fork resolution |

**Trend:** Response times have improved from hours/days (2020-2022) to minutes/hours (2024-2025).

---

## Bug Bounty Tools for Researchers

| Tool | Purpose | Source |
|------|---------|--------|
| Neodyme PoC Framework | Solana penetration testing | Open source |
| OtterSec CTF Framework | Solana CTF challenges | Open source |
| Sec3 X-ray | Static vulnerability scanning (50+ SVE types) | Open source (BP 2024) |
| Radar | Extensible static analysis with custom detectors | Open source (BP 2024) |
| Trident | Anchor fuzzing framework (MGF) | Ackee Blockchain |
| FuzzDelSol | Binary-only coverage-guided fuzzing | Academic (CCS 2023) |
| Certora SCP | Formal verification for SBF bytecode | cargo-certora-sbf |
| solana-lints | Lints based on Sealevel Attacks | Trail of Bits (crytic) |
| solana-verify | On-chain program verification | Solana Foundation |
| Saber Vipers | Checks and validations library | Open source |

---

## Lessons from Bug Bounties

1. **Bounties catch what audits miss** — Multiple SPL programs had 3-4 audits but still had bounty-discovered bugs
2. **Response speed is critical** — Wormhole's patch was ready but not deployed; attacker exploited the gap
3. **Core protocol bugs exist** — Durable nonce, JIT cache, ZK ElGamal, rBPF — even core Solana code has bugs
4. **Bounty ROI is massive** — $50K bounty for durable nonce bug vs. potential $100M+ exploit
5. **Confidential/ZK features are high-risk** — ZK ElGamal bug shows new crypto primitives need extra scrutiny
6. **Supply chain is the new frontier** — web3.js compromise wasn't found by bounty, but by community detection
7. **Validator coordination is fragile** — Agave v3.0.14 saw only 18% prompt upgrade; Solana Foundation now links stake delegation to compliance
8. **Ed25519 verification patterns are subtle** — Relay Protocol bug shows that even checking signatures can be insufficient if offsets aren't validated (EP-123)
9. **Multi-client world adds new risk surface** — Agave vs Firedancer behavioral differences can create consensus divergence; differential fuzzing is key technique
10. **Competitive audits complement solo research** — Code4rena Solana Foundation audit ($203.5K) found NO High/Med issues, but solo researchers found the original ZK ElGamal bugs

---

## Paywalled / Restricted Sources (Future Expansion)

If this knowledge base grows in popularity and receives funding, these sources could significantly expand coverage:

| Source | What's Behind the Wall | Estimated Value |
|--------|----------------------|-----------------|
| **Immunefi Private Reports** | ~90% of bug bounty findings are never publicly disclosed. Programs like Firedancer use Category 3 (Approval Required) for any public info. | VERY HIGH — hundreds of unreported findings |
| **Anza/Agave Private Security** | All validator-level vulnerabilities reported via private GitHub security reporting. No public CVEs. | HIGH — core protocol bugs |
| **Audit Firm NDA Reports** | OtterSec, Neodyme, Zellic, Halborn etc. have many private reports never published. | HIGH — real findings from real codebases |
| **Anchor Private Security** | No public security advisory process. Vulnerabilities reported directly to maintainers. | MEDIUM — framework-level bugs |
| **Solana Foundation Internal** | Validator patches distributed before disclosure. Detailed technical analysis rarely published. | HIGH — systemic risks |
| **Closed Bug Bounty Programs** | Programs that were briefly live on Immunefi but are now closed/private. | MEDIUM |

### Community Resources Worth Monitoring
- `github.com/sayan011/Immunefi-bug-bounty-writeups-list` — Curated list of ALL public Immunefi writeups
- `github.com/tpiliposian/Immunefi-bugfixes` — Detailed technical writeups of bounty fixes (2023-2024)
- `github.com/anza-xyz/security-audits` — All past and present SPL program audits
- `secure-contracts.com/not-so-smart-contracts/solana/` — Trail of Bits Solana vulnerability patterns

---

## 2025-2026 Major Incidents (Wave 10 Update)

### New Solana Ecosystem Incidents (Post-Wave 9)

| Incident | Date | Loss | Category | EPs |
|----------|------|------|----------|-----|
| SwissBorg/Kiln API | Sep 2025 | $41.5M | Third-party API supply chain — compromised Kiln engineer GitHub token → malicious `SetAuthority` in API-built unstake tx | EP-095, EP-128 |
| Upbit Solana Hot-Wallet | Nov 2025 | $36M | Exchange hot-wallet drain — weak digital signature algorithms, suspected Lazarus. 24 Solana tokens affected | EP-068, EP-097 |
| Step Finance | Jan 2026 | $30-40M | Compromised executive devices — social engineering/malware → private key theft → 261,854 SOL unstaked and drained | EP-068, EP-097 |
| Garden Finance | Oct 2025 | $11M | Multi-chain liquidity drain including Solana pools | EP-058, EP-068 |
| CrediX | Aug 2025 | $4.5M | Multisig ACL role escalation — attacker added as Admin+Bridge via ACLManager 6 days before drain | EP-073, EP-126 |
| ZK ElGamal Bug #3 | Jan/Feb 2026 | $0 (patched) | Third ZK proof verification bug found during re-audit before re-enabling program | EP-100 |
| Agave v3.0.14 | Jan 2026 | $0 (patched) | Two critical validator bugs: gossip defrag buffer panic + vote censoring attack (VoteStorage missing vote authority sig check) | EP-124, EP-125 |
| GlassWorm/Open VSX | Feb 2026 | N/A | Supply chain: malware uses Solana memos as C2 dead-drop for rotating staging infrastructure | EP-095 (SC-8) |

### Wave 10 Lessons Learned

11. **Third-party API providers are a critical attack surface** — SwissBorg lost $41.5M not through any protocol vulnerability but through a compromised staking partner. Smart contract audits don't cover operational dependencies.
12. **ACL role escalation is a slow-motion exploit** — CrediX attacker was added to multisig 6 DAYS before draining. Real-time monitoring of role changes would have caught this.
13. **Private key compromises dominate 2025-2026 losses** — Step Finance ($30-40M), Upbit ($36M), SwissBorg ($41.5M via Kiln) — all private key/access compromises, not smart contract bugs. Total: $107-117M from key management failures alone.
14. **ZK systems remain fragile** — Third ZK ElGamal bug found in less than a year. Programs using confidential transfers need continuous scrutiny.

---
<!-- Sources: Immunefi bounty pages, Solana post-mortems, Helius security history, Sec3 reports, sannykim/solsec, Neodyme blog, Anatomist Security, OtterSec blog, marcohextor Wormchain disclosure, Halborn 2026 hack analyses, CoinDesk, CryptoSlate, SwissBorg blog, Anza post-mortem Jan 2026, Decrypt, monoaudit.com, yfarmx.com -->
