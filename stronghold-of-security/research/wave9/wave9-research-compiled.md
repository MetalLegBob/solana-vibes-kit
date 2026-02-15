# Wave 9: Conference Talks, Academic Research & Security Firm Publications

**Date:** 2026-02-06
**Searches:** 40+ Exa MCP queries across 4 tracks
**Focus:** Breakpoint talks, academic papers, Rust security, hackathon findings, security firm blog posts

---

## TRACK 1: Breakpoint Security Talks (2022-2025)

### Breakpoint 2022 (Lisbon)
- **Sec3: "Automating Smart-Contract Security"** — Introduction of X-ray vulnerability scanner
  - Detects: missing signer check, integer overflow, unverified parsed account, type confusion, insecure PDA sharing, incorrect logic
  - Source: youtube.com/watch?v=kcv0u2CzRsU

### Breakpoint 2023 (Amsterdam)
- **Certora: "Ensuring the Safety of SBF Programs Through Formal Verification"**
  - Formal verification tool for Solana SBF bytecode
  - Automatically proves specifications or produces counterexamples
  - Applied to SPL Token 2022, found bugs in confidential extension
  - Source: solanacompass.com/learn/breakpoint-23/breakpoint-2023-ensuring-the-safety-of-sbf-programs-through-formal-verification
- **"The Good, The Bad, and The Vulnerable"** — General Solana security overview
  - Source: youtube.com/watch?v=hb__mykwRdA
- **Zero-Knowledge Proofs: Privacy and Compliance** — ROT∆ project (Yannick Schrade)
  - ZK proofs for transactional privacy + regulatory compliance
  - Limitations of shielded pools discussed

### Breakpoint 2024 (Singapore, Sep 2024)
- **X-ray Open-Source Release (Chris Wang/Sec3)** — Static analyzer now open-source
  - CLI tool for Rust-based Solana programs
  - 50+ SVE vulnerability types, SARIF output, GitHub CI integration
  - Repo: github.com/sec3-product/x-ray
  - Source: solanacompass.com/learn/breakpoint-24/bp-2024-technical-talk-open-source-x-ray-solana-smart-contract-static-analysis

- **Radar: Extensible Static Analysis (Joe Van Loon/Auto Wizard)** — NEW open-source static analysis tool
  - Focuses on extensibility — custom rules/detectors
  - Source: solanacompass.com/learn/breakpoint-24/breakpoint-2024-introducing-radar-extensible-static-analysis-for-solana-programs

- **Trident Fuzzing Tool (Viktor Fischer/Ackee Blockchain)** — First open-source fuzzer for Solana
  - Anchor-like macros for test writing
  - Found CRITICAL vulns in Kamino (infinite money glitch), Marinade (funds leak), Wormhole (cross-dimension funds)
  - Repo: github.com/Ackee-Blockchain/trident
  - Uses Honggfuzz and AFL backends
  - "Manually Guided Fuzzing" methodology (Aug 2025 blog post) — not brute force, developer-guided exploration
  - Source: solanacompass.com/learn/breakpoint-24/breakpoint-2024-technical-talk-fuzzing-comes-to-solana-viktor-fischer

- **Real-Time Security in Solana Ecosystem (Gal Sagie)** — Runtime monitoring approaches
  - Source: youtube.com/watch?v=JZeOhlm44J0

### Breakpoint 2025 (Abu Dhabi, Dec 2025)
- **Confirmed: Abu Dhabi, December 2025** (correcting earlier plans that said 2024 cap)
- Dev Stage Day 2 "Lock In" — focused on developer tooling
- Security-specific talk content not yet transcribed in detail
- Source: youtube.com/watch?v=vX6u73OvBXY (Day 2 Dev Stage livestream)

### DeFi Security Summit 2025 (associated event)
- **"Solana: The Bugs You're Missing" (Robert Reith, CEO Accretion)**
  - Advanced vulnerabilities beyond standard top-10 lists
  - Runtime nuances, account validation edge cases, account lifecycle quirks
  - Target audience: experienced security researchers
  - Source: youtube.com/watch?v=Gy1mvpJwiVQ

---

