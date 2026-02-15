# Wave 3: Gap Analysis — What's New vs Existing KB

**Date:** 2026-02-06
**Sources:** rekt.news, SlowMist Hacked, CertiK reports, De.Fi REKT database

---

## Gap Summary

### New Exploit Patterns to Add to KB

| Priority | Incident | Loss | New Pattern | Suggested EP# |
|----------|----------|------|-------------|---------------|
| HIGH | Texture Finance | $2.2M | CPI destination account not validated in rebalance | EP-098 |
| HIGH | Marinade SAM | $5M | Business logic inversion (algorithm backward) | EP-099 |
| HIGH | ZK ElGamal Proof | $0 (patched) | ZK proof forgery in confidential transfers | EP-100 |
| MED | LIBRA/MELANIA | $486M | Liquidity extraction by privileged account | EP-101 |
| MED | DogWifTools | $10M | RAT injection via compromised build pipeline | Expand EP-095 |
| MED | solana-pumpfun-bot | ? | Malicious npm package impersonation | Expand EP-095 |
| MED | PyPI semantic-types | ? | Monkey-patching runtime key generation | Expand EP-095 |
| LOW | CrediX | $4.5M | Minting role abuse (BRIDGE role) | Covered by EP-073 |
| LOW | MetaWin | $4M | Frictionless withdrawal system exploit | Covered by EP-073 |

### Existing KB Files to Update

| File | Update Needed |
|------|---------------|
| `core/exploit-patterns.md` | Add EP-098 through EP-101; expand EP-095 with 3 new supply chain variants |
| `core/exploit-patterns.md` | **CORRECTION:** Cetus DEX is SUI, not Solana — update all references |
| `protocols/staking-attacks.md` | Add Marinade SAM backward-logic exploit |
| `protocols/amm-dex-attacks.md` | Add LIBRA/MELANIA liquidity extraction pattern |
| `solana/token-extensions.md` | Add ZK ElGamal proof vulnerability (Apr 2025) |
| `reference/bug-bounty-findings.md` | Texture (Certora bounty), Loopscale (10% bounty) |
| `solana/known-vulnerable-deps.md` | Add DogWifTools, solana-pumpfun-bot, PyPI semantic-types |

### New Patterns Identified (Not Previously Categorized)

1. **Business Logic Inversion** (Marinade)
   - Algorithm comparison operators reversed
   - Long-running systemic gaming (not single-tx exploit)
   - Detection: Verify sorting/comparison logic matches spec

2. **Liquidity Extraction by Privileged Account** (LIBRA/MELANIA)
   - Launchpad deployer removes liquidity immediately after launch
   - Not a contract bug — it's an *intentional design* with backdoor
   - Detection: Check if LP tokens can be withdrawn by admin without timelock

3. **CPI Destination Account Injection in Multi-Step Operations** (Texture)
   - Variant of EP-050 but in a multi-step rebalance operation
   - The vault sends tokens through CPI, attacker substitutes the receiving account
   - Detection: Verify all destination accounts in CPI calls are derived/validated

4. **ZK Proof Forgery** (ZK ElGamal)
   - Invalid zero-knowledge proofs accepted by verifier
   - Enables unauthorized minting/withdrawals in confidential transfer system
   - Detection: Verify ZK proof verification is complete and uses latest program version

5. **Serial Rug Puller Pattern** (SolFire → Magnate → Kokomo)
   - Same deployer address across multiple exit scams
   - Detection: Check deployer address history for prior rug pulls

6. **Ecosystem Partner Social Engineering** (Aquabot, SolFire)
   - Scam projects gain credibility through legitimate ecosystem partnerships
   - Not a code vulnerability but relevant for trust assessment

---

## Corrections Needed

### Cetus DEX — SUI, Not Solana

**Files affected:**
- `core/exploit-patterns.md` — EP-015 (line 295), EP-091 (line 1798), cross-reference table (line 2007)
- `protocols/amm-dex-attacks.md` — line 26, 115, 164
- `solana/known-vulnerable-deps.md` — line 84, 123

**Recommended fix:** Change references from implying Solana to:
> "Cetus DEX ($223M, May 2025 on SUI — overflow pattern applicable to Solana AMMs)"

The overflow pattern (`checked_shlw` in `integer-mate`) is still valuable as a reference for custom math library auditing, but the code is in Move, not Rust. The *concept* (incorrect overflow guard allowing truncation) translates directly to Rust.

---

## Supply Chain Attack Taxonomy (Wave 3 Expansion)

Our EP-095 currently covers web3.js and general dependency poisoning. Wave 3 revealed 4 distinct supply chain sub-patterns:

### SC-1: Package Registry Poisoning
- **semantic-types on PyPI** — Malicious package on official registry
- **web3.js on npm** — Compromised legitimate package
- Detection: `cargo audit`, dependency pinning, signature verification

### SC-2: Fake Repository Impersonation
- **solana-pumpfun-bot on GitHub** — Fake repo mimicking legitimate tool
- Attacker controls multiple accounts to inflate stars/forks
- Uses obfuscated malicious packages as dependencies
- Detection: Verify repo authenticity, check dependency sources

### SC-3: Build Pipeline Compromise
- **DogWifTools** — Attacker extracted GitHub token from binary, accessed private repo
- Injected RAT into legitimate release pipeline
- Detection: Don't embed API keys in binaries, use code signing

### SC-4: Exfiltration via Blockchain
- **semantic-types** — Stolen keys exfiltrated via Solana devnet memo transactions
- Extremely stealthy — the exfiltration channel is the blockchain itself
- Detection: Monitor for unexpected devnet transactions from development environments

---

## Wave 3 Coverage Assessment

### What We Found That Was Already Covered
- Wormhole, Cashio, Mango, Crema, Raydium, Slope wallet, Nirvana, Loopscale, DEXX
- Most major 2022 exploits were well-covered by Waves 1-2

### What's Genuinely New from Wave 3
- **6 new incidents** with unique patterns worth adding as EPs
- **1 correction** (Cetus = SUI)
- **3 supply chain variants** to expand EP-095
- **Marinade SAM** is a particularly unique "slow exploit" pattern
- **ZK ElGamal** is critical for Token-2022 auditing
- **Texture** provides a concrete CPI account injection case study

### What's Still Missing (for future waves)
- More 2023 incidents (relatively quiet year, but some gaps)
- Deeper technical details on some 2025 incidents (Credix, Aquabot)
- Gaming exploits (The Heist, Star Atlas) — save for Wave 6
- NFT marketplace exploits — save for Wave 6
- MEV/sandwich attack case studies — save for Wave 6
- Conference talks and academic research — save for Wave 9

---

## Recommended Next Steps

1. **Immediate:** Add EP-098 through EP-101 to exploit-patterns.md
2. **Immediate:** Correct Cetus DEX chain attribution
3. **Immediate:** Expand EP-095 with supply chain sub-taxonomy
4. **Soon:** Update staking-attacks.md with Marinade SAM
5. **Soon:** Update token-extensions.md with ZK ElGamal
6. **Soon:** Update known-vulnerable-deps.md with supply chain tools
7. **Later:** Proceed to Wave 4 (Audit Report Mining) for deeper pattern coverage
