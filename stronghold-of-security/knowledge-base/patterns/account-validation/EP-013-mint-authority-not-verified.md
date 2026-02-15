# EP-013: Mint Authority Not Verified
**Category:** Account Validation  **Severity:** HIGH  **Solana-Specific:** Yes
**Historical Exploits:** MonkeyBall ($250K, Feb 2022) - compromised mint authority

**Description:** Mint accepted without checking if mint authority is revoked/trusted. Attacker mints unlimited supply.

**Vulnerable Pattern:**
```rust
pub token_mint: Account<'info, Mint>, // Any mint accepted!
```
**Secure Pattern:**
```rust
#[account(constraint = token_mint.mint_authority == COption::None)]
pub token_mint: Account<'info, Mint>,
```
**Detection:** Find mint usage. Verify `mint_authority` constraints.
