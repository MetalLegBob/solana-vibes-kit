# EP-021: Missing Oracle Confidence Check
**Category:** Oracle  **Severity:** CRITICAL  **Solana-Specific:** No
**Historical Exploits:** Mango Markets ($114M, Oct 2022), FTX collapse exploits (Nov 2022)

**Description:** Oracle price used without confidence interval check. Wide confidence = unreliable price.

**Vulnerable Pattern:**
```rust
let price = pyth_feed.get_current_price()?.price; // No confidence check!
```
**Secure Pattern:**
```rust
let conf_pct = (price.conf as u128 * 10000) / price.price as u128;
require!(conf_pct < 100, ErrorCode::ConfidenceTooWide); // < 1%
```
**Detection:** Grep for oracle price usage. Verify confidence interval validation.
