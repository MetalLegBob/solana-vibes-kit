# Aggregated Audit Firm Findings
<!-- Common findings from public Solana security audits -->
<!-- Last updated: 2026-02-06 -->

## Overview

This file aggregates common vulnerability patterns found across public Solana audit reports from major firms. Use this as a cross-reference during audits to ensure no common class is missed.

---

## Audit Firms Active on Solana

| Firm | Focus | Notable Clients | Public Reports |
|------|-------|----------------|---------------|
| OtterSec | Solana-first, full-stack | Wormhole, Solana SPL, Hylo, Light Protocol | anza-xyz/security-audits |
| Neodyme | Solana-first, deep protocol | Solana SPL Stake Pool, Neon, DeBridge | neodyme.io/reports |
| Sec3 (formerly Soteria) | Solana-first, automated + manual | Kamino, Jupiter, Meteora, Metaplex, Pyth | github.com/sec3-service/reports |
| Halborn | Multi-chain, Solana runtime | Solana Runtime (all versions), 0x, DeBridge | halborn.com/audits |
| Zellic | Multi-chain, DeFi focus | Drift, Token-2022, SPL Single Stake Pool | zellic.io |
| Trail of Bits | Multi-chain, tools-driven | Token-2022, Solang compiler | trailofbits.com |
| Kudelski | Multi-chain | SPL Token, SPL Stake Pool, Audius, Friktion | kudelskisecurity.com |
| NCC Group | Enterprise, multi-chain | Token-2022 | nccgroup.com |
| Certora | Formal verification | Token-2022 | certora.com |
| Code4rena | Competitive audit | Token-2022 | code4rena.com |

---

## Most Common Finding Categories

Based on analysis of 100+ public Solana audit reports:

### Tier 1: Found in >50% of Audits

**1. Missing or Insufficient Account Validation**
- Missing owner checks on deserialized accounts
- Missing signer checks on privileged operations
- Account type confusion (treating one account type as another)
- Missing PDA seed/bump validation
- **EP Reference:** EP-001 to EP-014
- **Firms reporting frequently:** Neodyme, OtterSec, Sec3, Halborn

**2. Arithmetic Overflow / Precision Loss**
- Unchecked arithmetic in release mode (silent wrapping)
- Integer truncation via `as` casts (u64 → u32)
- Rounding errors in fee/reward calculations
- Decimal mismatch between token amounts and oracle prices
- **EP Reference:** EP-015 to EP-020, EP-091
- **Firms reporting frequently:** All firms

**3. Missing Slippage / Output Validation**
- Swap operations without `min_amount_out`
- Deposit/withdrawal without minimum return checks
- Missing deadline checks on time-sensitive operations
- **EP Reference:** EP-060
- **Firms reporting frequently:** OtterSec, Sec3, Zellic

### Tier 2: Found in 25-50% of Audits

**4. Oracle Integration Issues**
- Missing staleness checks on Pyth/Switchboard prices
- Missing confidence interval validation
- No TWAP comparison for critical operations
- Oracle account not validated by address/owner
- **EP Reference:** EP-021 to EP-025
- **Firms reporting frequently:** Sec3, OtterSec, Zellic

**5. Access Control / Authorization Flaws**
- Admin functions callable without proper authority
- Missing timelock on parameter changes
- Single admin key with excessive privileges
- Upgrade authority not properly secured
- **EP Reference:** EP-008, EP-009
- **Firms reporting frequently:** Halborn, OtterSec, Neodyme

**6. CPI Safety Issues**
- Unverified program ID in CPI calls
- Missing program ownership validation on CPI target
- Privilege escalation via CPI signer seeds
- **EP Reference:** EP-030 to EP-040
- **Firms reporting frequently:** Neodyme, Zellic

### Tier 3: Found in 10-25% of Audits

**7. State Machine / Reentrancy Issues**
- State not updated before external calls
- Missing invariant checks between operations
- Re-initialization of already-initialized accounts
- **EP Reference:** EP-041 to EP-054

**8. Token-2022 / Extension Handling**
- Not accounting for transfer fees
- Missing permanent delegate check
- Using `Program<Token>` instead of `Interface<TokenInterface>`
- **EP Reference:** Token Extensions knowledge base

**9. Error Handling / DoS**
- Using `unwrap()` or `expect()` that panic on failure
- Unbounded iterations that can exceed compute limits
- Missing checks that allow zero-value operations
- **EP Reference:** EP-070 to EP-080

