# EP-016: Precision Loss in Division
**Category:** Arithmetic  **Severity:** MEDIUM  **Solana-Specific:** No
**Historical Exploits:** Port Finance ($200K, Nov 2021), Aldrin ($90K, Oct 2021)

**Description:** Integer division truncates. Small amounts round to zero, extractable through repeated operations.

**Vulnerable Pattern:**
```rust
let fee = (amount * fee_bps) / 10000; // 0 if product < 10000
```
**Secure Pattern:**
```rust
let fee = (amount as u128).checked_mul(fee_bps as u128)? / 10000;
require!(fee > 0 || amount == 0, ErrorCode::FeeTooSmall);
```
**Detection:** Review all division. Verify multiply-before-divide. Check minimums.
