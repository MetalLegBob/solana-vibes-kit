# EP-096: Exotic Collateral Oracle Manipulation
**Category:** Oracle  **Severity:** HIGH  **Solana-Specific:** No
**Historical Exploits:** Loopscale ($5.8M, Apr 2025 — RateX PT tokens)

**Description:** Protocol accepts novel token types (Principal Tokens, Yield Tokens, wrapped derivatives) as collateral but uses a pricing function that can be manipulated. The composability gap between the token issuer's oracle and the lending protocol's integration creates pricing vulnerabilities.

**Vulnerable Pattern:**
```rust
// Custom pricing for exotic collateral — manipulable
let pt_value = custom_price_function(rate_x_pt_account)?;
let borrowable = pt_value * LTV_RATIO;
// BUG: Custom pricing can be gamed; no circuit breaker
```
**Secure Pattern:**
```rust
let pt_value = custom_price_function(rate_x_pt_account)?;
// Cross-reference with independent oracle
let reference_price = get_independent_oracle_price(pt_mint)?;
require!(
    (pt_value as i128 - reference_price as i128).abs() < MAX_DEVIATION,
    ErrorCode::PriceDeviation
);
// Circuit breaker: pause if collateral value changes > X% in one block
require!(
    price_change_ratio(pt_mint, pt_value) < CIRCUIT_BREAKER_THRESHOLD,
    ErrorCode::CircuitBreakerTripped
);
```
**Detection:** Identify exotic/novel collateral types. Audit custom pricing functions for manipulation vectors. Check for circuit breakers on collateral value changes. Verify independent oracle cross-references.