## TRACK 2: Academic Papers on Solana/DeFi Security

### Peer-Reviewed Publications

**1. "Fuzz on the Beach: Fuzzing Solana Smart Contracts" (CCS 2023)**
- Authors: Smolka, Giesen, Winkler, Draissi, Davi, Karame, Pohl (University of Duisburg-Essen / Ruhr University Bochum)
- Published: ACM SIGSAC Conference on Computer & Communications Security 2023 (Copenhagen)
- Contribution: FuzzDelSol — first binary-only coverage-guided fuzzing architecture for Solana smart contracts
- Key insight: Solana's stateless programming model requires fundamentally different fuzzing approaches than EVM
- Arxiv: arxiv.org/abs/2309.03006

**2. "Soleker: Uncovering Vulnerabilities in Solana Smart Contracts" (ASE 2025)**
- Published: Automated Software Engineering Conference 2025 (Seoul, South Korea)
- Dedicated Solana vulnerability detection tool — static analysis approach
- Source: conf.researchr.org/details/ase-2025/ase-2025-papers/218/

**3. "Exploring Vulnerabilities and Concerns in Solana Smart Contracts" (arxiv, Apr 2025)**
- Authors: Wu, Xing, Li (Hainan University)
- Survey of Solana security analysis current state
- Categorizes vulnerability types specific to Solana's architecture
- Arxiv: arxiv.org/abs/2504.07419

**4. "Have We Solved Access Control Vulnerability Detection in Smart Contracts?" (ASE 2025)**
- Benchmark study evaluating access control detection tools
- Source: conf.researchr.org/details/ase-2025/ase-2025-papers/77/

**5. "Leveraging Mixture-of-Experts Framework for Smart Contract Vulnerability Repair with LLM" (ASE 2025)**
- Using LLMs with MoE architecture for automatic vulnerability repair
- "One-for-all" model limitation identified — specialized models per vuln type perform better

**6. "Solvent: Liquidity Verification of Smart Contracts" (2024)**
- Formal verification of liquidity properties
- Arxiv: arxiv.org/html/2404.17864v1

### ZK/Cryptography Research
**7. "ZK Coprocessor Bridge: Replay-Safe Private Execution from Solana to Aztec via Wormhole" (arxiv, Oct 2025)**
- Cross-chain ZK proof relay, replay safety analysis
- Arxiv: arxiv.org/abs/2510.22536

**8. "Full L1 On-Chain ZK-STARK+PQC Verification on Solana: A Measurement Study" (eprint, Sep 2025)**
- Post-quantum cryptography on Solana — Winterfell 0.12 + SHA-256 hashv syscall
- Tests whether ZK-STARK + PQC verification fits Solana's compute/memory constraints
- Source: eprint.iacr.org/2025/1741

### Certora Formal Verification Series (Aug 2023)
- **Part 1:** General verification tool architecture for Solana SBF bytecode
- **Part 2:** Formal verification of SPL Token 2022 Mint operation
- **Part 3:** Finding bugs in confidential extension of SPL Token 2022 using ZK proof verification
- **Tool:** `cargo-certora-sbf` — Cargo subcommand for Certora integration (github.com/Certora/cargo-certora-sbf, Apr 2025)
- Requires Rust >= 1.81, supports Solana v1.18 (Rust v1.75) and v2.1 (Rust v1.79)

### Academic Resource Collections
- **github.com/jianyu-niu/blockchain_conference_paper** — Comprehensive blockchain academic paper index
- **github.com/hzysvilla/Academic_Smart_Contract_Papers** — Smart contract paper collection
- **emergentmind.com/topics/solana-security-analysis-tools** — Meta-topic tracking Solana security research papers

---

## TRACK 3: Hackathon & Community Security Findings

### SuperSec (security.superteam.fun)
- **Solana exploits handbook** — detailed write-up of every Solana hack
- $511M hacked across 10 protocols documented with exploit type, technique, and audit status
- Includes: Wormhole ($325M), Mango ($115M), Cashio ($48M), Crema ($8.8M), etc.
- Structured table: protocol, date, $ stolen, exploit type, technique, auditor

