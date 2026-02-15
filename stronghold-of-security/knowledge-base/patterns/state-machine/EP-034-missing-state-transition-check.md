# EP-034: Missing State Transition Check
**Category:** Logic Errors  **Severity:** MEDIUM  **Solana-Specific:** No
**Historical Exploits:** Friktion ($1M, Mar 2022), Orca Whirlpool edge case (disclosed)

**Description:** State machine transitions not validated. Users skip steps or jump to final state.

**Vulnerable Pattern:**
```rust
order.status = OrderStatus::Settled; // No check current == Active!
```
**Secure Pattern:**
```rust
require!(order.status == OrderStatus::Active, ErrorCode::InvalidTransition);
order.status = OrderStatus::Settled;
```
**Detection:** Map state transitions. Verify each checks current state.
