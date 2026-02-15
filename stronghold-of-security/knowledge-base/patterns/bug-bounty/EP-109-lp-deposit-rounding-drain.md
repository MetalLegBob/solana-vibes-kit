# EP-109: LP Deposit Rounding Drain
**Category:** Arithmetic / Economic  **Severity:** CRITICAL  **Solana-Specific:** No
**Historical Exploits:** Raydium cp-swap Liquidity Drain ($505K bounty, Mar 2025 — ceiling rounding on zero amounts)

**Description:** In AMM deposit functions, the conversion between LP tokens and underlying tokens uses rounding (ceiling or floor). When the deposit amount is very small, integer arithmetic with ceiling rounding can produce `token_amount = 0` for one side while still minting LP tokens. An attacker deposits with only one token type, receives LP tokens, then withdraws both token types proportionally — draining the pool one tiny iteration at a time.

**Vulnerable Pattern:**
```rust
pub fn deposit(ctx: Context<Deposit>, lp_amount: u64) -> Result<()> {
    let pool = &ctx.accounts.pool;
    // Convert LP amount to required token amounts
    let (token_0_amount, token_1_amount) = lp_tokens_to_trading_tokens(
        lp_amount,
        pool.lp_supply,
        pool.token_0_vault_amount,
        pool.token_1_vault_amount,
        RoundDirection::Ceiling, // Ceiling rounds UP
    )?;
    // BUG: If lp_amount is tiny, token_1_amount can round to 0
    // Attacker deposits only token_0, gets LP tokens for free
    transfer_from_user(token_0_amount)?; // Small amount
    transfer_from_user(token_1_amount)?; // ZERO — no transfer needed
    mint_lp(lp_amount)?; // Still mints LP tokens
    Ok(())
}
```
**Secure Pattern:**
```rust
pub fn deposit(ctx: Context<Deposit>, lp_amount: u64) -> Result<()> {
    let (token_0_amount, token_1_amount) = lp_tokens_to_trading_tokens(
        lp_amount, pool.lp_supply, pool.token_0_vault_amount,
        pool.token_1_vault_amount, RoundDirection::Ceiling,
    )?;
    // CRITICAL: Reject zero amounts
    require!(token_0_amount > 0, ErrorCode::ZeroAmount);
    require!(token_1_amount > 0, ErrorCode::ZeroAmount);
    require!(lp_amount > 0, ErrorCode::ZeroAmount);

    transfer_from_user(token_0_amount)?;
    transfer_from_user(token_1_amount)?;
    mint_lp(lp_amount)?;
    Ok(())
}
```
**Detection:** In AMM deposit/withdrawal functions, check rounding direction and verify that ALL calculated amounts are checked for `> 0`. Look for `RoundDirection::Ceiling` or `RoundDirection::Floor` in token calculations. Flag any deposit that doesn't validate both token amounts are non-zero.
