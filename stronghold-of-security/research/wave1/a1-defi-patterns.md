# Solana DeFi Attack Patterns & Vulnerabilities

**Research Date:** 2026-02-06
**Scope:** DeFi patterns, Anchor framework, Token-2022, bug bounty disclosures
**Confidence:** MEDIUM (based on training data through January 2025, WebSearch unavailable)

**WARNING:** This document is compiled from training data without current web verification. All patterns should be validated against current security advisories and documentation.

---

## Part 1: DeFi Attack Patterns Applicable to Solana

### 1. Flash Loan Attacks via Solend/MarginFi

**Category:** DeFi Pattern

**Description:**
Flash loans allow borrowing large amounts without collateral within a single transaction. Attackers use borrowed funds to manipulate markets, drain liquidity, or exploit pricing vulnerabilities, then repay the loan before transaction finishes.

**Solana-specific context:**
- Solana's single-transaction atomicity enables flash loans within instruction sequences
- Protocols like Solend, MarginFi, and Mango Markets offer flash loan primitives
- Lower fees on Solana make flash loan attacks more economically viable than Ethereum
- Cross-program invocation (CPI) enables multi-protocol attack chains

**Mechanism:**
1. Borrow maximum available liquidity via flash loan
2. Manipulate target protocol (price oracle, liquidity pool, governance)
3. Execute profitable action (liquidation, swap, vote)
4. Repay loan + fee in same transaction

**Vulnerable pattern:**
```rust
// VULNERABLE: Price check without flash loan protection
pub fn liquidate(ctx: Context<Liquidate>, amount: u64) -> Result<()> {
    let price = ctx.accounts.oracle.get_price()?; // Spot price - manipulatable!

    let collateral_value = ctx.accounts.position.collateral * price;
    let debt_value = ctx.accounts.position.debt;

    require!(
        collateral_value < debt_value * LIQUIDATION_THRESHOLD,
        ErrorCode::NotLiquidatable
    );

    // Execute liquidation
    Ok(())
}
```

**Safe pattern:**
```rust
// SAFE: TWAP oracle + reentrancy guard + liquidation delay
#[derive(Accounts)]
pub struct Liquidate<'info> {
    #[account(
        mut,
        constraint = position.last_update_slot < clock.slot - LIQUIDATION_DELAY_SLOTS
    )]
    pub position: Account<'info, Position>,

    #[account(
        constraint = oracle.confidence < MAX_CONFIDENCE_INTERVAL,
        constraint = oracle.is_valid()
    )]
    pub oracle: Account<'info, PythOracle>,
}

pub fn liquidate(ctx: Context<Liquidate>, amount: u64) -> Result<()> {
    // Use TWAP price, not spot
    let twap_price = ctx.accounts.oracle.get_twap_price(TWAP_WINDOW)?;

    // Check confidence interval
    require!(
        ctx.accounts.oracle.confidence < MAX_CONFIDENCE_INTERVAL,
        ErrorCode::OracleConfidenceTooLow
    );

    // Validate position hasn't been updated this slot
    require!(
        ctx.accounts.position.last_update_slot < ctx.accounts.clock.slot,
        ErrorCode::PositionUpdatedThisSlot
    );

    Ok(())
}
```

**Detection strategy:**
- Monitor for transactions borrowing large amounts and repaying in same transaction
- Track oracle price deviations during liquidations
- Flag liquidations occurring immediately after large borrows
- Check for CPI chains involving lending protocols

**Historical examples:**
- Mango Markets exploit (October 2022): $116M via oracle manipulation and flash borrowing
- Crema Finance exploit (July 2022): Flash loan used to drain liquidity pools

**Root cause:** Reliance on manipulatable spot prices
**Severity:** CRITICAL

---

### 2. Oracle Manipulation - TWAP Attacks

**Category:** DeFi Pattern

**Description:**
Attackers manipulate Time-Weighted Average Price (TWAP) oracles by executing trades that move prices over multiple blocks, bypassing single-block flash loan protections.

**Solana-specific context:**
- Solana's 400ms block time makes TWAP windows harder to manipulate than Ethereum
- However, Jito bundles allow guaranteed transaction ordering within slots
- Pyth Network uses confidence intervals; Switchboard uses multiple data sources
- AMM-based oracles (Orca, Raydium) vulnerable to multi-block manipulation

