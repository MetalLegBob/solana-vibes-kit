# EP-083: Upgrade Without Notice
**Category:** Upgrade  **Severity:** HIGH  **Solana-Specific:** Yes
**Historical Exploits:** OptiFi accidental close ($661K)

**Description:** Program upgraded/closed with no advance notice. Users can't withdraw first.

**Vulnerable Pattern:**
```bash
solana program deploy new.so # No notice!
```
**Secure Pattern:**
```rust
state.pending_upgrade = Some(PendingUpgrade {
    buffer, grace_period_ends: clock.slot + 604800, // ~7 days
});
// Block new deposits during grace period
```
**Detection:** Verify upgrade procedures include notice period.