---

## Severity Distribution (Sec3 2025 Ecosystem Report)

Based on 163 audits, 1,733 findings:

| Severity | % of Findings | Common Categories |
|----------|--------------|-------------------|
| Critical | 5.3% | Fund drain, infinite mint, auth bypass |
| High | 8.4% | Privilege escalation, oracle manipulation |
| Medium | 20.2% | Precision loss, missing validation, DoS |
| Low | 32.2% | Best practice violations, minor issues |
| Informational | 33.9% | Code quality, documentation, gas optimization |

---

## Notable Audit Findings by Protocol Category

### DeFi / AMM
- **Meteora DLMM** (Sec3, Feb 2024): Precision loss in bin liquidity math
- **Jupiter Perpetual Exchange** (Sec3, Jan 2024): Oracle price manipulation window
- **Kamino Lending** (Sec3, Feb 2025): Collateral valuation edge cases
- **Drift** (Zellic, Jan 2025): Position sizing and liquidation threshold issues
- **Hylo** (OtterSec, May 2025): **2 Critical** — collateral ratio manipulation via LST registry omission/duplication (EP-102)
- **Vaultka** (Halborn, Jul-Aug 2024): **1 Critical, 1 High** — withdraw fee routed to user instead of fee vault (EP-099), inefficient slippage control
- **Blockstreet Launchpad** (Halborn, Aug-Sep 2025): **2 Critical, 2 High** — platform fees excluded from pool accounting (EP-105)
- **Cega Vault** (Zellic, Mar 2023): Vault strategy security review

### Infrastructure / Bridge
- **Wormhole** (OtterSec, multiple): Guardian signature verification, VAA processing
- **DeBridge** (Neodyme, Halborn): Cross-chain message validation
- **Hyperlane Sealevel** (Sec3, Jul 2023): Interchain message authentication
- **Firedancer v0.1** (Neodyme, Jul 2024): **2 High** — behavioral mismatches with Agave validator, remote crash vector
- **Squads Protocol v4** (Trail of Bits, Sep 2023): Multisig approval requirements, fund withdrawal, front-running
- **Olympus DAO OFT** (OtterSec, Mar 2023): **1 High** — failed cross-chain messages lock tokens permanently (EP-104)
- **LayerZero Solana Endpoint** (Zellic, Jul 2024): Cross-chain endpoint security
- **Chainflip Solana** (Zellic, Aug 2024): Cross-chain swap integration
- **N1 Bridge** (Zellic, Apr 2025): Bridge security review

### Token Standards
- **Token-2022** (Halborn, Zellic, Trail of Bits, OtterSec, NCC, Certora, Code4rena): Transfer fee bypass, confidential transfer issues, extension interaction bugs. Zellic found **2 Critical, 1 High** in extensions themselves.
- **SPL Stake Pool** (Neodyme x4, OtterSec, Halborn, Kudelski, Quantstamp): Delegation logic, reward calculation, withdrawal ordering
- **p-token** (Zellic/Anza, Oct 2025): New Solana token program audit
- **Pinocchio and p-token** (Zellic/Anza, Jun 2025): Low-level Solana primitive audit
- **BPF Stake Program** (Zellic/Anza, Mar 2025): Stake program migration audit

### NFT / Marketplace
- **Metaplex Bubblegum** (Sec3, Nov 2022): Compressed NFT Merkle tree operations
- **Metaplex Candy Guard** (Sec3, Nov 2022): Minting guard bypass conditions
- **Metaplex Inscriptions** (Sec3, Jan 2024): Data validation on inscribed content

### Oracle
- **Pyth Express Relay** (Sec3, Oct + Dec 2024): Relay message authentication, price feed validation
- **Helium Price Oracle** (Sec3, Apr 2023): Custom oracle implementation issues
- **Pyth Oracle** (Zellic, Apr 2022): Core oracle program audit
- **Pyth Governance** (Zellic, May 2022): Governance mechanisms

### Migration / Claims
- **Cytonic Network** (Zellic, Jul 2024): **1 Medium** — DoS in claim/migrate due to non-ATA deposits breaking derived addresses (EP-103)
- **Audius Claim and Rewards** (Zellic, Nov 2025): Rewards distribution program audit

---

## Common Remediation Patterns in Audit Reports

### What Auditors Recommend Most Often

