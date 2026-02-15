# EP-064: JIT Liquidity Extraction
**Category:** Economic  **Severity:** MEDIUM  **Solana-Specific:** No
**Historical Exploits:** Orca Whirlpools, Uniswap V3

**Description:** LP adds liquidity before swap, earns fees, removes immediately. No risk exposure.

**Vulnerable Pattern:**
```rust
pub fn remove_liquidity(ctx: ...) { position.liquidity -= amount; } // Same slot OK!
```
**Secure Pattern:**
```rust
position.locked_until = clock.slot + MIN_SLOTS; // ~18 min lock
require!(clock.slot >= position.locked_until);
```
**Detection:** Check minimum liquidity duration.
