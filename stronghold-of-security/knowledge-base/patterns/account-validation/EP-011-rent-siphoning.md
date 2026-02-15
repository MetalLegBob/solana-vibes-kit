# EP-011: Rent Siphoning
**Category:** Account Validation  **Severity:** MEDIUM  **Solana-Specific:** Yes
**Historical Exploits:** Accounts purged from insufficient rent in early Solana programs

**Description:** Lamport withdrawal below rent-exempt threshold causes garbage collection and data loss.

**Vulnerable Pattern:**
```rust
**vault.lamports.borrow_mut() -= amount; // No rent check!
```
**Secure Pattern:**
```rust
let required = Rent::get()?.minimum_balance(vault.data_len());
require!(vault.lamports() - amount >= required);
```
**Detection:** Find lamport withdrawals. Verify rent-exemption maintained.
