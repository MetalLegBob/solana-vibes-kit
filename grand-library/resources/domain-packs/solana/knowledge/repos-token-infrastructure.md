---
pack: solana
topic: "Forkable Repos — Token Infrastructure"
type: repo-catalogue
confidence: 8/10
sources_checked: 25
last_verified: "2026-02-16"
---

# Token Infrastructure — Forkable Repo Catalogue

> **Verification status:** Live-verified on 2026-02-16 via GitHub API and Exa web search. Star/fork counts are approximate (±5%). License information confirmed against GitHub's license detection.

---

## Token Launches / Launchpads

### Rally DFS Token Bonding Curve

- **URL:** https://github.com/rally-dfs/token-bonding-curve
- **Framework:** Native Rust
- **License:** No license detected by GitHub (forked from Apache 2.0 SPL codebase — fork legality unclear)
- **Use cases:** Fork candidate, Reference implementation
- **Category tags:** Token launch, bonding curve, linear pricing

**Trust signals:**
- Open-source linear bonding curve implementation
- No known formal audit
- **⚠️ STALE:** Last meaningful activity ~2022. 493 total commits. ~60-78 stars, ~24-27 forks.

**Builder notes:**
> Clean linear bonding curve — useful starting point for custom token launch mechanics. If forking: (1) update Solana SDK versions, (2) add graduation/migration logic to a DEX for pump-style launchpads, (3) add anti-sniping protections (the base has none), (4) add overflow protection for u64/u128 operations. Native Rust — more boilerplate but simpler math than CLMMs.

**Complexity:** Medium — single program, clean math, needs modernization
**Confidence:** 7/10
**Last verified:** 2026-02-16

---

## Vesting Contracts

### Bonfida Token Vesting

- **URL:** https://github.com/Bonfida/token-vesting
- **Framework:** Native Rust
- **License:** Other (GitHub NOASSERTION — custom LICENSE file, not standard SPDX. Manual review required.)
- **Use cases:** Fork candidate, Reusable component
- **Category tags:** Vesting, token lock, cliff, linear vesting

**Trust signals:**
- Bonfida is a well-established Solana team (also built SNS)
- Deployed on mainnet for production vesting schedules
- Audited by Kudelski Security (confirmed in README)
- **Low maintenance:** Last push June 2024. ~286 stars, ~186 forks. 6 contributors. Functional but not actively developed.

**Builder notes:**
> The "boring but reliable" vesting choice. Handles cliff periods, linear vesting, SPL token compatibility. If forking: (1) add Token-2022 support, (2) add batch creation for multiple recipients, (3) consider adding cancellation logic. Native Rust — more control, lower compute costs, but more boilerplate than Anchor alternatives.

**Complexity:** Low-Medium — single program, straightforward state machine
**Confidence:** 7/10
**Last verified:** 2026-02-16

---

### Streamflow Protocol

- **URL:** https://github.com/streamflow-finance/js-sdk
- **Framework:** Anchor + TypeScript SDK
- **License:** GPL-3.0 — **copyleft, forks must also be GPL**
- **Use cases:** Reusable component, Reference implementation
- **Category tags:** Vesting, token streaming, cliff, graded vesting, batch distribution

**Trust signals:**
- Dominant vesting platform: 28.5K+ projects, $1.4B+ TVL, 1.3M+ users
- Audited by OPCODES and FYEO (Solana), OtterSec (Aptos), MoveBit (Sui)
- Actively maintained (~149 stars, ~37 forks)
- Production-proven with major Solana protocols

**Builder notes:**
> Most feature-complete vesting on Solana. The JS SDK is excellent for integration. On-chain program source NOT publicly available. Old repos (timelock-crate, streamflow-program) archived March 2023. JS SDK wraps closed-source deployed program. The gold standard feature set: linear, graded, cliff, cancelable/non-cancelable, batch creation. If integrating, customize fee structures and governance over vesting parameters.

**Complexity:** Medium — SDK is straightforward, on-chain program more complex
**Confidence:** 8/10
**Last verified:** 2026-02-16

---

### ME Foundation veToken

- **URL:** https://github.com/me-foundation/vetoken
- **Framework:** Anchor
- **License:** Apache 2.0 (confirmed)
- **Use cases:** Fork candidate, Reference implementation
- **Category tags:** Vesting, vote-escrow, staking, governance, veTokenomics

