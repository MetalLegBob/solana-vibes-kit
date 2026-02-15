# Staking Protocol Attack Playbook
<!-- Protocol-specific attack vectors for Staking and Liquid Staking protocols -->
<!-- Last updated: 2026-02-06 -->

## How Staking Protocols Work (Mental Model)

Staking protocols allow users to lock tokens (SOL, etc.) to earn yield from network validation. Liquid staking protocols issue derivative tokens (mSOL, jitoSOL, bSOL) representing the staked position, allowing users to remain liquid while earning staking rewards.

**Key components:**
- **Stake pools:** Aggregate user deposits, delegate to validators
- **Liquid staking tokens (LSTs):** Receipt tokens representing share of staked pool
- **Exchange rate:** LST-to-SOL ratio, increases over time as rewards accrue
- **Validator selection:** Strategy for distributing stake across validators
- **Unstaking/withdrawal:** Epoch-based cooldown or instant via liquidity pools
- **Delegation strategy:** Algorithm choosing which validators receive stake

---

## Common Architecture Patterns

### Native Stake Pool (SPL Stake Pool)
- Marinade (mSOL), SolBlaze (bSOL), Jito (jitoSOL)
- Users deposit SOL → receive LST tokens
- Pool delegates to multiple validators
- Exchange rate increases each epoch from rewards

### Restaking
- Solayer, Picasso/Mantis
- Stake already-staked tokens to secure additional services
- Layered risk: underlying + restaking protocol

### Validator-Specific Staking
- Direct delegation to single validator
- Simpler but concentrated risk
- No liquid token issued (typically)

---

## Known Attack Vectors

### 1. LST Exchange Rate Manipulation
**Severity:** CRITICAL  **EP Reference:** EP-033, EP-058
**Historical:** Multiple EVM liquid staking protocols

**Mechanism:** Exchange rate between LST and underlying SOL is calculated from pool reserves. If an attacker can inflate the pool's SOL balance without minting proportional LSTs (e.g., direct donation), the exchange rate shifts. This can be exploited if other protocols use the exchange rate for collateral valuation.

**Detection:**
- How is the exchange rate calculated?
- Can SOL be donated directly to the pool without minting LSTs?
- Do external protocols use the LST exchange rate for pricing?
- Is there a cap on exchange rate change per epoch?

**Code pattern to audit:**
```rust
// DANGEROUS: Exchange rate from simple division
let exchange_rate = pool_sol_balance / lst_supply;
// SAFE: Track deposits separately, use TWAP
let exchange_rate = pool.tracked_sol_deposits / lst_supply;
require!(rate_change_this_epoch < MAX_RATE_CHANGE);
```

**Invariant:** `exchange_rate_change_per_epoch < MAX_DEVIATION`

---

### 2. First-Depositor / Rounding Attack
**Severity:** HIGH  **EP Reference:** EP-033
**Historical:** Multiple DeFi vault protocols

**Mechanism:** First user deposits a tiny amount of SOL, then donates a large amount directly to the pool. When the second depositor deposits, their LST minting rounds down to zero (or near-zero), and their SOL is captured by the existing LST holders.

**Detection:**
- Is there a MINIMUM_DEPOSIT on first stake?
- Are there minimum LST tokens minted?
- Can the first deposit be front-run?

**Code pattern to audit:**
```rust
// DANGEROUS: No minimum on first deposit
let lst_to_mint = (deposit_amount * lst_supply) / pool_sol;
// SAFE: Lock minimum liquidity on first deposit
if lst_supply == 0 {
    require!(deposit_amount >= MINIMUM_DEPOSIT);
    let lst_to_mint = deposit_amount - MINIMUM_LIQUIDITY;
    // Lock MINIMUM_LIQUIDITY permanently
}
```

**Invariant:** `first_deposit_locks_minimum_liquidity`

---

### 3. Validator Delegation Manipulation / Algorithm Inversion
**Severity:** HIGH  **EP Reference:** EP-058, EP-099
**Historical:** Marinade SAM "Slow Roasted Stake" ($5M, 126 epochs — algorithm implemented backward)

