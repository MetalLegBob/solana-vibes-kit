# EP-001: Missing Signer Check
**Category:** Account Validation  **Severity:** CRITICAL  **Solana-Specific:** Yes
**Historical Exploits:** Wormhole ($320M, Feb 2022)

**Description:** Authority account not verified as transaction signer, allowing unauthorized callers.

**Vulnerable Pattern:**
```rust
pub authority: AccountInfo<'info>, // No Signer constraint!
```
**Secure Pattern:**
```rust
pub authority: Signer<'info>, // Anchor enforces is_signer
```
**Detection:** Grep for `AccountInfo` on authority/admin accounts. Verify `Signer<'info>` usage.
