# EP-099: Business Logic Inversion / Algorithm Direction Error
**Category:** Logic  **Severity:** HIGH  **Solana-Specific:** No
**Historical Exploits:** Marinade SAM ($5M, 126 epochs — unstake algorithm implemented backward)

**Description:** Core business logic comparison operators are reversed (ascending vs descending, min vs max, greater-than vs less-than). Unlike off-by-one errors, the algorithm produces plausible but incorrect results that may not be caught by basic testing. Particularly dangerous in staking/delegation/auction systems where the effects accumulate over time.

**Vulnerable Pattern:**
```rust
// Marinade SAM: INTENDED to unstake lowest bidders first
// ACTUAL: sorted highest-first, protecting lowest bidders from unstaking
fn get_unstake_priority(validators: &mut Vec<ValidatorStake>) {
    // BUG: sort direction is backwards — should be ascending, not descending
    validators.sort_by(|a, b| b.bid_lamports.cmp(&a.bid_lamports));
    // Now "lowest bidders" are at the end and never get unstaked
}

// Gaming pattern: validator bids high to get stake, then reduces bid to 1 lamport
// Backward logic protects the low bid from unstaking for 126+ epochs
```
**Secure Pattern:**
```rust
fn get_unstake_priority(validators: &mut Vec<ValidatorStake>) {
    // CORRECT: ascending order — lowest bidders unstaked first
    validators.sort_by(|a, b| a.bid_lamports.cmp(&b.bid_lamports));
}

// Additional safeguard: prevent bid reduction after stake assignment
fn update_bid(validator: &mut ValidatorStake, new_bid: u64) -> Result<()> {
    require!(
        new_bid >= validator.current_bid * MIN_BID_RETENTION_PCT / 100,
        ErrorCode::BidReductionTooLarge
    );
    Ok(())
}
```
**Detection:** Identify all sorting, comparison, and priority functions. Verify sort direction matches specification/comments. Check for auction/bidding systems where participants can modify bids after winning. Test with adversarial scenarios where participants game the ordering. Look for `cmp` calls where `a` and `b` may be swapped.

**Sub-pattern: Fee Routing Inversion** (Halborn/Vaultka, Critical — withdraw fee sent to user instead of fee vault):
For every fee transfer instruction, verify: (a) fee destination matches the protocol's fee vault/treasury, not the user, (b) fee amount is deducted from user proceeds, not added to them. Trace the actual token flow in fee-related CPIs — a simple destination account mix-up can silently rebate fees to users.
