# EP-045: CPI Return Data Spoofing
**Category:** CPI  **Severity:** HIGH  **Solana-Specific:** Yes
**Historical Exploits:** Oracle manipulation via fake return data

**Description:** `get_return_data()` used without verifying source program ID. Fake data accepted.

**Vulnerable Pattern:**
```rust
let (_, data) = get_return_data()?; // Source not checked!
```
**Secure Pattern:**
```rust
let (program_id, data) = get_return_data()?;
require_keys_eq!(program_id, TRUSTED_ORACLE_ID);
```
**Detection:** Find `get_return_data()`. Verify source program validated.
