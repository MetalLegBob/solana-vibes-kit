# EP-017: Decimal Normalization Errors
**Category:** Arithmetic  **Severity:** CRITICAL  **Solana-Specific:** No
**Historical Exploits:** Saber ($4.6M, Jul 2022) - stableswap decimal mismatch

**Description:** Tokens with different decimals miscalculated when normalization uses lossy integer division.

**Vulnerable Pattern:**
```rust
let normalized = amount / 10u64.pow(decimals as u32); // Loses precision!
```
**Secure Pattern:**
```rust
let normalized = (amount as u128) * 10u128.pow((18 - decimals) as u32); // Scale UP
```
**Detection:** Check decimal handling in multi-token math. Test with 6, 9, 18 decimals.
