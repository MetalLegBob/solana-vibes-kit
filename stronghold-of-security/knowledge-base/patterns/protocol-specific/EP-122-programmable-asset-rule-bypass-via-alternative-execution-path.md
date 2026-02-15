# EP-122: Programmable Asset Rule Bypass via Alternative Execution Path
**Category:** Logic / State Machine  **Severity:** CRITICAL  **Solana-Specific:** Yes
**Historical Exploits:** Metaplex pNFT Mad Shield audit (Dec 2023 — 3 Critical findings: delegate transfer path skipped metadata validation, AllowList bypass via mismatched owner/destination, burn instruction disabled all pNFT operations)

**Description:** Programmable NFTs (pNFTs) or other rule-enforced assets have multiple execution paths for operations like transfer or burn. If one path (e.g., delegate-initiated transfer) skips the validation that other paths enforce (e.g., metadata verification, Rule Set checking), all creator-defined rules can be bypassed.

**Sub-patterns:**
1. **Delegate path skip:** Transfer via token delegate bypasses metadata account validation, skipping Rule Set enforcement entirely
2. **AllowList destination mismatch:** AllowList validates the owner pubkey but doesn't verify the destination token account is actually owned by that pubkey — NFT transferred to non-approved program
3. **Token record destruction:** Burn instruction doesn't validate `token_record` when authority is token owner — burning token record permanently disables all pNFT operations for that asset

**Vulnerable Pattern:**
```rust
pub fn transfer_pnft(ctx: Context<TransferPNFT>) -> Result<()> {
    if ctx.accounts.authority.key() == ctx.accounts.token_owner.key() {
        // Owner path: validate metadata, check Rule Set
        validate_metadata(&ctx.accounts.metadata)?;
        check_rule_set(&ctx.accounts.rule_set, Operation::Transfer)?;
    } else {
        // Delegate path: MISSING metadata/rule validation
        // BUG: Delegate can transfer without any rule checks
    }
    execute_transfer(ctx)?;
    Ok(())
}
```
**Secure Pattern:**
```rust
pub fn transfer_pnft(ctx: Context<TransferPNFT>) -> Result<()> {
    // ALWAYS validate metadata and rules regardless of authority type
    validate_metadata(&ctx.accounts.metadata)?;
    check_rule_set(&ctx.accounts.rule_set, Operation::Transfer)?;

    // Then check authority-specific permissions
    match get_authority_type(&ctx) {
        AuthorityType::Owner => { /* owner-specific logic */ },
        AuthorityType::Delegate => { /* delegate-specific logic */ },
    }
    execute_transfer(ctx)?;
    Ok(())
}
```
**Detection:** For any programmable/rule-enforced asset: (a) enumerate ALL execution paths for each operation (transfer, burn, delegate, etc.), (b) verify Rule Set/validation logic runs on ALL paths, not just the primary one, (c) check that destination account ownership matches the validated identity, (d) verify destructive operations (burn) cannot destroy control structures (token_record, metadata) independently.
