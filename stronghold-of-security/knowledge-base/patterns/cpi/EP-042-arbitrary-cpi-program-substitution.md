# EP-042: Arbitrary CPI / Program Substitution
**Category:** CPI  **Severity:** CRITICAL  **Solana-Specific:** Yes
**Historical Exploits:** Fake token programs stealing funds

**Description:** CPI target program ID not validated. Malicious program substituted.

**Vulnerable Pattern:**
```rust
pub target_program: AccountInfo<'info>, // Any program!
```
**Secure Pattern:**
```rust
pub token_program: Program<'info, Token>, // Anchor validates ID
```
**Detection:** Search for `invoke()`. Verify target program IDs validated.
