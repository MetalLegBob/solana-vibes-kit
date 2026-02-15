# EP-081: Immediate Proposal Execution
**Category:** Upgrade  **Severity:** HIGH  **Solana-Specific:** No
**Historical Exploits:** Governance flash loan attacks (Beanstalk-style)

**Description:** Proposal executable immediately after vote ends. No exit window.

**Vulnerable Pattern:**
```rust
require!(clock >= proposal.voting_ends); proposal.executed = true; // Instant!
```
**Secure Pattern:**
```rust
require!(clock >= proposal.timelock_ends); // Vote end + delay
require!(!guardian_veto.is_vetoed);
```
**Detection:** Verify timelock between vote end and execution. Check veto mechanisms.