### Superteam CTF (Bengaluru, Jul 2025)
- **ctf.superteam.fun** — Solana Security CTF
- 15 challenges, 50 participants, ₹5L+ in prizes, 8 hours
- Categories: Smart contract exploits, Cryptographic challenges (Ed25519, PDAs), DeFi security
- Sponsored by Microsoft, Reskill, Localhost

### Solana Privacy Hack 2026 (Jan 2026)
- Global hackathon for confidential blockchain infrastructure
- Comes after ZK ElGamal was disabled — community building alternatives

### $50K Security Audit Credits — Colosseum Hackathon (Oct 2025)
- Adevar Labs providing 5×$10K security audit credits
- "Cypherpunk Track" on Superteam Earn
- 95 submissions received

### Helius Redacted Hackathon (2025)
- **"Solana Hacks, Bugs, and Exploits: A Complete History"** by Lucrative Panda — Track winner
  - 38 verified security incidents (2020-Q1 2025)
  - Peak: 15 incidents in 2022
  - Gross losses: ~$600M; mitigated: ~$469M; net losses: ~$131M
  - Application exploits dominated (26 incidents)
  - Supply chain attacks emerged as new threat in 2024
  - Source: helius.dev/blog/solana-hacks
- Multiple other security history articles submitted as bounty entries (all Apr-May 2025)

### Code4rena Solana Foundation Audit (Aug-Sep 2025)
- **Scope:** Token-2022 program (extensions), zk-sdk (ZK ElGamal stack), ZK ElGamal Proof Program
- **Duration:** Aug 21 - Sep 23, 2025 (about 1 month)
- **Total awards:** $203,500 USDC
- **RESULT: NO High or Medium severity vulnerabilities found**
- 7 Low severity reports
- Triggered by the two ZK ElGamal bugs — comprehensive community audit of the fixed code
- Source: code4rena.com/reports/2025-08-solana-foundation

### Jupiter Lend Code4rena Audit (Feb 2026, UPCOMING)
- $107,000 USDC bounty
- Scope: Solana/Rust lending protocol
- Source: code4rena.com/audits

---

## TRACK 4: Rust Security Research Applicable to Solana

### Asymmetric Research Blog Posts (Key for Solana Auditing)

**1. "Invocation Security: Navigating Vulnerabilities in Solana CPIs" (Apr 23, 2025)**
- Author: Maxwell Dulin
- Comprehensive guide to CPI security on Solana
- Properties of CPIs, security issues, safer patterns
- How Solana's permission model differs from EVM
- Source: blog.asymmetric.re/invocation-security-navigating-vulnerabilities-in-solana-cpis/

**2. "Wrong Offset: Bypassing Signature Verification in Relay" (Sep 22, 2025)** ← NEW EP CANDIDATE
- Author: Felix Wilhelm
- **Critical vulnerability in Relay Protocol (cross-chain bridge, $5B+ volume, 85+ chains)**
- Bug: Contracts trusted Ed25519 verification without validating offsets
- Impact: Forged allocator signatures → potential double-spends
- Solana-specific: Uses Ed25519 precompile instruction sysvar pattern
- Patched privately, no funds lost
- Source: blog.asymmetric.re/wrong-offset-bypassing-signature-verification-in-relay/

**3. "Threat Contained: marginfi Flash Loan Vulnerability" (Sep 17, 2025)**
- Author: Felix Wilhelm
- Already covered as EP-118 (flash loan account state migration bypass)
- New instruction `transfer_to_new_account` bypassed flash loan repayment check
- $160M at risk, patched before exploit
- Key insight: "Unlike EVM, Solana's SVM runtime does not allow cross-program reentrancy and limits CPI call depth to four" — flash loans implemented differently
- Source: blog.asymmetric.re/threat-contained-marginfi-flash-loan-vulnerability/

