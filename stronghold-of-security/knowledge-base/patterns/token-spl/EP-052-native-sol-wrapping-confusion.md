# EP-052: Native SOL Wrapping Confusion
**Category:** Token/SPL  **Severity:** MEDIUM  **Solana-Specific:** Yes
**Historical Exploits:** WSOL close_account sending SOL to wrong destination

**Description:** Native SOL token accounts have special semantics. close_account ignores destination for WSOL.

**Vulnerable Pattern:**
```rust
token::close_account(/* destination: vault */)? // Ignored for WSOL!
```
**Secure Pattern:**
```rust
if user_token.is_native() { /* handle WSOL separately */ }
else { token::close_account(/* ... */)?; }
```
**Detection:** Check for `is_native()` before close operations.
