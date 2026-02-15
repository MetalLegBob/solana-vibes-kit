# EP-106: Lamport Transfer Write-Demotion Trap
**Category:** Account Validation / Runtime  **Severity:** HIGH  **Solana-Specific:** Yes
**Historical Exploits:** "King of the SOL" secp256r1_program eternal king (May 2025 — OtterSec disclosure)

**Description:** When transferring lamports to arbitrary accounts, the Solana runtime silently demotes certain accounts from writable to read-only during message sanitization. Accounts on the "reserved account list" (built-in programs, sysvars) and executable accounts cannot receive lamport transfers even if marked `mut`. Programs that reimburse or refund lamports to arbitrary user-provided accounts will silently fail or brick when the target account is reserved/executable.

Three sub-traps:
1. **Rent-Exemption Trap:** Transferring FROM an account can drop it below rent-exempt threshold, causing account garbage collection
2. **Executable Account Trap:** Executable accounts (programs) reject lamport writes — `set_lamports` fails silently
3. **Write-Demotion Trap:** Reserved accounts are silently downgraded from writable to read-only by runtime

**Vulnerable Pattern:**
```rust
// King-of-the-Hill: reimburse previous king
pub fn claim_throne(ctx: Context<ClaimThrone>) -> Result<()> {
    let old_king = &ctx.accounts.old_king; // User-provided account
    let bid = ctx.accounts.bid_amount;

    // BUG: If old_king is secp256r1_program or other reserved account,
    // this silently fails — old_king can never be dethroned
    **old_king.lamports.borrow_mut() += bid;
    **ctx.accounts.vault.lamports.borrow_mut() -= bid;
    Ok(())
}
```
**Secure Pattern:**
```rust
// Never transfer lamports to arbitrary accounts
// Use a PDA vault for refunds, let users claim
pub fn claim_throne(ctx: Context<ClaimThrone>) -> Result<()> {
    let refund_vault = &ctx.accounts.refund_vault; // PDA owned by program
    // Store refund in vault, user claims via separate instruction
    refund_vault.pending_refund += bid;
    refund_vault.recipient = old_king.key();
    Ok(())
}
```
**Detection:** Find lamport transfers to user-provided accounts (`**account.lamports.borrow_mut()`). Check if the recipient is validated as NOT executable and NOT on the reserved list. Flag any pattern where lamports are sent to an arbitrary `AccountInfo` without checks.
