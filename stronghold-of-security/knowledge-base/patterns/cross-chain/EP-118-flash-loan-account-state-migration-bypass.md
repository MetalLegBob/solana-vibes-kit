# EP-118: Flash Loan Account State Migration Bypass
**Category:** Logic / State Machine  **Severity:** CRITICAL  **Solana-Specific:** Yes
**Historical Exploits:** MarginFi ($160M at risk, Sep 2025 — `transfer_to_new_account` bypassed flash loan repayment check, patched before exploit)

**Description:** Program has both flash loan functionality AND account migration/transfer instructions. During an active flash loan, the user's account is in a temporary state (borrowed but not yet repaid). If the account can be migrated or transferred to a new account during this window, the flash loan repayment check operates on the old (zeroed/disabled) account instead of the new one, allowing the borrower to keep funds without repayment.

**Vulnerable Pattern:**
```rust
pub fn flash_loan_start(ctx: Context<FlashLoan>) -> Result<()> {
    let account = &mut ctx.accounts.user_account;
    account.flash_loan_active = true;
    transfer_tokens_to_user(amount)?;
    Ok(())
}

pub fn transfer_to_new_account(ctx: Context<Transfer>) -> Result<()> {
    let old_account = &mut ctx.accounts.old_account;
    let new_account = &mut ctx.accounts.new_account;
    // BUG: No check for active flash loan
    new_account.balances = old_account.balances.clone();
    old_account.balances = Balances::default(); // Zeroed out
    old_account.disabled = true;
    Ok(())
}

pub fn flash_loan_end(ctx: Context<FlashLoan>) -> Result<()> {
    let account = &ctx.accounts.user_account; // Points to OLD account
    // OLD account is zeroed/disabled — health check passes (no liability)
    // Borrowed funds are gone, never repaid
    account.flash_loan_active = false;
    Ok(())
}
```
**Secure Pattern:**
```rust
pub fn transfer_to_new_account(ctx: Context<Transfer>) -> Result<()> {
    let old_account = &ctx.accounts.old_account;
    // CRITICAL: Block migration during active flash loan
    require!(!old_account.flash_loan_active, ErrorCode::FlashLoanActive);
    // ... proceed with migration
    Ok(())
}
```
**Detection:** For any program with flash loan support: (a) identify ALL instructions that can modify, move, or reset account state, (b) verify each checks for active flash loan state, (c) test: can a user start a flash loan, call another instruction that resets their state, then end the flash loan? Also applies to: account delegation, account close, authority transfer, and position splitting during flash loans.
