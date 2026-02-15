# EP-070: Sensitive Data in Logs
**Category:** Key Management  **Severity:** HIGH  **Solana-Specific:** No
**Historical Exploits:** Slope Wallet ($8M, Aug 2022)

**Description:** Seeds, keys, or secrets logged via `msg!()`. On-chain logs are public.

**Vulnerable Pattern:**
```rust
msg!("Seed: {:?}", seed); // Visible in logs!
```
**Secure Pattern:**
```rust
msg!("Account initialized for: {}", owner.key()); // Public info only
```
**Detection:** Search `msg!` for sensitive params. Review client-side logging.
