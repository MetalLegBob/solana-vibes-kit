# EP-056: Token-2022 Confidential Transfer Bypass
**Category:** Token/SPL  **Severity:** MEDIUM  **Solana-Specific:** Yes
**Historical Exploits:** Emerging with Token-2022 adoption

**Description:** Confidential transfers hide amounts. Programs reading `.amount` get 0.

**Vulnerable Pattern:**
```rust
let balance = token_account.amount; // 0 if confidential transfer!
```
**Secure Pattern:**
```rust
if mint_has_extension(ExtensionType::ConfidentialTransfer) {
    return Err(ErrorCode::ConfidentialNotSupported.into());
}
```
**Detection:** Check handling of confidential transfer mints.
