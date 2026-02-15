# EP-003: Account Type Cosplay / Discriminator Bypass
**Category:** Account Validation  **Severity:** CRITICAL  **Solana-Specific:** Yes
**Historical Exploits:** Saber (Aug 2022) via duplicate account type confusion

**Description:** Wrong account type passed with correct owner. Fields reinterpreted without discriminator validation.

**Vulnerable Pattern:**
```rust
let data: Config = Config::try_from_slice(&account_data[8..])?; // No discriminator check
```
**Secure Pattern:**
```rust
pub config: Account<'info, Config>, // Anchor validates 8-byte discriminator
```
**Detection:** Find manual `try_from_slice`. Verify `Account<'info, T>` over `AccountInfo`.
