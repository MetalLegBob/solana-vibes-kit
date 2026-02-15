# Common False Positives Guide
<!-- Patterns that look dangerous but are actually safe in context -->
<!-- Last updated: 2026-02-06 -->
<!-- Purpose: Reduce noise in audit reports by recognizing safe patterns -->

## Why This Matters

Reporting false positives wastes developer time, erodes trust in the audit, and buries real findings. Before flagging something, check this guide. If a pattern appears here, verify the specific context before reporting.

---

## 1. Anchor Built-In Protections

These are things Anchor handles automatically. **Do NOT flag these when Anchor types are correctly used.**

### FP-001: "Missing owner check" on `Account<'info, T>`
**Why it's safe:** `Account<'info, T>` automatically validates that the account is owned by the current program. The discriminator (first 8 bytes) is also checked, preventing type confusion.
**Only flag if:** Raw `AccountInfo` or `UncheckedAccount` is used instead.

### FP-002: "Missing discriminator check" on Anchor accounts
**Why it's safe:** `Account<'info, T>` validates the 8-byte discriminator automatically. This prevents both reinitialization and type cosplay attacks.
**Only flag if:** Manual deserialization with `try_from_slice` bypasses discriminator, or native (non-Anchor) code is used.

### FP-003: "Missing signer check" when `Signer<'info>` is used
**Why it's safe:** `Signer<'info>` type enforces `is_signer = true` at deserialization time. Anchor generates the check automatically.
**Only flag if:** `AccountInfo` or `UncheckedAccount` is used for an account that should be a signer.

### FP-004: "Reinitialization possible" on `#[account(init)]`
**Why it's safe:** Anchor's `init` constraint creates the account with a discriminator. If the account already exists with a non-zero discriminator, `init` will fail.
**Only flag if:** `init_if_needed` is used AND authority fields could be overwritten, OR account space is modified via `realloc` without checking discriminator.

### FP-005: "Account not closed properly" when using Anchor `close`
**Why it's safe:** Anchor's `close = destination` constraint zeros all account data, transfers remaining lamports, and changes the account owner to the system program. This prevents revival attacks.
**Only flag if:** Manual lamport transfer is used instead of `close` constraint, or if the closed account can be recreated in the same transaction without checking.

### FP-006: "PDA bump not validated" when using `bump = account.bump`
**Why it's safe:** When `bump = account.bump` is specified in the constraint, Anchor uses the stored canonical bump. When `bump` alone is specified on `init`, Anchor finds and uses the canonical bump.
**Only flag if:** Bump is not stored during init, or a hardcoded non-canonical bump is used, or `find_program_address` is called in instruction logic unnecessarily.

