# EP-063: Interest Rate Manipulation
**Category:** Economic  **Severity:** HIGH  **Solana-Specific:** No
**Historical Exploits:** Euler Finance ($200M, Mar 2023, Ethereum)

**Description:** Instant rate updates based on utilization. Flash loans spike utilization.

**Vulnerable Pattern:**
```rust
let rate = calculate_rate(borrowed * 10000 / deposited); // Instant!
```
**Secure Pattern:**
```rust
let twap_util = pool.calculate_twap_utilization(SLOTS_PER_HOUR)?;
let max_change = pool.rate / 10;
pool.rate = clamp(target, pool.rate - max_change, pool.rate + max_change);
```
**Detection:** Check rate updates: instant vs TWAP utilization. Verify rate change limits.
