# EP-060: Missing Slippage Protection
**Category:** Economic  **Severity:** HIGH  **Solana-Specific:** No
**Historical Exploits:** Sandwich attacks on Jupiter, Raydium, Orca

**Description:** Swap accepts no minimum output. MEV bots sandwich users.

**Vulnerable Pattern:**
```rust
pub fn swap(ctx: ..., amount_in: u64) { /* no min_out! */ }
```
**Secure Pattern:**
```rust
pub fn swap(ctx: ..., amount_in: u64, min_out: u64, deadline: i64) {
    require!(clock.unix_timestamp <= deadline);
    require!(amount_out >= min_out, ErrorCode::Slippage);
}
```
**Detection:** Review swap functions. Verify `min_amount_out` and deadline params.
