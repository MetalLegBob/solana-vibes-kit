# EP-053: Orphaned Token Account Rent Lock
**Category:** Token/SPL  **Severity:** LOW  **Solana-Specific:** Yes
**Historical Exploits:** Rent accumulation from undrained accounts

**Description:** Token account drained but not closed. Rent SOL locked permanently.

**Vulnerable Pattern:**
```rust
token::transfer(/* all tokens */)?; // Account not closed!
```
**Secure Pattern:**
```rust
token::transfer(/* all tokens */)?;
token::close_account(/* return rent */)?;
```
**Detection:** Find transfers draining accounts. Verify close_account follows.