**Mechanism:** In auction-based delegation systems, validators bid high to win stake, then lower their bids after receiving delegation. The pool continues allocating stake to underperforming validators. Users receive lower APY than expected.

**The Marinade Case (EP-099):** Marinade's Stake Auction Marketplace intended to unstake the lowest bidders first. The sorting logic was **reversed** — lowest bidders were protected from unstaking. 85+ validators gamed this for 126 epochs: bid high to win stake, immediately drop bid to 1 lamport, retain stake indefinitely. Result: ~$5M (37,000 SOL) in missed rewards to mSOL holders. This is a "slow exploit" — not a single-transaction hack but systematic gaming over months.

**Detection:**
- How does the pool select validators?
- Can validators change their commission/bid after receiving delegation?
- **Verify sort direction in priority/auction algorithms matches specification**
- Is there a penalty for bid manipulation?
- Are validator performance metrics checked on-chain?
- Is there a minimum bid retention requirement after winning stake?
- Can validators slash bids to near-zero after delegation?

**Code pattern to audit:**
```rust
// DANGEROUS: Sort direction may be backwards
validators.sort_by(|a, b| b.bid.cmp(&a.bid));  // Ascending or descending?
// VERIFY: Does this match the spec? Test with adversarial inputs.
// ALSO CHECK: Can validators modify bids post-delegation?
```

**Invariant:** `validator_performance_matches_bid_commitment && sort_direction_matches_spec`

---

### 4. Withdrawal Queue Manipulation
**Severity:** MEDIUM  **EP Reference:** EP-065
**Historical:** Various liquid staking protocols

**Mechanism:** Unstaking typically requires waiting until end of epoch. If the withdrawal queue isn't properly ordered (FIFO), an attacker can front-run legitimate unstakers. If instant withdrawal uses an AMM pool, the pool can be drained or price manipulated.

**Detection:**
- Is the withdrawal queue FIFO?
- Can withdrawals be front-run?
- If instant withdrawal exists, what liquidity source does it use?
- Can a large withdrawal depeg the LST?

**Invariant:** `withdrawals_are_fifo_ordered`

---

### 5. Slashing Exposure Without User Awareness
**Severity:** HIGH  **EP Reference:** EP-058
**Historical:** Theoretical on Solana (slashing not yet fully implemented)

**Mechanism:** Liquid staking pool delegates to validators. If validators are slashed (when implemented), losses are socialized across all pool depositors. Users have no choice in validator selection and may not be aware of slashing risk.

**Detection:**
- Does the pool have a validator selection/removal policy?
- Is there insurance against slashing?
- Are users informed of slashing risk?
- Can the pool remove a misbehaving validator quickly?

**Note:** Solana has not yet implemented full slashing as of early 2026, but it's planned. Protocols should prepare.

---

### 6. Depegging and Cascading Liquidation
**Severity:** HIGH  **EP Reference:** EP-058, EP-096
**Historical:** stETH depeg (EVM, June 2022), various LST depegs

**Mechanism:** LSTs trade on secondary markets. During market stress, large sells can depeg the LST from its underlying value. If LSTs are used as collateral in lending protocols, depegging triggers cascading liquidations, further depressing price.

**Detection:**
- Is the LST used as collateral in lending protocols?
- What happens if the LST depegs 10%? 20%?
- Is there a circuit breaker on collateral value changes?
- Can the protocol handle mass withdrawals?

**Invariant:** `protocol_can_survive_lst_depeg_of_20_percent`

---

### 7. Reward Distribution Manipulation
**Severity:** MEDIUM  **EP Reference:** EP-016, EP-019

**Mechanism:** Staking rewards are distributed per-epoch. If the reward accounting is based on snapshots, an attacker can deposit just before the snapshot, collect rewards, and withdraw immediately after.

**Detection:**
- When are rewards snapshoted?
- Is there a time-weighted reward distribution?
- Can users deposit-and-withdraw around reward boundaries?
- Is there a minimum staking duration?

