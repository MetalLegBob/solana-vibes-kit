# EP-054: Token-2022 Transfer Fee Not Accounted
**Category:** Token/SPL  **Severity:** HIGH  **Solana-Specific:** Yes
**Historical Exploits:** Emerging with Token-2022 adoption

**Description:** Token-2022 transfer fees deducted from recipient. Protocol receives less than expected.

**Vulnerable Pattern:**
```rust
token::transfer(ctx, amount)?;
vault.balance += amount; // Wrong! Fee deducted!
```
**Secure Pattern:**
```rust
let pre = vault_token.amount;
token::transfer_checked(ctx, amount, decimals)?;
vault_token.reload()?;
vault.balance += vault_token.amount - pre; // Actual received
```
**Detection:** Check Token-2022 support. Verify post-transfer balance checks.
