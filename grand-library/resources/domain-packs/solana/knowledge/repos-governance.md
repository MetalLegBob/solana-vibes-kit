---
pack: solana
topic: "Forkable Repos — Governance & Access Control"
type: repo-catalogue
confidence: 8/10
sources_checked: 20
last_verified: "2026-02-16"
---

# Governance & Access Control — Forkable Repo Catalogue

> **Verification status:** Live-verified on 2026-02-16 via GitHub API and Exa web search. Star/fork counts are approximate (±5%). License information confirmed against GitHub's license detection.

---

## Multisig Wallets

### Squads Protocol v4

- **URL:** https://github.com/Squads-Protocol/v4
- **Framework:** Anchor
- **License:** AGPL-3.0 (per GitHub detection on program repo). Note: the UI repo (`squads-v4-public-ui`) uses BSL 1.1 (Change Date: Jan 30, 2029; Additional Use Grant: NONE; Change License: GPL v2+). Verify LICENSE file manually for program code.
- **Use cases:** Reference implementation (AGPL limits commercial forking)
- **Category tags:** Multisig, treasury management, transaction batching, program upgrades

**Trust signals:**
- Audited by Trail of Bits (2023), Neodyme (2023, 2024), OtterSec (2023, 2024), Certora (Oct/Dec 2023)
- Dominant multisig on Solana — used by Solana Foundation, Jupiter, Marinade, hundreds of protocols
- ~171 stars, ~77 forks
- Actively maintained (536 commits, last push Feb 2026)
- Note: Squads also has a newer `smart-account-program` repo (last updated Feb 2026) which may be a successor/complement.

**Builder notes:**
> Extremely well-engineered. The v4 architecture is a significant improvement over v3. Key patterns to study: vault PDA derivation, time-lock mechanics, spending limits, batch transaction execution, and the "config transactions" vs "vault transactions" split. **AGPL is the key consideration for forking** — derivatives must publish source for network-accessible use. The Anchor IDL is clean and well-structured.

**Complexity:** Medium-High — core multisig is clean, full feature set (spending limits, time locks, batching) adds surface area
**Confidence:** 9/10
**Last verified:** 2026-02-16

---

### Squads MPL (v3)

> **⚠️ ARCHIVED:** Archived by owner on April 25, 2025. Read-only. Superseded by v4.

- **URL:** https://github.com/Squads-Protocol/squads-mpl
- **Framework:** Anchor
- **License:** AGPL-3.0 — **strong copyleft, network-accessible derivatives must publish source** (NOT GPL-3.0 as previously listed)
- **Use cases:** Historical reference (archived)
- **Category tags:** Multisig, treasury management

**Trust signals:**
- Audited by OtterSec, Bramah Systems, Neodyme (audit PDFs in repo)
- Was production on Solana mainnet for 1-2 years before v4
- Superseded by v4. Archived April 2025.
- ~123 stars, ~57 forks

**Builder notes:**
> Simpler than v4 — was a good starting point for custom multisig. Missing v4's spending limits and time locks. Readable, well-commented code. **However, this repo is now archived and read-only.** Use v4 as reference instead.

**Complexity:** Medium — simpler multisig model, fewer features than v4
**Confidence:** 6/10 (archived)
**Last verified:** 2026-02-16

---

## DAO Frameworks / Governance Programs

### SPL Governance (Realms)

- **URL:** https://github.com/solana-labs/solana-program-library/tree/master/governance
- **Framework:** Native Rust (no Anchor)
- **License:** Apache 2.0
- **Use cases:** Fork candidate, Reference implementation, Reusable component
- **Category tags:** DAO framework, governance, voting, proposal system, treasury, token-weighted voting

**Trust signals:**
- Official Solana Program Library — canonical governance framework
- Audited by OtterSec (v3, Sep 2022 — 1 medium finding, 0 criticals), Ackee Blockchain (Neon Labs fork). Kudelski/Neodyme audited other SPL programs but not governance specifically.
- Used by hundreds of DAOs through the Realms interface
- SPL repo had ~4,176 stars (now archived)
- **⚠️ ARCHIVED at solana-labs (March 2025).** Governance now maintained under **Mythic-Project** org. See `Mythic-Project/solana-program-library` (governance dir, 9 stars, last updated Jan 2026), `Mythic-Project/governance-program-library` (last updated Nov 2025), and `Mythic-Project/spl-governance-v3.1.2` (last updated Jan 2026).

