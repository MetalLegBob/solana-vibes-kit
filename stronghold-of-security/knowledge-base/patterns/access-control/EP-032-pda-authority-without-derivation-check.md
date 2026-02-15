# EP-032: PDA Authority Without Derivation Check
**Category:** Access Control  **Severity:** CRITICAL  **Solana-Specific:** Yes
**Historical Exploits:** Vaults drained via fake PDA accounts

**Description:** PDA key matched but derivation not re-verified. Substituted accounts accepted.

**Vulnerable Pattern:**
```rust
require_keys_eq!(vault.authority, vault_authority.key()); // Key only!
```
**Secure Pattern:**
```rust
#[account(seeds = [b"auth", vault.key().as_ref()], bump)]
pub vault_authority: SystemAccount<'info>, // Re-derives PDA
```
**Detection:** Find PDA authorities. Verify `seeds` constraint re-derives PDA.
