# EP-104: Cross-Chain Message Non-Recoverability
**Category:** Bridge / Cross-Chain  **Severity:** HIGH  **Solana-Specific:** No
**Historical Exploits:** Olympus DAO OFT (High, Mar 2023 — failed LayerZero messages locked tokens permanently)

**Description:** Cross-chain bridge burns or locks tokens on the source chain immediately upon send, but if the message fails on the destination chain (validator downtime, gas issues, payload errors), there is no retry or refund mechanism. Tokens are permanently locked/burned with no recovery path.

**Vulnerable Pattern:**
```rust
pub fn send_cross_chain(ctx: Context<Send>, amount: u64, dst_chain: u16) -> Result<()> {
    // BUG: Tokens burned immediately — no recovery if destination fails
    burn_tokens(&ctx.accounts.source_token_account, amount)?;
    send_lz_message(dst_chain, payload)?;
    // If message fails on destination: tokens are gone forever
    Ok(())
}
```
**Secure Pattern:**
```rust
pub fn send_cross_chain(ctx: Context<Send>, amount: u64, dst_chain: u16) -> Result<()> {
    let transfer = &mut ctx.accounts.pending_transfer;
    transfer.amount = amount;
    transfer.dst_chain = dst_chain;
    transfer.status = TransferStatus::Pending;
    transfer.created_at = Clock::get()?.unix_timestamp;
    transfer.sender = ctx.accounts.user.key();

    // Escrow tokens (don't burn yet) — can be reclaimed on failure
    escrow_tokens(&ctx.accounts.source_token_account, &ctx.accounts.escrow, amount)?;
    send_lz_message(dst_chain, payload)?;
    // On destination confirmation: mark complete, burn escrowed tokens
    // On failure/timeout: user calls reclaim_failed_transfer()
    Ok(())
}

pub fn reclaim_failed_transfer(ctx: Context<Reclaim>) -> Result<()> {
    let transfer = &ctx.accounts.pending_transfer;
    require!(transfer.status == TransferStatus::Failed, ErrorCode::NotFailed);
    require!(transfer.sender == ctx.accounts.user.key(), ErrorCode::NotSender);
    release_escrow(&ctx.accounts.escrow, &ctx.accounts.user_token_account, transfer.amount)?;
    Ok(())
}
```
**Detection:** In bridge/cross-chain programs, verify: (a) tokens are escrowed, not burned, until destination confirmation, (b) failed messages have a retry mechanism, (c) timeout/refund exists for permanently failed messages, (d) pending transfer state is tracked on-chain. Check LayerZero, Wormhole, and custom bridge integrations.
