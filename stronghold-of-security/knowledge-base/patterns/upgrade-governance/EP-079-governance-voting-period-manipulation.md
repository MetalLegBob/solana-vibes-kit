# EP-079: Governance Voting Period Manipulation
**Category:** Upgrade  **Severity:** HIGH  **Solana-Specific:** No
**Historical Exploits:** Solend governance incident (Jun 2022) - rushed vote

**Description:** No minimum voting period. Emergency proposals pass in hours.

**Vulnerable Pattern:**
```rust
proposal.voting_ends = clock.timestamp + period; // No minimum!
```
**Secure Pattern:**
```rust
let period = match proposal_type {
    Parameter => MIN_VOTING_PERIOD,      // 3 days
    Emergency => EMERGENCY_PERIOD,       // 24h with super-majority
};
proposal.voting_starts = clock.timestamp + REVIEW_PERIOD; // 24h review
```
**Detection:** Check minimum voting periods, review periods, timelocks.
