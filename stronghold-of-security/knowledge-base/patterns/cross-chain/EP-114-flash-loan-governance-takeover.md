# EP-114: Flash Loan Governance Takeover
**Category:** Economic / Governance  **Severity:** CRITICAL  **Solana-Specific:** No
**Historical Exploits:** Beanstalk ($182M, Apr 2022 — flash loaned $1B to pass malicious governance proposal in <13 seconds)

**Description:** Attacker borrows governance tokens via flash loan, gains supermajority voting power, votes on and executes a malicious proposal that drains the treasury, then repays the loan — all in a single atomic transaction. On EVM, Beanstalk's `emergencyCommit()` allowed same-block vote + execute. On Solana, SPL Governance's early vote tipping with zero hold-up time enables the same pattern.

**Vulnerable Pattern:**
```rust
// SPL Governance: early tipping + zero hold-up + liquid governance tokens
GovernanceConfig {
    vote_tipping: VoteTipping::Early,      // Ends vote as soon as majority reached
    min_transaction_hold_up_time: 0,       // Execute immediately after approval
    deposit_exempt_proposal_count: 0,
    // No snapshot — voting power = current token balance
}
// Attack: flash loan tokens → deposit → create proposal → vote (tips immediately)
// → execute (zero hold-up) → drain treasury → repay flash loan
```
**Secure Pattern:**
```rust
GovernanceConfig {
    vote_tipping: VoteTipping::Strict,     // Wait for full voting period
    min_transaction_hold_up_time: 172800,  // 48h minimum hold-up
    // Plus: require tokens locked for N slots before voting
    // Plus: snapshot voting power at proposal creation time
}
```
**Detection:** Check SPL Governance configs: (a) vote tipping mode, (b) hold-up time, (c) whether governance tokens can be flash-loaned, (d) whether voting requires prior token lock-up, (e) whether voting power is snapshotted at proposal creation. Flag any DAO where `hold_up_time == 0` or where governance tokens are available on lending protocols.
