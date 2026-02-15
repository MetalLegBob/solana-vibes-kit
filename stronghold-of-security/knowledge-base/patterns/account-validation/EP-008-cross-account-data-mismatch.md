# EP-008: Cross-Account Data Mismatch
**Category:** Account Validation  **Severity:** HIGH  **Solana-Specific:** Yes
**Historical Exploits:** Staking protocols with mismatched mint/pool configs

**Description:** Individual accounts pass validation but are not related to each other.

**Vulnerable Pattern:**
```rust
#[account(constraint = stake_token.mint == ACCEPTED_MINT)] // Hardcoded, not pool-relative
```
**Secure Pattern:**
```rust
#[account(constraint = stake_token.mint == stake_pool.stake_mint)] // Cross-validated
```
**Detection:** Verify cross-account constraints. Test with valid-but-mismatched accounts.
