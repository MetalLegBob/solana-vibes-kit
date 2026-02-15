# EP-025: No Liquidity Adjustment on Collateral
**Category:** Oracle  **Severity:** HIGH  **Solana-Specific:** No
**Historical Exploits:** Mango Markets - over-valued MNGO on thin liquidity

**Description:** Large collateral position valued at oracle price without market depth haircut.

**Vulnerable Pattern:**
```rust
let value = user.balance * oracle_price; // No haircut for illiquidity!
```
**Secure Pattern:**
```rust
let ratio = user.balance * 10000 / market.liquidity;
let haircut = if ratio > 5000 { 5000 } else if ratio > 2000 { 7500 } else { 10000 };
let value = user.balance * oracle_price * haircut / 10000;
```
**Detection:** Check if large positions are haircut. Verify per-asset borrow caps.
