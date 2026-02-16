---
pack: solana
topic: "Forkable Repos — Governance & Access Control"
type: repo-catalogue
confidence: 8/10
sources_checked: 20
last_verified: "2026-02-16"
---

# Governance & Access Control — Forkable Repo Catalogue

> **Verification note:** Fields marked [VERIFY] need live confirmation. Run `gh repo view <org/repo> --json licenseInfo,stargazerCount,forkCount,updatedAt` to verify.

---

## Multisig Wallets

### Squads Protocol v4

- **URL:** https://github.com/Squads-Protocol/v4
- **Framework:** Anchor
- **License:** BSL 1.1 (Business Source License) — **restricts commercial use/forking for competing products until change date.** [VERIFY exact change date and additional use grants]
- **Use cases:** Reference implementation (BSL limits forking)
- **Category tags:** Multisig, treasury management, transaction batching, program upgrades

**Trust signals:**
- Audited by OtterSec and Neodyme
- Dominant multisig on Solana — used by Solana Foundation, Jupiter, Marinade, hundreds of protocols
- ~200-400+ stars [VERIFY]
- Actively maintained

**Builder notes:**
> Extremely well-engineered. The v4 architecture is a significant improvement over v3. Key patterns to study: vault PDA derivation, time-lock mechanics, spending limits, batch transaction execution, and the "config transactions" vs "vault transactions" split. **BSL is the blocker for forking** — consult legal. The Anchor IDL is clean and well-structured.

**Complexity:** Medium-High — core multisig is clean, full feature set (spending limits, time locks, batching) adds surface area
**Confidence:** 9/10
**Last verified:** 2026-02-16

---

### Squads MPL (v3)

- **URL:** https://github.com/Squads-Protocol/squads-mpl
- **Framework:** Anchor
- **License:** GPL-3.0 [VERIFY] — copyleft, derivatives must also be GPL
- **Use cases:** Fork candidate (with GPL compliance), Reference implementation
- **Category tags:** Multisig, treasury management

**Trust signals:**
- Audited by OtterSec
- Was production on Solana mainnet for 1-2 years before v4
- Likely superseded by v4 in new deployments
- ~100-200 stars [VERIFY]

**Builder notes:**
> Simpler than v4 — good starting point for a custom multisig if you're okay with GPL. Missing v4's spending limits and time locks. Readable, well-commented code. If forking, add: configurable thresholds, time-lock support, and CPI guards.

**Complexity:** Medium — simpler multisig model, fewer features than v4
**Confidence:** 8/10
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
- Audited by Kudelski, Neodyme [VERIFY]
- Used by hundreds of DAOs through the Realms interface
- SPL repo has 3000+ stars
- [VERIFY] whether active development continues under solana-labs or community fork

**Builder notes:**
> The most feature-complete governance framework on Solana. Supports: multi-realm governance, token owner records, proposal lifecycle, voting with deposit, instruction execution, council + community tokens, and plugin-based voter weight (voter-weight-addin interface). **The downside:** native Rust — verbose, harder to extend than Anchor. Manual borsh serialization. The voter-weight plugin system is elegant and worth studying — it allows plugging in NFT voting, VSR, and custom voter weight calculations. The `governance-ui` repo is a large Next.js app you'd also need to fork for a custom frontend.

**Complexity:** High — large codebase, native Rust, complex state machine, plugin system
**Confidence:** 8/10
**Last verified:** 2026-02-16

---

### Voter Stake Registry (VSR)

- **URL:** https://github.com/blockworks-foundation/voter-stake-registry
- **Framework:** Anchor
- **License:** Apache 2.0 [VERIFY]
- **Use cases:** Fork candidate, Reusable component
- **Category tags:** Governance, voting, token locking, veTokens

**Trust signals:**
- Built by Blockworks Foundation (Mango team)
- Used in production by multiple Realms DAOs
- Audited [VERIFY auditor]

