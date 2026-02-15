# EP-027: Confused Deputy / Authority Mismatch
**Category:** Access Control  **Severity:** CRITICAL  **Solana-Specific:** Yes
**Historical Exploits:** Vaults drained via mismatched vault-authority pairs

**Description:** Signer verified but not matched to the specific resource being accessed.

**Vulnerable Pattern:**
```rust
require!(authority.is_signer); // But for WHICH vault?
```
**Secure Pattern:**
```rust
#[account(mut, has_one = authority)]
pub vault: Account<'info, Vault>,
pub authority: Signer<'info>,
```
**Detection:** Verify authority matched to specific resource via `has_one`.
