# DAO / Governance Attack Playbook
<!-- Protocol-specific attack vectors for DAO and Governance systems -->
<!-- Last updated: 2026-02-06 -->

## How Governance Works (Mental Model)

DAOs (Decentralized Autonomous Organizations) use on-chain governance to make collective decisions. On Solana, SPL Governance is the standard implementation. Token holders create proposals, vote, and execute approved actions — including treasury transfers, parameter changes, and program upgrades.

**Key components:**
- **Governance tokens:** Voting power, often transferable and tradeable
- **Proposals:** On-chain actions to be voted on (treasury transfers, upgrades, parameter changes)
- **Voting period:** Time window for members to cast votes
- **Quorum:** Minimum participation required for valid vote
- **Vote tipping:** Early termination of voting when outcome is certain
- **Timelock/Hold-up:** Delay between approval and execution
- **Execution:** On-chain execution of approved proposal instructions

---

## Common Architecture Patterns

### SPL Governance (Solana Standard)
- Realms DAO platform
- Token-based voting, delegation support
- Early and strict vote tipping modes
- Configurable thresholds, quorum, hold-up times

### Multisig Governance
- Squads Protocol on Solana
- N-of-M signature required for actions
- Simpler but less decentralized
- Common for protocol admin operations

### Hybrid (Off-chain + On-chain)
- Snapshot-style off-chain voting with on-chain execution
- Lower gas costs for voting
- Trust assumptions on the off-chain component

---

## Known Attack Vectors

### 1. Flash Loan Governance Attack
**Severity:** CRITICAL  **EP Reference:** EP-058, EP-061, EP-114
**Historical:** Beanstalk DAO ($182M, Apr 2022)

**Mechanism:** Borrow massive amount of governance tokens via flash loan. Vote on (or create + vote on) a malicious proposal. Execute the proposal in the same transaction. Repay the flash loan. All in one atomic transaction.

**Beanstalk Deep-Dive (Wave 7):** Attacker flash loaned $1B from Aave + Uniswap + SushiSwap → converted to BEAN3CRV-f LP tokens → gained Stalk (governance token) → achieved 67%+ voting power → called `emergencyCommit()` on malicious BIP-18 → BIP-18 used `delegatecall` to drain entire treasury → repaid flash loan. Total time: <13 seconds. Net profit: $76-80M. Community members had warned about this exact attack vector months before in Discord; founders dismissed concerns ("not a concern in any capacity until Stalk is liquid"). Auditors had not reviewed the governance module.

**Detection:**
- Can tokens be borrowed and used for voting in the same transaction?
- Is there a lock-up period between acquiring tokens and voting?
- Is there a hold-up time between proposal approval and execution?
- Does the DAO use vote tipping that allows immediate execution?

**Code pattern to audit:**
```rust
// DANGEROUS: No token lock-up, vote tipping allows same-tx execution
pub fn cast_vote(ctx: Context<CastVote>, vote: Vote) -> Result<()> {
    // Tokens deposited and vote cast immediately
    deposit_governing_tokens(&ctx)?;
    record_vote(&ctx, vote)?;
    // With early tipping, proposal may be executable NOW
    Ok(())
}
// SAFE: Require token lock-up before voting
pub fn cast_vote(ctx: Context<CastVote>, vote: Vote) -> Result<()> {
    require!(
        ctx.accounts.token_deposit.deposit_slot < clock.slot - MIN_LOCK_SLOTS,
        ErrorCode::TokensNotLockedLongEnough
    );
    record_vote(&ctx, vote)?;
    Ok(())
}
```

**Invariant:** `voting_tokens_must_be_locked_before_voting_period`

---

### 2. Backdoored Proposal (Tornado DAO Attack)
**Severity:** CRITICAL  **EP Reference:** EP-009
**Historical:** Tornado Cash DAO ($1M+, May 2023)

**Mechanism:** Attacker submits a proposal that looks identical to a previous legitimate proposal. The proposal contract contains a hidden `selfdestruct` + redeployment backdoor. After the proposal passes, the attacker replaces the contract code and executes a malicious version.

**Detection:**
- Are proposal instructions human-readable and verified?
- Can proposal target contracts be modified after submission?
- Is there a community review period?
- Do voters verify the actual on-chain instructions, not just the description?

**On Solana:** While `selfdestruct` doesn't exist, equivalent risks include:
- Proposal targets a program with upgrade authority the attacker controls
- Proposal calls a program via CPI that can be upgraded before execution
- Proposal description doesn't match the actual instruction data

