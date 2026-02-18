---
pack: solana
topic: "Forkable Repos — Developer Tooling"
type: repo-catalogue
confidence: 8/10
sources_checked: 25
last_verified: "2026-02-16"
---

# Developer Tooling — Forkable Repo Catalogue

> **Verification status:** Live-verified on 2026-02-16 via GitHub API and Exa web search. Star/fork counts are approximate (±5%). License information confirmed against GitHub's license detection.

---

## Testing Frameworks

### Bankrun (solana-bankrun)

> **⚠️ DEPRECATED:** README explicitly states "DEPRECATED: use LiteSVM instead." No active development.

- **URL:** https://github.com/kevinheavey/solana-bankrun
- **Framework:** TypeScript (wraps Rust via NAPI)
- **License:** Apache 2.0
- **Use cases:** Historical reference (deprecated)
- **Category tags:** Testing, unit testing, integration testing, TypeScript

**Trust signals:**
- Maintained by Kevin Heavey (prolific Solana contributor, also behind `solders`)
- ~164 stars, ~16 forks
- **DEPRECATED** — successor is LiteSVM

**Builder notes:**
> Was the go-to for fast Solana program tests in TypeScript. Spun up a lightweight `BanksServer` in-process instead of a full validator. **Now deprecated in favor of LiteSVM.** If you have existing bankrun tests, migrate to LiteSVM. For new projects, start with LiteSVM directly.

**Complexity:** Low — clean API, straightforward to adopt
**Confidence:** 6/10 (deprecated)
**Last verified:** 2026-02-16

---

### LiteSVM

- **URL:** https://github.com/LiteSVM/litesvm
- **Framework:** Rust (core), TypeScript bindings via NAPI
- **License:** Apache 2.0
- **Use cases:** Reusable component, Fork candidate (for custom test infrastructure)
- **Category tags:** Testing, unit testing, integration testing, Rust, SVM

**Trust signals:**
- Successor to solana-bankrun (which is now deprecated). Originally created by kevinheavey, now under `LiteSVM` org.
- Growing rapidly in 2024-2025
- Community endorsement from Solana core developers
- ~538 stars, ~124 forks

**Builder notes:**
> The standard for fast Solana program testing. Minimal SVM implementation — processes transactions without consensus, gossip, or RPC overhead. Deterministic, fast tests. **Key advantage over bankrun:** Rust-native, no NAPI bridge overhead for Rust program developers. TS bindings are solid but Rust API is primary. The recommended testing tool for all new Solana projects.

**Complexity:** Low-Medium — Rust API is ergonomic, TS bindings require understanding NAPI layer
**Confidence:** 9/10
**Last verified:** 2026-02-16

---

### Trident

- **URL:** https://github.com/Ackee-Blockchain/trident
- **Framework:** Rust
- **License:** MIT
- **Use cases:** Reusable component, Reference implementation
- **Category tags:** Testing, fuzzing, security, Anchor

**Trust signals:**
- Maintained by Ackee Blockchain (established Solana security auditing firm)
- ~357 stars, ~52 forks
- Used in production audit workflows
- Backed by Solana Foundation grant.
- Conference talks and documentation

**Builder notes:**
> The only serious purpose-built fuzzing framework for Solana programs. Generates fuzz test harnesses from your Anchor IDL using `honggfuzz`. Auto-generates fuzz targets that exercise instruction handlers with random but valid-structured inputs. **Tightly coupled to Anchor** — if using raw Solana programs, setup is more manual. Fuzz campaigns are resource-intensive and generated code can be verbose. Essential for security-focused testing.

**Complexity:** Medium-High — fuzzing concepts require understanding, setup is automated but tuning requires expertise
**Confidence:** 8/10
**Last verified:** 2026-02-16

---

## CLI Tools

### solana-verify

- **URL:** https://github.com/Ellipsis-Labs/solana-verifiable-build
- **Framework:** Rust (CLI binary)
- **License:** MIT
- **Use cases:** Reusable component
- **Category tags:** CLI, verification, security, devops

**Trust signals:**
- Maintained by Ellipsis Labs (Phoenix DEX team)
- ~400 stars, ~180 forks
- Endorsed by Solana Foundation
- Integrated into Solana Explorer for verified builds
- **Note:** Repo name is `solana-verifiable-build`, not `solana-verify`. The crate name on crates.io is `solana-verify`. Latest release v0.4.12 (Nov 2025).

