# EP-046: Missing CPI Error Propagation
**Category:** CPI  **Severity:** HIGH  **Solana-Specific:** No
**Historical Exploits:** Withdrawals recorded despite failed transfers

**Description:** CPI error suppressed (`let _ =`). State updated as if operation succeeded.

**Vulnerable Pattern:**
```rust
let _ = token::transfer(ctx, amount); // Error swallowed!
vault.total += amount; // Wrong!
```
**Secure Pattern:**
```rust
token::transfer(ctx, amount)?; // Propagate with ?
vault.total += amount;
```
**Detection:** Search for `let _ =` on CPI calls. Verify `?` operator.
