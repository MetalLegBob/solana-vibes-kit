# EP-006: Unchecked Sysvar Account
**Category:** Account Validation  **Severity:** HIGH  **Solana-Specific:** Yes
**Historical Exploits:** Cashio ($52M, Mar 2022) - fake sysvar injection

**Description:** Sysvar account (Clock, Rent) accepted without address validation. Attacker passes fake with manipulated data.

**Vulnerable Pattern:**
```rust
pub clock: AccountInfo<'info>, // Could be fake!
```
**Secure Pattern:**
```rust
pub clock: Sysvar<'info, Clock>, // Address validated
// Or: let clock = Clock::get()?; // No account needed
```
**Detection:** Find `AccountInfo` for sysvars. Use `Sysvar<'info, T>` or `Clock::get()`.
