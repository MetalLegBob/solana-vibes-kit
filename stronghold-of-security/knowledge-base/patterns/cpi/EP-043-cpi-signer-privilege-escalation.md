# EP-043: CPI Signer Privilege Escalation
**Category:** CPI  **Severity:** CRITICAL  **Solana-Specific:** Yes
**Historical Exploits:** Malicious programs using escalated PDA privileges

**Description:** PDA signer passed to untrusted CPI target. Called program uses signer for unauthorized actions.

**Vulnerable Pattern:**
```rust
invoke_signed(&ix, &remaining_accounts, &[&vault_seeds])?; // Vault signs for anything!
```
**Secure Pattern:**
```rust
require_keys_eq!(target.key(), TRUSTED_PROGRAM_ID);
invoke_signed(&specific_ix, &[vault, dest], signer_seeds)?; // Limited scope
```
**Detection:** Review `invoke_signed`. Verify target validated and accounts explicit.
