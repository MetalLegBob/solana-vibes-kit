# EP-010: Unchecked Token Mint
**Category:** Account Validation  **Severity:** CRITICAL  **Solana-Specific:** Yes
**Historical Exploits:** Fake token deposits across multiple protocols

**Description:** Token account accepted without mint verification. Worthless token credited as valuable.

**Vulnerable Pattern:**
```rust
pub user_token: Account<'info, TokenAccount>, // Which mint?
```
**Secure Pattern:**
```rust
#[account(constraint = user_token.mint == vault.accepted_mint)]
pub user_token: Account<'info, TokenAccount>,
```
**Detection:** Check all token accounts for mint constraints.