**Invariant:** `proposal_instructions_match_description_and_are_immutable`

---

### 3. Inactive DAO Takeover
**Severity:** HIGH  **EP Reference:** EP-058
**Historical:** Synthetify DAO ($230K, Oct 2023), Indexed Finance DAO (Nov 2023)

**Mechanism:** DAO has low participation. Attacker acquires governance tokens cheaply (mispriced relative to treasury value). Submits proposal to transfer treasury to attacker. No active members oppose or even notice. Proposal passes by default.

**Detection:**
- What is the current voter participation rate?
- Is the governance token price fair relative to treasury value?
- Is `treasury_value / token_market_cap > 1`? (attackable)
- Is there an alerting mechanism for new proposals?
- Is there a minimum voting participation (quorum)?

**Invariant:** `treasury_value < cost_to_acquire_voting_majority`

---

### 4. Vote Tipping Exploitation
**Severity:** HIGH  **EP Reference:** EP-058
**Historical:** SPL Governance-specific

**Mechanism:** SPL Governance's "early vote tipping" ends the voting period as soon as one option reaches majority + threshold. An attacker with sufficient tokens can create a proposal and vote immediately, tipping the result before anyone else can react. With hold-up time of zero, execution can be immediate.

**Detection:**
- Which tipping mode is configured? (early, strict, or disabled)
- What is the hold-up time after approval?
- Can a single entity tip the vote?
- Is there a notification system for new proposals?

**Code pattern to audit (SPL Governance config):**
```rust
// DANGEROUS: Early tipping + zero hold-up
GovernanceConfig {
    vote_tipping: VoteTipping::Early,
    min_transaction_hold_up_time: 0,  // Immediate execution!
    ..
}
// SAFE: Strict tipping + meaningful hold-up
GovernanceConfig {
    vote_tipping: VoteTipping::Strict,  // Must wait for voting period end
    min_transaction_hold_up_time: 172800,  // 2 days
    ..
}
```

**Invariant:** `hold_up_time >= 48_hours`

---

### 5. Proposal Execution with Errors Abuse
**Severity:** MEDIUM  **EP Reference:** EP-058
**Historical:** Neodyme research on SPL Governance

**Mechanism:** SPL Governance allows marking an approved proposal as "Executing with errors" if an instruction reverts. This was meant for legitimate retry after fixing external issues. But anyone can mark a valid proposal as errored. Combined with the ability to create conditions that temporarily fail (e.g., using a not-yet-created token account), an attacker can create a time-bomb proposal.

**Detection:**
- Can proposals be flagged as "Executing with errors" by anyone?
- Are there proposals that reference accounts not yet created?
- Can a "failed" proposal be re-executed later?

**Invariant:** `only_proposal_creator_can_flag_execution_errors`

---

### 6. Governance Token Price Manipulation
**Severity:** HIGH  **EP Reference:** EP-021, EP-058

**Mechanism:** Governance token has thin liquidity. Attacker buys tokens to accumulate voting power, or uses lending protocol to borrow tokens for voting. After passing malicious proposal, sells tokens. The cost of acquiring voting power may be much less than the treasury value.

**Detection:**
- What is the liquidity of the governance token?
- Can governance tokens be borrowed from lending protocols?
- Is there a vote-escrow mechanism (veTokens) preventing quick exits?
- Is the governance token market cap < treasury value?

**Invariant:** `cost_to_acquire_majority > extractable_value`

---

### 7. Privileged Admin Functions Bypassing Governance
**Severity:** CRITICAL  **EP Reference:** EP-008, EP-009

**Mechanism:** Protocol has admin functions (setVotingPeriod, setQuorum, emergency withdraw, upgrade) controlled by a single key or small multisig that bypasses governance. Admin can change parameters to make governance useless, or directly drain treasury.

**Detection:**
- Which functions bypass governance? (List ALL admin functions)
- Who holds the admin key? Is it a multisig?
- Can admin change governance parameters (quorum, threshold, hold-up)?
- Is there a timelock on admin actions?
- Can admin upgrade the governance program itself?

**Invariant:** `no_admin_function_can_drain_treasury_without_governance`

---

### 8. Delegation and Vote Buying
**Severity:** MEDIUM  **EP Reference:** EP-058

**Mechanism:** Token holders delegate voting power to a malicious delegate. Or, an attacker bribes token holders off-chain (via Dark DAO mechanisms or direct payments) to delegate or vote a certain way. Delegates accumulate enough power to pass proposals.

**Detection:**
- Is delegation supported? Can it be revoked quickly?
- Is there a maximum delegation per address?
- Are delegate voting patterns transparent?
- Can delegation be combined with flash loans?

