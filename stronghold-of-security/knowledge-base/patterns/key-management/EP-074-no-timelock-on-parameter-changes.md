# EP-074: No Timelock on Parameter Changes
**Category:** Key Management  **Severity:** HIGH  **Solana-Specific:** No
**Historical Exploits:** Marinade commission changes, Bonfida governance dispute

**Description:** Critical parameter changes (fees, authorities) take effect immediately.

**Vulnerable Pattern:**
```rust
pub fn set_fee(ctx: ..., fee: u64) { pool.fee = fee; } // Instant!
```
**Secure Pattern:**
```rust
pool.pending_fee = Some(fee);
pool.fee_change_slot = clock.slot + TIMELOCK; // e.g., 3 days
// Separate execute after timelock expires
```
**Detection:** Find parameter changes. Verify timelock delays.
