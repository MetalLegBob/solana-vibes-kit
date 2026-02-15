# EP-050: CPI Account Injection
**Category:** CPI  **Severity:** HIGH  **Solana-Specific:** Yes
**Historical Exploits:** Injected remaining_accounts altering CPI behavior

**Description:** `remaining_accounts` forwarded raw to CPI. Attacker injects accounts changing behavior.

**Vulnerable Pattern:**
```rust
invoke(&ix, &ctx.remaining_accounts.to_vec())?; // Unvalidated!
```
**Secure Pattern:**
```rust
invoke(&ix, &[vault.to_account_info(), dest.to_account_info()])?; // Explicit
```
**Detection:** Find CPI with remaining_accounts. Verify explicit account construction.
