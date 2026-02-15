# EP-077: Incomplete Field Init
**Category:** Initialization  **Severity:** MEDIUM  **Solana-Specific:** Yes
**Historical Exploits:** Vaults leaking previous owner data

**Description:** Only some fields initialized. Uninitialized contain garbage from previous account.

**Vulnerable Pattern:**
```rust
vault.authority = auth.key(); vault.balance = 0;
// vault.last_updated NOT SET - garbage!
```
**Secure Pattern:**
```rust
vault.initialize(auth.key(), clock.unix_timestamp); // ALL fields
```
**Detection:** Review struct init. Verify ALL fields set. Use Default trait.
