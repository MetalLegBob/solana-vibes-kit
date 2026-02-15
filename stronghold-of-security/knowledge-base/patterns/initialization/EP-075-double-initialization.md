# EP-075: Double Initialization
**Category:** Initialization  **Severity:** HIGH  **Solana-Specific:** Yes
**Historical Exploits:** Config accounts overwritten by second caller

**Description:** Init function callable multiple times, overwriting authority/params.

**Vulnerable Pattern:**
```rust
#[account(mut)] pub config: Account<'info, Config>, // Re-initable!
```
**Secure Pattern:**
```rust
#[account(init, payer = payer, space = 8 + Config::LEN)] // Fails if exists
```
**Detection:** Check init functions for `init` constraint or `is_initialized` flag.
