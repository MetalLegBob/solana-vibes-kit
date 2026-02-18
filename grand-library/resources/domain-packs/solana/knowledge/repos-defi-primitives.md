---
pack: solana
topic: "Forkable Repos — DeFi Primitives"
type: repo-catalogue
confidence: 7/10
sources_checked: 30
last_verified: "2026-02-16"
---

# DeFi Primitives — Forkable Repo Catalogue

> **Verification status:** Live-verified on 2026-02-16 via GitHub API and Exa web search. Star/fork counts are approximate (±5%). License information confirmed against GitHub's license detection.

---

## AMMs (Automated Market Makers)

### Orca Whirlpools

- **URL:** https://github.com/orca-so/whirlpools
- **Framework:** Anchor
- **License:** "Other" per GitHub detection — **custom license, NOT Apache 2.0. Verify LICENSE file manually before forking.**
- **Use cases:** Fork candidate (with license review), Reference implementation, Reusable SDK
- **Category tags:** AMM, concentrated liquidity, CLMM

**Trust signals:**
- Audited by Kudelski Security, Neodyme, OtterSec, and Sec3
- ~510 stars, ~310 forks. Actively maintained with V2 SDK rewrite.
- No major on-chain exploits. Billions in cumulative volume
- Production-proven across the Solana DeFi ecosystem

**Builder notes:**
> The best-documented CLMM on Solana. Clean Anchor code in `programs/whirlpool`. The tick-array system chunks price ranges into fixed-size arrays — more Solana-friendly than Uniswap V3's linked-list approach. If forking, study the `sqrt_price` calculations carefully and expect to customize fee tier logic and pool creation permissions. The V2 SDK uses Rust-first compiled to WASM. The `oracle` account pattern for on-chain TWAP adds accounts to every swap instruction — consider whether you need it. **License is listed as "Other" on GitHub — review the actual LICENSE file before building anything commercial on top.**

**Complexity:** High — concentrated liquidity math, tick arrays, multi-account architecture
**Confidence:** 8/10 (license uncertainty reduces from 9)
**Last verified:** 2026-02-16

---

### Raydium CP-Swap

- **URL:** https://github.com/raydium-io/raydium-cp-swap
- **Framework:** Anchor
- **License:** Apache 2.0
- **Use cases:** Fork candidate
- **Category tags:** AMM, constant-product

**Trust signals:**
- Raydium is a top-3 Solana DEX by volume
- Simpler program with clean codebase
- ~226 stars. Actively maintained.
- **⚠️ CRITICAL (March 2025):** Authority private key compromise — attacker withdrew ~$505K in fees. Vulnerability was in key management, not program logic. Patched via authority rotation. $505K bug bounty paid.
- **⚠️ Supply chain (2025):** Malicious npm packages impersonating Raydium discovered. Use only official `@raydium-io/` scoped packages.

**Builder notes:**
> The best fork candidate if you just need a basic x*y=k AMM. Straightforward constant-product with standard LP token minting. Much simpler than CLMMs — start here if concentrated liquidity is overkill for your use case. Clean Anchor code, minimal surface area. **Note the March 2025 authority compromise** — the program logic itself was not exploited, but the incident highlights the importance of key management when deploying forks.

**Complexity:** Low-Medium — straightforward constant-product math
**Confidence:** 7/10 (reduced due to security incident)
**Last verified:** 2026-02-16

---

### Raydium CLMM

- **URL:** https://github.com/raydium-io/raydium-clmm
- **Framework:** Anchor
- **License:** Apache 2.0
- **Use cases:** Fork candidate, Reference implementation
- **Category tags:** AMM, concentrated liquidity, CLMM

**Trust signals:**
- Audited by MadShield (confirmed) and OtterSec
- ~365 stars, ~320 forks
- Raydium AMM V4 had a 2022 exploit (compromised private key, not program logic). CLMM itself has no known on-chain exploit
- Active development through 2024-2025

**Builder notes:**
> Solid CLMM but less polished than Orca's — sparser comments. Tick math is heavily inspired by Uniswap V3 (closer to a direct port than Orca's). If forking, protocol fee and fund fee structures are Raydium-specific and need reworking. For most builders, Orca Whirlpools is the better CLMM fork candidate due to documentation quality.

**Complexity:** High — tick-based CLMM, similar complexity to Orca
**Confidence:** 8/10
**Last verified:** 2026-02-16

