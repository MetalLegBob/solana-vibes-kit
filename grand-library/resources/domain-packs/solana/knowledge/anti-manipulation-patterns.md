---
pack: solana
confidence: 8/10
sources_checked: 16
last_updated: "2026-02-16"
---

# How do I prevent economic exploits?

Economic exploits on Solana have resulted in hundreds of millions in losses. Here's how to prevent governance attacks, flash loan manipulation, oracle gaming, whale manipulation, and other economic attack vectors based on real exploits and successful defense patterns.

## Governance Attacks

### The Threat Model

**Governance Takeover:**
- Attacker acquires >50% voting power
- Passes malicious proposal
- Drains treasury or changes parameters
- Exits before community can react

**Real Example (Cross-chain, but applicable):**
- Build Finance (2021): Attacker bought governance tokens, passed proposal to mint infinite tokens, dumped
- Beanstalk (2022): Flash loan attack to gain governance majority, passed instant proposal, stole $182M

### Defense Mechanisms

**Timelock Delays:**
```rust
pub struct ProposalTimelock {
    proposal_id: u64,
    created_at: i64,
    executable_at: i64,  // created_at + MIN_DELAY
    executed: bool,
}

const MIN_DELAY: i64 = 2 * 24 * 60 * 60; // 2 days minimum

pub fn execute_proposal(ctx: Context<ExecuteProposal>) -> Result<()> {
    let current_time = Clock::get()?.unix_timestamp;
    require!(
        current_time >= ctx.accounts.proposal.executable_at,
        ErrorCode::TimelockNotExpired
    );
    // Execute proposal...
}
```

**Benefits:**
- Community has time to react (2-7 days typical)
- Can emergency-cancel malicious proposals
- Whales can't insta-pass harmful changes

**Recommended Delays:**
- Parameter changes: 2 days
- Treasury withdrawals: 3 days
- Contract upgrades: 7 days
- Emergency actions: 24 hours (special multi-sig)

**Quorum Requirements:**
```
Proposal Type         Quorum    Threshold
Parameter tweaks      10%       51%
Major changes         20%       66%
Treasury (large)      30%       75%
Protocol upgrades     40%       80%
```

Higher stakes = higher requirements.

**Vote Delegation Limits:**
```rust
pub struct VoteDelegation {
    max_delegation_per_address: u64, // e.g., 5% of supply
    total_delegated: u64,
}

// Prevent single entity from aggregating too much delegated power
require!(
    delegation.total_delegated < (total_supply * 5) / 100,
    ErrorCode::DelegationLimitExceeded
);
```

**Snapshot Voting:**
- Take vote weight snapshot from past block
- Prevents flash loan governance attacks
- Can't borrow tokens just for vote

```rust
pub struct GovernanceSnapshot {
    snapshot_slot: u64,      // e.g., current_slot - 1000
    voter_weights: HashMap<Pubkey, u64>,
}
```

**Multi-Sig Safety Net:**
```
Standard Proposals: DAO vote
Critical Proposals: DAO vote + 3/5 multi-sig approval
Emergency Halt: 6/9 multi-sig can pause (not execute)
```

Solend learned this the hard way (whale takeover attempt, June 2022).

## Flash Loan Manipulation

### Attack Patterns on Solana

**Flash Loan Basics:**
- Borrow massive amount with no collateral
- Manipulate markets within single transaction
- Repay loan before transaction ends
- Keep profits from manipulation

**Solana-Specific Risks:**
- Solend, Port Finance offer flash loans
- Single transaction can contain many instructions
- Can manipulate oracles, drain pools, exploit pricing

**Real Solana Exploits:**

**Crema Finance (July 2022):**
- $6M flash loan attack
- Exploited bug in LP deposit/withdrawal logic
- Used Solend flash loans
- Deposited and withdrew more than actually deposited

**Solend Pool Exploit (November 2022):**
- $1.26M market manipulation
- Three lending pools targeted
- Oracle price manipulation via flash loans
- Attacker borrowed, manipulated price, liquidated positions

### Defense Mechanisms

**Price Oracle Manipulation Protection:**

```rust
pub struct TwapOracle {
    prices: Vec<PricePoint>,
    window_size: u64,  // e.g., 10 minutes
}

pub fn get_twap_price(oracle: &TwapOracle) -> u64 {
    // Time-Weighted Average Price
    let sum: u64 = oracle.prices.iter().map(|p| p.price).sum();
    sum / oracle.prices.len()
}

// Use TWAP instead of spot price for critical operations
require!(
    current_price < (twap_price * 105) / 100, // Within 5% of TWAP
    ErrorCode::PriceManipulationDetected
);
```

