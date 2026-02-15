# EP-119: Fee/Revenue Destination Account Hijacking
**Category:** Account Validation  **Severity:** HIGH  **Solana-Specific:** Yes
**Historical Exploits:** Raydium CP-Swap creator fee hijacking (Dec 2025 — UncheckedAccount for fee recipient allowed stealing all creator fees from any pool)

**Description:** Fee collection instructions accept the fee destination account as an unchecked or loosely validated input. If the program doesn't verify that the fee recipient matches the pool creator or authorized fee collector, any caller can redirect fees to their own account.

**Vulnerable Pattern:**
```rust
#[account(mut)]
pub creator_fee_destination: UncheckedAccount<'info>, // Not validated!

pub fn collect_creator_fees(ctx: Context<CollectFees>) -> Result<()> {
    // Transfers accumulated creator fees to whatever account is passed
    transfer_tokens(
        &ctx.accounts.pool_fee_vault,
        &ctx.accounts.creator_fee_destination, // Attacker's account
        fee_amount,
    )?;
    Ok(())
}
```
**Secure Pattern:**
```rust
#[account(
    mut,
    constraint = creator_fee_destination.key() == pool.creator_fee_account @ ErrorCode::InvalidFeeAccount
)]
pub creator_fee_destination: AccountInfo<'info>,

// OR derive fee destination from pool creator PDA
#[account(
    mut,
    seeds = [b"creator_fee", pool.key().as_ref()],
    bump
)]
pub creator_fee_destination: Account<'info, TokenAccount>,
```
**Detection:** Search for `UncheckedAccount` in fee/revenue collection instructions. Verify fee destinations are constrained to pool creator or PDA-derived accounts. Check that fee rate parameters cannot be manipulated by non-creators.