**Builder notes:**
> The reference implementation for ve-token voting on Solana. Implements vote-escrowed token locking as an SPL Governance voter-weight plugin. Clean Anchor code. If building governance with lockup-weighted voting, start here. The registrar/voter pattern is well-designed. Key thing to study: how it implements the SPL Governance voter-weight-addin interface. If forking, simplify lockup period tiers or add delegation as needed.

**Complexity:** Medium — focused scope, Anchor, but lockup mechanics and SPL Governance integration add nuance
**Confidence:** 8/10
**Last verified:** 2026-02-16

---

### Tribeca

- **URL:** https://github.com/TribecaHQ/tribeca
- **Framework:** Anchor
- **License:** AGPL-3.0 [VERIFY] — strong copyleft, network-accessible derivatives must publish source
- **Use cases:** Reference implementation
- **Category tags:** DAO framework, governance, veTokens, token locking, gauge voting

**Trust signals:**
- Used by Saber, Quarry ecosystem
- Audited (Bramah Systems [VERIFY])
- ~100-200 stars [VERIFY]
- **Development appears stalled** as of 2023-2024 [VERIFY]

**Builder notes:**
> Inspired by Curve's ve-model. Clean separation: `govern` (core governance), `locked-voter` (ve-token locking), `gauge` (gauge voting for reward distribution). Modular design is excellent for study. **However:** project may be abandoned. Dependencies may need Anchor version bumps. The gauge voting system is one of the few Solana implementations of this pattern. AGPL limits commercial forking.

**Complexity:** Medium-High — multiple interacting programs, but each is relatively clean
**Confidence:** 6/10
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

- **URL:** https://github.com/coral-xyz/anchor (specifically `lang/src/`)
- **Framework:** Anchor (it IS the framework)
- **License:** Apache 2.0
- **Use cases:** Reusable component
- **Category tags:** Access control, framework, authorization

**Trust signals:**
- The dominant Solana framework. Thousands of stars. Audited extensively.

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
- **License:** Apache 2.0 [VERIFY]
- **Use cases:** Reusable component
- **Category tags:** Treasury management, token vesting, payment streaming, payroll

**Trust signals:**
- Production protocol with meaningful TVL
- Audited, used by multiple Solana projects

**Builder notes:**
> If treasury needs include vesting schedules (team tokens, grants, contributor compensation), Streamflow is the reference. The streaming model (linear unlock + optional cliff) is well-implemented. For pure "multisig treasury," use Squads. For "treasury + automated disbursement," Streamflow complements Squads.

**Complexity:** Medium
**Confidence:** 8/10
**Last verified:** 2026-02-16

---

## Builder Recommendations

**If you want a multisig:**
Study Squads v4 architecture, fork Squads MPL (v3) if GPL is acceptable, or build from scratch using v4 as reference if BSL is a blocker.

**If you want a DAO / governance system:**
Start with SPL Governance (Apache 2.0, maximum flexibility). The voter-weight plugin system is the key extensibility point. Study Tribeca for ve-token/gauge patterns.

**If you want role-based access control:**
No dominant standalone RBAC library exists on Solana. Build it yourself using Anchor constraints — store roles in a config PDA, check with `constraint` or `has_one`. This is a gap in the ecosystem.

**If you want treasury management:**
Squads v4 for multisig custody + SPL Governance for proposal-gated voting. Streamflow for vesting/streaming. Most serious DAOs combine Squads + SPL Governance.

## License Summary

| License | Repos | Fork-Friendly? |
|---|---|---|
| Apache 2.0 | SPL Governance, VSR, Token-2022, Anchor, Streamflow | **Yes** |
| GPL-3.0 | Squads MPL (v3) | **Conditional** — forks must be GPL |
| AGPL-3.0 | Tribeca | **Restrictive** — network use triggers disclosure |
| BSL 1.1 | Squads v4 | **No** — restricts competing commercial use |
