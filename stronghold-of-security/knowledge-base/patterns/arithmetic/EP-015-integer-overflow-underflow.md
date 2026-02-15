# EP-015: Integer Overflow/Underflow
**Category:** Arithmetic  **Severity:** CRITICAL  **Solana-Specific:** Yes (release wraps silently)
**Historical Exploits:** Cetus DEX ($223M, May 2025 on SUI — checked_shlw overflow; pattern applicable to Solana), multiple token programs

**Description:** Rust release builds wrap on overflow. Unchecked arithmetic produces wrong results.

**Vulnerable Pattern:**
```rust
vault.balance = vault.balance + amount; // Wraps to 0!
vault.balance = vault.balance - amount; // Wraps to u64::MAX!
```
**Secure Pattern:**
```rust
vault.balance = vault.balance.checked_add(amount).ok_or(ErrorCode::Overflow)?;
vault.balance = vault.balance.checked_sub(amount).ok_or(ErrorCode::Underflow)?;
```
**Detection:** Search for `+`, `-`, `*`, `/` on financial values. Verify `checked_*` methods.