**Invariant:** `no_single_delegate_controls_majority`

---

### 9. Token Accumulation Governance Takeover
**Severity:** HIGH  **EP Reference:** EP-114
**Historical:** Build Finance DAO ($470K, Feb 2022 — hostile takeover via token accumulation)

**Mechanism:** Unlike flash loan attacks (which are atomic), this attack is patient: attacker gradually buys governance tokens on the open market until they have enough to pass a proposal. No flash loan needed — just enough capital relative to the token's market cap. Attacker then passes a proposal granting themselves minting authority, drains liquidity pools, and mints unlimited tokens.

**Build Finance Deep-Dive (Wave 7):** First attempt failed (insufficient tokens). Attacker hid evidence by disabling the gitbook and proposal bot. Second attempt succeeded: gained control of governance contract + minting keys + treasury → minted 1.1M BUILD tokens → drained Balancer + Uniswap liquidity → took 130K METRIC from treasury → minted 1B more BUILD → sent ~160 ETH to Tornado Cash. Team stated loss was "total and irrecoverable."

**Detection:**
- Is the governance token market cap < treasury value? (Cost to acquire majority < extractable value)
- Is there a vote-escrow mechanism requiring long-term locking?
- Are there whale alerts for large token accumulation?
- Is there a maximum single-address voting power cap?
- Can governance grant minting authority? (Most dangerous capability)

**Invariant:** `cost_to_acquire_majority > extractable_value`

---

### 10. Governance Proposal Code Bugs
**Severity:** HIGH  **EP Reference:** EP-114
**Historical:** Compound Proposal 62 ($80M at risk, 2021 — `>` vs `>=` bug in COMP distribution)

**Mechanism:** A legitimate governance proposal introduces a subtle bug in the code it deploys. Because governance proposals are complex and on-chain code changes go through a 7-day voting process, there may be no admin override to fix a bug quickly once deployed. The Compound Proposal 62 introduced a `>` instead of `>=` comparison that caused $80M+ in COMP tokens to be misdistributed. Any fix required another 7-day governance cycle.

**Compound Whale Attack (2024):** Whale "Humpy" accumulated COMP, proposed investing $24M into a vault they controlled (Proposal 289). Security researchers flagged it as a governance attack. Resolved by compromise (30% reserves to COMP stakers). Shows that even non-flash-loan governance attacks are viable on large protocols.

**Detection:**
- Are governance proposals audited before voting?
- Is there an emergency pause mechanism that can halt a buggy proposal?
- Can critical protocol parameters be changed via governance without timelock?
- Does a whale have enough voting power to pass proposals unilaterally?

**Invariant:** `governance_proposals_audited_before_execution`

---

## Key Invariants That Must Hold

1. `hold_up_time >= meaningful_review_period` (48h minimum recommended)
2. `quorum_requires_meaningful_participation` (not just 1 vote)
3. `treasury_value < cost_to_acquire_voting_majority`
4. `voting_tokens_locked_before_voting_period`
5. `proposal_instructions_immutable_after_submission`
6. `admin_functions_timelocked_and_multisig`
7. `no_flash_loan_voting` (lock-up or snapshot-based)
8. `governance_cannot_grant_minting_authority` (or requires extreme threshold)
9. `emergency_pause_exists_independent_of_governance_cycle`
10. `proposals_audited_before_execution` (especially parameter changes)

## Red Flags Checklist

- [ ] Early vote tipping enabled with zero hold-up time
- [ ] No quorum requirement or very low quorum
- [ ] Governance token market cap < treasury value
- [ ] Governance tokens borrowable on lending protocols without lock-up
- [ ] Admin functions bypass governance (direct key access)
- [ ] No notification system for new proposals
- [ ] Proposal descriptions don't include verifiable instruction data
- [ ] Vote delegation has no cap per delegate
- [ ] "Executing with errors" can be flagged by anyone
- [ ] No lock-up period between token deposit and voting
- [ ] Single admin key can modify governance parameters
- [ ] Governance can grant minting authority
- [ ] No emergency pause independent of governance cycle
- [ ] Token market cap < treasury value (accumulation attack viable)
- [ ] No whale alerts or concentration monitoring
- [ ] Governance proposals not audited before execution
- [ ] No maximum voting power per address

---
<!-- Sources: Waves 1-2+7 research, Neodyme "How to Hack a DAO", Beanstalk/Tornado/Synthetify/Build Finance/Compound exploits, a16z governance framework, Cantina governance research -->