**Builder notes:**
> The most feature-complete governance framework on Solana. Supports: multi-realm governance, token owner records, proposal lifecycle, voting with deposit, instruction execution, council + community tokens, and plugin-based voter weight (voter-weight-addin interface). **The downside:** native Rust — verbose, harder to extend than Anchor. Manual borsh serialization. The voter-weight plugin system is elegant and worth studying — it allows plugging in NFT voting, VSR, and custom voter weight calculations. The `governance-ui` (45 stars, 78 forks under Mythic-Project, last updated Dec 2025) is a large Next.js app you'd also need to fork for a custom frontend.

**Complexity:** High — large codebase, native Rust, complex state machine, plugin system
**Confidence:** 8/10
**Last verified:** 2026-02-16

---

### Voter Stake Registry (VSR)

- **URL:** https://github.com/blockworks-foundation/voter-stake-registry
- **Framework:** Anchor
- **License:** GPL-3.0 — **copyleft, derivatives must also be GPL** (NOT Apache 2.0)
- **Use cases:** Reference implementation (stale)
- **Category tags:** Governance, voting, token locking, veTokens

**Trust signals:**
- Built by Blockworks Foundation (Mango team)
- Used in production by multiple Realms DAOs
- No formal third-party audit report found for this specific fork. Bug bounty via security@mango.markets.
- ~21 stars, ~25 forks. Forked from project-serum/governance-registry.
- **⚠️ STALE:** Last meaningful commit May 2022 (~4 years ago). Not archived but functionally abandoned. 275 total commits.

**Builder notes:**
> The reference implementation for ve-token voting on Solana. Implements vote-escrowed token locking as an SPL Governance voter-weight plugin. Clean Anchor code. If building governance with lockup-weighted voting, study the patterns here but be aware the code is very dated. The registrar/voter pattern is well-designed. Key thing to study: how it implements the SPL Governance voter-weight-addin interface. **Consider ME Foundation veToken as a more modern alternative for veTokenomics.**

**Complexity:** Medium — focused scope, Anchor, but lockup mechanics and SPL Governance integration add nuance
**Confidence:** 5/10 (stale, unaudited)
**Last verified:** 2026-02-16

---

### Tribeca

- **URL:** https://github.com/TribecaHQ/tribeca
- **Framework:** Anchor
- **License:** AGPL-3.0 (confirmed) — strong copyleft, network-accessible derivatives must publish source
- **Use cases:** Historical reference
- **Category tags:** DAO framework, governance, veTokens, token locking, gauge voting

**Trust signals:**
- Used by Saber, Quarry ecosystem
- **UNAUDITED** — README explicitly states: "This code is unaudited. Use at your own risk." (Bramah Systems audit was for Saber StableSwap, not Tribeca.)
- ~135 stars, ~45 forks
- **⚠️ STALE/ABANDONED:** ~64 commits total, no meaningful activity since ~2022. Not archived but effectively dormant.

**Builder notes:**
> Inspired by Curve's ve-model. Clean separation: `govern` (core governance), `locked-voter` (ve-token locking), `gauge` (gauge voting for reward distribution). Modular design is excellent for study. **However:** project is abandoned and unaudited. Dependencies need Anchor version bumps. The gauge voting system is one of the few Solana implementations of this pattern. AGPL limits commercial forking.

**Complexity:** Medium-High — multiple interacting programs, but each is relatively clean
**Confidence:** 4/10 (stale, unaudited, AGPL)
**Last verified:** 2026-02-16

---

## Access Control Patterns

### Token-2022 Access Control Extensions

- **URL:** https://github.com/solana-labs/solana-program-library/tree/master/token/program-2022
- **Framework:** Native Rust
- **License:** Apache 2.0
- **Use cases:** Reusable component, Reference implementation
- **Category tags:** Access control, token gating, transfer controls

