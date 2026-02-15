# EP-090: Simultaneous Operation Race
**Category:** Race Conditions  **Severity:** HIGH  **Solana-Specific:** No
**Historical Exploits:** Cyclos ($340K, Mar 2022), Hubble ($180K, Jul 2022)

**Description:** Withdraw + borrow in same tx batch. Health check after both = undercollateralized.

**Vulnerable Pattern:**
```rust
// Ix1: withdraw collateral. Ix2: borrow against it. Health check post-both.
```
**Secure Pattern:**
```rust
validate_health(user)?; // Before
execute_operation()?;
validate_health(user)?; // After each operation
```
**Detection:** Find composable operations. Verify per-operation health checks.
