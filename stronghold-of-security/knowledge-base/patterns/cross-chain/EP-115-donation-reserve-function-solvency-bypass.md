# EP-115: Donation/Reserve Function Solvency Bypass
**Category:** Economic / DeFi  **Severity:** CRITICAL  **Solana-Specific:** No
**Historical Exploits:** Euler Finance ($197M, Mar 2023 — `donateToReserves` burned collateral without solvency check)

**Description:** Protocol has a function that modifies a user's collateral or debt position (donate, contribute, add-to-reserve, forfeit) without verifying that the position remains solvent afterward. Attacker intentionally drives their position into bad debt, then exploits the liquidation mechanism (favorable discount, self-liquidation) to extract value. The key insight: any function that can make a position unhealthy without checking is an exploit primitive.

**Vulnerable Pattern:**
```rust
pub fn donate_to_reserve(ctx: Context<Donate>, amount: u64) -> Result<()> {
    let user_position = &mut ctx.accounts.user_position;
    let reserve = &mut ctx.accounts.reserve;

    // Burns user's collateral tokens (eTokens equivalent)
    user_position.collateral -= amount;
    reserve.total_reserves += amount;

    // BUG: No health check — position may now be insolvent
    // Attacker leverages up → donates collateral → triggers self-liquidation at discount
    Ok(())
}
```
**Secure Pattern:**
```rust
pub fn donate_to_reserve(ctx: Context<Donate>, amount: u64) -> Result<()> {
    let user_position = &mut ctx.accounts.user_position;
    let reserve = &mut ctx.accounts.reserve;

    user_position.collateral -= amount;
    reserve.total_reserves += amount;

    // CRITICAL: Verify position is still healthy after any collateral change
    let health = calculate_health_factor(user_position, oracle_price)?;
    require!(health >= MIN_HEALTH_FACTOR, ErrorCode::PositionUnhealthy);
    Ok(())
}
```
**Detection:** Find ALL functions that decrease collateral, increase debt, or modify position health. For each, verify a solvency/health check occurs AFTER the modification. Includes: donate, forfeit, contribute, burn-collateral, transfer-position, split-position, and any admin function that modifies individual positions. Also check liquidation discount — if an attacker can self-liquidate at favorable rates, the donate→liquidate loop is profitable.
