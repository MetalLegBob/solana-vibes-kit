# EP-058: Flash Loan Price Manipulation
**Category:** Economic  **Severity:** CRITICAL  **Solana-Specific:** No
**Historical Exploits:** Nirvana ($3.5M, Jul 2022), Mango Markets ($114M, Oct 2022)

**Description:** Spot price from AMM manipulated via flash loans within single transaction.

**Vulnerable Pattern:**
```rust
let price = pool.reserve_b / pool.reserve_a; // Flash-loan manipulable!
```
**Secure Pattern:**
```rust
let price = oracle.get_twap(TWAP_WINDOW)?;
require!(oracle.confidence < MAX_CONF);
require!(clock.unix_timestamp - oracle.timestamp < MAX_AGE);
```
**Detection:** Find price from pool reserves. Flag spot price usage.
