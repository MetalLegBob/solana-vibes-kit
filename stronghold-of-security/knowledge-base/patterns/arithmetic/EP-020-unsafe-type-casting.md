# EP-020: Unsafe Type Casting
**Category:** Arithmetic  **Severity:** HIGH  **Solana-Specific:** No
**Historical Exploits:** Apricot Finance ($1.2M, Jul 2021) - wrong decimal casting

**Description:** Casting between int types (u128->u64, i64->u64) silently truncates or reinterprets.

**Vulnerable Pattern:**
```rust
let price = oracle_value as u64; // Negative i64 becomes huge u64!
```
**Secure Pattern:**
```rust
let price = u64::try_from(oracle_value).map_err(|_| ErrorCode::InvalidCast)?;
```
**Detection:** Search for `as u64`, `as u32` casts. Verify `try_from` usage.
