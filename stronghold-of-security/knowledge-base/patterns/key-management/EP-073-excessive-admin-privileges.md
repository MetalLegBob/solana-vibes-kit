# EP-073: Excessive Admin Privileges
**Category:** Key Management  **Severity:** HIGH  **Solana-Specific:** No
**Historical Exploits:** Raydium pool drainage, Marinade commission changes

**Description:** Admin has unlimited withdrawals and instant parameter changes with no caps or delays.

**Vulnerable Pattern:**
```rust
pub fn admin_withdraw(ctx: ..., amount: u64) { transfer(amount)?; } // No limit!
```
**Secure Pattern:**
```rust
require!(amount <= MAX_PER_TX);
require!(clock.slot - last_withdraw > MIN_DELAY);
emit!(AdminWithdrawEvent { amount, slot });
```
**Detection:** List admin functions. Verify limits, rate limiting, events.