**Trust signals:**
- Official Solana programs — highest possible trust level
- Audited by multiple firms

**Builder notes:**
> Token-2022 is where the interesting access control primitives live: **Transfer Hooks** for custom logic on every transfer (whitelist/blacklist, compliance), **Permanent Delegate** for authority to burn/transfer any holder's tokens (regulated assets), **Confidential Transfers** for privacy. These are building blocks, not complete governance systems. Study transfer hooks for CPI-based access control patterns.

**Complexity:** Medium-High — Token-2022 is a large, complex program
**Confidence:** 9/10
**Last verified:** 2026-02-16

---

### Anchor Access Control (Built-in)

- **URL:** https://github.com/solana-foundation/anchor (redirects from coral-xyz/anchor)
- **Framework:** Anchor (it IS the framework)
- **License:** Apache 2.0
- **Use cases:** Reusable component
- **Category tags:** Access control, framework, authorization

**Trust signals:**
- The dominant Solana framework. ~4,951 stars. Audited extensively.
- Now maintained by Solana Foundation (transferred from Coral/coral-xyz).

**Builder notes:**
> Not a standalone access-control program — it's the framework you build with. Key patterns: `Signer<'info>` for authentication, `has_one = authority` for ownership, `constraint = ...` for arbitrary guards, `#[access_control]` for pre-instruction checks. For role-based access, build a config/admin PDA with role fields and use constraints to check them. **There is no equivalent to OpenZeppelin's AccessControl.sol on Solana** — RBAC is typically rolled by hand using Anchor constraints.

**Complexity:** Low (using patterns) / High (understanding macro internals)
**Confidence:** 9/10
**Last verified:** 2026-02-16

---

## Treasury Management

### Streamflow (Payment Streaming)

- **URL:** https://github.com/streamflow-finance/js-sdk
- **Framework:** Anchor + TypeScript SDK
- **License:** GPL-3.0 — **copyleft, forks must also be GPL**
- **Use cases:** Reusable component
- **Category tags:** Treasury management, token vesting, payment streaming, payroll

**Trust signals:**
- Production protocol with meaningful TVL (~149 stars, ~37 forks)
- Audited by OPCODES and FYEO (Solana)

**Builder notes:**
> If treasury needs include vesting schedules (team tokens, grants, contributor compensation), Streamflow is the reference. The streaming model (linear unlock + optional cliff) is well-implemented. For pure "multisig treasury," use Squads. For "treasury + automated disbursement," Streamflow complements Squads.

**Complexity:** Medium
**Confidence:** 8/10
**Last verified:** 2026-02-16

---

## Builder Recommendations

**If you want a multisig:**
Study Squads v4 architecture. Note: both v4 (AGPL-3.0) and v3 (AGPL-3.0, archived) are strong copyleft. Building from scratch using v4 as reference may be necessary for proprietary use.

**If you want a DAO / governance system:**
Start with SPL Governance (Apache 2.0, maximum flexibility) — now maintained under Mythic-Project. The voter-weight plugin system is the key extensibility point. Study Tribeca for ve-token/gauge patterns (but note it's unaudited and abandoned).

**If you want role-based access control:**
No dominant standalone RBAC library exists on Solana. Build it yourself using Anchor constraints — store roles in a config PDA, check with `constraint` or `has_one`. This is a gap in the ecosystem.

**If you want treasury management:**
Squads v4 for multisig custody + SPL Governance for proposal-gated voting. Streamflow (GPL-3.0) for vesting/streaming. Most serious DAOs combine Squads + SPL Governance.

## License Summary

| License | Repos | Fork-Friendly? |
|---|---|---|
| Apache 2.0 | SPL Governance, Token-2022, Anchor | **Yes** |
| AGPL-3.0 | Squads v4 (program), Squads MPL v3 (archived), Tribeca | **Restrictive** — network use triggers source disclosure |
| GPL-3.0 | VSR, Streamflow | **Conditional** — forks must be GPL |
| BSL 1.1 | Squads v4 (UI only) | **No** — restricts competing commercial use |
