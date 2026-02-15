# EP-040: Closing Account With Obligations
**Category:** Logic Errors  **Severity:** HIGH  **Solana-Specific:** Yes
**Historical Exploits:** Lending bad debt from closed accounts

**Description:** Account closed without checking outstanding debts or claims.

**Vulnerable Pattern:**
```rust
#[account(mut, close = authority)] // No debt check!
```
**Secure Pattern:**
```rust
#[account(mut, close = authority,
    constraint = user.debt_owed == 0,
    constraint = user.borrowed == 0)]
```
**Detection:** Review closures. Verify obligation checks.