**Benefits:**
- Flash loan can't manipulate average over time
- Requires sustained manipulation (expensive)
- Used by Aave, Compound on EVM

**Multiple Oracle Sources:**
```rust
pub struct MultiSourceOracle {
    pyth_price: u64,
    switchboard_price: u64,
    chainlink_price: u64,  // when available on Solana
}

pub fn get_median_price(oracles: &MultiSourceOracle) -> u64 {
    let mut prices = vec![
        oracles.pyth_price,
        oracles.switchboard_price,
        oracles.chainlink_price,
    ];
    prices.sort();
    prices[1]  // Median of 3
}
```

**Flash Loan Detection:**
```rust
pub struct LoanDetection {
    balance_snapshot_start: u64,
    balance_snapshot_end: u64,
}

pub fn execute_critical_operation(ctx: Context<Execute>) -> Result<()> {
    let start_balance = ctx.accounts.user_token.amount;

    // ... perform operation ...

    let end_balance = ctx.accounts.user_token.amount;

    // Suspicious: Balance decreased significantly within tx
    require!(
        end_balance > (start_balance * 90) / 100,
        ErrorCode::SuspiciousBalanceChange
    );

    Ok(())
}
```

**Reentrancy Guards:**
```rust
pub struct ReentrancyGuard {
    locked: bool,
}

pub fn protected_function(ctx: Context<Protected>) -> Result<()> {
    require!(!ctx.accounts.guard.locked, ErrorCode::Reentrancy);

    ctx.accounts.guard.locked = true;

    // ... critical operations ...

    ctx.accounts.guard.locked = false;
    Ok(())
}
```

Prevents recursive calls during flash loan execution.

**Minimum Holding Period:**
```rust
pub struct PositionTimelock {
    opened_at: i64,
    min_hold_seconds: i64,  // e.g., 1 hour
}

pub fn close_position(ctx: Context<Close>) -> Result<()> {
    let current_time = Clock::get()?.unix_timestamp;
    let held_for = current_time - ctx.accounts.position.opened_at;

    require!(
        held_for >= ctx.accounts.position.min_hold_seconds,
        ErrorCode::MinimumHoldPeriodNotMet
    );

    // ... close position ...
}
```