**Builder notes:**
> Critical infrastructure for program verification. Builds your program in a Docker container and compares the hash against what's deployed on-chain. Integrate into your CI/CD pipeline for any production program. Docker-based build ensures reproducibility. Some programs with complex build setups may need verify config tweaks. `solana-verify verify-from-repo` is the main command.

**Complexity:** Low — simple CLI
**Confidence:** 9/10
**Last verified:** 2026-02-16

---

## IDL / Client Generation

### Codama (formerly Kinobi)

- **URL:** https://github.com/codama-idl/codama
- **Framework:** TypeScript (core), generates Rust, TypeScript, Python clients
- **License:** MIT (copyright Codama 2025 / Metaplex Foundation 2024)
- **Use cases:** Reusable component, Fork candidate (for custom code generation)
- **Category tags:** IDL, client generation, code generation, SDK generation

**Trust signals:**
- Created by Loris Leiva (Metaplex lead engineer)
- Generates all official Metaplex client SDKs
- Evolved from `metaplex-foundation/kinobi` (155 stars, still exists). The `codama-idl` org is the new canonical home.
- ~411 stars, ~72 forks. 865 commits.
- Active development

**Builder notes:**
> The most powerful IDL-to-client-code generation system on Solana. Uses visitor/transformer pattern — define IDL tree, apply transformations, render to target languages. Generates beautiful, idiomatic client code targeting @solana/kit (web3.js v2). **Steep learning curve** — the AST/visitor architecture demands investment. Rename from Kinobi caused confusion. If building a program that needs production client SDKs, this is the tool.

**Complexity:** High — powerful but complex visitor/transformer architecture
**Confidence:** 8/10
**Last verified:** 2026-02-16

---

### Shank

- **URL:** https://github.com/metaplex-foundation/shank
- **Framework:** Rust (proc-macro)
- **License:** Apache 2.0
- **Use cases:** Reusable component
- **Category tags:** IDL, IDL extraction, native programs, Rust macros

**Trust signals:**
- Metaplex Foundation
- Used to generate IDLs for all Metaplex native programs
- ~213 stars, ~42 forks. Latest release v0.4.8 (Feb 2026). 1.7M+ crates.io downloads.
- Active maintenance

**Builder notes:**
> If you write native Solana programs (not Anchor), Shank extracts an IDL via Rust proc-macros. Annotate instruction enums and account structs with `#[derive(ShankInstruction)]`, `#[derive(ShankAccount)]`, and get a Codama-compatible IDL. Minimal overhead — just proc-macros, no framework. Limitation: must manually keep macros in sync with program logic (not runtime-validated like Anchor).

**Complexity:** Low-Medium — simple macros, understanding generated IDL format takes study
**Confidence:** 8/10
**Last verified:** 2026-02-16

---

## Program Scaffolding / Frameworks

### Anchor Framework

- **URL:** https://github.com/solana-foundation/anchor (redirects from coral-xyz/anchor)
- **Framework:** Rust + TypeScript
- **License:** Apache 2.0
- **Use cases:** Reusable component, Reference implementation, Fork candidate
- **Category tags:** Framework, scaffolding, Rust, TypeScript, IDL, testing, CLI

**Trust signals:**
- Maintained by Solana Foundation (transferred from Coral/coral-xyz). TS packages migrating from `@coral-xyz` to `@anchor-lang`.
- ~4,951 stars, ~1,849 forks. 320 contributors, 51 releases.
- The most widely used Solana development framework
- Daily commits, massive community, ecosystem grants
- **⚠️ Security advisory (Feb 2026):** CPI Return Data Spoofing in `Return<T>::get()` — codegen discards program ID from `get_return_data()`, allowing malicious CPI callee to spoof return data. CVSSv3 7.5 (HIGH). Check for patches in latest version.

**Builder notes:**
> The "Rails of Solana." `anchor init` scaffolds a full project. The macro system (`#[program]`, `#[derive(Accounts)]`, constraints) drastically reduces boilerplate. Huge community, most tutorials assume Anchor, automatic serialization. Adds ~20-30KB to program size (optimized in recent versions). The macro magic can obscure what's happening at runtime — dangerous if you don't understand the underlying model. Use Anchor for 90% of programs, go native only when you need absolute minimal size or full control.

