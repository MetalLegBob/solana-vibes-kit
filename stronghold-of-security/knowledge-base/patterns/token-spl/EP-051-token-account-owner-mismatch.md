# EP-051: Token Account Owner Mismatch
**Category:** Token/SPL  **Severity:** HIGH  **Solana-Specific:** Yes
**Historical Exploits:** Deposits credited to wrong users

**Description:** Token account's owner field not verified to match expected user.

**Vulnerable Pattern:**
```rust
pub user_token: Account<'info, TokenAccount>, // owner not verified!
```
**Secure Pattern:**
```rust
#[account(constraint = user_token.owner == user.key())]
pub user_token: Account<'info, TokenAccount>,
```
**Detection:** Verify `.owner` matches expected user on all token accounts.
