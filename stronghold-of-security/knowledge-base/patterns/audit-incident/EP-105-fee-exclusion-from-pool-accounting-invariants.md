# EP-105: Fee Exclusion from Pool Accounting Invariants
**Category:** Economic / DeFi  **Severity:** HIGH  **Solana-Specific:** No
**Historical Exploits:** Blockstreet Launchpad (Critical, Aug-Sep 2025 — platform fees excluded from pool accounting)

**Description:** Protocol collects fees (platform fees, performance fees, withdrawal fees) but the fee amounts are not tracked in pool state variables. Over time, the pool's internal accounting drifts from actual token balances because fees are a "leak" not captured in the bookkeeping equation. This breaks the fundamental invariant: `total_deposited == total_withdrawn + total_fees + current_balance`.

**Vulnerable Pattern:**
```rust
pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
    let pool = &mut ctx.accounts.pool;
    let fee = amount * pool.fee_rate / 10000;
    let user_receives = amount - fee;

    // Transfer fee to protocol treasury
    transfer_tokens(&ctx.accounts.pool_vault, &ctx.accounts.fee_vault, fee)?;
    // Transfer remainder to user
    transfer_tokens(&ctx.accounts.pool_vault, &ctx.accounts.user, user_receives)?;

    // BUG: Pool accounting only tracks the withdrawal, not the fee
    pool.total_value -= amount; // Subtracts full amount including fee
    // But fee went to fee_vault, not user — pool.total_value no longer matches pool_vault balance
    // Over many withdrawals, drift accumulates
    Ok(())
}
```
**Secure Pattern:**
```rust
pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
    let pool = &mut ctx.accounts.pool;
    let fee = amount * pool.fee_rate / 10000;
    let user_receives = amount - fee;

    transfer_tokens(&ctx.accounts.pool_vault, &ctx.accounts.fee_vault, fee)?;
    transfer_tokens(&ctx.accounts.pool_vault, &ctx.accounts.user, user_receives)?;

    // CORRECT: Track fees separately in pool accounting
    pool.total_value -= amount;
    pool.total_fees_collected += fee;
    pool.total_withdrawn += user_receives;

    // Invariant check (can be an assertion or off-chain monitoring):
    // pool_vault.amount == pool.total_value - pool.total_withdrawn - pool.total_fees_collected
    Ok(())
}
```
**Detection:** For every fee collection point (deposit fees, withdrawal fees, performance fees, platform fees), verify the fee amount is tracked in pool state. Check that `pool.total_value_locked` or equivalent accounts for fee deductions. Look for pool invariant checks — if none exist, flag as medium risk. Verify: `actual_vault_balance == expected_balance_from_accounting`.