Makes flash loan attacks impossible (can't hold for hour in one tx).

## Oracle Gaming

### Manipulation Vectors

**Low Liquidity Oracles:**
- Small pool with oracle
- Attacker manipulates pool price
- Oracle reflects manipulated price
- Exploit dependent protocols

**Solana Oracle Landscape:**
- **Pyth Network:** Pull-based, high-frequency, Pythnet validators
- **Switchboard:** Push-based, customizable feeds
- **Chainlink:** Limited Solana presence (as of 2025)

### Pyth Oracle Best Practices

**Confidence Intervals:**
```rust
use pyth_sdk_solana::load_price_feed_from_account_info;

pub fn get_pyth_price(price_account: &AccountInfo) -> Result<u64> {
    let price_feed = load_price_feed_from_account_info(price_account)?;
    let current_price = price_feed
        .get_current_price()
        .ok_or(ErrorCode::PriceUnavailable)?;

    // Check confidence interval
    let confidence = current_price.conf;
    let price = current_price.price as u64;

    require!(
        confidence < (price * 2) / 100, // Confidence < 2% of price
        ErrorCode::OracleConfidenceTooWide
    );

    Ok(price)
}
```

**Staleness Checks:**
```rust
pub fn verify_price_freshness(price_feed: &PriceFeed) -> Result<()> {
    let current_time = Clock::get()?.unix_timestamp;
    let price_time = price_feed.publish_time;

    const MAX_STALENESS: i64 = 60; // 60 seconds

    require!(
        current_time - price_time < MAX_STALENESS,
        ErrorCode::StalePriceData
    );

    Ok(())
}
```

**Circuit Breakers:**
```rust
pub struct CircuitBreaker {
    last_price: u64,
    max_price_change_bps: u16,  // e.g., 1000 = 10%
}

pub fn check_circuit_breaker(
    breaker: &CircuitBreaker,
    new_price: u64,
) -> Result<()> {
    let price_change_bps = if new_price > breaker.last_price {
        ((new_price - breaker.last_price) * 10000) / breaker.last_price
    } else {
        ((breaker.last_price - new_price) * 10000) / breaker.last_price
    };

    require!(
        price_change_bps <= breaker.max_price_change_bps as u64,
        ErrorCode::CircuitBreakerTripped
    );

    Ok(())
}
```

If price moves >10% in one update, halt operations until manual review.

**Mango Markets Exploit (October 2022):**
- $116M drained via oracle manipulation
- Attacker manipulated MNGO token price on low-liquidity exchange
- Oracle reflected manipulated price
- Used inflated collateral to borrow and drain pools

**Prevention:**
- Use multiple oracle sources
- Require minimum liquidity thresholds
- Circuit breakers on price changes
- TWAP instead of spot prices

## Whale Manipulation

### Attack Vectors

**Liquidity Pool Manipulation:**
- Whale adds massive liquidity
- Skews pool ratios
- Profits from imbalanced trades
- Withdraws, leaving LPs with losses

**Solend Whale Incident (June 2022):**
- Single whale deposited $170M collateral (5.7M SOL)
- Borrowed $108M USDC/USDT
- Represented majority of protocol's borrowing capacity
- Risk: If SOL crashed, liquidation could break Solend
- Protocol attempted governance takeover to manage position (controversial)
- Whale eventually reduced position by $25M

### Defense Patterns

**Position Size Limits:**
```rust
pub struct ProtocolLimits {
    max_single_deposit: u64,      // e.g., $10M
    max_protocol_utilization: u8, // e.g., 20% of pool
}

pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
    let limits = &ctx.accounts.limits;

    // Check individual position size
    require!(
        amount <= limits.max_single_deposit,
        ErrorCode::DepositTooLarge
    );

    // Check protocol-wide concentration
    let new_total = ctx.accounts.pool.total_deposits + amount;
    let utilization = (amount * 100) / new_total;

    require!(
        utilization <= limits.max_protocol_utilization,
        ErrorCode::UtilizationTooHigh
    );

    Ok(())
}
```

**Graduated Liquidation:**
```rust
pub struct LiquidationParams {
    liquidation_threshold: u8,  // e.g., 75% LTV
    liquidation_penalty: u8,    // e.g., 5%
    max_liquidation_per_tx: u64, // e.g., 10% of position
}

// Instead of liquidating entire position at once:
// - Liquidate in chunks (10% at a time)
// - Reduces market impact
// - Gives whale time to add collateral
```

**Dynamic Borrow Limits:**
```
Total Pool Size: $100M
Single User Max Borrow: min(
  $10M (absolute cap),
  15% of pool (dynamic cap)
)

As pool grows, individual max grows
But never exceeds absolute cap
```

**Whale Monitoring:**
```rust
pub struct WhaleAlert {
    address: Pubkey,
    position_size: u64,
    protocol_share: u8,  // Percentage of total
    alert_threshold: u8, // e.g., 10%
}

// Emit event when position exceeds threshold
if (position.protocol_share > whale_alert.alert_threshold) {
    emit!(WhalePositionAlert {
        whale: position.address,
        size: position.position_size,
        share: position.protocol_share,
    });
}
```

Allows community to monitor and react.

**Diversified Collateral:**
```
Single Collateral Type Max: 30% of total borrows

Example:
Total Borrows: $100M
SOL Collateral: Max $30M (even if demand is higher)
Forces diversification, reduces correlation risk
```

## Rate Limiting

### Why Rate Limiting Matters

**Attack Scenarios:**
- Rapid deposits/withdrawals to manipulate ratios
- Spam transactions to exploit rounding errors
- DoS via resource exhaustion
- MEV extraction via rapid arbitrage

### Implementation Patterns

**Per-Account Rate Limits:**
```rust
pub struct RateLimit {
    last_action_slot: u64,
    actions_in_window: u32,
    window_size_slots: u64,     // e.g., 150 slots (~60 seconds)
    max_actions_per_window: u32, // e.g., 10
}

pub fn check_rate_limit(ctx: Context<RateLimited>) -> Result<()> {
    let current_slot = Clock::get()?.slot;
    let rate_limit = &mut ctx.accounts.rate_limit;

    // Reset window if expired
    if current_slot > rate_limit.last_action_slot + rate_limit.window_size_slots {
        rate_limit.actions_in_window = 0;
        rate_limit.last_action_slot = current_slot;
    }

    // Check limit
    require!(
        rate_limit.actions_in_window < rate_limit.max_actions_per_window,
        ErrorCode::RateLimitExceeded
    );

    rate_limit.actions_in_window += 1;
    Ok(())
}
```

**Cooldown Periods:**
```rust
pub struct Cooldown {
    last_action_time: i64,
    cooldown_seconds: i64,  // e.g., 300 = 5 minutes
}

pub fn execute_with_cooldown(ctx: Context<Cooldown>) -> Result<()> {
    let current_time = Clock::get()?.unix_timestamp;
    let cooldown = &ctx.accounts.cooldown;

    require!(
        current_time >= cooldown.last_action_time + cooldown.cooldown_seconds,
        ErrorCode::CooldownNotExpired
    );

    // Update timestamp
    ctx.accounts.cooldown.last_action_time = current_time;

    // ... perform action ...
    Ok(())
}
```

**Transaction Throttling:**
```
Limit large operations:
- Withdraw > $100K: Max 1 per hour
- Borrow > $50K: Max 3 per day
- Emergency withdraw: Max 1 per week
```

Prevents rapid drainage attacks.

## Circuit Breakers

### Global Pause Mechanisms

**Emergency Halt:**
```rust
#[account]
pub struct EmergencyControl {
    paused: bool,
    pause_authority: Pubkey,  // Multi-sig
}

pub fn protected_operation(ctx: Context<Protected>) -> Result<()> {
    require!(
        !ctx.accounts.emergency.paused,
        ErrorCode::ProtocolPaused
    );

    // ... normal operation ...
}

pub fn emergency_pause(ctx: Context<Pause>) -> Result<()> {
    // Only multi-sig can pause
    require!(
        ctx.accounts.signer.key() == ctx.accounts.emergency.pause_authority,
        ErrorCode::Unauthorized
    );

    ctx.accounts.emergency.paused = true;
    emit!(ProtocolPausedEvent { timestamp: Clock::get()?.unix_timestamp });
    Ok(())
}
```

**Graduated Pause:**
```
Level 1: Pause new deposits (withdrawals still ok)
Level 2: Pause all operations except withdrawals
Level 3: Full freeze (emergency only)
```

**Automatic Circuit Breakers:**
```rust
pub struct AutoCircuitBreaker {
    trigger_conditions: Vec<TriggerCondition>,
    active: bool,
}

pub enum TriggerCondition {
    PriceChange { threshold: u16 },        // e.g., 20% in 1 hour
    VolumeSpike { multiplier: u16 },       // e.g., 10x average
    LiquidationCascade { threshold: u64 }, // e.g., $10M liquidated in 1 hour
}

pub fn check_auto_circuit_breaker(ctx: Context<Check>) -> Result<()> {
    let breaker = &ctx.accounts.circuit_breaker;

    for condition in &breaker.trigger_conditions {
        if condition.is_triggered()? {
            // Auto-pause protocol
            ctx.accounts.emergency.paused = true;
            emit!(CircuitBreakerTriggered { condition: condition.clone() });
            return Err(ErrorCode::CircuitBreakerActive.into());
        }
    }

    Ok(())
}
```

**Real Example:**
- Solana mainnet Turbine failure (2023)
- Network congestion caused consensus issues
- Validators halted network (circuit breaker)
- Coordinated restart after diagnosis

### Insurance Funds

**Protocol Safety Net:**
```rust
pub struct InsuranceFund {
    balance: u64,
    auto_replenish_rate: u16,  // % of protocol revenue
    min_balance_threshold: u64,
}

// Automatically fund insurance from revenue
pub fn collect_revenue(ctx: Context<Revenue>, amount: u64) -> Result<()> {
    let insurance_amount = (amount * ctx.accounts.insurance.auto_replenish_rate as u64) / 10000;

    // Transfer to insurance fund
    token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.revenue_vault.to_account_info(),
                to: ctx.accounts.insurance_vault.to_account_info(),
                authority: ctx.accounts.authority.to_account_info(),
            },
        ),
        insurance_amount,
    )?;

    ctx.accounts.insurance.balance += insurance_amount;
    Ok(())
}
```

**Usage:**
- Cover bad debt from liquidations
- Compensate users after exploits
- Bridge deficits during market volatility

**Real Examples:**
- Raydium: Compensated users 100% (RAY pools) or 90% (non-RAY) after $4M exploit
- Wormhole: $326M reimbursed after bridge hack (via Jump Trading bailout)
- Pump.fun: $1.9M restored after employee exploit

## Best Practices Summary

### Governance Security
1. **Timelocks:** 2-7 day delays on critical proposals
2. **High Quorums:** 30-40% for major changes
3. **Snapshot Voting:** Prevent flash loan governance
4. **Multi-Sig Backup:** Critical operations require both DAO + multi-sig
5. **Delegation Limits:** Cap single entity voting power

### Flash Loan Protection
1. **TWAP Oracles:** Time-weighted averages, not spot prices
2. **Multiple Oracles:** Median of 3+ sources
3. **Reentrancy Guards:** Lock critical functions
4. **Holding Periods:** Require minimum time before actions
5. **Balance Checks:** Detect suspicious intra-tx changes

### Oracle Security
1. **Confidence Checks:** Require tight confidence intervals
2. **Staleness Checks:** Reject old price data (>60s)
3. **Circuit Breakers:** Halt on >10% price swings
4. **Multiple Sources:** Never rely on single oracle
5. **Liquidity Thresholds:** Ignore low-liquidity price feeds

### Whale Protection
1. **Position Limits:** Cap single-user deposits
2. **Utilization Caps:** Limit % of pool any user can control
3. **Graduated Liquidation:** Liquidate in chunks, not all at once
4. **Monitoring:** Alert on whale positions >10% of protocol
5. **Diversification:** Force collateral type diversity

### Rate Limiting
1. **Per-Account Limits:** Max transactions per time window
2. **Cooldown Periods:** Enforce delays between actions
3. **Size-Based Throttling:** Larger operations = longer cooldowns
4. **Slot-Based Windows:** Use Solana slots for precise timing

### Circuit Breakers
1. **Emergency Pause:** Multi-sig can halt protocol
2. **Graduated Levels:** Pause specific functions, not all
3. **Auto-Triggers:** Halt on anomalous activity
4. **Insurance Funds:** 5-10% of revenue to safety fund
5. **Recovery Plans:** Document restart procedures

## Security Audit Checklist

Before deploying economic mechanisms:

- [ ] Governance timelock (≥2 days for critical ops)
- [ ] Flash loan protection (TWAP or holding periods)
- [ ] Multiple oracle sources (≥3 feeds)
- [ ] Oracle staleness checks (<60s)
- [ ] Circuit breakers on price swings (>10%)
- [ ] Position size limits (≤20% of pool)
- [ ] Rate limiting (per account and global)
- [ ] Reentrancy guards on all state-changing functions
- [ ] Emergency pause mechanism (multi-sig)
- [ ] Insurance fund (≥5% of TVL target)
- [ ] Formal audit by reputable firm (Sec3, OtterSec, Neodyme)
- [ ] Bug bounty program (Immunefi, Code4rena)

## Real Exploit Timeline Reference

**Major Solana DeFi Exploits:**
- **Wormhole (Feb 2022):** $326M bridge exploit (signature verification)
- **Cashio (March 2022):** $52M infinite mint exploit
- **Solend Whale (June 2022):** $170M position risk (governance controversy)
- **Crema Finance (July 2022):** $6M flash loan attack
- **Solend Exploit (Nov 2022):** $1.26M oracle manipulation
- **Mango Markets (Oct 2022):** $116M oracle manipulation via off-chain price
- **DEXX (Nov 2024):** $30M private key leak (not protocol, but ecosystem)
- **Pump.fun Employee (May 2024):** $1.9M insider exploit (fully restored)

**Common Themes:**
- Oracle manipulation (33% of exploits)
- Flash loans (25%)
- Access control bugs (20%)
- Logic errors (15%)
- Economic design flaws (7%)

**Most Effective Defenses:**
- TWAP oracles (stops flash loan price manipulation)
- Timelocks (stops governance attacks)
- Multi-sig + monitoring (catches insider threats)
- Formal audits (catches logic errors)
- Insurance funds (mitigates damage when exploits occur)

## Tools & Resources

**Auditing Firms (Solana-specialized):**
- Sec3 (X-ray scanner, WatchTower monitoring, OwLLM)
- OtterSec
- Neodyme
- Kudelski Security
- Halborn

**Monitoring:**
- Sec3 WatchTower: Real-time threat monitoring
- Forta Network: Cross-chain threat detection
- Custom Dune Analytics dashboards

**Bug Bounties:**
- Immunefi: DeFi-focused platform
- Code4rena: Audit contests
- HackerOne: General security platform

**Learning:**
- Helius "Hitchhiker's Guide to Solana Program Security"
- Solana security best practices: usesolana.xyz
- Exploit post-mortems: Rekt News, Blocksec reports
