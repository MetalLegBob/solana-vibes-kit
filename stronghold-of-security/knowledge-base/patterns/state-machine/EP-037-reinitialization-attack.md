# EP-037: Reinitialization Attack
**Category:** Logic Errors  **Severity:** HIGH  **Solana-Specific:** Yes
**Historical Exploits:** Parrot Protocol ($80M potential, Oct 2021)

**Description:** Account closed then reinitialized with different params, bypassing original constraints.

**Vulnerable Pattern:**
```rust
config.authority = authority.key(); // No init guard! Can re-init.
```
**Secure Pattern:**
```rust
#[account(init, payer = payer, space = 8 + Config::LEN)] // Fails if exists
pub config: Account<'info, Config>,
```
**Detection:** Check init functions for `init` constraint or `is_initialized` flag.
