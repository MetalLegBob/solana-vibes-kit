# Known Vulnerable Dependencies
<!-- Solana ecosystem crates and packages with known security issues -->
<!-- Last updated: 2026-02-06 -->
<!-- Sources: CVE databases, Helius incidents, audit reports, npm advisories -->

## Critical: Supply Chain Attacks

### @solana/web3.js (npm)
**CVE:** CVE-2024-54134 (CVSS 8.3 HIGH)
**Affected versions:** 1.95.6, 1.95.7
**Date:** December 3, 2024
**Impact:** Malicious code exfiltrated private keys via Cloudflare header lookalike
**Window:** ~5 hours (3:20 PM - 8:25 PM UTC)
**Safe versions:** < 1.95.6, >= 1.95.8
**Detection:**
- Check `package-lock.json` for affected versions
- Monitor for unexpected network calls from `@solana/web3.js`
- Use `npm audit` or Socket.dev for supply chain monitoring
**Lesson:** Lock dependency versions. Never handle private keys in frontend code.

---

## Solana SDK & Runtime

### Solana CLI / Validator
| Version Range | Issue | Impact | Fix |
|--------------|-------|--------|-----|
| < 1.16.0 | Compatibility break with 1.14 | Build failures | Upgrade to >= 1.16 |
| 1.17.12 | Token-2022 `address` constraint break | Programs with Token-2022 fail | Use >= 1.18.10 |
| < 1.17+ | Non-rent-exempt accounts possible | Account GC risks | Upgrade |

### rBPF / SBF Runtime
**CVE-2021-46102** — Integer overflow in `relocate` function (solana_rbpf 0.2.14-0.2.17)
- `_value` read from ELF without bounds check → overflow calculating `addr`
- CVSS 7.5 (High), Availability impact
- **Fix:** Upgrade to >= 0.2.17

**CVE-2022-23066** — Incorrect `sdiv` calculation (solana_rbpf 0.2.26-0.2.27)
- Improper signed division implementation
- **Fix:** Upgrade to >= 0.2.28

**CVE-2022-31264** — Integer overflow from ELF headers (solana_rbpf < 0.2.29)
- Invalid ELF program headers cause panic via malformed eBPF
- **Fix:** Upgrade to >= 0.2.29

**ELF Alignment Vulnerability (Aug 2024):**
- `CALL_REG` opcode assumed `.text` section alignment
- Programs compiled with non-standard toolchains could crash validators
- Patched preemptively via secret validator update
- **Detection:** Check if validators are up to date

**JIT Cache Bug (Feb 2024):**
- Infinite recompile loop for legacy loader programs
- Caused 5-hour mainnet outage
- **Detection:** Not exploitable by app developers, but illustrates runtime risks

**Direct Mapping Validator RCE (2025, Anatomist Security):**
- v1.16+ Direct Mapping optimization maps host account data buffers directly into VM memory
- Inadequate permission validation on memory access allowed OOB writes
- **Impact:** Validator RCE — could compromise entire node, mint tokens, exfiltrate keys
- >$9B TVL at risk
- **Fix:** Patched via coordinated validator update
- **Source:** https://anatomi.st/blog/2025_06_27_pwning_solana_for_fun_and_profit

### @solana/pay (npm)
**CVE-2022-35917** — Weakness in Transfer Validation Logic (<= 0.2.0)
- `validateTransfer()` with reference key could validate multiple transfers instead of one
- Moderate severity
- **Fix:** Upgrade to >= 0.2.1

---

## Anchor Framework

### Anchor Versions with Known Issues
| Version | Issue | Severity | Fix |
|---------|-------|----------|-----|
| < 0.29.0 | Non-type-safe bumps (`ctx.bumps.get()`) | LOW | Upgrade to 0.29+ |
| 0.30.0 | Token-2022 `address` constraint broken on Solana 1.17.12 | HIGH | Use 0.30.1+ |
| < 0.31.0 | borsh 0.9 serialization (may differ from 0.10) | MEDIUM | Upgrade |
| All | `remaining_accounts` bypasses all Anchor protections | HIGH | Manual validation required |

### anchor-gen (Third-Party)
**Note:** `anchor-gen` has NOT been audited (stated in its documentation).
Replaced by `declare_program!` in Anchor 0.30+.
**Recommendation:** Use `declare_program!` macro for CPI interop instead.

