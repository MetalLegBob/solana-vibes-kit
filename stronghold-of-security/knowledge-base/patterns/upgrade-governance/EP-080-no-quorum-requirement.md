# EP-080: No Quorum Requirement
**Category:** Upgrade  **Severity:** MEDIUM  **Solana-Specific:** No
**Historical Exploits:** Low-participation governance attacks

**Description:** Proposal passes with any majority, no minimum participation.

**Vulnerable Pattern:**
```rust
require!(yes_votes > no_votes); // 2 vs 1 sufficient!
```
**Secure Pattern:**
```rust
let total = yes + no;
require!(total * 100 >= possible * QUORUM_PCT);
require!(yes * 100 / total >= THRESHOLD);
```
**Detection:** Verify quorum requirements. Check super-majority for critical changes.
