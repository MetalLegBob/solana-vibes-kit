# EP-007: Account Relationship Not Verified
**Category:** Account Validation  **Severity:** CRITICAL  **Solana-Specific:** Yes
**Historical Exploits:** Tulip Protocol vault drain (disclosed)

**Description:** Account accepted without verifying it belongs to the expected parent (e.g., vault_token not linked to vault).

**Vulnerable Pattern:**
```rust
pub vault_token: Account<'info, TokenAccount>, // Not linked to vault!
```
**Secure Pattern:**
```rust
#[account(constraint = vault_token.owner == vault.key())]
pub vault_token: Account<'info, TokenAccount>,
```
**Detection:** Map account relationships. Verify constraints enforce cross-account links.
