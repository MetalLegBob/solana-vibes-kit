# EP-047: State Update Before CPI
**Category:** CPI  **Severity:** HIGH  **Solana-Specific:** No
**Historical Exploits:** Double-spend via pre-CPI state mutation

**Description:** Internal state modified before CPI. If CPI interacts with stale state, logic errors result.

**Vulnerable Pattern:**
```rust
vault.balance -= amount; // Updated BEFORE transfer
token::transfer(ctx, amount)?;
```
**Secure Pattern:**
```rust
let pre = vault_token.amount;
token::transfer(ctx, amount)?;
vault_token.reload()?;
vault.balance += vault_token.amount - pre; // Verified actual change
```
**Detection:** Check state updates before CPI. Verify post-CPI balance verification.