1. **Use Anchor constraints** — `#[account(has_one, constraint, seeds)]` instead of manual checks
2. **Use `checked_*` arithmetic** — `checked_add`, `checked_mul`, `checked_div`, `checked_sub`
3. **Validate all oracle data** — staleness, confidence, sanity bounds
4. **Add slippage protection** — `min_amount_out` on every user-facing operation
5. **Use canonical PDA bumps** — `ctx.bumps.account_name` not instruction arguments
6. **Validate CPI targets** — check `program_id` matches expected program
7. **Add timelock to admin operations** — minimum 24-48 hour delay
8. **Use `Interface<TokenInterface>`** — support both Token and Token-2022
9. **Add circuit breakers** — pause on extreme price movements or unusual activity
10. **Emit events for critical operations** — enables monitoring and incident response

---

## Automated Security Tools (Solana-Specific)

| Tool | Provider | Type | Notes |
|------|----------|------|-------|
| **X-ray** | Sec3 | Static analysis | 50+ SVE vuln types, SARIF output, GitHub CI, free plan. Open-sourced at BP 2024 (github.com/sec3-product/x-ray) |
| **Radar** | Auto Wizard | Static analysis | Extensible open-source static analysis, custom rules/detectors. Presented at BP 2024 by Joe Van Loon |
| **Trident** | Ackee Blockchain | Fuzzing | First open-source fuzzer for Solana. Manually Guided Fuzzing (MGF). Found CRITICAL vulns in Kamino, Marinade, Wormhole. Uses Honggfuzz/AFL backends. (github.com/Ackee-Blockchain/trident) |
| **FuzzDelSol** | Uni Duisburg-Essen | Fuzzing | Academic binary-only coverage-guided fuzzer (CCS 2023 paper). Targets compiled SBF bytecode directly |
| **Certora SCP** | Certora | Formal verification | Solana Certora Prover for SBF bytecode. `cargo-certora-sbf` Cargo subcommand (github.com/Certora/cargo-certora-sbf). Verified SPL Token-2022, found bugs in confidential extension |
| **Riverguard** | Neodyme | Dynamic mutation testing | Free, Solana Foundation supported, tests deployed programs |
| **otter-verify** | OtterSec | Program verification | Verifies deployed bytecode matches source |
| **IDL Guesser** | Sec3 | Reverse engineering | Recovers IDL from closed-source binaries (Apr 2025) |
| **solana-lints** | Trail of Bits | Linting | Lints based on Sealevel Attacks (github.com/crytic/solana-lints) |
| **solana-poc-framework** | Neodyme | Exploit PoC | Framework for building exploit demonstrations |
| **solana-security-txt** | Neodyme | Best practice | Standard for embedding security contacts in programs |
| **WatchTower** | Sec3 | Runtime monitoring | Real-time threat detection for deployed programs |

**Recommended audit workflow:**
1. **Step 0:** Verify program source matches deployed bytecode (OtterSec Verify / Solana Verified Programs API)
2. **Step 1:** Run automated static analysis (Sec3 X-ray, Radar, solana-lints)
3. **Step 1b:** Fuzz with Trident (Ackee) for edge-case discovery
4. **Step 2:** Manual code review (The Fortress / human auditors)
5. **Step 3:** Dynamic testing against deployed program (Neodyme Riverguard)
6. **Step 4:** PoC development for confirmed findings (Neodyme solana-poc-framework)
7. **Step 5:** (High-value protocols) Formal verification with Certora SCP

---

## Notable Competitive Audits

### Code4rena Solana Foundation (Aug-Sep 2025)
- **Scope:** Token-2022 program (extensions), zk-sdk (ZK ElGamal stack), ZK ElGamal Proof Program
- **Duration:** 33 days, $203,500 USDC total awards
- **Result:** **NO High or Medium severity vulnerabilities found** — 7 Low reports only
- **Context:** Triggered by two ZK ElGamal proof forgery bugs (Apr + Jun 2025); comprehensive community audit of the fixed code
- **Takeaway:** Post-fix code passed rigorous community audit, but the ZK ElGamal bugs were found by solo researchers (LonelySloth, zksecurity), not competitive audits — highlighting value of both approaches
- Source: code4rena.com/reports/2025-08-solana-foundation

