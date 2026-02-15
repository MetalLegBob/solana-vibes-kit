# EP-055: Token-2022 Transfer Hook Reentrancy
**Category:** Token/SPL  **Severity:** HIGH  **Solana-Specific:** Yes
**Historical Exploits:** Emerging with Token-2022 adoption

**Description:** Transfer hooks execute arbitrary code during transfers. Programs can be reentered.

**Vulnerable Pattern:**
```rust
token::transfer(ctx, amount)?; // Hook could reenter this program!
```
**Secure Pattern:**
```rust
pool.reentrancy_lock = true;
pool.balance -= amount; // State BEFORE transfer
token::transfer(ctx, amount)?;
pool.reentrancy_lock = false;
```
**Detection:** Check Token-2022 mint support. Verify reentrancy guards.
