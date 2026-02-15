# Anchor Version Gotchas
<!-- Security-relevant changes between Anchor versions -->
<!-- Last updated: 2026-02-06 -->
<!-- Source: Anchor CHANGELOG, release notes, audit findings -->

## Version Timeline

| Version | Date | Solana Compat | Key Security Changes |
|---------|------|---------------|---------------------|
| 0.29.0 | 2023-12 | >= 1.16 | Type-safe bumps, 36% smaller binaries |
| 0.30.0 | 2024-04-15 | >= 1.16 (rec 1.18.8) | IDL rewrite (BREAKING), Token Extensions, `declare_program!` |
| 0.30.1 | 2024-06-20 | >= 1.17.3 (rec 1.18.17) | Legacy IDL conversion, `address` constraint fix |
| 0.31.0 | 2025-03-08 | >= 1.18.19 | `LazyAccount`, Solana SDK v2, borsh 0.9 removed |
| 0.31.1 | 2025-04-19 | >= 1.18.19 | Bugfixes, Docker improvements |
| 0.32.0 | 2025-10-08 | >= 1.18.19 | Custom discriminators, `solana-verify`, SPL updates |

---

## 0.29.0 — Security-Relevant Changes

### Type-Safe Context Bumps
**Before:** `ctx.bumps.get("account_name")` returned `Option<u8>` — easy to forget `.unwrap()`.
**After:** `ctx.bumps.account_name` — direct field access, compile-time checked.
**Audit impact:** Reduced risk of bump mishandling. Old code using `.get()` still works but is deprecated.

### Solana 1.14 Dropped
Programs targeting Solana < 1.16 will not work with Anchor 0.29+. Check validator compatibility.

### New Docker Image
`projectserum/build` deprecated. Use `backpackapp/build` (later `solanafoundation/anchor`).
**Audit impact:** Verify reproducible builds use the correct image.

### `idl-build` Feature
IDL generation now uses a Cargo feature instead of parsing. Programs MUST add `idl-build` feature to `Cargo.toml`.
**Audit impact:** Missing feature means IDL won't generate, but no security impact.

---

## 0.30.0 — Major Breaking Release

### IDL Rewrite (BREAKING)
Complete rewrite of IDL type specification and generation. Legacy IDLs (pre-0.30) are incompatible.
**Audit impact:** Client code using old IDLs may deserialize data incorrectly. Verify IDL version matches program version.

### Token Extensions Support
Added `token::token_program` constraint for Token-2022 compatibility.
```rust
// NEW: Specify which token program
#[account(
    mut,
    token::mint = mint,
    token::authority = authority,
    token::token_program = token_program,  // Can be Token or Token-2022
)]
pub token_account: InterfaceAccount<'info, TokenAccount>,
pub token_program: Interface<'info, TokenInterface>,  // Accepts both
```
**Audit impact:** Programs that don't specify `token_program` may accept unexpected token program. Check if protocol intends to support Token-2022.

### `declare_program!` Macro
New way to declare CPI interfaces from other Anchor programs without direct dependency.
**Audit impact:** Replaces `anchor-gen` (unaudited crate). More secure for CPI interop.

### Optional Bumps
Bumps are now optional in client-side account resolution.
**Audit impact:** Verify programs still store and validate canonical bumps on-chain.

### Build Tool Change
`cargo build-bpf` (deprecated) replaced by `cargo build-sbf`.
**Audit impact:** None directly, but old build scripts may fail.

### `#[interface]` Deprecated
`#[interface]` attribute for instruction discriminators is deprecated.
**Audit impact:** Programs using `#[interface]` should migrate to standard dispatching.

---

## 0.30.1 — Critical Fixes

### `address` Constraint Fix
Programs using `address` constraint with `TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb` (Token-2022) were broken on Solana >= 1.17.12. Fixed in both Anchor and Solana.
**Audit impact:** Programs on Anchor 0.30.0 with Token-2022 `address` constraints need this fix. Requires `solana-cli >= 1.18.10`.

### Versioned Transactions
`maxSupportedTransactionVersion` was not being set from `AnchorProvider`, causing v0 transactions to fail.
**Audit impact:** Programs using Address Lookup Tables (ALTs) may have client-side issues on 0.30.0.

---

## 0.31.0 — Breaking Changes

### Solana SDK v2 Upgrade
Major upgrade from Solana SDK v1 to v2 + latest SPL crates.
**Audit impact:** API changes may affect CPI interfaces. Verify all program dependencies are compatible.

### borsh 0.9 Support Removed
Only borsh 0.10+ is supported. Programs using borsh 0.9 serialization will fail to compile.
**Audit impact:** Account data serialized with borsh 0.9 may have different encoding. Verify on-chain data compatibility.

### `EventIndex` Removed
Events no longer use index-based identification.
**Audit impact:** Event parsing code needs updating. No security impact.

### `LazyAccount` Added
New account type that deserializes fields on-demand, saving compute and memory.
**Audit impact:** `LazyAccount` doesn't validate all fields upfront — ensure critical field checks still happen.

### Custom Discriminators (0.32.0)
```rust
#[account(discriminator = 1)]
pub struct MyAccount { ... }
```
**Audit impact:** Custom discriminators break the default 8-byte hash pattern. Verify no collision with other account types in the same program.

---

## Cross-Version Audit Checklist

### When auditing, always check:
- [ ] **Anchor version** in `Cargo.toml` and `Anchor.toml` — determines which protections exist
- [ ] **Solana SDK version** compatibility — mismatches cause subtle bugs
- [ ] **IDL format** — pre-0.30 vs post-0.30 IDLs are incompatible
- [ ] **Token program handling** — does the program support Token-2022? Should it?
- [ ] **Bump storage** — are canonical bumps stored? (all versions should, but pre-0.29 patterns vary)
- [ ] **Build reproducibility** — correct Docker image and toolchain for the version
- [ ] **Deprecated features** — `#[interface]`, `build-bpf`, `projectserum/build` image
- [ ] **borsh version** — 0.9 vs 0.10 can affect data encoding

### Dangerous version-specific patterns:
| Pattern | Safe In | Dangerous In |
|---------|---------|--------------|
| `ctx.bumps.get("name").unwrap()` | 0.28- | 0.29+ (use `.name` instead) |
| `Program<'info, Token>` only (no Token-2022) | Pre-Token-2022 | 0.30+ if Token-2022 tokens exist |
| `cargo build-bpf` | 0.29- | 0.30+ (deprecated, may produce incorrect output) |
| IDL without `idl-build` feature | 0.28- | 0.29+ (IDL won't generate) |
| borsh 0.9 serialization | 0.30- | 0.31+ (won't compile) |

---
<!-- Sources: Anchor CHANGELOG, release notes 0.29.0-0.32.0, Anchor documentation -->
