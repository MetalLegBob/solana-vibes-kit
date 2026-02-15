# EP-065: Liquidation MEV
**Category:** Economic  **Severity:** MEDIUM  **Solana-Specific:** No
**Historical Exploits:** Solend, MarginFi via Jito bundles, Hubble ($180K, Jul 2022)

**Description:** Fixed liquidation bonus creates MEV. Bots front-run liquidators.

**Vulnerable Pattern:**
```rust
let bonus = collateral * 110 / 100; // Fixed 10% = MEV target
```
**Secure Pattern:**
```rust
let bonus = if health < 0.5 { 1000 } else if health < 0.8 { 500 } else { 200 }; // Dynamic
```
**Detection:** Check liquidation incentive structure. Verify dynamic bonuses.
