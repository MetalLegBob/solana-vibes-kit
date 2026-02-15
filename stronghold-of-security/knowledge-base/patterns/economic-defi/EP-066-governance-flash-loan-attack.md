# EP-066: Governance Flash Loan Attack
**Category:** Economic  **Severity:** CRITICAL  **Solana-Specific:** No
**Historical Exploits:** Beanstalk ($181M, Apr 2022), Solend governance (Jun 2022)

**Description:** Flash-borrowed tokens give instant voting power. Vote on malicious proposal in same tx.

**Vulnerable Pattern:**
```rust
voter.voting_power = voter.token_amount; // Immediate!
```
**Secure Pattern:**
```rust
voter.pending_deposit_slot = clock.slot;
// Activate after delay. Use snapshot voting at proposal creation.
```
**Detection:** Check instant voting power. Verify delay/snapshot mechanisms.