**Complexity:** Medium — easy to start, mastering constraints and CPI patterns takes time
**Confidence:** 9/10
**Last verified:** 2026-02-16

---

### Poseidon (TypeScript-to-Anchor)

- **URL:** https://github.com/Turbin3/poseidon
- **Framework:** TypeScript -> Rust/Anchor transpiler
- **License:** No license file detected on GitHub — **significant concern for inclusion**
- **Use cases:** Reference implementation
- **Category tags:** Scaffolding, transpiler, TypeScript, Anchor, education

**Trust signals:**
- Built by Turbin3 (Solana developer education org — note casing: capital T, number 3)
- ~154 stars, ~33 forks. 168 commits. No releases published.
- **⚠️ STALE:** Last activity May 2025 (~9 months ago). No published releases. No license file.

**Builder notes:**
> Write Solana programs in TypeScript, transpiles to Anchor Rust. Great for TS developers who want to write programs without learning Rust. Good for learning and prototyping — for production, graduate to Anchor directly. Same fundamental limitations as all transpilers: subset of TS, generated code may not be optimal, debugging across transpilation boundary is hard.

**Complexity:** Medium — low barrier to write, understanding output requires Anchor knowledge
**Confidence:** 4/10 (stale, no license)
**Last verified:** 2026-02-16

---

### Solana Program Library (SPL)

- **URL:** https://github.com/solana-labs/solana-program-library
- **Framework:** Rust
- **License:** Apache 2.0
- **Use cases:** Reference implementation, Reusable component, Fork candidate
- **Category tags:** Reference programs, tokens, governance, staking

**Trust signals:**
- Official Solana Labs — ~4,176 stars, ~2,389 forks
- Core infrastructure used by the entire ecosystem
- Battle-tested programs handling billions of dollars
- **⚠️ ARCHIVED:** Entire repo archived March 2025. Individual programs migrated to separate repos under various orgs (solana-program, Mythic-Project, etc.).

**Builder notes:**
> The most important reference codebase in Solana development. Every program is production-proven. Token program teaches account model fundamentals. Token-2022 teaches extension architecture. Governance teaches complex multi-instruction workflows. **Note: repo is archived.** Individual programs now live in separate repos. The code remains an excellent reference but verify you're using the latest migrated versions.

**Complexity:** Medium-High — individual programs range from simple (Memo) to very complex (Token-2022)
**Confidence:** 8/10
**Last verified:** 2026-02-16

---

## Debugging / Profiling

### Solana Explorer (Source)

- **URL:** https://github.com/solana-foundation/explorer (moved from solana-labs/explorer)
- **Framework:** Next.js, TypeScript
- **License:** MIT
- **Use cases:** Fork candidate, Reference implementation
- **Category tags:** Debugging, explorer, visualization

**Trust signals:**
- Official Solana Foundation (moved from solana-labs)
- Production deployment at explorer.solana.com
- ~610 stars, ~530 forks. 2,664 commits. Actively maintained.

**Builder notes:**
> Fork this for custom block explorers or internal dashboards. The transaction parsing, account rendering, and program log display are production-proven. The instruction decoding patterns are particularly useful — they show how to parse and display arbitrary Solana program interactions. Large Next.js app — extracting individual components requires understanding the full architecture.

**Complexity:** Medium-High — full Next.js application
**Confidence:** 8/10
**Last verified:** 2026-02-16

---

## Builder Recommendations

**Starting a new Solana program:**
`anchor init` for the project scaffold. Use LiteSVM for fast testing (bankrun is deprecated). Add Trident for fuzz testing before audit.

**Generating client SDKs:**
Use Anchor's built-in IDL for basic clients. Graduate to Codama for production-quality SDK generation.

**Native Rust programs (no Anchor):**
Use Shank for IDL extraction. Study SPL programs as reference (archived but code is still excellent). Use LiteSVM for Rust-native testing.

**Verifying deployments:**
Integrate solana-verify into CI/CD. Essential for trust and transparency. Note: repo name is `solana-verifiable-build`.

## License Summary

| License | Repos | Fork-Friendly? |
|---|---|---|
| Apache 2.0 | Anchor, SPL, Shank, LiteSVM | **Yes** |
| MIT | Trident, solana-verify, Codama, Explorer | **Yes** |
| No license | Poseidon | **No** — cannot fork without permission |
| Deprecated | Bankrun | N/A — use LiteSVM instead |
