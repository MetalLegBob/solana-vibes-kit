# EP-067: Multi-Hop Price Impact Amplification
**Category:** Economic  **Severity:** MEDIUM  **Solana-Specific:** No
**Historical Exploits:** Jupiter routing manipulation

**Description:** Multi-hop routes compound price impact. First pool manipulated to amplify slippage.

**Vulnerable Pattern:**
```rust
for swap in route { amount = swap_pool(pool, amount)?; } // No aggregate check!
```
**Secure Pattern:**
```rust
require!(total_impact_bps <= max_impact);
require!(amount >= min_amount_out);
```
**Detection:** Review multi-hop routing. Verify aggregate impact limits.
