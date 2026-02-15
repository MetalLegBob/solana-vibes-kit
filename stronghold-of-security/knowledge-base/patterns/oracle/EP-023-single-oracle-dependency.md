# EP-023: Single Oracle Dependency
**Category:** Oracle  **Severity:** HIGH  **Solana-Specific:** No
**Historical Exploits:** Mango Markets - manipulated Pyth TWAP via thin orderbooks

**Description:** Single oracle source with no fallback. If manipulated or down, protocol is vulnerable.

**Vulnerable Pattern:**
```rust
let price = pyth_oracle.get_price()?; // Single source!
```
**Secure Pattern:**
```rust
let p1 = pyth_oracle.get_twap()?;
let p2 = amm_oracle.get_twap(SLOTS_PER_HOUR)?;
require!(abs_diff(p1, p2) * 100 / p2 < 5, ErrorCode::OracleDivergence);
let price = std::cmp::min(p1, p2); // Conservative
```
**Detection:** Count oracle sources per price. Verify fallback/cross-validation.