**Trust signals:**
- Built by ME Foundation (Magic Eden)
- SPL Token / Token-2022 support
- Features tiered lockup multipliers, proposal creation, and voting
- Open-source toolkit designed for forking
- Very low community traction: ~3-4 stars, 0 forks. New repo (created ~April 2024).

**Builder notes:**
> The only production-quality veToken implementation on Solana. If building veTokenomics (Curve-style locking with voting power), start here. Features different voting power multipliers per lockup tier, proposal creation, and voting. If forking: (1) customize lockup tiers and multiplier math, (2) add gauge voting for emission direction, (3) consider bribe market integration. veTokenomics on Solana is nascent — first-mover advantage for builders.

**Complexity:** High — multi-account architecture, time-decay math, governance integration
**Confidence:** 7/10
**Last verified:** 2026-02-16

---

## Token Distribution / Airdrops

### Jito Foundation Distributor

- **URL:** https://github.com/jito-foundation/distributor
- **Framework:** Anchor
- **License:** GPL-3.0 — **copyleft, forks must also be GPL**
- **Use cases:** Fork candidate, Reusable component
- **Category tags:** Merkle airdrop, token distribution, vesting, claim mechanics

**Trust signals:**
- Built by Jito Foundation — top-tier Solana team
- Used for JTO token distribution (one of the largest Solana airdrops)
- Production-proven at scale
- Audited by OtterSec (confirmed — audit directory in repo)
- ~72 stars, ~61 forks
- **⚠️ Supply-chain risk:** Malicious typosquatted npm package `@jito-lab/provider` discovered June 2025. NOT official Jito code. Use only official `@jito-foundation/` scoped packages.

**Builder notes:**
> **The single most valuable repo for builders doing a token launch with an airdrop.** Solves two problems at once: efficient Merkle claim distribution AND linear vesting of claimed tokens. Fork it, customize vesting schedule parameters, deploy. If forking: (1) add multiple vesting schedules per distribution, (2) add clawback for unvested tokens, (3) customize claim window logic. Anchor-based with clean DX.

**Complexity:** Medium — Merkle verification + vesting state machine
**Confidence:** 9/10
**Last verified:** 2026-02-16

---

### Saber Merkle Distributor

- **URL:** https://github.com/saber-hq/merkle-distributor
- **Framework:** Anchor
- **License:** GPL-3.0 — **copyleft, forks must also be GPL**
- **Use cases:** Fork candidate, Reference implementation
- **Category tags:** Merkle airdrop, token distribution

**Trust signals:**
- Fork of Uniswap's Ethereum Merkle distributor, adapted for Solana
- Well-known in the ecosystem, forked by multiple projects
- **Saber team stale since ~2023.** 61 total commits. Functional but not receiving updates.
- ~192 stars, ~61 forks

**Builder notes:**
> The OG Solana Merkle distributor. Clean, simple, proven pattern. Does NOT include vesting — pure "claim your tokens now" distribution. If you just need a basic Merkle airdrop without vesting, this is the cleanest starting point. Simpler codebase than Jito's (easier to audit), but may need Anchor/SDK version updates.

**Complexity:** Low-Medium — straightforward Merkle verification
**Confidence:** 8/10
**Last verified:** 2026-02-16

---

### Jupiter Merkle Distributor

- **URL:** https://github.com/jup-ag/merkle-distributor (unconfirmed — may be private)
- **Framework:** Anchor
- **License:** Unknown — repo may not be public
- **Use cases:** Reference implementation
- **Category tags:** Merkle airdrop, large-scale distribution

**Trust signals:**
- Built by Jupiter — #1 DEX aggregator on Solana
- Used for Jupuary: 700M JUP tokens to 2M wallets ($616M value)
- One of the largest Solana airdrops ever executed successfully
- **⚠️ Repo access uncertain:** `jup-ag/merkle-distributor` not confirmed as public. The SDK repo (`jup-ag/merkle-distributor-sdk`, 16 stars) was archived Nov 2025. On-chain program may be in private repo.

