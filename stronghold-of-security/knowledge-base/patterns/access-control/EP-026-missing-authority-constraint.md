# EP-026: Missing Authority Constraint
**Category:** Access Control  **Severity:** CRITICAL  **Solana-Specific:** No
**Historical Exploits:** Common in nearly every Solana audit

**Description:** Admin function does not verify caller is the stored authority.

**Vulnerable Pattern:**
```rust
pub fn update_fee(ctx: ..., fee: u64) { config.fee = fee; } // No auth!
```
**Secure Pattern:**
```rust
#[account(mut, has_one = authority @ ErrorCode::Unauthorized)]
pub config: Account<'info, Config>,
pub authority: Signer<'info>,
```
**Detection:** List privileged ops. Verify `has_one` or key equality constraint.
