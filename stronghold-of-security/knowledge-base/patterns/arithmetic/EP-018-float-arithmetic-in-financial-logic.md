# EP-018: Float Arithmetic in Financial Logic
**Category:** Arithmetic  **Severity:** HIGH  **Solana-Specific:** Yes (non-deterministic)
**Historical Exploits:** DeFi rounding errors via repeated small operations

**Description:** f32/f64 causes precision loss and non-deterministic results across validators.

**Vulnerable Pattern:**
```rust
let interest = principal as f64 * 0.05; // Float!
```
**Secure Pattern:**
```rust
let interest = principal.checked_mul(500)?.checked_div(10_000)?; // Basis points
```
**Detection:** Search for `f32`, `f64` in financial logic.
