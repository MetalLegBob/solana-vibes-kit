# EP-014: ALT Account Substitution
**Category:** Account Validation  **Severity:** HIGH  **Solana-Specific:** Yes
**Historical Exploits:** Batch processing with ALT-sourced malicious accounts

**Description:** Address Lookup Table accounts in `remaining_accounts` not validated with same rigor as direct accounts.

**Vulnerable Pattern:**
```rust
for account in ctx.remaining_accounts { // Unvalidated!
    let vault: Account<Vault> = Account::try_from(account)?;
}
```
**Secure Pattern:**
```rust
for (account, expected) in remaining_accounts.iter().zip(expected_keys.iter()) {
    require_keys_eq!(account.key(), *expected);
    require!(account.owner == &crate::ID);
}
```
**Detection:** Find `remaining_accounts`. Verify key, owner, type validation.