**Mechanism:**
1. Accumulate capital to manipulate AMM prices
2. Execute large swap to move price
3. Hold position across TWAP window blocks
4. Exploit protocol using manipulated TWAP
5. Reverse position to recover capital

**Vulnerable pattern:**
```rust
// VULNERABLE: Short TWAP window on AMM oracle
pub fn get_twap_price(pool: &Account<Pool>, window_slots: u64) -> Result<u64> {
    require!(window_slots >= 10, ErrorCode::WindowTooShort); // Only 4 seconds!

    let mut sum: u128 = 0;
    for slot in (clock.slot - window_slots)..clock.slot {
        sum += pool.price_history[slot as usize] as u128;
    }

    Ok((sum / window_slots as u128) as u64)
}
```

**Safe pattern:**
```rust
// SAFE: Long TWAP + confidence intervals + circuit breakers
pub fn get_validated_price(
    pyth_oracle: &Account<PriceAccount>,
    amm_oracle: &Account<Pool>,
) -> Result<u64> {
    // Use Pyth as primary (off-chain aggregated data)
    let pyth_price = pyth_oracle.get_current_price()?;

    // Validate confidence interval
    require!(
        pyth_oracle.conf < pyth_price.price / 100, // <1% confidence
        ErrorCode::ConfidenceTooWide
    );

    // Use AMM TWAP as secondary with long window
    let amm_twap = amm_oracle.get_twap(SLOTS_PER_HOUR)?; // 1 hour = 9000 slots

    // Prices must be within 5% tolerance
    let deviation = if pyth_price.price > amm_twap {
        (pyth_price.price - amm_twap) * 100 / amm_twap
    } else {
        (amm_twap - pyth_price.price) * 100 / amm_twap
    };

    require!(deviation < 5, ErrorCode::OracleDivergence);

    // Return conservative price (worse for user)
    Ok(std::cmp::min(pyth_price.price, amm_twap))
}
```

**Detection strategy:**
- Monitor for large AMM swaps followed by protocol interactions
- Track oracle price deviations from external CEX prices
- Alert on confidence interval widening
- Flag transactions spanning multiple blocks with price impact

**Historical examples:**
- Mango Markets (October 2022): TWAP manipulation via large perpetual positions
- Various AMM oracle manipulations on Ethereum (Harvest Finance, Warp Finance)

**Root cause:** Insufficient TWAP window or reliance on manipulatable on-chain prices
**Severity:** CRITICAL

---

### 3. Pyth Confidence Interval Bypass

**Category:** DeFi Pattern

**Description:**
Pyth oracles provide confidence intervals indicating price uncertainty. Attackers exploit protocols that don't validate confidence, executing trades during high-volatility periods when confidence is wide.

**Solana-specific context:**
- Pyth is dominant oracle on Solana, used by most DeFi protocols
- Confidence intervals widen during market volatility or low liquidity
- Some protocols ignore confidence checks for UX reasons
- Network congestion can delay oracle updates, widening confidence

**Mechanism:**
1. Wait for market volatility event (liquidation cascade, exchange outage)
2. Monitor for wide Pyth confidence intervals
3. Execute trades at stale or uncertain prices
4. Profit from price slippage when confidence narrows

**Vulnerable pattern:**
```rust
// VULNERABLE: No confidence interval validation
pub fn execute_swap(ctx: Context<Swap>, amount_in: u64) -> Result<()> {
    let price_data = ctx.accounts.pyth_price.try_deserialize_unchecked::<Price>()?;

    // Using price without checking confidence!
    let price = price_data.agg.price;
    let amount_out = amount_in * price;

    // Execute swap
    Ok(())
}
```

