# EP-019: Rounding Direction Favoring User
**Category:** Arithmetic  **Severity:** HIGH  **Solana-Specific:** No
**Historical Exploits:** Mercurial Finance virtual price manipulation (disclosed)

**Description:** Protocol rounds in user's favor (up on withdraw, down on deposit). Repeated operations extract value.

**Vulnerable Pattern:**
```rust
let lp = (d_new - d_old) * supply / d_old; // Rounds in user favor
```
**Secure Pattern:**
```rust
let lp = (d_new - d_old) * supply / d_old; // Round DOWN for deposits
require!(lp > 0, ErrorCode::TooSmall); // Prevent dust extraction
```
**Detection:** Review rounding in deposit/withdraw/swap. Verify protocol-favorable direction.