### Asymmetric Research Blog Disclosures (2024-2025)
Key publications with direct Solana audit relevance:
- **"Invocation Security: Navigating Vulnerabilities in Solana CPIs"** (Apr 2025, Maxwell Dulin) — Comprehensive CPI security guide
- **"Wrong Offset: Bypassing Signature Verification in Relay"** (Sep 2025, Felix Wilhelm) — Ed25519 offset manipulation (EP-123)
- **"Threat Contained: marginfi Flash Loan Vulnerability"** (Sep 2025, Felix Wilhelm) — Flash loan repayment bypass (EP-118)
- **"Finding Fractures: Differential Fuzzing in Rust"** (May 2025) — Agave vs Firedancer consensus bug finding via LibAFL
- Source: blog.asymmetric.re

### Community Security Resources
- **SuperSec (security.superteam.fun):** Detailed handbook of every Solana hack — $511M across 10+ protocols with exploit type taxonomy
- **Helius "Complete History" (helius.dev/blog/solana-hacks):** 38 verified incidents (2020-Q1 2025), ~$600M gross losses, ~$131M net. Track winner of Helius Redacted Hackathon
- **Superteam CTF (ctf.superteam.fun):** Solana Security CTF (Bengaluru, Jul 2025) — 15 challenges covering smart contract exploits, Ed25519/PDA crypto, DeFi security

---

## Public Audit Report Repositories

- **Solana/Anza official:** github.com/anza-xyz/security-audits
- **Solana Labs (legacy):** github.com/solana-labs/security-audits
- **Sec3:** github.com/sec3-service/reports
- **OtterSec:** Published per-client (linked from client repos) + Notion reports page
- **Neodyme:** neodyme.io (blog + reports section, SHA256 hashes)
- **Halborn:** halborn.com/audits (searchable, includes hack analyses)
- **Zellic:** zellic.io + GitHub publications repo with all PDFs
- **Trail of Bits:** GitHub publications repo with dedicated Solana section
- **Community aggregation:** github.com/sannykim/solsec

---

## Wave 10 Updates: 2025-2026 Developments

### Halborn January 2026 Month-in-Review
- Step Finance hack analysis: compromised executive devices → private keys. Emphasis on off-chain security, cold wallets, endpoint security.
- SagaEVM ($7M, EVM precompile bridge exploit — not Solana, but shows supply chain risk of forked codebases)
- Crypto theft hit ~$400M in January 2026 alone
- Source: halborn.com/blog/post/month-in-review-top-defi-hacks-of-january-2026

### Halborn 2025 Hack Analyses (Solana-relevant)
- **SwissBorg (Sep 2025):** Detailed analysis of Kiln API compromise — third-party staking service supply chain attack. Key finding: malicious `SetAuthority` instructions hidden in routine unstake transactions.
- **CrediX (Aug 2025):** ACL role escalation via multisig — attacker added as Admin+Bridge 6 days before drain. Key finding: role assignment without timelock.
- **Upbit (Nov 2025):** Hot-wallet breach via weak digital signature algorithms. Key finding: Lazarus Group suspected, signature infrastructure vulnerability.
- Source: halborn.com/blog (individual hack analysis posts)

### Anza Security Post-Mortems (2026)
- **Agave v3.0.14 (Jan 16, 2026):** Detailed disclosure of two critical vulnerabilities:
  1. Gossip defragmentation buffer cleanup → bounds check panic → validator crash
  2. VoteStorage missing vote authority signature verification → vote censoring attack
- Key finding: vote censoring attack could stall consensus by flooding validators with invalid but accepted vote messages for future slots
- Source: anza.xyz/blog/january-2026-gossip-and-vote-processing-security-patch-summary

### ZK ElGamal Proof Program Status (2026)
- Third vulnerability found during re-audit (Jan/Feb 2026) before program re-enablement
- Program was disabled since Jun 2025 (epoch 805) after Bug #2
- Patched by Anza + Firedancer + Jito engineers, no exploit
- Source: decrypt.co (Feb 2 2026), solana.com post-mortems

---
<!-- Sources: Sec3 2025 Ecosystem Report, anza-xyz/security-audits, Neodyme blog, OtterSec public reports, Halborn public audits, Zellic publications, Trail of Bits publications, sannykim/solsec, Wave 4 audit firm mining, Wave 9 conference/academic research (Breakpoint 2022-2025, Asymmetric Research blog, Code4rena Solana Foundation audit, Ackee Blockchain Trident, Certora SCP, CCS 2023 FuzzDelSol, SuperSec, Helius Complete History, Superteam CTF), Wave 10 Halborn 2025-2026, Anza Jan 2026 post-mortem, Decrypt ZK ElGamal -->
