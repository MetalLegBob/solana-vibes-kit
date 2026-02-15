# EP-049: Unverified Token Program
**Category:** CPI  **Severity:** CRITICAL  **Solana-Specific:** Yes
**Historical Exploits:** Crema Finance - malicious token program in CPI

**Description:** Token program accepted as `AccountInfo` without ID verification. Malicious program mimics interface.

**Vulnerable Pattern:**
```rust
pub token_program: AccountInfo<'info>, // Could be malicious!
```
**Secure Pattern:**
```rust
pub token_program: Program<'info, Token>, // Anchor validates ID
```
**Detection:** Verify token programs use `Program<'info, Token>`.
