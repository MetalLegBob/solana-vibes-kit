# EP-091: Custom Overflow Guard Bypass
**Category:** Arithmetic  **Severity:** CRITICAL  **Solana-Specific:** No (Move/Sui, but pattern applies to any chain)
**Historical Exploits:** Cetus DEX ($223M, May 2025 on SUI — pattern applicable to Solana)

**Description:** Custom overflow check function uses incorrect constant/threshold, allowing values that WILL overflow when shifted. Silent wrapping produces near-zero results, enabling near-free liquidity minting.

**Vulnerable Pattern:**
```rust
fn checked_shlw(value: u256) -> u256 {
    // BUG: Threshold too high — allows values that overflow when shifted
    assert!(value <= INCORRECT_MAX_THRESHOLD);
    value << 64  // Wraps silently!
}
fn get_delta_a(liquidity: u128, sqrt_price_a: u128, sqrt_price_b: u128) -> u64 {
    let numerator = checked_shlw(liquidity as u256 * delta as u256);
    // Overflow wraps numerator to ~1; division yields ~1 token needed
    let result = numerator / (sqrt_price_a as u256 * sqrt_price_b as u256);
    result as u64  // Returns 1 instead of massive required amount
}
```
**Secure Pattern:**
```rust
fn checked_shlw(value: u256) -> u256 {
    // CORRECT: Verify top 64 bits are zero before shifting left by 64
    assert!(value >> 192 == 0);
    value << 64
}
```
**Detection:** Search for custom bit-shift/overflow-check functions. Verify guard constants are mathematically correct. Check if language silently wraps (Move does, Rust panics). Audit third-party math libraries (e.g., `integer-mate`).
