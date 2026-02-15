# EP-029: Missing Freeze Check
**Category:** Access Control  **Severity:** MEDIUM  **Solana-Specific:** Yes
**Historical Exploits:** Frozen accounts used in protocol operations

**Description:** Frozen token account used without checking frozen state.

**Vulnerable Pattern:**
```rust
token::transfer(/* from potentially frozen account */)?;
```
**Secure Pattern:**
```rust
require!(!user_tokens.is_frozen(), ErrorCode::AccountFrozen);
```
**Detection:** Check for `is_frozen()` before token operations.