---

## SPL Libraries

### spl-token < 0.1.5
- Missing hardcoded check for SPL program ID in CPI calls
- Allows arbitrary program substitution in token operations
- **Fix:** Upgrade to >= 0.1.5

### spl-token-2022
Multiple audit findings (all fixed in current versions):
| Finding | Auditor | Status |
|---------|---------|--------|
| Transfer fee bypass via confidential deposit/withdraw | Halborn | Fixed |
| Non-transferable tokens transferable via confidential transfer | Halborn | Fixed |
| Various extension interaction bugs | Zellic, Trail of Bits, NCC, OtterSec | Fixed |
**Recommendation:** Use latest SPL versions. Check audit reports at `github.com/anza-xyz/security-audits`.

---

## Third-Party Crates

### integer-mate (Move/Sui library)
**Affected:** Cetus DEX ($223M exploit on SUI, May 2025 — pattern applicable to Solana custom math libs)
**Issue:** Incorrect overflow check constant in `checked_shlw` function
**Impact:** Integer overflow enabled near-free liquidity minting
**Note:** A similar bug was found and fixed on Aptos version in 2023 but the fix was NOT ported to Sui
**Lesson:** Third-party math libraries must be audited independently. Fixes on one chain don't automatically propagate.

### pyth-sdk-solana
- No known vulnerabilities in the SDK itself
- **BUT:** Programs must validate oracle output (staleness, confidence, price > 0)
- Old versions may not support `get_price_no_older_than` — upgrade

### switchboard-v2
- No known vulnerabilities in the SDK itself
- **BUT:** Verify aggregator configuration (min_oracle_results, update interval)
- Check for deprecated v1 usage

---

## Dependency Audit Checklist

### For Every Solana Program Audit:
1. **Check `Cargo.lock`** for known vulnerable crate versions
2. **Run `cargo audit`** (install via `cargo install cargo-audit`)
3. **Check `package-lock.json`** or `yarn.lock` for frontend dependencies
4. **Run `npm audit`** on JavaScript/TypeScript projects
5. **Verify Anchor version** matches security-relevant constraints
6. **Check Solana SDK version** compatibility
7. **Look for `anchor-gen`** usage (unaudited, replace with `declare_program!`)
8. **Check oracle SDK versions** (Pyth, Switchboard) for latest APIs
9. **Verify third-party math libraries** are audited and up-to-date

### spl-token-swap (Cargo)
**GHSA:** GHSA-h6xm-c6r4-vmwf (Dec 2024)
**Impact:** Unsound `unpack` API casts `u8` array to arbitrary types. Can cause misaligned pointer dereference (panic/DoS) or construct illegal types (undefined behavior).
**Vulnerability:** `unpack` function's length check only prevents out-of-bound access. Does NOT prevent misaligned pointers (e.g., casting `u8` pointer to `u16`-aligned type) or construction of illegal bit patterns (e.g., non-0/1 `bool`).
**Action:**
- Check if project depends on `spl-token-swap` and uses the `unpack` API
- Audit any code that casts `u8` arrays to complex types without alignment checks
- Note: Broader lesson — Rust's `unsafe` in SPL crates can introduce soundness issues

### Red Flags in Dependencies:
- Unlocked versions in `Cargo.toml` (e.g., `"*"` or `">=0.1"`)
- Vendored/forked crates without clear provenance
- Dependencies from personal GitHub repos (not official orgs)
- Very old Anchor/Solana SDK versions (> 6 months behind)
- Usage of deprecated crates (`projectserum/*`, `spl-token < 0.1.5`)

### Rust Memory Safety ≠ Smart Contract Safety
Per Three Sigma research (May 2025): Rust's memory safety guarantees do NOT protect against logic bugs, missing signer checks, economic exploits, or protocol-level vulnerabilities. Programs need security audits regardless of being written in Rust. Key areas Rust DOESN'T protect: CPI authorization, PDA validation, oracle staleness, economic invariants, access control logic.

---
<!-- Sources: CVE-2024-54134, CVE-2021-46102, CVE-2022-23066, CVE-2022-31264, CVE-2022-35917, GHSA-h6xm-c6r4-vmwf, Halborn Token-2022 audits, Cetus post-mortems, Anchor CHANGELOG, cargo-audit database, Anatomist Security blog, Three Sigma Rust memory safety research (May 2025) -->