---

### Saber Stable Swap

- **URL:** https://github.com/saber-hq/stable-swap
- **Framework:** Native Rust
- **License:** Apache 2.0
- **Use cases:** Fork candidate
- **Category tags:** AMM, stable swap, StableSwap invariant

**Trust signals:**
- Audited by Bramah Systems (confirmed)
- ~419 stars
- Dominant stablecoin AMM on Solana in 2021-2022
- **⚠️ STALE:** Last meaningful commit March 2024 (~12 months ago). Not archived but no active development.

**Builder notes:**
> The canonical Curve-style StableSwap on Solana. Clean separation of math library and on-chain program. Best fork candidate for stable-pair AMMs, wrapped-asset AMMs, or any low-slippage same-price-asset swaps. The math follows Curve's invariant. Also see `saber-hq/quarry` for liquidity mining rewards (AGPL-3.0 though). **Code is solid but stale — expect to update Solana SDK dependencies if forking.**

**Complexity:** Medium — well-structured math, simpler than CLMMs
**Confidence:** 7/10 (reduced due to staleness)
**Last verified:** 2026-02-16

---

### Phoenix DEX

- **URL:** https://github.com/Ellipsis-Labs/phoenix-v1
- **Framework:** Native Rust (no Anchor)
- **License:** BSL-1.1 (Business Source License) — **NOT Apache 2.0. Restricted until Feb 2027. Change License: GPL v2 or later. Cannot be used for competing commercial use before change date.**
- **Use cases:** Reference implementation (license restricts forking)
- **Category tags:** DEX, CLOB, order book

**Trust signals:**
- Audited by OtterSec
- ~247 stars
- Built by Ellipsis Labs (well-funded, active development — also maintain solana-verify)
- No known exploits

**Builder notes:**
> Full on-chain central limit order book — one of the most complex Solana programs in existence. Native Rust with custom serialization and aggressive compute-unit optimization. Gold standard for CLOB design on Solana. **BSL-1.1 is a major fork blocker** — you cannot build competing commercial products until Feb 2027 when it converts to GPL v2+. Best used as an architectural reference for high-performance native Rust programs. No Anchor IDL means harder client integration.

**Complexity:** Very High — full CLOB, native Rust, custom serialization
**Confidence:** 8/10
**Last verified:** 2026-02-16

---

### OpenBook V2

- **URL:** https://github.com/openbook-dex/openbook-v2
- **Framework:** Anchor
- **License:** Dual MIT / GPL-3.0 (confirmed) — **choose either license; MIT allows permissive forking**
- **Use cases:** Fork candidate, Reference implementation
- **Category tags:** DEX, CLOB, order book

**Trust signals:**
- Community rewrite from scratch (NOT patched Serum code)
- ~254 stars
- Addressed many Serum-era design issues (cranking mechanism, event queue)
- **⚠️ STALE:** No meaningful activity for >18 months. Effectively abandoned. Not archived but no active development.

**Builder notes:**
> The most forkable on-chain order book on Solana — uses Anchor unlike Phoenix. Well-designed order book data structures. The crank/event-queue system is cleaner than Serum's but still requires off-chain cranking infrastructure. **Dual MIT/GPL-3.0 is more permissive than previously documented** — MIT option allows unrestricted commercial forking. However, the project appears abandoned — expect significant dependency updates if forking. For an actively maintained CLOB reference, look at Phoenix (BSL-1.1 but excellent architecture study).

**Complexity:** High — full on-chain order book
**Confidence:** 5/10 (reduced due to staleness)
**Last verified:** 2026-02-16

---

### Meteora DLMM

- **URL:** https://github.com/MeteoraAg/dlmm-sdk
- **Framework:** Anchor
- **License:** No license detected on GitHub — **significant risk flag. Cannot legally fork without explicit permission.**
- **Use cases:** Reference implementation only (no license)
- **Category tags:** AMM, DLMM, concentrated liquidity, bin-based

**Trust signals:**
- Meteora (formerly Mercurial) live since 2021
- Audited by Zenith, Offside Labs, OtterSec, and Sec3
- ~280 stars
- Active in memecoin/launchpad space (2024-2025)

