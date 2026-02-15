# EP-082: No Voting Power Snapshot
**Category:** Upgrade  **Severity:** HIGH  **Solana-Specific:** No
**Historical Exploits:** Flash loan governance attacks

**Description:** Voting power based on current balance, not snapshot at proposal creation. Tokens borrowed to vote.

**Vulnerable Pattern:**
```rust
let power = voter.current_balance; // Current, not snapshot!
```
**Secure Pattern:**
```rust
let power = get_power_at_slot(voter, proposal.snapshot_slot)?;
require!(voter.deposit_slot + DELAY < proposal.snapshot_slot);
```
**Detection:** Check snapshot-based voting. Verify deposit delay.