### FP-007: "Token program not validated" when `Program<'info, Token>` is used
**Why it's safe:** `Program<'info, T>` validates both the program ID and the executable flag.
**Only flag if:** `AccountInfo` or `UncheckedAccount` is used for the token program account.

---

## 2. Solana Runtime Protections

These are enforced by the Solana runtime itself. **Do NOT flag these as vulnerabilities.**

### FP-008: "Reentrancy possible via CPI"
**Why it's safe (partially):** Solana limits CPI depth to 4. A program cannot recursively call itself infinitely. Additionally, Solana's transaction model requires all accounts to be declared upfront.
**Still flag if:** State is read before CPI and not re-checked after (stale data), or checks-effects-interactions pattern is violated. The depth limit prevents infinite recursion but NOT same-transaction reentrancy via multiple instructions.

### FP-009: "Account can be created with insufficient rent"
**Why it's safe:** Since Solana 1.17+, the runtime enforces rent-exempt minimum on all new accounts. Accounts below rent-exempt threshold are rejected at creation. Anchor's `init` constraint also calculates the correct amount.
**Only flag if:** An account's lamports are drained to below rent-exempt (but even then, the runtime will eventually garbage collect it).

### FP-010: "Integer overflow in Rust"
**Why it's safe (partially):** Rust debug builds DO panic on overflow. However, Solana programs are **compiled in release mode**, which silently wraps.
**Always flag:** Unchecked arithmetic (`+`, `-`, `*`, `/`) on financial values in Solana programs. This is NOT a false positive despite Rust's reputation for safety. Only `checked_*` methods are safe.

### FP-011: "Program can be upgraded"
**Why it's safe (sometimes):** Upgradability is a feature, not a bug, when the upgrade authority is properly managed (multisig, timelock, governance).
**Flag if:** Upgrade authority is a single EOA with no timelock, or upgrade authority has not been set to null for immutable programs that claim to be immutable.

### FP-012: "Transaction can be replayed"
**Why it's safe:** Solana transactions include a recent blockhash that expires after ~60 seconds (150 slots). The runtime rejects transactions with expired or duplicate blockhashes.
**Only flag if:** Durable nonces are used without proper nonce advancement, or the program has its own message/signature verification that lacks replay protection.

---

## 3. Patterns That Look Dangerous But Are Safe

### FP-013: Global PDA without user key in seeds
```rust
seeds = [b"config"], bump  // Looks like PDA collision risk
```
**Why it's safe:** For singleton config accounts (one per program), a global PDA is correct. Not every PDA needs a user key.
**Only flag if:** The PDA is supposed to be per-user but uses global seeds, OR multiple instances could be needed (e.g., per-pool, per-market).

### FP-014: `UncheckedAccount` with `/// CHECK:` and constraints
```rust
/// CHECK: Validated via seeds constraint as Metaplex metadata PDA
#[account(seeds = [...], bump, seeds::program = metadata_program.key())]
pub metadata: UncheckedAccount<'info>,
```
**Why it's safe:** The PDA seeds constraint validates the account address deterministically. `UncheckedAccount` is necessary here because the metadata account type isn't in Anchor's type system.
**Only flag if:** The `/// CHECK:` comment doesn't match the actual constraints, or constraints are insufficient for the use case.

### FP-015: `remaining_accounts` usage
```rust
let remaining = &ctx.remaining_accounts;
```
**Why it's safe (sometimes):** `remaining_accounts` is a legitimate pattern for variable-length account lists (e.g., multiple token accounts, batch operations).
**Always flag if:** Accounts from `remaining_accounts` are used in sensitive operations (transfers, minting, authority checks) without:
- Owner validation
- Type/discriminator validation
- PDA address validation
- Signer checks where needed
**Key insight (Zellic):** "Absolutely none of the protections that Anchor typically provides are present on `remaining_accounts`."

### FP-016: `invoke_signed` with PDA signer
```rust
invoke_signed(&ix, accounts, &[&[b"vault", user_key, &[bump]]])?;
```
**Why it's safe:** This is the standard pattern for PDA-signed CPIs. The runtime validates that the signer seeds produce the expected PDA.
**Only flag if:** Seeds don't match the PDA derivation, or the CPI target program is not validated, or the signer seeds include user-controlled data that could produce a different valid PDA.

### FP-017: `init_if_needed` for recipient token accounts
```rust
#[account(init_if_needed, payer = sender, associated_token::mint = mint, associated_token::authority = recipient)]
pub recipient_ata: Account<'info, TokenAccount>,
```
**Why it's safe:** For ATAs, `init_if_needed` is standard — the recipient may not have created their token account yet. The ATA constraints (mint + authority) make reinitialization harmless since the same ATA always derives to the same address.
**Only flag if:** Used for non-ATA accounts where reinitialization could overwrite authority or state.

### FP-018: Redundant manual check after Anchor constraint
```rust
#[account(has_one = authority)]
pub config: Account<'info, Config>,
pub authority: Signer<'info>,
// In handler:
require!(config.authority == authority.key(), ErrorCode::Unauthorized); // Redundant
```
**Why it's safe:** The manual check is redundant but harmless. `has_one` already validates this.
**Not a finding** — at most an informational note about code cleanliness.

### FP-019: `msg!` for debugging (non-secret data)
```rust
msg!("Deposit: user={}, amount={}", user.key(), amount);
```
**Why it's safe:** Logging public keys and amounts is standard practice and aids debugging/monitoring.
**Only flag if:** Private keys, seeds, or secret configuration data is logged (EP-070, EP-097).

### FP-020: Account data matching with `has_one`
```rust
#[account(has_one = mint, has_one = authority)]
pub pool: Account<'info, Pool>,
```
**Why it's safe:** `has_one` automatically checks that `pool.mint == mint.key()` and `pool.authority == authority.key()`. This is Anchor's recommended pattern.
**Not a finding** when used correctly with matching field names.

