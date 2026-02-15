# EP-022: Stale Oracle Price
**Category:** Oracle  **Severity:** HIGH  **Solana-Specific:** No
**Historical Exploits:** Jet Protocol (~$100K, Dec 2021), Synthetify ($120K, Jul 2021)

**Description:** Oracle not refreshed within acceptable window. Stale/zero prices used for operations.

**Vulnerable Pattern:**
```rust
let price = oracle.get_price()?; // No staleness check!
```
**Secure Pattern:**
```rust
require!(clock.unix_timestamp - oracle.timestamp < MAX_AGE);
require!(oracle.price > 0, ErrorCode::InvalidPrice);
```
**Detection:** Find oracle usage. Verify timestamp checks and zero-price guards.
