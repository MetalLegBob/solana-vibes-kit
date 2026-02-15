# EP-059: Vault Donation / Inflation Attack
**Category:** Economic  **Severity:** CRITICAL  **Solana-Specific:** No
**Historical Exploits:** ERC-4626 style attacks on Solana vaults

**Description:** Direct token donation inflates share price. Next depositor's shares round to zero.

**Vulnerable Pattern:**
```rust
let shares = deposit * total_shares / vault_tokens.amount; // Includes donations!
```
**Secure Pattern:**
```rust
let shares = deposit * total_shares / vault.tracked_assets; // Internal accounting
require!(shares > 0, ErrorCode::InsufficientDeposit);
vault.tracked_assets += deposit;
```
**Detection:** Check vault share calculation source. Verify internal accounting vs token balance.