**4. "Finding Fractures: An Intro to Differential Fuzzing in Rust" (May 15, 2025)** ← NEW EP CANDIDATE
- Authors: Anthony Laou Hine Tsuei, Nick Lang
- **Asymmetric Research has used differential fuzzing between Agave and Firedancer implementations**
- Uncovers consensus bugs from behavioral differences between validator clients
- Uses LibAFL for building Rust differential fuzzers
- Key insight: "Even minor deviations in client behavior can lead to network forks or security vulnerabilities"
- Directly relevant to multi-client Solana world (Agave + Firedancer)
- Source: blog.asymmetric.re/finding-fractures-an-intro-to-differential-fuzzing-in-rust/

**5. "Behind the Scenes of a Blocked Phishing Attempt" (Jul 1, 2025)**
- Social engineering targeting web3 security researchers
- Attacker posed as well-known web3 founder via Telegram
- Payload analyzed in controlled environment
- Source: blog.asymmetric.re

**6. "Circle's CCTP Noble Mint Bug" (Aug 27, 2024)**
- Vulnerability in Circle's CCTP: circumventing message sender verification to mint fake USDC on Noble
- Cross-chain relevance for Solana bridges using CCTP

### Agave Validator Vulnerabilities ← NEW EP CANDIDATE

**1. Agave rBPF Network Patch (Aug 2024)**
- External researcher discovered vulnerability in Agave + Jito validator clients
- **Impact:** Could crash leaders one by one, eventually halting the entire network
- Timeline: Discovered Aug 5, patch created, audited by 3rd party firms, 67%+ network patched by Aug 8
- Root cause: In the rBPF module (program loading/execution)
- Source: anza.xyz/blog/agave-network-patch-root-cause-analysis
- Deep analysis: medium.com/@astralaneio/postmortem-analysis-a-case-study-on-agave-network-patch

**2. Agave v3.0.14 Critical Patches (Jan 2026)**
- Two critical bugs patched: validator crash vulnerability + vote spam attack
- Only 18% of stake upgraded promptly — highlighted coordination challenge
- Solana Foundation linked stake delegation incentives to software compliance
- Source: longbridge.com/en/news/273615193

### Agave 3.0 Major Changes Affecting Security
- **CPI Nesting Depth: 4 → 8** — doubles attack surface for nested CPI exploits
- **Higher Single-Account Compute Limit: 40% of block CUs** — larger programs, more compute per account
- **Cache overhaul:** 30-40% faster but potential for new cache-related bugs
- Source: helius.dev/blog/agave-v3-0

### OtterSec Research

**"Solana: The Hidden Dangers of Lamport Transfers" (May 14, 2025)**
- Rent-exemption quirks, write-demotion traps
- "King of the SOL" game demonstrates how transfers to arbitrary accounts can silently fail or brick programs
- Already partially captured in existing lamport transfer EP
- OtterSec founder Robert Chen: "Programs on Solana are fundamentally more secure" — explicit account model forces developers to think about permissions
- Source: osec.io/blog/2025-05-14-king-of-the-sol/

### RustSec Advisories Relevant to Solana

**spl-token-swap: Unsound U8 Type Casting (GHSA-h6xm-c6r4-vmwf, Dec 2024)**
- `unpack` API casts `u8` array to arbitrary types
- Can cause misaligned pointer dereference (panic) or construct illegal types (undefined behavior)
- Directly in Solana's SPL crate ecosystem
- Source: advisories.gitlab.com/pkg/cargo/spl-token-swap/GHSA-h6xm-c6r4-vmwf

**Other Relevant RustSec:**
- RUSTSEC-2025-0144: ml-dsa timing side-channel (relevant for crypto implementations)
- RUSTSEC-2023-0096: aes-gcm plaintext exposed on tag verification failure
- CVE-2024-24576: Rust stdlib Command API batch file escaping (critical, Windows)
- CVE-2025-68260: First CVE in Rust Linux kernel code (rust_binder, Dec 2025)

### Three Sigma: "Rust Memory Safety on Solana" (May 2025)
- Key thesis: Rust's memory safety guarantees are NOT sufficient for blockchain security
- Logic bugs, missing signer checks, economic exploits are NOT prevented by Rust
- "What a Rust audit examines on Solana": CPI, PDAs, account validation, economic invariants
- Source: threesigma.xyz/blog/rust-and-solana/rust-memory-safety-on-solana