**Code pattern to audit:**
```rust
// DANGEROUS: Snapshot-based rewards
let reward = user.balance_at_snapshot * reward_rate;
// SAFE: Time-weighted rewards
let reward = user.time_weighted_balance * reward_rate;
```

**Invariant:** `rewards_are_time_weighted_not_snapshot_based`

---

### 8. Account Owner Reassignment (Phishing)
**Severity:** CRITICAL  **EP Reference:** EP-097
**Historical:** Solana phishing attacks ($3M+, Dec 2025)

**Mechanism:** Attacker crafts a malicious transaction that reassigns the "Owner" field of a user's stake account or token account to an attacker-controlled program. Wallets may not display this operation clearly. Once ownership is transferred, the attacker can withdraw all staked funds.

**Detection:**
- Does the staking UI clearly display ownership changes?
- Are there warnings for Owner field reassignment?
- Is the protocol vulnerable to phishing via crafted transactions?

**Invariant:** `account_owner_changes_require_explicit_user_confirmation`

---

## Key Invariants That Must Hold

1. `exchange_rate_only_increases` (except for slashing events)
2. `lst_supply * exchange_rate <= total_pool_sol` (LSTs always backed)
3. `first_deposit_locks_minimum_liquidity` (prevent rounding attack)
4. `validator_commission_matches_delegation_terms`
5. `withdrawals_are_ordered_and_fair` (FIFO or similar)
6. `reward_distribution_is_time_weighted`
7. `no_deposit_and_withdraw_in_same_epoch_boundary`

## Red Flags Checklist

- [ ] Exchange rate calculated from raw pool balance (donatable)
- [ ] No minimum deposit/liquidity on first stake
- [ ] Validator selection has no performance monitoring
- [ ] Withdrawal queue can be jumped or front-run
- [ ] Rewards based on point-in-time snapshot, not time-weighted
- [ ] No circuit breaker on exchange rate deviation
- [ ] LST used as collateral without depeg protection
- [ ] Admin can redirect stake to specific validators without timelock
- [ ] No slashing preparation or insurance mechanism
- [ ] Instant withdrawal pool has insufficient liquidity depth
- [ ] Multi-LST pool without per-LST risk assessment
- [ ] Validator selection doesn't factor MEV behavior
- [ ] Restaking slashing conditions not clearly defined

---

## Protocol-Specific Intelligence (Wave 8)

### Marinade (mSOL)
**Programs:** Liquid staking, native staking
**Audits:** Ackee Blockchain (Jul 2021), Kudelski Security (Nov 2021), Neodyme (Oct 2023)
**Bug Bounty:** Immunefi (active)
**Status:** 4+ years without major security incident

**Security posture:**
- Multiple independent audits from top Solana audit firms
- Multisig governance
- Delegation strategy with validator performance monitoring
- Participated in coordinated MEV crackdown (2025)

**Key audit focus areas for Marinade forks:**
- Validator selection and delegation fairness
- Epoch boundary timing for deposits/withdrawals
- mSOL exchange rate calculation integrity
- Unstake queue ordering and fairness

### Jito (JitoSOL)
**Programs:** Stake pool (JitoSOL), restaking, tip router, block engine
**Audits:** Immunefi $150K restaking audit competition (Nov 2024)
**Bug Bounty:** Immunefi (active)

**Security-relevant events:**
- **Validator sandwich enforcement** (Oct 2025): Banned 15 validators for evidence of sandwich attacks. ~6% of proposed blocks contained sandwiched transactions. Response to on-chain MEV abuse report.
- **Mempool shutdown** (Mar 2024): Shut down public mempool to reduce sandwich attacks — attackers adapted within 1 month via private mempools

**Restaking architecture (new attack surface):**
- Flexible staking parameters and customizable slashing conditions
- Vault receipt tokens (VRT) — potential for VRT pricing manipulation
- Node consensus networks (NCN) can customize slashing — risk of over-aggressive slashing
- Tip router for MEV distribution — fairness and manipulation risks

