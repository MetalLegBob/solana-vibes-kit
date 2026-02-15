# EP-103: ATA Assumption Failure in Migration/Claim
**Category:** Account Validation  **Severity:** MEDIUM  **Solana-Specific:** Yes
**Historical Exploits:** Cytonic Network (Medium, Jul 2024 — non-ATA deposits broke migration function)

**Description:** Protocol derives a user's Associated Token Account (ATA) to locate their tokens for migration, claim, airdrop, or refund operations. If a user deposited to a non-ATA token account (which is valid on Solana), the derived ATA has zero balance and the user's tokens are silently skipped or locked.

**Vulnerable Pattern:**
```rust
pub fn migrate(ctx: Context<Migrate>) -> Result<()> {
    // BUG: Assumes user's tokens are always in their ATA
    let user_ata = get_associated_token_address(&ctx.accounts.user.key(), &old_mint);
    let balance = get_token_balance(&user_ata)?; // Returns 0 if tokens are in non-ATA account
    // User's actual tokens in a different account — migration silently skips them
    mint_new_tokens(ctx.accounts.user_new_ata, balance)?;
    Ok(())
}
```
**Secure Pattern:**
```rust
#[derive(Accounts)]
pub struct Migrate<'info> {
    pub user: Signer<'info>,
    // User provides their actual token account (ATA or otherwise)
    #[account(
        mut,
        constraint = user_token_account.owner == user.key() @ ErrorCode::InvalidOwner,
        constraint = user_token_account.mint == old_mint @ ErrorCode::InvalidMint,
    )]
    pub user_token_account: Account<'info, TokenAccount>,
    // ...
}

pub fn migrate(ctx: Context<Migrate>) -> Result<()> {
    let source = &ctx.accounts.user_token_account;
    // Works regardless of whether source is ATA or non-ATA
    burn_old_tokens(source, source.amount)?;
    mint_new_tokens(ctx.accounts.user_new_ata, source.amount)?;
    Ok(())
}
```
**Detection:** Search for `get_associated_token_address` used to derive source accounts for migration, claim, or refund operations. Verify the protocol either (a) enforces ATA-only deposits at entry point, or (b) accepts user-specified source accounts with proper ownership/mint validation. Particularly risky in token migration, airdrop claim, and emergency withdrawal functions.
