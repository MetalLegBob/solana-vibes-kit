# EP-108: Remaining Account Spoofing in Extension Patterns
**Category:** Account Validation  **Severity:** CRITICAL  **Solana-Specific:** Yes
**Historical Exploits:** Raydium CLMM Tick Manipulation ($505K bounty, Jan 2024 — TickArrayBitmapExtension not validated)

**Description:** Programs that use `remaining_accounts` for auxiliary/extension accounts (tick arrays, bitmap extensions, oracle accounts, etc.) may fail to validate that the account is the correct one for the context. The `remaining_accounts` pattern bypasses Anchor's compile-time account validation, making it the programmer's responsibility to verify each account's identity, owner, and relationship to other accounts.

**Vulnerable Pattern:**
```rust
// Raydium CLMM: increase_liquidity uses remaining_accounts for tick bitmap extension
pub fn increase_liquidity(ctx: Context<IncreaseLiquidity>) -> Result<()> {
    let pool = &ctx.accounts.pool_state;

    // BUG: remaining_accounts[0] is used as TickArrayBitmapExtension
    // but NOT validated as the correct extension for THIS pool
    let tick_bitmap_ext = &ctx.remaining_accounts[0];

    // Attacker passes a malicious/wrong extension account
    // Tick status is read from wrong bitmap → incorrect liquidity calculations
    flip_tick_in_bitmap(tick_bitmap_ext, tick_index)?;
    Ok(())
}
```
**Secure Pattern:**
```rust
pub fn increase_liquidity(ctx: Context<IncreaseLiquidity>) -> Result<()> {
    let pool = &ctx.accounts.pool_state;

    if !ctx.remaining_accounts.is_empty() {
        let tick_bitmap_ext = &ctx.remaining_accounts[0];
        // VALIDATE: extension must be the correct PDA for this pool
        let expected_key = TickArrayBitmapExtension::key(pool.key());
        require_keys_eq!(tick_bitmap_ext.key(), expected_key, ErrorCode::InvalidAccount);
        // Also verify owner
        require!(tick_bitmap_ext.owner == &crate::ID, ErrorCode::InvalidOwner);
    }
    Ok(())
}
```
**Detection:** Find `remaining_accounts` usage. For each access, verify the account is validated (PDA derivation check, owner check, key comparison). Flag any `remaining_accounts[N]` used without validation. Pay special attention to CLMM/AMM programs with tick arrays, bitmap extensions, or oracle accounts passed via remaining_accounts.