### Reverse Engineering Closed-Source Solana Programs
- "Cracking Solana's Closed Programs" (Arcaze, Apr 2025)
- Mentions Loopscale ($5.7M USDC + 1,200 SOL) as motivation — closed-source contracts
- Toolchain for dumping on-chain binaries, rebuilding IDLs, finding bugs
- Source: anarcaze.medium.com

### Trail of Bits Solana Tooling
- **crytic/solana-lints:** Lints based on Sealevel Attacks (github.com/crytic/solana-lints)
- **Trail of Bits Solang audit:** Security audit of Solang compiler (github.com/solana-labs/security-audits)

---

## NEW EXPLOIT PATTERNS IDENTIFIED (Not Yet in KB)

### EP-123 CANDIDATE: Ed25519 Instruction Offset Manipulation
- **Source:** Asymmetric Research — Relay Protocol disclosure (Sep 2025)
- **Pattern:** Program verifies Ed25519 signatures by checking the Ed25519 instruction sysvar, but doesn't validate the OFFSET into the instruction data
- **Impact:** Attacker provides valid Ed25519 signature for different message, tricks program by pointing to wrong offset
- **Distinct from:** EP-004 (missing signer check) — program IS checking signatures, just incorrectly trusting offset
- **Solana-specific:** Ed25519 precompile program + instructions sysvar pattern is unique to Solana
- **Real-world:** Relay Protocol ($5B+ volume cross-chain bridge)

### EP-124 CANDIDATE: Validator Client Crash Chain
- **Source:** Anza rBPF patch (Aug 2024), Agave v3.0.14 (Jan 2026)
- **Pattern:** Crafted transactions/programs crash validator leaders sequentially, halting the network
- **Impact:** Network-level DoS — not smart contract theft but protocol availability
- **Relevance:** Auditors assessing protocol dependencies should consider validator-level risks
- **Real-world:** Agave rBPF (Aug 2024), Agave v3.0.14 (Jan 2026)

### EP-125 CANDIDATE: Multi-Client Consensus Divergence
- **Source:** Asymmetric Research differential fuzzing (May 2025)
- **Pattern:** Different validator implementations (Agave vs Firedancer) interpret edge cases differently
- **Impact:** Consensus splits, potential for targeted exploitation of one client's behavior
- **Detection:** Differential fuzzing with LibAFL between implementations
- **Relevance:** As Firedancer gains adoption, behavioral differences become security-relevant

---

## KB EXPANSION TARGETS

1. **audit-firm-findings.md** — Add: Code4rena Solana Foundation audit results, Radar tool, expanded Trident section, FuzzDelSol, cargo-certora-sbf, Asymmetric Research blog catalog
2. **bug-bounty-findings.md** — Add: Relay Ed25519 bypass, Agave rBPF, Agave v3.0.14, Helius complete history reference
3. **known-vulnerable-deps.md** — Add: spl-token-swap GHSA-h6xm-c6r4-vmwf
4. **exploit-patterns.md** — Add: EP-123 (Ed25519 offset), EP-124 (validator crash chain), EP-125 (multi-client consensus divergence)
5. **bridge-attacks.md** — Add: Relay Protocol Ed25519 pattern
6. **token-extensions.md** — Add: Code4rena audit result (no High/Med found after ZK ElGamal fix)
7. **solana-runtime-quirks.md** — Add: Agave 3.0 CPI depth increase (4→8), compute limit changes

---

## SOURCES SUMMARY

**Conference Talks:** BP 2022-2025 (4 years), DSS 2025
**Academic Papers:** 8 papers (CCS 2023, ASE 2025 ×3, arxiv ×3, eprint ×1)
**Security Firm Blogs:** Asymmetric Research (6 posts), OtterSec (2 posts), Neodyme, Three Sigma, Certora (3 posts)
**Community:** SuperSec, Superteam CTF, Helius Redacted Hackathon, Code4rena
**RustSec:** 5 relevant advisories
**Post-Mortems:** ZK ElGamal ×2 (Solana Foundation), Agave rBPF (Anza), Agave v3.0.14
**Comprehensive Histories:** Helius (38 incidents), 5+ Medium articles from Helius bounty