**Key audit focus areas:**
- Restaking: Slashing condition validation, VRT share pricing
- Tip router: Fair distribution, manipulation resistance
- MEV: Validator behavior monitoring, sandwich detection
- Stake pool: Exchange rate integrity, withdrawal fairness

### Sanctum (INF, saSOL)
**Programs:** Router (LST-SOL swaps), Infinity Pool (multi-LST liquidity), Reserve (instant unstake)
**Architecture:** Uses SPL Stake Pool program (helped Solana Labs build it)
**Status:** No known security incidents

**Key innovation — Infinity Pool:**
- Multi-LST liquidity pool with INF token
- INF yield = weighted average of all pooled LST yields + trading fees
- Solves LST fragmentation and liquidity issues

**mSOL depeg event (Dec 2023):**
- Large selling pressure caused temporary mSOL depeg
- Highlighted risk of insufficient LST liquidity
- Sanctum Infinity Pool designed to solve this

**Key audit focus areas:**
- Infinity Pool: Per-LST risk assessment (what if one LST depegs?)
- Exchange rate calculations across multiple LSTs
- Router: Arbitrage-resistant pricing between LST-SOL conversions
- Reserve: Instant unstake liquidity depth and manipulation resistance
- SPL Stake Pool: Battle-tested but verify custom extensions

---

## Restaking-Specific Attack Vectors (Wave 10)

### Vector 9: Restaking Slashing Propagation
**Description:** In restaking protocols (Jito restaking, Solayer), a single slashing event on one Node Consensus Network (NCN) can cascade across all operators and vaults that share the slashed operator. If slashing conditions are overly aggressive or poorly validated, an attacker can trigger cascading slashings that drain shared collateral pools.

**Attack Flow:**
1. Attacker identifies an NCN with aggressive slashing conditions and shared operators
2. Triggers a slashing event on the NCN (e.g., by manipulating the conditions the operator must meet)
3. Slashing reduces the operator's shared collateral, affecting ALL vaults that delegated to that operator
4. Other NCNs may also slash the same operator due to reduced collateral → cascade

**Red Flags:**
- Slashing conditions defined by NCN without protocol-level bounds
- No maximum slash percentage per epoch
- Operator collateral shared across many NCNs without isolation
- No slashing dispute/appeal mechanism

**Invariants:**
- Single slashing event must not reduce operator collateral below minimum threshold for other NCNs
- Slash amounts must be bounded per epoch (e.g., max 10% per epoch)
- Shared collateral must have isolation bounds between NCN commitments

### Vector 10: VRT (Vault Receipt Token) Share Price Manipulation
**Description:** Vault Receipt Tokens represent a share of restaked assets. Like LP token donation attacks (EP-059), the first depositor can manipulate VRT pricing by donating assets directly to the vault, inflating the share price so subsequent depositors receive zero shares.

**Red Flags:**
- `total_assets / total_shares` without virtual reserves
- No minimum initial deposit
- VRT mint without dead share protection

### Vector 11: Third-Party Staking API Compromise
**Description:** Protocols delegating staking operations to third-party services (Kiln, Figment, etc.) are vulnerable when the service provider's API is compromised. See EP-128 for full details.

**Historical Exploit:** SwissBorg/Kiln ($41.5M, Sep 2025) — compromised GitHub token → malicious `SetAuthority` instructions injected into routine unstake transaction

**Red Flags:**
- Staking operations delegated to third-party API without instruction-level verification
- No allowlist for authority change operations
- Single-party signing of API-constructed transactions

---
<!-- Sources: Wave 1+2+8+10 research, Sigma Prime liquid staking review, Everstake delegation exploit, Helius ecosystem history, Marinade audits (Ackee/Kudelski/Neodyme), Jito restaking docs/Immunefi competition, Jito sandwich enforcement, Sanctum Infinity Pool docs, mSOL depeg analysis, SwissBorg/Kiln post-mortem (Nov 2025), Halborn SwissBorg analysis (Sep 2025) -->
