# EP-028: Delegate Authority Misuse
**Category:** Access Control  **Severity:** HIGH  **Solana-Specific:** Yes
**Historical Exploits:** Token delegate bypass of owner checks

**Description:** Token account owner checked but delegate ignored. Delegate can still authorize transfers.

**Vulnerable Pattern:**
```rust
require!(token_account.owner == user.key()); // Delegate can still transfer!
```
**Secure Pattern:**
```rust
if let COption::Some(delegate) = token_account.delegate {
    require!(delegate == user.key(), ErrorCode::UnauthorizedDelegate);
}
```
**Detection:** Check if delegate field is validated alongside owner.
