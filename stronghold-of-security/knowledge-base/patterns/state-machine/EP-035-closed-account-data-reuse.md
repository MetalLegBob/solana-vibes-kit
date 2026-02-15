# EP-035: Closed Account Data Reuse
**Category:** Logic Errors  **Severity:** HIGH  **Solana-Specific:** Yes
**Historical Exploits:** DeFi accounts with stale debt positions

**Description:** Closed account (0 lamports) still readable until GC. Stale data used in operations.

**Vulnerable Pattern:**
```rust
pub data_account: Account<'info, DataAccount>, // No lamport check
```
**Secure Pattern:**
```rust
#[account(constraint = data_account.to_account_info().lamports() > 0)]
pub data_account: Account<'info, DataAccount>,
```
**Detection:** Verify lamport checks on accounts that could be closed.