**Safe pattern:**
```rust
// SAFE: Strict confidence validation with circuit breaker
use pyth_sdk_solana::state::Price;

pub fn execute_swap(ctx: Context<Swap>, amount_in: u64, max_age_slots: u64) -> Result<()> {
    let price_account = &ctx.accounts.pyth_price;
    let price_data = price_account.try_deserialize::<Price>()?;
    let clock = Clock::get()?;

    // Check price is recent
    let age = clock.unix_timestamp - price_data.timestamp;
    require!(age < max_age_slots as i64 * 400, ErrorCode::PriceStale);

    // Check confidence interval < 1% of price
    let confidence_pct = (price_data.conf as u128 * 10000) / price_data.agg.price as u128;
    require!(confidence_pct < 100, ErrorCode::ConfidenceTooWide); // < 1%

    // Check price status
    require!(
        price_data.agg.status == PriceStatus::Trading,
        ErrorCode::PriceNotTrading
    );

    // Circuit breaker: check price movement
    let prev_price = ctx.accounts.market.last_price;
    let price_change_pct = if price_data.agg.price > prev_price {
        ((price_data.agg.price - prev_price) as u128 * 100) / prev_price as u128
    } else {
        ((prev_price - price_data.agg.price) as u128 * 100) / prev_price as u128
    };

    require!(price_change_pct < 10, ErrorCode::PriceMovedTooMuch); // < 10% move

    Ok(())
}
```

**Detection strategy:**
- Monitor Pyth confidence intervals across protocol interactions
- Flag trades executed when confidence > 1% of price
- Alert on stale price usage (timestamp > 60 seconds old)
- Track correlation between wide confidence and liquidations

**Historical examples:**
- Multiple protocols exploited during FTX collapse (November 2022) when Pyth confidence widened
- USDC depeg event (March 2023): protocols with confidence checks avoided losses

**Root cause:** Missing or insufficient confidence interval validation
**Severity:** HIGH

---

### 4. Jito MEV Sandwich Attacks

**Category:** DeFi Pattern

**Description:**
Sandwich attacks involve front-running user trades with buy orders, then back-running with sell orders to profit from induced price slippage. Jito bundles enable guaranteed atomic execution on Solana.

**Solana-specific context:**
- Jito allows validators to accept transaction bundles with guaranteed ordering
- Unlike Ethereum, Solana doesn't have public mempool, but Jito creates similar dynamics
- ~60% of validators run Jito-Solana, making MEV infrastructure prevalent
- Lower fees make smaller sandwich attacks economically viable

**Mechanism:**
1. Monitor pending user swap transactions (via Jito mempool)
2. Submit bundle: [frontrun buy, victim swap, backrun sell]
3. Pay tip to validator for bundle inclusion
4. Extract value from victim's price slippage

**Vulnerable pattern:**
```rust
// VULNERABLE: No slippage protection
pub fn swap(ctx: Context<Swap>, amount_in: u64) -> Result<()> {
    let pool = &mut ctx.accounts.pool;

    // Calculate output using constant product formula
    let amount_out = (pool.reserve_out * amount_in) / (pool.reserve_in + amount_in);

    // Execute swap without minimum output check!
    pool.reserve_in += amount_in;
    pool.reserve_out -= amount_out;

    token::transfer(/* ... */)?;

    Ok(())
}
```

**Safe pattern:**
```rust
// SAFE: Strict slippage limits + deadline + private relay option
pub fn swap(
    ctx: Context<Swap>,
    amount_in: u64,
    min_amount_out: u64, // User-specified minimum
    deadline: i64,
) -> Result<()> {
    let clock = Clock::get()?;
    let pool = &mut ctx.accounts.pool;

    // Check deadline
    require!(clock.unix_timestamp <= deadline, ErrorCode::SwapExpired);

    // Calculate output
    let amount_out = (pool.reserve_out as u128 * amount_in as u128)
        / (pool.reserve_in as u128 + amount_in as u128);
    let amount_out = amount_out as u64;

    // Enforce minimum output (slippage protection)
    require!(amount_out >= min_amount_out, ErrorCode::SlippageExceeded);

    // Additional: limit per-swap price impact to 1%
    let price_impact = (amount_in as u128 * 10000) / pool.reserve_in as u128;
    require!(price_impact < 100, ErrorCode::PriceImpactTooHigh);

    pool.reserve_in += amount_in;
    pool.reserve_out -= amount_out;

    Ok(())
}
```

**Detection strategy:**
- Analyze Jito bundles for sandwich patterns (buy-victim-sell sequences)
- Monitor for transactions with zero/high slippage tolerance
- Track MEV extraction per pool over time
- Flag validators with high sandwich bundle inclusion rates

