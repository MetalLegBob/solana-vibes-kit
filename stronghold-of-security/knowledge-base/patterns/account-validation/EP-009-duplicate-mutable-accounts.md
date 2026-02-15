# EP-009: Duplicate Mutable Accounts
**Category:** Account Validation  **Severity:** CRITICAL  **Solana-Specific:** Yes
**Historical Exploits:** Saber stableswap (Aug 2022) - infinite minting

**Description:** Same account passed as two parameters. Transfer operations become no-ops or double-spend.

**Vulnerable Pattern:**
```rust
pub source: Account<'info, UserAccount>,
pub dest: Account<'info, UserAccount>, // Could be same as source!
```
**Secure Pattern:**
```rust
#[account(mut, constraint = source.key() != dest.key())]
pub source: Account<'info, UserAccount>,
```
**Detection:** Find multiple mutable accounts of same type. Verify inequality constraints.
