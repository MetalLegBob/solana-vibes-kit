# EP-092: Deprecated Sysvar Account Injection
**Category:** Account Validation  **Severity:** CRITICAL  **Solana-Specific:** Yes
**Historical Exploits:** Wormhole ($326M, Feb 2022)

**Description:** Using `load_instruction_at` (deprecated) instead of `load_instruction_at_checked` allows attacker to pass a fake sysvar account pre-loaded with forged instruction data, bypassing signature verification.

**Vulnerable Pattern:**
```rust
let ix = load_instruction_at(
    0,
    &ctx.accounts.instruction_sysvar  // NOT validated as real sysvar!
)?;
verify_secp256k1_instruction(&ix)?;
```
**Secure Pattern:**
```rust
// Option 1: Use checked variant (validates sysvar address)
let ix = load_instruction_at_checked(0, &ctx.accounts.instruction_sysvar)?;
// Option 2: Explicit address check
require!(
    ctx.accounts.instruction_sysvar.key() == sysvar::instructions::ID,
    ErrorCode::InvalidSysvar
);
```
**Detection:** Grep for `load_instruction_at` without `_checked`. Check any sysvar account for explicit address validation. Review Secp256k1 verification paths.
