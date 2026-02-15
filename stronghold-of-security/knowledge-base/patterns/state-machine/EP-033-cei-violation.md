# EP-033: CEI Violation
**Category:** Logic Errors  **Severity:** CRITICAL  **Solana-Specific:** No
**Historical Exploits:** Crema Finance ($8.8M, Jul 2022), DeFi Land ($70K, Nov 2021)

**Description:** State updates after external calls (CPI). Enables reentrancy or stale-state exploitation.

**Vulnerable Pattern:**
```rust
token::transfer(/* out */)?;    // Interaction FIRST
position.liquidity -= amount;   // Effect LAST - stale if reentered
```
**Secure Pattern:**
```rust
pool.reentrancy_lock = true;
position.liquidity -= amount;   // Effect FIRST
token::transfer(/* out */)?;    // Interaction LAST
pool.reentrancy_lock = false;
```
**Detection:** State updates must precede CPI. Look for reentrancy guards.
