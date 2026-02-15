# EP-002: Missing Owner Check
**Category:** Account Validation  **Severity:** CRITICAL  **Solana-Specific:** Yes
**Historical Exploits:** Multiple DeFi exploits via fake account injection

**Description:** Account data read without verifying program ownership, allowing attacker-controlled data.

**Vulnerable Pattern:**
```rust
pub user_data: AccountInfo<'info>, // Owner not checked
```
**Secure Pattern:**
```rust
pub user_data: Account<'info, UserData>, // Anchor checks owner == program_id
```
**Detection:** Search for raw `AccountInfo` deserialized without `owner` checks.
