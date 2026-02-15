# EP-101: Liquidity Extraction by Privileged Account
**Category:** Rug Pull / Access Control  **Severity:** CRITICAL  **Solana-Specific:** No
**Historical Exploits:** LIBRA ($286M, Feb 2025 — $85M liquidity withdrawn in 2 hours), MELANIA ($200M, Jan 2025 — $26M liquidity withdrawn), SolFire ($4M, Jan 2022 — deposited funds drained by admin)

**Description:** Protocol deployer or admin retains the ability to withdraw liquidity from AMM pools, drain vaults, or extract deposited funds without restriction. This is the on-chain mechanism behind most rug pulls. The contract may appear legitimate but contains a privileged withdrawal path with no timelock, multisig, or community governance requirement.

**Vulnerable Pattern:**
```rust
// Deployer can remove all liquidity from AMM pool at any time
pub fn remove_liquidity(ctx: Context<RemoveLiquidity>, amount: u64) -> Result<()> {
    // Only checks deployer signature — no timelock, no multisig
    require!(ctx.accounts.authority.key() == DEPLOYER_PUBKEY);
    // Drains pool liquidity to deployer wallet
    transfer_from_pool(ctx.accounts.pool, ctx.accounts.authority_token_account, amount)?;
    Ok(())
}

// Variations:
// - LP token holder can burn and withdraw (LIBRA pattern)
// - Admin wallet holds majority of LP tokens from launch
// - "Migration" function moves all funds to new contract (actually attacker wallet)
```
**Secure Pattern:**
```rust
// Liquidity locked with timelock + multisig + community veto
pub fn remove_liquidity(ctx: Context<RemoveLiquidity>, amount: u64) -> Result<()> {
    let lock = &ctx.accounts.liquidity_lock;
    // Require timelock period has passed since proposal
    require!(
        Clock::get()?.unix_timestamp >= lock.proposed_at + LIQUIDITY_LOCK_PERIOD,
        ErrorCode::TimelockNotExpired
    );
    // Require multisig approval
    require!(lock.approvals >= REQUIRED_APPROVALS, ErrorCode::InsufficientApprovals);
    // Cap withdrawal amount per period
    require!(amount <= lock.max_withdrawal_per_period, ErrorCode::WithdrawalCapExceeded);
    // Emit event for off-chain monitoring
    emit!(LiquidityRemoved { amount, authority: ctx.accounts.authority.key() });
    transfer_from_pool(ctx.accounts.pool, ctx.accounts.destination, amount)?;
    Ok(())
}
```
**Detection:** Check who holds LP tokens after launch (concentrated ownership = rug risk). Verify liquidity lock contracts and timelock durations. Audit admin withdrawal functions for caps and multisig requirements. Check if deployer can call `remove_liquidity` or `withdraw` without restrictions. Look for "migration" or "upgrade" functions that move all funds. Verify LP token vesting schedules.
