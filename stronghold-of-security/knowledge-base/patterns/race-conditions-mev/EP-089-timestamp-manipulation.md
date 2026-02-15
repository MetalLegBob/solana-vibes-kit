# EP-089: Timestamp Manipulation
**Category:** Race Conditions  **Severity:** MEDIUM  **Solana-Specific:** Yes
**Historical Exploits:** Reward manipulation via validator drift, Synthetify ($120K, Jul 2021)

**Description:** Validators can manipulate Clock timestamp within ~30s. Financial calcs using timestamps are exploitable.

**Vulnerable Pattern:**
```rust
let reward = (clock.unix_timestamp - last_claim) as u64 * RATE; // Manipulable!
```
**Secure Pattern:**
```rust
let reward = (clock.slot - last_claim_slot) * RATE_PER_SLOT; // Slots are monotonic
```
**Detection:** Find `unix_timestamp` in financial logic. Prefer slot-based timing.
