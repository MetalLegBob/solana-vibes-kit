# EP-098: CPI Destination Account Injection in Multi-Step Operations
**Category:** CPI / Account Validation  **Severity:** CRITICAL  **Solana-Specific:** Yes
**Historical Exploits:** Texture Finance ($2.2M, Jul 2025 — vault rebalance missing ownership check)

**Description:** In multi-step operations (rebalance, migrate, compound), the program sends tokens via CPI to a destination account. If the destination account is not validated as belonging to the expected PDA/vault, an attacker can substitute their own account and intercept the tokens.

**Vulnerable Pattern:**
```rust
// Texture: Vault rebalances USDC into SuperLendy pools for LP tokens
// BUG: lp_token_account not validated as owned by vault
pub fn rebalance(ctx: Context<Rebalance>) -> Result<()> {
    let amount = ctx.accounts.vault.available_balance()?;
    // CPI to SuperLendy — deposits USDC, receives LP tokens
    superlend::cpi::deposit(
        CpiContext::new(
            ctx.accounts.superlend_program.to_account_info(),
            superlend::cpi::Deposit {
                depositor: ctx.accounts.vault.to_account_info(),
                lp_token_account: ctx.accounts.lp_token_account.to_account_info(), // NOT VALIDATED
                // ...
            },
        ),
        amount,
    )?;
    Ok(())
}
```
**Secure Pattern:**
```rust
#[derive(Accounts)]
pub struct Rebalance<'info> {
    #[account(mut)]
    pub vault: Account<'info, Vault>,
    #[account(
        mut,
        // CRITICAL: Verify LP token account is owned by vault PDA
        constraint = lp_token_account.owner == vault.key() @ ErrorCode::InvalidAccountOwner,
        // Also verify correct mint
        constraint = lp_token_account.mint == expected_lp_mint @ ErrorCode::InvalidMint,
    )]
    pub lp_token_account: Account<'info, TokenAccount>,
    // ...
}
```
**Detection:** In multi-step operations (rebalance, compound, migrate), verify every CPI destination account has ownership/authority constraints. Look for `token_account` parameters without `constraint = ... .owner ==` checks. Especially audit any function that moves tokens through intermediate steps.