---

## 4. Common Tool False Positives

Patterns that automated scanners frequently flag incorrectly:

### FP-021: "Arithmetic overflow" on non-financial values
```rust
counter += 1;  // View counter, NFT mint index, etc.
```
**Scanner flags:** Unchecked arithmetic
**Reality:** If the value has no financial impact AND cannot realistically overflow (e.g., u64 counter incrementing once per transaction), the risk is negligible.
**Recommendation:** Still use `checked_add` for consistency, but severity is INFO not CRITICAL.

### FP-022: "Missing zero-amount check" on internal functions
```rust
pub fn internal_transfer(amount: u64) { ... }  // Called only from validated paths
```
**Scanner flags:** No `require!(amount > 0)` check
**Reality:** If the function is only called from paths that already validate amount, the check is redundant.
**Still flag if:** The function is public/external and can be called with arbitrary input.

### FP-023: "Floating point usage" in non-financial contexts
```rust
let progress_pct = (completed as f64 / total as f64) * 100.0;
msg!("Progress: {}%", progress_pct);
```
**Scanner flags:** Float arithmetic in smart contract
**Reality:** If floats are only used for display/logging and not for financial calculations, there's no risk.
**Always flag if:** Floats are used in token amounts, prices, collateral ratios, or any value that affects fund movement.

### FP-024: "Account not validated" on write-only destination
```rust
/// CHECK: Receive-only account, no data read
#[account(mut)]
pub fee_receiver: UncheckedAccount<'info>,
```
**Scanner flags:** UncheckedAccount without full validation
**Reality:** If the account only receives lamports/tokens and no data is read from it, minimal validation is needed. However...
**Still flag if:** The fee receiver should be a specific known address (validate with `constraint`).

### FP-025: "CPI return data not checked"
```rust
token::transfer(cpi_ctx, amount)?;
// No check on return data
```
**Scanner flags:** CPI return value not validated
**Reality:** SPL token transfer doesn't return meaningful data. The `?` propagates any error. This is fine.
**Only flag if:** The CPI target is a custom program whose return data contains critical state information that should be validated (EP-045).

---

## 5. When False Positives Become Real

A pattern from this guide becomes a **real finding** when:

1. **Anchor types are NOT used** — If `AccountInfo` or `UncheckedAccount` is used where `Account<T>`, `Signer`, or `Program<T>` would work, all the FP-001 through FP-007 protections don't apply.

2. **Constraints are missing or wrong** — `Account<'info, T>` with no `has_one`, `seeds`, or relationship constraints may still allow unauthorized access even with owner/discriminator checks.

3. **`remaining_accounts` is used for sensitive operations** — Per FP-015, this bypasses ALL Anchor protections.

4. **Native (non-Anchor) code** — Programs written in raw Rust without Anchor have NONE of these built-in protections. Every check must be manual.

5. **Anchor version is outdated** — Older Anchor versions may have different constraint behavior or known bugs. Always check the version.

6. **`#[account]` is used without `#[derive(Accounts)]`** — Account struct definitions don't provide runtime validation on their own; they must be used in an Accounts derive struct with constraints.

---

## Quick Decision Tree

```
Is it an Anchor program?
├── YES: Is the correct Anchor type used? (Account<T>, Signer, Program<T>)
│   ├── YES: Are constraints sufficient? (has_one, seeds, etc.)
│   │   ├── YES → Likely false positive (check this guide)
│   │   └── NO → Real finding (missing constraint)
│   └── NO: Is AccountInfo/UncheckedAccount used?
│       ├── With adequate constraints → Check FP-006, FP-014
│       └── Without constraints → Real finding
├── NO (native Rust): Every check must be manual
│   └── Missing check = Real finding (no built-in protections)
└── MIXED: Check each account individually
```

---
<!-- END OF COMMON FALSE POSITIVES GUIDE -->
<!-- 25 false positive patterns across 5 categories -->
<!-- Sources: Zellic "Vulnerabilities You'll Write With Anchor", Neodyme "Common Pitfalls", Sec3 audit methodology, Anchor documentation -->