**Builder notes:**
> The most battle-tested large-scale airdrop implementation on Solana. Jupuary 2025 stress-tested it at a scale no other distributor has matched. Study for optimizations around handling millions of claims. Jupiter's airdrop was fully unlocked (no vesting) — add vesting if needed.

**Complexity:** Medium — same Merkle pattern at scale
**Confidence:** 5/10 (repo not confirmed public, SDK archived)
**Last verified:** 2026-02-16

---

## Staking Programs

### SPL Stake Pool

- **URL:** https://github.com/solana-labs/solana-program-library/tree/master/stake-pool
- **Framework:** Native Rust
- **License:** Apache 2.0
- **Use cases:** Fork candidate, Reference implementation
- **Category tags:** Staking, stake pool, validator delegation, LST

**Trust signals:**
- Official Solana Labs — canonical implementation
- Audited multiple times (OtterSec noted front-run deposit vulnerability — patched)
- SPL repo had ~4,176 stars (now archived March 2025). Stake pool code maintained via Anza/community.
- **⚠️ SPL repo archived March 2025.** Individual programs migrated to separate repos under various orgs.

**Builder notes:**
> If building an LST, this is the foundation most teams start from. Handles validator delegation, stake account management, pool token minting/burning. Study the front-run deposit vulnerability patch carefully. Does NOT include MEV reward distribution (need Jito for that). Native Rust — significant boilerplate. High complexity fork — not for beginners.

**Complexity:** High — multi-account, epoch-based rewards, validator delegation
**Confidence:** 9/10
**Last verified:** 2026-02-16

---

### Marinade Finance Liquid Staking

- **URL:** https://github.com/marinade-finance/liquid-staking-program
- **Framework:** Anchor (has Anchor.toml, uses anchor-lang — contrary to earlier reports of native Rust)
- **License:** Custom (GitHub cannot detect SPDX from LICENSE.md — manual review required before forking)
- **Use cases:** Reference implementation
- **Category tags:** Staking, liquid staking, LST, mSOL

**Trust signals:**
- Largest Solana LST protocol (~$2.5B TVL, 42% LST market share)
- Audited by Kudelski Security, Ackee Blockchain, Neodyme (Q4 2021); Neodyme, Sec3 (2023 v2.0 upgrade)
- Known exploit: Lost $5M when validators gamed unstake algorithm for 126 epochs
- Actively maintained with 400+ validator set
- ~95-118 stars, ~27-37 forks
- **⚠️ Validator sandwich issue (June-Oct 2025):** ~6% of leader slots contained sandwich attacks from validators in Marinade's Stake Auction Marketplace. Marinade blacklisted offending validators and implemented bond slashing. Operational issue, not program code vulnerability.

**Builder notes:**
> The most battle-tested LST on Solana, but study the validator gaming exploit carefully before building. The $5M exploit highlights importance of auction mechanism design. Study: share-based exchange rate model (mSOL appreciates over time), validator delegation strategy, instant vs delayed unstake mechanics. **Verify license before forking** — LICENSE.md not auto-detected by GitHub. Even if not forkable, the #1 reference for production LST architecture.

**Complexity:** Very High — multi-program, epoch-based, validator management, unstake queues
**Confidence:** 8/10
**Last verified:** 2026-02-16

---

## Token-2022 / Token Extensions

### Solana Program Examples (Token-2022 Section)

- **URL:** https://github.com/solana-developers/program-examples/tree/main/tokens/token-2022
- **Framework:** Anchor + Native Rust examples
- **License:** MIT (per GitHub — not Apache 2.0 as previously assumed)
- **Use cases:** Fork candidate, Reference implementation
- **Category tags:** Token-2022, transfer hook, non-transferable, whitelist, extensions

**Trust signals:**
- Official Solana Developers repository
- Designed specifically for developers to learn from and fork
- Maintained by Solana developer relations team
- ~1,368 stars, ~517 forks. Last push: Feb 2026. 50+ contributors.

**Builder notes:**
> Best starting point for learning Token-2022 extensions by example. Key examples: (1) `transfer-hook/whitelist` — production-ready pattern for KYC/compliance gating, (2) `non-transferable` — soulbound token implementation. Intentionally simple, well-commented. Fork the specific extension example you need rather than building from scratch.