**Historical examples:**
- Widespread sandwich attacks on Jupiter, Raydium, Orca DEXs
- Research shows 2-5% of swap volume affected by MEV on Solana (lower than Ethereum's 10%+)

**Root cause:** Lack of slippage protection and transaction privacy
**Severity:** MEDIUM (user loss, not protocol risk)

---

### 5. JIT (Just-In-Time) Liquidity Attacks

**Category:** DeFi Pattern

**Description:**
Liquidity providers add concentrated liquidity immediately before large swaps, then remove it after, extracting fees without providing lasting liquidity or taking inventory risk.

**Solana-specific context:**
- Orca Whirlpools (concentrated liquidity) vulnerable to JIT
- Solana's fast finality (400ms) enables same-slot JIT attacks
- Jito bundles make JIT atomically guaranteed: [add liquidity, user swap, remove liquidity]
- Lower gas fees make JIT profitable on smaller trades

**Mechanism:**
1. Detect incoming large swap (via Jito mempool or on-chain signals)
2. Add concentrated liquidity in tight range around current price
3. User swap executes, paying fees to JIT provider
4. Remove liquidity immediately after
5. Repeat without capital at risk

**Vulnerable pattern:**
```rust
// VULNERABLE: Allows same-slot deposit and withdrawal
pub fn add_liquidity(ctx: Context<AddLiquidity>, amount: u64) -> Result<()> {
    let position = &mut ctx.accounts.position;
    let clock = Clock::get()?;

    position.liquidity += amount;
    position.last_update = clock.slot; // Can withdraw same slot!

    Ok(())
}

pub fn remove_liquidity(ctx: Context<RemoveLiquidity>, amount: u64) -> Result<()> {
    let position = &mut ctx.accounts.position;

    // No time lock!
    position.liquidity -= amount;

    Ok(())
}
```

**Safe pattern:**
```rust
// SAFE: Minimum liquidity duration + fee rebate delay
const MIN_LIQUIDITY_SLOTS: u64 = 2700; // ~18 minutes

pub fn add_liquidity(ctx: Context<AddLiquidity>, amount: u64) -> Result<()> {
    let position = &mut ctx.accounts.position;
    let clock = Clock::get()?;

    position.liquidity += amount;
    position.locked_until_slot = clock.slot + MIN_LIQUIDITY_SLOTS;

    Ok(())
}

pub fn remove_liquidity(ctx: Context<RemoveLiquidity>, amount: u64) -> Result<()> {
    let position = &mut ctx.accounts.position;
    let clock = Clock::get()?;

    // Enforce time lock
    require!(
        clock.slot >= position.locked_until_slot,
        ErrorCode::LiquidityStillLocked
    );

    position.liquidity -= amount;

    Ok(())
}

pub fn claim_fees(ctx: Context<ClaimFees>) -> Result<()> {
    let position = &mut ctx.accounts.position;
    let clock = Clock::get()?;

    // Fees claimable only after delay (prevents JIT fee extraction)
    require!(
        clock.slot >= position.last_fee_update + MIN_LIQUIDITY_SLOTS,
        ErrorCode::FeesNotVested
    );

    // Pay out fees
    Ok(())
}
```

**Detection strategy:**
- Monitor for add_liquidity -> swap -> remove_liquidity patterns in same transaction/bundle
- Track liquidity duration per position
- Calculate fee extraction efficiency (fees earned / time at risk)
- Flag positions with >90% of fees earned in <1% of liquidity duration

**Historical examples:**
- Widespread JIT on Uniswap v3 (Ethereum)
- Orca Whirlpools experiences similar behavior on Solana

**Root cause:** No minimum liquidity duration requirement
**Severity:** MEDIUM (reduces LP returns, harms protocol competitiveness)

---

### 6. Price Impact Amplification (Multi-Pool Routing)

**Category:** DeFi Pattern

**Description:**
Attackers exploit aggregator routing logic to amplify price impact across multiple pools, causing greater slippage than single-pool swaps and profiting from the inefficiency.

**Solana-specific context:**
- Jupiter aggregator routes across 20+ DEXs on Solana
- Multi-hop swaps (A->B->C) can have compounding price impact
- Attackers manipulate one pool in route to affect final output
- Cross-program invocation depth limits (4) constrain routing complexity

**Mechanism:**
1. Identify aggregator route using multiple pools
2. Front-run with trade in first pool to increase price impact
3. Victim's aggregated swap executes with amplified slippage
4. Back-run to extract profit

**Vulnerable pattern:**
```rust
// VULNERABLE: No total price impact check across route
pub fn execute_route(ctx: Context<ExecuteRoute>, route: Vec<PoolSwap>) -> Result<()> {
    let mut amount = ctx.accounts.user.amount_in;

    for swap in route {
        // Execute each hop
        amount = swap_pool(swap.pool, amount)?;
        // No aggregate price impact check!
    }

    // Final amount might be way below expectation
    Ok(())
}
```

**Safe pattern:**
```rust
// SAFE: Aggregate price impact limit + simulation check
pub fn execute_route(
    ctx: Context<ExecuteRoute>,
    route: Vec<PoolSwap>,
    min_amount_out: u64,
    max_total_impact_bps: u16, // Max 100 = 1%
) -> Result<()> {
    let initial_amount = ctx.accounts.user.amount_in;
    let mut amount = initial_amount;
    let mut total_impact_bps: u16 = 0;

    // Simulate route first
    let simulated_output = simulate_route(&route, initial_amount)?;
    require!(
        simulated_output >= min_amount_out,
        ErrorCode::SimulationFailed
    );

    for swap in route.iter() {
        let pool = &swap.pool;
        let pre_price = calculate_price(pool)?;

        // Execute swap
        let amount_out = swap_pool(pool, amount)?;

        // Calculate this hop's price impact
        let post_price = calculate_price(pool)?;
        let hop_impact = calculate_impact_bps(pre_price, post_price);

        total_impact_bps += hop_impact;
        amount = amount_out;
    }

    // Check aggregate impact
    require!(
        total_impact_bps <= max_total_impact_bps,
        ErrorCode::PriceImpactTooHigh
    );

    // Check final output
    require!(amount >= min_amount_out, ErrorCode::SlippageExceeded);

    Ok(())
}
```

**Detection strategy:**
- Monitor multi-hop routes for excessive price impact
- Compare simulated vs actual output on aggregated swaps
- Flag routes where impact sum > 2x individual impacts
- Track MEV extraction on routed trades

**Historical examples:**
- Jupiter routing manipulation reports (ongoing issue)
- Similar attacks on 1inch and other aggregators on Ethereum

**Root cause:** No aggregate price impact validation across routing hops
**Severity:** MEDIUM

---

### 7. Liquidity Sniping on New Pools

**Category:** DeFi Pattern

**Description:**
Bots detect new liquidity pool creation and immediately execute large swaps to extract value before legitimate users can trade. Often combined with rug pulls.

**Solana-specific context:**
- Raydium and Orca pool creation transactions are public
- Bots monitor program logs for pool initialization
- Sub-second block times enable rapid sniping
- Common on meme coin launches and rug pulls

**Mechanism:**
1. Monitor for pool initialization transactions
2. Submit swap transaction immediately after pool creation
3. Buy large percentage of initial liquidity
4. Wait for organic buyers to pump price
5. Sell at profit (or pool creator rugs)

**Vulnerable pattern:**
```rust
// VULNERABLE: No initial liquidity lock or launch delay
pub fn initialize_pool(
    ctx: Context<InitializePool>,
    initial_reserve_a: u64,
    initial_reserve_b: u64,
) -> Result<()> {
    let pool = &mut ctx.accounts.pool;

    pool.reserve_a = initial_reserve_a;
    pool.reserve_b = initial_reserve_b;
    pool.is_active = true; // Immediately tradeable!

    msg!("Pool initialized"); // Snipers watching for this log

    Ok(())
}
```

**Safe pattern:**
```rust
// SAFE: Launch delay + initial liquidity lock + fair launch mechanism
pub fn initialize_pool(
    ctx: Context<InitializePool>,
    initial_reserve_a: u64,
    initial_reserve_b: u64,
    launch_delay_slots: u64,
) -> Result<()> {
    let pool = &mut ctx.accounts.pool;
    let clock = Clock::get()?;

    pool.reserve_a = initial_reserve_a;
    pool.reserve_b = initial_reserve_b;
    pool.is_active = false; // Not yet tradeable
    pool.launch_slot = clock.slot + launch_delay_slots;
    pool.creator_lp_locked_until = clock.slot + CREATOR_LP_LOCK_SLOTS;

    // Optional: fair launch mechanism (max buy per wallet)
    pool.initial_max_buy = initial_reserve_a / 100; // Max 1% per buyer initially

    Ok(())
}

pub fn activate_pool(ctx: Context<ActivatePool>) -> Result<()> {
    let pool = &mut ctx.accounts.pool;
    let clock = Clock::get()?;

    require!(clock.slot >= pool.launch_slot, ErrorCode::LaunchDelayNotMet);

    pool.is_active = true;

    Ok(())
}

pub fn swap(ctx: Context<Swap>, amount_in: u64) -> Result<()> {
    let pool = &ctx.accounts.pool;
    let clock = Clock::get()?;

    // Enforce fair launch buy limits for first hour
    if clock.slot < pool.launch_slot + FAIR_LAUNCH_SLOTS {
        let user_total = ctx.accounts.user_state.total_bought;
        require!(
            user_total + amount_in <= pool.initial_max_buy,
            ErrorCode::FairLaunchLimitExceeded
        );
    }

    Ok(())
}
```

**Detection strategy:**
- Monitor new pool creation transactions
- Track first 10 swaps after pool creation
- Flag if single wallet buys >10% of initial liquidity
- Correlate with subsequent rug pull patterns

**Historical examples:**
- Countless meme coin rug pulls on Solana (daily occurrence)
- Bonk, SAMO early trading (legitimate tokens but sniped)

**Root cause:** Immediate pool activation without launch protection
**Severity:** LOW (user protection, not protocol security)

---

### 8. Governance Flash Loan Attacks

**Category:** DeFi Pattern

**Description:**
Attackers use flash loans to temporarily acquire governance tokens, pass malicious proposals, then return the tokens before transaction ends.

**Solana-specific context:**
- Solana's SPL Governance program used by many DAOs
- Single-transaction voting possible if not protected
- Common pattern: flash borrow -> vote -> propose -> execute -> repay
- Lower than Ethereum due to less mature DeFi lending

**Mechanism:**
1. Flash borrow governance tokens from lending protocol
2. Deposit tokens to gain voting power
3. Submit and vote on malicious proposal in same transaction
4. If possible, execute proposal immediately
5. Withdraw tokens and repay loan

**Vulnerable pattern:**
```rust
// VULNERABLE: Immediate voting power on deposit
pub fn deposit_governance_tokens(
    ctx: Context<DepositGovernance>,
    amount: u64,
) -> Result<()> {
    let voter = &mut ctx.accounts.voter;

    voter.token_amount += amount;
    voter.voting_power = voter.token_amount; // Immediate voting power!

    token::transfer(/*...*/)?;

    Ok(())
}

pub fn cast_vote(ctx: Context<CastVote>, proposal_id: u64, vote: Vote) -> Result<()> {
    let voter = &ctx.accounts.voter;
    let proposal = &mut ctx.accounts.proposal;

    // No time lock check!
    proposal.tally[vote] += voter.voting_power;

    Ok(())
}
```

**Safe pattern:**
```rust
// SAFE: Voting power time lock + snapshot-based voting
const VOTING_POWER_DELAY_SLOTS: u64 = 27000; // ~3 hours

pub fn deposit_governance_tokens(
    ctx: Context<DepositGovernance>,
    amount: u64,
) -> Result<()> {
    let voter = &mut ctx.accounts.voter;
    let clock = Clock::get()?;

    voter.token_amount += amount;

    // Voting power granted after delay
    voter.pending_deposit_slot = clock.slot;

    token::transfer(/*...*/)?;

    Ok(())
}

pub fn activate_voting_power(ctx: Context<ActivateVotingPower>) -> Result<()> {
    let voter = &mut ctx.accounts.voter;
    let clock = Clock::get()?;

    require!(
        clock.slot >= voter.pending_deposit_slot + VOTING_POWER_DELAY_SLOTS,
        ErrorCode::VotingPowerNotActive
    );

    voter.voting_power = voter.token_amount;

    Ok(())
}

pub fn cast_vote(ctx: Context<CastVote>, proposal_id: u64, vote: Vote) -> Result<()> {
    let voter = &ctx.accounts.voter;
    let proposal = &mut ctx.accounts.proposal;
    let clock = Clock::get()?;

    // Use snapshot voting power (taken at proposal creation)
    let snapshot_power = get_voting_power_at_slot(
        voter,
        proposal.snapshot_slot,
    )?;

    // Ensure tokens were deposited before snapshot
    require!(
        voter.pending_deposit_slot + VOTING_POWER_DELAY_SLOTS < proposal.snapshot_slot,
        ErrorCode::TokensDepositedAfterSnapshot
    );

    proposal.tally[vote] += snapshot_power;

    Ok(())
}
```

**Detection strategy:**
- Monitor for large token deposits followed by votes in same transaction
- Track voting power activation timing
- Alert on proposals with sudden voting power spikes
- Flag same-transaction deposit->vote patterns

**Historical examples:**
- Beanstalk governance attack (Ethereum, April 2022): $181M via flash loan governance takeover
- Build Finance governance attack (February 2021)

**Root cause:** Immediate voting power on deposit without time lock
**Severity:** CRITICAL

---

### 9. Liquidation Front-Running

**Category:** DeFi Pattern

**Description:**
Bots monitor for positions approaching liquidation threshold, front-run liquidators to capture liquidation bonuses by executing liquidation first.

**Solana-specific context:**
- Solend, MarginFi, Mango have liquidation incentives (5-10% bonus)
- Public transaction visibility enables front-running
- Jito bundles allow guaranteed liquidation ordering
- Keeper bots compete for liquidation MEV

**Mechanism:**
1. Monitor lending positions approaching health factor < 1
2. Detect liquidator transaction in mempool
3. Front-run with higher priority fee or Jito tip
4. Execute liquidation first, capture bonus
5. Liquidator's transaction fails (position already liquidated)

**Vulnerable pattern:**
```rust
// VULNERABLE: Fixed liquidation bonus creates MEV competition
pub fn liquidate(ctx: Context<Liquidate>, amount: u64) -> Result<()> {
    let position = &ctx.accounts.position;
    let oracle_price = ctx.accounts.oracle.get_price()?;

    let health_factor = calculate_health(position, oracle_price)?;
    require!(health_factor < 1.0, ErrorCode::PositionHealthy);

    // Fixed 10% liquidation bonus
    let collateral_value = amount * oracle_price;
    let liquidator_bonus = collateral_value * 110 / 100;

    // Transfer bonus to liquidator
    // This creates MEV worth racing for!

    Ok(())
}
```

**Safe pattern:**
```rust
// SAFE: Dynamic bonus + partial liquidation + liquidator queue
pub fn liquidate(
    ctx: Context<Liquidate>,
    max_amount: u64,
) -> Result<()> {
    let position = &mut ctx.accounts.position;
    let oracle_price = ctx.accounts.oracle.get_price()?;

    let health_factor = calculate_health(position, oracle_price)?;
    require!(health_factor < 1.0, ErrorCode::PositionHealthy);

    // Dynamic bonus based on health factor (lower health = higher bonus)
    let bonus_bps = if health_factor < 0.5 {
        1000 // 10% if severely underwater
    } else if health_factor < 0.8 {
        500 // 5% if moderately underwater
    } else {
        200 // 2% if slightly underwater
    };

    // Only liquidate enough to restore health to 1.2
    let amount_to_liquidate = calculate_partial_liquidation(
        position,
        oracle_price,
        TARGET_HEALTH_FACTOR,
    )?;
    let amount = std::cmp::min(amount_to_liquidate, max_amount);

    // Prioritize registered liquidators (reduces MEV)
    if ctx.accounts.liquidator_registry.is_some() {
        let registry = ctx.accounts.liquidator_registry.as_ref().unwrap();
        require!(
            registry.is_registered(&ctx.accounts.liquidator.key()),
            ErrorCode::UnregisteredLiquidator
        );
    }

    let collateral_value = amount * oracle_price;
    let liquidator_payment = collateral_value * (10000 + bonus_bps) / 10000;

    Ok(())
}
```

**Detection strategy:**
- Monitor for competing liquidation transactions on same position
- Track liquidator profitability and MEV extraction
- Flag liquidations with excessive Jito tips
- Analyze priority fee distribution among liquidators

**Historical examples:**
- Widespread on Solend, MarginFi during volatile markets
- Similar MEV dynamics as Ethereum liquidation bots (Aave, Compound)

**Root cause:** Predictable liquidation incentives create MEV opportunity
**Severity:** LOW (reduces liquidator competition but doesn't harm protocol)

---

### 10. Interest Rate Manipulation

**Category:** DeFi Pattern

**Description:**
Attackers manipulate lending pool utilization rates to extract value through interest rate swings, harming lenders or borrowers.

**Solana-specific context:**
- Solend, MarginFi, Drift use utilization-based interest rate curves
- Low liquidity pools more vulnerable to manipulation
- Flash loans enable single-transaction rate manipulation
- Smaller protocols more vulnerable than established ones

**Mechanism:**
1. Flash borrow large amount from external source
2. Deposit into target lending pool (lowers utilization → lowers rates)
3. Borrow maximum at low rate
4. Withdraw deposit (spikes utilization → spikes rates)
5. Wait for rate adjustment
6. Repay at favorable terms

**Vulnerable pattern:**
```rust
// VULNERABLE: Instant interest rate updates based on current utilization
pub fn calculate_borrow_rate(pool: &Pool) -> Result<u64> {
    let utilization = (pool.total_borrowed * 10000) / pool.total_deposited;

    // Rate updates instantly based on utilization
    let rate = if utilization < 8000 {
        // <80% utilization: low rate
        BASE_RATE + (utilization * RATE_SLOPE_1)
    } else {
        // >80% utilization: high rate (kink model)
        BASE_RATE + (8000 * RATE_SLOPE_1) + ((utilization - 8000) * RATE_SLOPE_2)
    };

    Ok(rate) // Can be manipulated within single transaction!
}
```

**Safe pattern:**
```rust
// SAFE: Time-weighted rate updates + rate change limits
pub fn update_interest_rate(pool: &mut Pool, clock: &Clock) -> Result<()> {
    let slots_elapsed = clock.slot - pool.last_rate_update_slot;

    // Only update rate every hour minimum
    require!(slots_elapsed >= SLOTS_PER_HOUR, ErrorCode::RateUpdateTooFrequent);

    // Calculate TWAP utilization over past hour
    let twap_utilization = pool.calculate_twap_utilization(SLOTS_PER_HOUR)?;

    // Calculate target rate based on TWAP utilization
    let target_rate = calculate_kink_rate(twap_utilization);

    // Limit rate change per update (prevents rate spiking)
    let max_rate_change = pool.current_rate / 10; // Max 10% change per update
    let new_rate = if target_rate > pool.current_rate {
        std::cmp::min(target_rate, pool.current_rate + max_rate_change)
    } else {
        std::cmp::max(target_rate, pool.current_rate - max_rate_change)
    };

    pool.current_rate = new_rate;
    pool.last_rate_update_slot = clock.slot;

    Ok(())
}

pub fn accrue_interest(pool: &mut Pool, clock: &Clock) -> Result<()> {
    let time_elapsed = clock.slot - pool.last_interest_accrual_slot;

    // Use stable rate for accrual, not manipulatable spot utilization
    let interest = (pool.total_borrowed as u128
        * pool.current_rate as u128
        * time_elapsed as u128)
        / (SLOTS_PER_YEAR as u128 * 10000);

    pool.total_borrowed += interest as u64;
    pool.last_interest_accrual_slot = clock.slot;

    Ok(())
}
```

**Detection strategy:**
- Monitor utilization rate changes >20% in single slot
- Track correlated large deposits and borrows
- Alert on rate changes exceeding normal bounds
- Flag patterns: deposit -> borrow -> withdraw in same transaction

**Historical examples:**
- Euler Finance hack (Ethereum, March 2023): $200M, involved interest rate manipulation
- Various smaller protocols exploited via rate manipulation

**Root cause:** Instant rate updates based on manipulatable utilization
**Severity:** HIGH

---

