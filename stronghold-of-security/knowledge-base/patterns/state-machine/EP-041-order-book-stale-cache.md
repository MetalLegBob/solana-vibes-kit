# EP-041: Order Book Stale Cache
**Category:** Logic Errors  **Severity:** MEDIUM  **Solana-Specific:** No
**Historical Exploits:** Dexlab ($180K, Sep 2021)

**Description:** Order cancellation doesn't update best bid/ask cache. Market orders hit stale prices.

**Vulnerable Pattern:**
```rust
order.status = Cancelled; // pool.best_bid still points to cancelled order!
```
**Secure Pattern:**
```rust
order.status = Cancelled;
if pool.best_bid == order.price { pool.best_bid = recalculate(pool)?; }
```
**Detection:** Review order cancel logic. Verify cached aggregates updated.