**Builder notes:**
> Uses a bin-based system (inspired by Trader Joe's Liquidity Book on Avalanche) rather than tick arrays. Each bin holds liquidity at a specific price — conceptually simpler than tick math. Code quality is decent. **No license detected — this is a hard blocker for forking.** Without a license, all rights are reserved by default. Contact Meteora for licensing terms before building on this code. Reference only.

**Complexity:** High — bin-based liquidity, different tradeoffs from tick-based CLMMs
**Confidence:** 5/10 (no license is a hard blocker)
**Last verified:** 2026-02-16

---

## Lending Protocols

### Solend (Save)

> **⚠️ REBRANDED & ARCHIVED:** Rebranded to "Save" in July 2024. Original `solendprotocol/solend-sdk` repo archived ~Oct 2022. Active development at `solendprotocol/public`.

- **URL:** https://github.com/solendprotocol/public (active repo)
- **Original URL:** https://github.com/solendprotocol/solend-sdk (archived)
- **Framework:** Native Rust
- **License:** Apache 2.0
- **Use cases:** Fork candidate, Reference implementation
- **Category tags:** Lending, borrowing, interest rates, liquidation

**Trust signals:**
- Audited by Kudelski Security
- One of the oldest lending protocols on Solana
- Had governance controversy in 2022 (social issue, not code exploit)
- **⚠️ ARCHIVED:** Original solend-sdk repo archived ~Oct 2022. Active repo is `solendprotocol/public`.
- Rebranded to "Save" July 2024

**Builder notes:**
> Port of SPL Token Lending with significant enhancements. Compound V2-style architecture. **Top fork candidate for lending protocols.** Interest rate model, reserve management, and obligation tracking are production-proven. Key areas to customize: interest rate curves, collateral factor tables, oracle integration (uses Pyth + Switchboard). Native Rust — more boilerplate but more control. The liquidation bonus/close-factor logic serves as liquidation engine reference too. **Use the `solendprotocol/public` repo, not the archived `solend-sdk`.**

**Complexity:** High — full lending protocol with interest rate models, collateral, liquidation
**Confidence:** 7/10 (reduced due to rebrand/archive complexity)
**Last verified:** 2026-02-16

---

### SPL Token Lending

> **⚠️ ARCHIVED:** Entire SPL repo archived March 2025. Token Lending was NOT migrated to a separate repo. Effectively abandoned.

- **URL:** https://github.com/solana-labs/solana-program-library/tree/master/token-lending (archived)
- **Framework:** Native Rust
- **License:** Apache 2.0
- **Use cases:** Historical reference (archived, unmigrated)
- **Category tags:** Lending, reference implementation

**Trust signals:**
- Official Solana Labs / SPL program
- Ancestor of Solend and several other lending protocols
- Part of SPL monorepo (~4,176 stars total)
- **⚠️ ARCHIVED:** SPL repo archived March 2025. Token Lending was NOT migrated to a standalone repo unlike other SPL programs.
- **⚠️ UNAUDITED:** No formal third-party audit found for SPL Token Lending specifically.

**Builder notes:**
> The canonical minimal lending program on Solana. Start here to understand lending architecture from first principles. Clean but dated code — predates Anchor conventions. **Archived and unmigrated** — this program is effectively abandoned. For a production lending fork, use Solend/Save (`solendprotocol/public`) instead. Historical reference value remains high for understanding the fundamental lending architecture that Solend and others built upon.

**Complexity:** Medium — simpler than Solend/Jet, minimal viable lending
**Confidence:** 5/10 (archived, unaudited, unmigrated)
**Last verified:** 2026-02-16

---

### Jet Protocol V2

> **⚠️ DEFUNCT:** Repository returns 404. Jet Labs appears to have shut down or made the repo private. Do not depend on this.

- **URL:** https://github.com/jet-lab/jet-v2 (404 — not found)
- **Framework:** Anchor
- **License:** Was AGPL-3.0
- **Use cases:** N/A — defunct
- **Category tags:** Lending, borrowing, margin, cross-collateral

**Trust signals:**
- Was audited by OtterSec
- **⚠️ DEFUNCT:** Repo returns 404 as of Feb 2026. Either deleted or made private.
- Team appears to have shut down or pivoted entirely.

**Builder notes:**
> **This project no longer exists publicly.** Previously was an architecturally ambitious multi-program lending system with "margin accounts," cross-collateral, and "airspace" isolation. If you have a local clone from before deletion, the patterns (especially margin/cross-collateral) remain valuable as reference. Otherwise, use Solend/Save for lending protocol reference.

**Complexity:** N/A — defunct
**Confidence:** 0/10 (defunct)
**Last verified:** 2026-02-16

---

## Escrow Patterns

### Anchor Escrow (Educational)

- **URL:** https://github.com/ironaddicteddog/anchor-escrow
- **Framework:** Anchor
- **License:** MIT (confirmed)
- **Use cases:** Fork candidate, Reference implementation
- **Category tags:** Escrow

**Trust signals:**
- Most-referenced escrow tutorial in the Solana ecosystem
- ~195 stars
- Based on Paulx's original escrow tutorial, ported to Anchor

**Builder notes:**
> Clean, minimal two-party token exchange with maker/taker flow. **Excellent starting point** for custom escrow logic. Would need hardening for production: timeouts, partial fills, fee mechanisms, multi-asset support. Also see the escrow examples in Anchor's own test suite (`anchor/tests/escrow`).

**Complexity:** Low — intentionally minimal and educational
**Confidence:** 9/10
**Last verified:** 2026-02-16

---

### Streamflow Protocol

- **URL:** https://github.com/streamflow-finance/js-sdk
- **Framework:** Anchor + TypeScript SDK
- **License:** GPL-3.0 (confirmed) — **copyleft, forks must also be GPL. NOT Apache 2.0.**
- **Use cases:** Reusable component (SDK integration)
- **Category tags:** Escrow, vesting, token streaming, time-locked payments

**Trust signals:**
- Production protocol: 28.5K+ projects, $1.4B+ TVL
- Audited by OPCODES and FYEO (Solana)
- Actively maintained with multiple audits
- Used by major Solana protocols for team/investor vesting
- **Note:** On-chain program source is NOT publicly available in this repo. The js-sdk is the public interface; the program itself may not be open-source.

**Builder notes:**
> Best-in-class for time-based escrow (vesting, streaming payments, cliff + linear release). The SDK provides clean integration for using Streamflow's deployed program. **GPL-3.0 is a significant consideration** — any forked code must also be GPL. The on-chain program source does not appear to be publicly available — this is an SDK for interacting with Streamflow's deployed program, not a forkable program. Use as a service/integration, not as a fork candidate.

**Complexity:** Low (SDK integration) — you're integrating with their deployed program
**Confidence:** 7/10 (reduced: GPL, program source not public)
**Last verified:** 2026-02-16

---

## Vaults

### SPL Stake Pool

- **URL:** https://github.com/solana-labs/solana-program-library/tree/master/stake-pool
- **Framework:** Native Rust
- **License:** Apache 2.0
- **Use cases:** Fork candidate
- **Category tags:** Vault, stake pool, liquid staking, LST

**Trust signals:**
- Official Solana Labs implementation
- Audited by Neodyme
- Used by multiple LST providers
- Known vulnerability (front-run deposit exploit) was identified and patched
- **⚠️ ARCHIVED at solana-labs (March 2025).** Stake pool was migrated to `solana-program/stake-pool` (verify current location).

**Builder notes:**
> The canonical staking vault on Solana. If launching an LST/stake-pool product, forking this is the standard approach. Handles deposits, withdrawals, validator management, fee collection, epoch-based rewards. Study the front-run deposit vulnerability patch carefully. Does NOT include MEV reward distribution — need Jito's layer for that. **Note: SPL repo is archived.** Check for the migrated standalone repo under `solana-program` org.

**Complexity:** High — multi-account architecture, epoch-based reward math
**Confidence:** 7/10 (reduced: archived, needs migration verification)
**Last verified:** 2026-02-16

---

### Drift Vaults

- **URL:** https://github.com/drift-labs/drift-vaults
- **Framework:** Anchor
- **License:** Apache 2.0 (confirmed)
- **Use cases:** Fork candidate
- **Category tags:** Vault, managed fund, delegated trading

**Trust signals:**
- Part of the Drift ecosystem (largest Solana perps DEX)
- Drift audited by OtterSec
- ~44 stars

**Builder notes:**
> Clean "managed fund" vault pattern: users deposit USDC, manager trades on their behalf, profits/losses socialized. The share-token accounting (internal tracking without separate SPL token) is a useful pattern. **Excellent fork candidate for strategy vaults or managed fund products.** Would need modification to work with protocols other than Drift. Also see: `drift-labs/protocol-v2` (Apache 2.0, ~365 stars) for the full perpetuals/spot/lending program.

**Complexity:** Medium — clean vault logic, complexity is in the Drift integration
**Confidence:** 8/10
**Last verified:** 2026-02-16

---

## Liquidation Engines

### Solend Public Liquidator

- **URL:** https://github.com/solendprotocol/public (liquidator code within the public monorepo)
- **Original URL:** https://github.com/solendprotocol/public-liquidator (may redirect or be archived)
- **Framework:** TypeScript (off-chain)
- **License:** MIT (confirmed — NOT Apache 2.0)
- **Use cases:** Fork candidate
- **Category tags:** Liquidation, bot, MEV

**Trust signals:**
- Official Solend/Save liquidation bot, used in production
- Helps decentralize the liquidation process
- **Note:** May have been consolidated into the `solendprotocol/public` monorepo along with the rebrand to Save.

**Builder notes:**
> Off-chain liquidation bot that monitors obligations, identifies underwater positions, and submits liquidation transactions. Good reference for: account scanning, health factor calculation, profitability analysis, and execution. **If building a lending protocol, you NEED liquidation infrastructure.** The on-chain liquidation logic is in the Solend lending program (see Solend entry above). MIT license allows unrestricted commercial use.

**Complexity:** Medium — straightforward off-chain logic, complexity in performance and edge cases
**Confidence:** 7/10 (reduced: repo may have moved)
**Last verified:** 2026-02-16

---

### Drift Protocol V2

- **URL:** https://github.com/drift-labs/protocol-v2
- **Framework:** Anchor
- **License:** Apache 2.0
- **Use cases:** Reference implementation
- **Category tags:** Perpetuals, liquidation, spot, lending

**Trust signals:**
- Audited by OtterSec
- Largest perpetuals DEX on Solana
- ~365 stars, ~213 forks. Very actively maintained (daily commits).

**Builder notes:**
> One of the largest single Solana programs — covers perpetuals, spot, borrow/lend, insurance fund, and liquidation in one program. The liquidation priority system (liquidator bonus + insurance fund backstop) is a good reference for robust liquidation incentive design. **Not practical to fork just the liquidation engine** — deeply integrated with margin system. Their keeper bot (`drift-labs/keeper-bots-v2`) is also open source for off-chain infrastructure reference.

**Complexity:** Very High — massive multi-feature program
**Confidence:** 9/10
**Last verified:** 2026-02-16

---

## Quick Reference: Best Fork by Use Case

| If you need... | Fork this | Why |
|---|---|---|
| Simple constant-product AMM | Raydium CP-Swap | Clean Anchor, Apache 2.0, minimal |
| Concentrated liquidity AMM | Orca Whirlpools | Best docs, production-proven (verify custom license) |
| StableSwap AMM | Saber Stable Swap | Apache 2.0, Curve math, clean code (stale) |
| On-chain order book (reference) | Phoenix V1 | BSL-1.1 (restricted until Feb 2027), gold-standard CLOB |
| On-chain order book (forkable) | OpenBook V2 | MIT option available, Anchor (but stale) |
| Basic lending protocol | Solend (Save) | Apache 2.0, battle-tested, Compound V2-style |
| Token escrow | Anchor Escrow | MIT, simple, well-documented |
| Vesting/streaming (integration) | Streamflow | GPL-3.0, production-grade (SDK only, not forkable program) |
| Strategy/managed vault | Drift Vaults | Apache 2.0, clean share accounting |
| Staking/LST vault | SPL Stake Pool | Apache 2.0, official Solana Labs (archived) |
| Liquidation bot | Solend Public Liquidator | MIT, practical starting point |

## License Summary

| License | Repos | Fork-Friendly? |
|---|---|---|
| Apache 2.0 | Raydium CP-Swap, Raydium CLMM, Saber, Solend/Save, SPL Token Lending, SPL Stake Pool, Drift Vaults, Drift V2 | **Yes** |
| MIT | Anchor Escrow, Solend Public Liquidator | **Yes** |
| Dual MIT/GPL-3.0 | OpenBook V2 | **Yes** (choose MIT) |
| GPL-3.0 | Streamflow | **Conditional** — forks must be GPL |
| BSL-1.1 | Phoenix V1 | **No** — restricted until Feb 2027 |
| "Other" (custom) | Orca Whirlpools | **Verify** — not standard Apache/MIT |
| No license | Meteora DLMM | **No** — all rights reserved by default |
| DEFUNCT | Jet V2 | N/A — repo deleted |
