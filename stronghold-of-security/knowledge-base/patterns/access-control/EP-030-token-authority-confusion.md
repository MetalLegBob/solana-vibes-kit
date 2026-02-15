# EP-030: Token Authority Confusion
**Category:** Access Control  **Severity:** HIGH  **Solana-Specific:** Yes
**Historical Exploits:** SPL owner vs transfer authority confusion

**Description:** Token account "owner" field confused with transfer "authority" parameter.

**Vulnerable Pattern:**
```rust
require!(source_token.owner == config.authority); // Wrong field for transfers!
```
**Secure Pattern:**
```rust
require!(admin.key() == config.authority);
require!(source_token.owner == admin.key()
    || source_token.delegate == COption::Some(admin.key()));
```
**Detection:** Review token transfer auth. Distinguish owner from transfer authority.
