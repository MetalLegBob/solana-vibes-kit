# EP-057: Token-2022 Non-Transferable Bypass
**Category:** Token/SPL  **Severity:** MEDIUM  **Solana-Specific:** Yes
**Historical Exploits:** Soulbound token transfer via burn+mint

**Description:** Non-transferable extension bypassed through burn-then-mint-to-new-owner pattern.

**Vulnerable Pattern:**
```rust
token::burn(ctx, amount)?;
token::mint_to(new_owner_ctx, amount)?; // Effectively transferred!
```
**Secure Pattern:**
```rust
if mint_has_extension(ExtensionType::NonTransferable) {
    require!(burn_owner == mint_dest, ErrorCode::CannotTransfer);
}
```
**Detection:** Check burn+mint patterns on non-transferable tokens.