**Complexity:** Low-Medium — individual examples are simple
**Confidence:** 9/10
**Last verified:** 2026-02-16

---

### Civic Transfer Hook Example

- **URL:** https://github.com/civicteam/token-extensions-transfer-hook
- **Framework:** Anchor
- **License:** No license detected by GitHub — manual review required
- **Use cases:** Fork candidate, Reference implementation
- **Category tags:** Token-2022, transfer hook, KYC, compliance, Civic Pass

**Trust signals:**
- Built by Civic — established identity/compliance infrastructure on Solana
- Production implementation of KYC-gated transfers
- Civic is a real company with deployed products
- ~6 stars, ~2 forks. Small repo, 21 commits.

**Builder notes:**
> Best reference for compliance-gated token transfers using Token-2022 transfer hooks. Integrates Civic Pass (identity verification) with transfer hook logic so only KYC-verified wallets can send/receive. If building RWA, securities, or compliance-required tokens, start here. Fork and replace Civic Pass with your own verification if needed. Key learning: how to structure Extra Account Metas for transfer hooks requiring external verification state.

**Complexity:** Medium — transfer hook + external account integration
**Confidence:** 8/10
**Last verified:** 2026-02-16

---

### Solana Foundation Mosaic

- **URL:** https://github.com/solana-foundation/mosaic
- **Framework:** TypeScript SDK
- **License:** MIT (confirmed)
- **Use cases:** Reusable component
- **Category tags:** Token-2022, stablecoin templates, RWA templates, TypeScript SDK

**Trust signals:**
- Official Solana Foundation
- Pre-built templates for common Token-2022 use cases
- ~16 stars, ~9 forks. Created July 2025, actively maintained (last push Feb 2026).
- sRFC-37 integration flagged as "not ready for mainnet use" in README.

**Builder notes:**
> TypeScript SDK (not on-chain programs) with templates for creating Token-2022 tokens with specific extension combos. Templates for: stablecoins (Transfer Fee + Permanent Delegate + Metadata), RWAs (Transfer Hook + Default Account State + Metadata), arcade tokens. Essential client-side tooling for Token-2022 integration. Saves significant boilerplate.

**Complexity:** Low — TypeScript SDK, template-based
**Confidence:** 7/10
**Last verified:** 2026-02-16

---

## Recommended Fork Paths

| Builder goal | Start with | Alternative | License note |
|---|---|---|---|
| Token launchpad | Rally DFS Bonding Curve | Study Pump.fun docs for reference | No license detected |
| Vested airdrop | Jito Distributor (GPL-3.0) | Saber Merkle (GPL-3.0) + Bonfida Vesting | GPL-3.0 copyleft |
| Liquid staking protocol | SPL Stake Pool + study Marinade | Very High complexity | Apache 2.0 (SPL) |
| Compliance token (Token-2022) | Civic Transfer Hook | Solana Program Examples | No license / MIT |
| veTokenomics | ME Foundation veToken | — | Apache 2.0 |
| Simple Merkle airdrop | Saber Merkle Distributor (GPL-3.0) | Jupiter Merkle Distributor | GPL-3.0 copyleft |

## License Summary

| Repo | License | Fork-safe? |
|---|---|---|
| Rally DFS Token Bonding Curve | No license detected (forked from Apache 2.0 SPL) | ⚠️ Unclear — no license file |
| Bonfida Token Vesting | NOASSERTION (custom LICENSE file) | ⚠️ Manual review required |
| Streamflow JS SDK | GPL-3.0 | Copyleft — forks must be GPL |
| ME Foundation veToken | Apache 2.0 | **Yes** |
| Jito Foundation Distributor | GPL-3.0 | Copyleft — forks must be GPL |
| Saber Merkle Distributor | GPL-3.0 | Copyleft — forks must be GPL |
| Jupiter Merkle Distributor | Unknown (repo may not be public) | ⚠️ Cannot verify |
| SPL Stake Pool | Apache 2.0 | **Yes** |
| Marinade Liquid Staking | Custom (non-SPDX LICENSE.md) | ⚠️ Manual review required |
| Solana Program Examples | MIT | **Yes** |
| Civic Transfer Hook | No license detected | ⚠️ Manual review required |
| Solana Foundation Mosaic | MIT | **Yes** |
