# Solana/Anchor Secure Patterns Reference

**Last Updated:** 2025-01-XX
**Confidence Level:** MEDIUM (based on training data, requires verification with current documentation)

This reference covers critical security patterns for Solana/Anchor development across arithmetic safety, oracle integration, token handling, error handling, and timing safety.

---

## 6. Arithmetic Safety Patterns

### Pattern: Safe Addition with Overflow Protection

**Category:** Arithmetic

**Purpose:**
Prevent integer overflow when adding token amounts, prices, or accumulated values.

**The Secure Way:**
```rust
// SAFE: Using checked_add prevents overflow panics
use anchor_lang::prelude::*;

pub fn safe_deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
    let vault = &mut ctx.accounts.vault;

    vault.total_deposits = vault.total_deposits
        .checked_add(amount)
        .ok_or(ErrorCode::MathOverflow)?;

    Ok(())
}
```

**Common Mistakes:**
```rust
// DANGEROUS: Unchecked addition can overflow
vault.total_deposits = vault.total_deposits + amount; // Panics on overflow

// DANGEROUS: Using wrapping_add silently wraps
vault.total_deposits = vault.total_deposits.wrapping_add(amount); // Wrong result
```

**Why the secure version works:**
- `checked_add` returns `None` on overflow instead of panicking
- `.ok_or()` converts `None` to a custom error
- Transaction fails gracefully with descriptive error
- Prevents attackers from causing overflows to reset balances

**Checklist:**
- [ ] All arithmetic operations use `checked_*` methods
- [ ] Error handling converts `None` to custom error codes
- [ ] No direct `+`, `-`, `*`, `/` operators on financial values
- [ ] Test cases cover boundary values (u64::MAX - 1, etc.)

---

### Pattern: Safe Subtraction with Underflow Protection

**Category:** Arithmetic

**Purpose:**
Prevent integer underflow when withdrawing tokens or decrementing balances.

**The Secure Way:**
```rust
// SAFE: checked_sub prevents underflow
pub fn safe_withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
    let vault = &mut ctx.accounts.vault;

    vault.total_deposits = vault.total_deposits
        .checked_sub(amount)
        .ok_or(ErrorCode::InsufficientFunds)?;

    Ok(())
}
```

**Common Mistakes:**
```rust
// DANGEROUS: Unchecked subtraction panics on underflow
vault.total_deposits = vault.total_deposits - amount;

// DANGEROUS: Saturating sub hides the error
vault.total_deposits = vault.total_deposits.saturating_sub(amount);
```

**Why the secure version works:**
- Returns `None` if result would be negative
- Forces explicit error handling
- Prevents balance underflow attacks
- Clear error message to users

**Checklist:**
- [ ] All subtractions use `checked_sub`
- [ ] Error code clearly indicates insufficient balance
- [ ] Balance checks happen before state changes
- [ ] No silent failures with saturating operations

---

### Pattern: Safe Multiplication with Intermediate Widening

**Category:** Arithmetic

**Purpose:**
Prevent overflow when multiplying values, especially for fee or interest calculations.

**The Secure Way:**
```rust
// SAFE: Widen to u128 before multiplication, then downcast
pub fn calculate_fee(amount: u64, fee_bps: u64) -> Result<u64> {
    const BPS_DENOMINATOR: u128 = 10000;

    let amount_u128 = amount as u128;
    let fee_bps_u128 = fee_bps as u128;

    let fee_u128 = amount_u128
        .checked_mul(fee_bps_u128)
        .ok_or(ErrorCode::MathOverflow)?
        .checked_div(BPS_DENOMINATOR)
        .ok_or(ErrorCode::MathOverflow)?;

    u64::try_from(fee_u128).map_err(|_| ErrorCode::MathOverflow.into())
}
```

**Common Mistakes:**
```rust
// DANGEROUS: Intermediate overflow before division
let fee = (amount * fee_bps) / 10000; // Overflows if amount * fee_bps > u64::MAX

// DANGEROUS: Division before multiplication loses precision
let fee = (amount / 10000) * fee_bps; // Rounds down too early
```

**Why the secure version works:**
- u128 provides headroom for intermediate multiplication
- Multiply before divide preserves precision
- Explicit downcast with error handling
- Prevents both overflow and precision loss

**Checklist:**
- [ ] Intermediate calculations use u128 or wider
- [ ] Multiply before divide for percentage calculations
- [ ] Final result safely downcasted with try_from
- [ ] Test with maximum input values

---

### Pattern: Safe Basis Point Calculations

**Category:** Arithmetic

**Purpose:**
Calculate percentages/fees expressed in basis points (1 bps = 0.01%) without precision loss.

**The Secure Way:**
```rust
// SAFE: Proper basis point calculation with overflow protection
pub fn apply_fee(amount: u64, fee_bps: u16) -> Result<(u64, u64)> {
    const MAX_BPS: u16 = 10000;
    require!(fee_bps <= MAX_BPS, ErrorCode::InvalidFeeBps);

    let amount_u128 = amount as u128;
    let fee_bps_u128 = fee_bps as u128;

    let fee = amount_u128
        .checked_mul(fee_bps_u128)
        .ok_or(ErrorCode::MathOverflow)?
        .checked_div(10000)
        .ok_or(ErrorCode::MathOverflow)?;

    let fee_u64 = u64::try_from(fee).map_err(|_| ErrorCode::MathOverflow)?;
    let remaining = amount.checked_sub(fee_u64).ok_or(ErrorCode::MathOverflow)?;

    Ok((fee_u64, remaining))
}
```

**Common Mistakes:**
```rust
// DANGEROUS: No validation of fee_bps range
let fee = (amount * fee_bps as u64) / 10000; // fee_bps could be > 10000

// DANGEROUS: Division before multiplication
let fee = (amount / 10000) * fee_bps as u64; // Precision loss
```

**Why the secure version works:**
- Validates fee_bps is within valid range (0-10000)
- Uses u128 to prevent intermediate overflow
- Returns both fee and remaining amount
- Multiply-before-divide preserves precision

**Checklist:**
- [ ] Basis points validated to be <= 10000
- [ ] Intermediate calculations use u128
- [ ] Multiply before divide
- [ ] Both fee and remaining amounts returned

---

### Pattern: Safe Decimal Precision Scaling

**Category:** Arithmetic

**Purpose:**
Convert between different decimal precisions (e.g., USDC 6 decimals to SOL 9 decimals) safely.

**The Secure Way:**
```rust
// SAFE: Scale between decimal precisions with overflow checks
pub fn scale_amount(
    amount: u64,
    from_decimals: u8,
    to_decimals: u8,
) -> Result<u64> {
    if from_decimals == to_decimals {
        return Ok(amount);
    }

    if from_decimals < to_decimals {
        // Scale up: multiply
        let scale_factor = 10u128.pow((to_decimals - from_decimals) as u32);
        let scaled = (amount as u128)
            .checked_mul(scale_factor)
            .ok_or(ErrorCode::MathOverflow)?;
        u64::try_from(scaled).map_err(|_| ErrorCode::MathOverflow.into())
    } else {
        // Scale down: divide
        let scale_factor = 10u64.pow((from_decimals - to_decimals) as u32);
        amount.checked_div(scale_factor).ok_or(ErrorCode::MathOverflow.into())
    }
}
```

**Common Mistakes:**
```rust
// DANGEROUS: Unchecked power operation
let scaled = amount * 10u64.pow(decimal_diff as u32); // Can overflow

// DANGEROUS: Incorrect scaling direction
let scaled = amount / 10u64.pow(decimal_diff as u32); // Wrong direction
```

**Why the secure version works:**
- Explicitly handles both scale-up and scale-down cases
- Uses u128 for scale-up to prevent overflow
- Checked operations throughout
- Validates result fits in target type

**Checklist:**
- [ ] Decimal difference calculated correctly
- [ ] Scale-up uses wider integer type
- [ ] Power operations bounded (decimals typically < 20)
- [ ] Direction (multiply vs divide) matches scaling direction

---

### Pattern: Safe Price Calculations with Oracle Decimals

**Category:** Arithmetic

**Purpose:**
Calculate USD values or swap amounts using oracle prices with different decimal formats.

**The Secure Way:**
```rust
// SAFE: Calculate USD value accounting for both token and price decimals
pub fn calculate_usd_value(
    token_amount: u64,
    token_decimals: u8,
    price: i64,           // Oracle price
    price_expo: i32,      // Oracle exponent (typically negative)
) -> Result<u64> {
    require!(price > 0, ErrorCode::InvalidPrice);

    let token_amount_u128 = token_amount as u128;
    let price_u128 = price as u128;

    // Multiply first to maintain precision
    let value_raw = token_amount_u128
        .checked_mul(price_u128)
        .ok_or(ErrorCode::MathOverflow)?;

    // Adjust for oracle exponent (typically negative, e.g., -8)
    let adjusted_expo = (token_decimals as i32) + price_expo;

    let value = if adjusted_expo >= 0 {
        value_raw
            .checked_mul(10u128.pow(adjusted_expo as u32))
            .ok_or(ErrorCode::MathOverflow)?
    } else {
        value_raw
            .checked_div(10u128.pow((-adjusted_expo) as u32))
            .ok_or(ErrorCode::MathOverflow)?
    };

    u64::try_from(value).map_err(|_| ErrorCode::MathOverflow.into())
}
```

**Common Mistakes:**
```rust
// DANGEROUS: Ignoring oracle exponent
let value = token_amount * (price as u64); // Wrong scale

// DANGEROUS: Divide before multiply
let value = (token_amount / 10u64.pow(token_decimals as u32)) * price; // Precision loss
```

**Why the secure version works:**
- Accounts for both token decimals and oracle exponent
- Multiplies before adjusting decimals
- Handles both positive and negative exponents
- Validates price is positive

**Checklist:**
- [ ] Oracle price validated as positive
- [ ] Both token decimals and price exponent accounted for
- [ ] Multiplication happens before decimal adjustment
- [ ] Exponent sign handled correctly

---

### Pattern: Safe LP Token Mint Calculation

**Category:** Arithmetic

**Purpose:**
Calculate LP tokens to mint when users deposit to a liquidity pool without rounding errors or exploits.

**The Secure Way:**
```rust
// SAFE: LP token mint with proper rounding and overflow protection
pub fn calculate_lp_tokens_to_mint(
    deposit_amount: u64,
    pool_total_value: u64,
    lp_token_supply: u64,
) -> Result<u64> {
    // First deposit: 1:1 ratio
    if lp_token_supply == 0 {
        require!(pool_total_value == 0, ErrorCode::InvalidPoolState);
        return Ok(deposit_amount);
    }

    require!(pool_total_value > 0, ErrorCode::InvalidPoolState);

    // LP tokens = (deposit_amount * lp_token_supply) / pool_total_value
    let deposit_u128 = deposit_amount as u128;
    let supply_u128 = lp_token_supply as u128;
    let pool_value_u128 = pool_total_value as u128;

    let lp_tokens = deposit_u128
        .checked_mul(supply_u128)
        .ok_or(ErrorCode::MathOverflow)?
        .checked_div(pool_value_u128)
        .ok_or(ErrorCode::MathOverflow)?;

    let lp_tokens_u64 = u64::try_from(lp_tokens)
        .map_err(|_| ErrorCode::MathOverflow)?;

    // Prevent zero-value deposits
    require!(lp_tokens_u64 > 0, ErrorCode::DepositTooSmall);

    Ok(lp_tokens_u64)
}
```

**Common Mistakes:**
```rust
// DANGEROUS: Division before multiplication
let lp_tokens = (deposit_amount / pool_total_value) * lp_token_supply; // Rounds to zero

// DANGEROUS: No zero-value check
// Allows attacker to deposit without receiving LP tokens, inflating pool value

// DANGEROUS: Not handling first deposit
let lp_tokens = (deposit_amount * lp_token_supply) / pool_total_value; // Divide by zero
```

**Why the secure version works:**
- Special handling for first deposit (supply = 0)
- Multiply before divide to preserve precision
- Prevents zero LP token mints (donation attack)
- All arithmetic is checked

**Checklist:**
- [ ] First deposit handled separately
- [ ] Multiply before divide
- [ ] Result validated as non-zero
- [ ] Pool state consistency checks

---

### Pattern: Safe Interest Rate Calculation

**Category:** Arithmetic

**Purpose:**
Calculate accrued interest over time without precision loss or overflow.

**The Secure Way:**
```rust
// SAFE: Compound interest with fixed-point arithmetic
pub fn calculate_interest(
    principal: u64,
    annual_rate_bps: u64,  // Annual rate in basis points
    seconds_elapsed: u64,
) -> Result<u64> {
    const SECONDS_PER_YEAR: u128 = 365 * 24 * 60 * 60;
    const BPS_DENOMINATOR: u128 = 10000;

    let principal_u128 = principal as u128;
    let rate_u128 = annual_rate_bps as u128;
    let time_u128 = seconds_elapsed as u128;

    // Simple interest formula: principal * rate * time / (BPS_DENOMINATOR * SECONDS_PER_YEAR)
    let interest = principal_u128
        .checked_mul(rate_u128)
        .ok_or(ErrorCode::MathOverflow)?
        .checked_mul(time_u128)
        .ok_or(ErrorCode::MathOverflow)?
        .checked_div(BPS_DENOMINATOR)
        .ok_or(ErrorCode::MathOverflow)?
        .checked_div(SECONDS_PER_YEAR)
        .ok_or(ErrorCode::MathOverflow)?;

    u64::try_from(interest).map_err(|_| ErrorCode::MathOverflow.into())
}
```

**Common Mistakes:**
```rust
// DANGEROUS: Using f64 for financial calculations
let interest = (principal as f64) * (rate as f64) * (time as f64); // Precision loss

// DANGEROUS: Incorrect order of operations
let interest = (principal * time) / SECONDS_PER_YEAR * rate / 10000; // Early rounding
```

**Why the secure version works:**
- Integer-only math (no floating point)
- Multiplications before divisions
- u128 intermediate to prevent overflow
- Constants clearly defined

**Checklist:**
- [ ] No floating-point operations
- [ ] Time constants accurate (365 days, leap years if needed)
- [ ] Multiply before divide
- [ ] Rate denominator matches precision

---

### Pattern: Safe Rounding Direction Control

**Category:** Arithmetic

**Purpose:**
Control rounding direction to favor the protocol in calculations (round down for withdrawals, round up for deposits).

**The Secure Way:**
```rust
// SAFE: Explicit rounding direction control
pub fn divide_round_up(numerator: u128, denominator: u128) -> Result<u128> {
    require!(denominator > 0, ErrorCode::DivisionByZero);

    let quotient = numerator
        .checked_div(denominator)
        .ok_or(ErrorCode::MathOverflow)?;

    let remainder = numerator
        .checked_rem(denominator)
        .ok_or(ErrorCode::MathOverflow)?;

    if remainder > 0 {
        quotient.checked_add(1).ok_or(ErrorCode::MathOverflow.into())
    } else {
        Ok(quotient)
    }
}

pub fn divide_round_down(numerator: u128, denominator: u128) -> Result<u128> {
    require!(denominator > 0, ErrorCode::DivisionByZero);
    numerator.checked_div(denominator).ok_or(ErrorCode::MathOverflow.into())
}

// Use in context: withdraw rounds down (favors protocol)
pub fn calculate_withdrawal(shares: u64, total_shares: u64, total_assets: u64) -> Result<u64> {
    let shares_u128 = shares as u128;
    let total_shares_u128 = total_shares as u128;
    let total_assets_u128 = total_assets as u128;

    let amount = shares_u128
        .checked_mul(total_assets_u128)
        .ok_or(ErrorCode::MathOverflow)?;

    let result = divide_round_down(amount, total_shares_u128)?;
    u64::try_from(result).map_err(|_| ErrorCode::MathOverflow.into())
}
```

**Common Mistakes:**
```rust
// DANGEROUS: Inconsistent rounding (sometimes favors user, sometimes protocol)
let amount = (shares * total_assets) / total_shares; // Default truncation

// DANGEROUS: Always rounding up (allows value extraction)
let amount = ((shares * total_assets) + total_shares - 1) / total_shares;
```

**Why the secure version works:**
- Explicit control over rounding direction
- Withdrawals round down (users get slightly less)
- Deposits round up (users pay slightly more)
- Prevents economic attacks via rounding

**Checklist:**
- [ ] Rounding direction documented per operation
- [ ] Withdrawals/burns round down
- [ ] Deposits/mints round up (if charging users)
- [ ] Rounding consistent across related operations

---

## 7. Oracle Integration Patterns

### Pattern: Safe Pyth Oracle Price Reading

**Category:** Oracle

**Purpose:**
Read prices from Pyth oracle with proper staleness, confidence, and exponent handling.

**The Secure Way:**
```rust
// SAFE: Complete Pyth oracle integration with all safety checks
use pyth_sdk_solana::load_price_feed_from_account_info;
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct ReadPythPrice<'info> {
    /// CHECK: Validated by Pyth SDK
    pub pyth_price_account: AccountInfo<'info>,
}

pub fn get_pyth_price(
    pyth_account: &AccountInfo,
    max_age_seconds: u64,
    max_confidence_bps: u64,  // Max confidence as % of price (in bps)
) -> Result<(i64, i32)> {
    let price_feed = load_price_feed_from_account_info(pyth_account)
        .map_err(|_| ErrorCode::InvalidPythAccount)?;

    let price_data = price_feed
        .get_current_price()
        .ok_or(ErrorCode::PythPriceUnavailable)?;

    // Check 1: Price staleness
    let clock = Clock::get()?;
    let age = clock.unix_timestamp - price_data.publish_time;
    require!(
        age >= 0 && (age as u64) <= max_age_seconds,
        ErrorCode::PythPriceStale
    );

    // Check 2: Price confidence
    let price_abs = price_data.price.abs();
    let max_confidence = (price_abs as u128)
        .checked_mul(max_confidence_bps as u128)
        .ok_or(ErrorCode::MathOverflow)?
        .checked_div(10000)
        .ok_or(ErrorCode::MathOverflow)?;

    require!(
        (price_data.conf as u128) <= max_confidence,
        ErrorCode::PythPriceLowConfidence
    );

    // Check 3: Price is positive (for asset prices)
    require!(price_data.price > 0, ErrorCode::InvalidPrice);

    Ok((price_data.price, price_data.expo))
}
```

**Common Mistakes:**
```rust
// DANGEROUS: No staleness check
let price = price_feed.get_current_price().unwrap().price;

// DANGEROUS: Ignoring confidence interval
// Price could be unreliable but still used

// DANGEROUS: Not handling exponent
let usd_value = token_amount * price; // Wrong scale
```

**Why the secure version works:**
- Validates price freshness using publish_time
- Checks confidence is within acceptable bounds
- Returns both price and exponent for proper scaling
- Fails gracefully if oracle data unavailable

**Checklist:**
- [ ] Staleness checked against max_age
- [ ] Confidence interval validated
- [ ] Price sign validated (positive for asset prices)
- [ ] Exponent returned and used in calculations
- [ ] All unwrap() replaced with proper error handling

---

### Pattern: Safe Switchboard Oracle Integration

**Category:** Oracle

**Purpose:**
Read prices from Switchboard V2 oracle with staleness and bounds checking.

**The Secure Way:**
```rust
// SAFE: Switchboard oracle with validation
use switchboard_v2::AggregatorAccountData;
use std::convert::TryInto;

pub fn get_switchboard_price(
    aggregator_account: &AccountInfo,
    max_staleness_slots: u64,
) -> Result<(i128, u32)> {
    let aggregator = AggregatorAccountData::new(aggregator_account)
        .map_err(|_| ErrorCode::InvalidSwitchboardAccount)?;

    let clock = Clock::get()?;

    // Check staleness
    let staleness = clock.slot - aggregator.latest_confirmed_round.round_open_slot;
    require!(
        staleness <= max_staleness_slots,
        ErrorCode::SwitchboardPriceStale
    );

    // Get price result
    let price_result = aggregator.get_result()
        .map_err(|_| ErrorCode::SwitchboardPriceUnavailable)?;

    // Validate price is within reasonable bounds
    require!(price_result > 0.0, ErrorCode::InvalidPrice);

    // Convert to fixed-point (i128 with implicit decimals)
    let decimals = aggregator.num_success as u32; // Or configured decimals
    let scale = 10i128.pow(decimals);
    let price_scaled = (price_result * scale as f64) as i128;

    Ok((price_scaled, decimals))
}
```

**Common Mistakes:**
```rust
// DANGEROUS: No staleness check
let price = aggregator.get_result().unwrap();

// DANGEROUS: Using f64 directly in calculations
let value = (amount as f64) * price; // Precision issues

// DANGEROUS: Not validating aggregator account
let aggregator = AggregatorAccountData::new(aggregator_account).unwrap();
```

**Why the secure version works:**
- Checks slot-based staleness
- Converts f64 to fixed-point for calculation
- Validates price is positive
- Proper error handling

**Checklist:**
- [ ] Staleness validated using slot difference
- [ ] Price converted from f64 to fixed-point
- [ ] Aggregator account validated
- [ ] Decimals/scale factor tracked

---

### Pattern: Oracle Price Sanity Bounds (Circuit Breakers)

**Category:** Oracle

**Purpose:**
Prevent oracle manipulation or failures from causing extreme price swings.

**The Secure Way:**
```rust
// SAFE: Circuit breaker with min/max price bounds
#[account]
pub struct PriceConfig {
    pub min_price: u64,       // Minimum acceptable price (e.g., $0.50 for stablecoin)
    pub max_price: u64,       // Maximum acceptable price (e.g., $1.50 for stablecoin)
    pub max_price_change_bps: u16,  // Max change per update (e.g., 500 = 5%)
    pub last_valid_price: u64,
    pub last_update_slot: u64,
}

pub fn validate_price_with_circuit_breaker(
    new_price: u64,
    config: &mut PriceConfig,
) -> Result<()> {
    let clock = Clock::get()?;

    // Check 1: Absolute bounds
    require!(
        new_price >= config.min_price && new_price <= config.max_price,
        ErrorCode::PriceOutOfBounds
    );

    // Check 2: Rate of change (if not first update)
    if config.last_update_slot > 0 {
        let last_price_u128 = config.last_valid_price as u128;
        let new_price_u128 = new_price as u128;

        let price_diff = if new_price > config.last_valid_price {
            new_price - config.last_valid_price
        } else {
            config.last_valid_price - new_price
        };

        let max_change = last_price_u128
            .checked_mul(config.max_price_change_bps as u128)
            .ok_or(ErrorCode::MathOverflow)?
            .checked_div(10000)
            .ok_or(ErrorCode::MathOverflow)?;

        require!(
            (price_diff as u128) <= max_change,
            ErrorCode::PriceChangeTooLarge
        );
    }

    // Update state
    config.last_valid_price = new_price;
    config.last_update_slot = clock.slot;

    Ok(())
}
```

**Common Mistakes:**
```rust
// DANGEROUS: No bounds checking
let price = oracle.get_price(); // Could be 0, u64::MAX, or manipulated

// DANGEROUS: No rate limiting
// Oracle manipulation could cause instant 100x price changes
```

**Why the secure version works:**
- Absolute min/max bounds prevent extreme values
- Rate limiting prevents sudden manipulation
- Historical price tracking for comparison
- Configurable parameters per asset

**Checklist:**
- [ ] Min/max bounds set per asset type
- [ ] Rate of change limited (e.g., 5-10% per update)
- [ ] Previous price stored for comparison
- [ ] Admin can update bounds if needed

---

### Pattern: Oracle Fallback and Aggregation

**Category:** Oracle

**Purpose:**
Use multiple oracle sources and fallback logic to improve reliability.

**The Secure Way:**
```rust
// SAFE: Multi-oracle with fallback
pub struct OraclePrice {
    pub price: u64,
    pub confidence: u8,  // 0-100
    pub source: OracleSource,
}

#[derive(PartialEq)]
pub enum OracleSource {
    Pyth,
    Switchboard,
    TWAP,
}

pub fn get_price_with_fallback(
    pyth_account: &AccountInfo,
    switchboard_account: &AccountInfo,
    twap_account: &Account<TWAPOracle>,
    max_price_deviation_bps: u64,
) -> Result<OraclePrice> {
    let mut prices = Vec::new();

    // Try Pyth (highest priority)
    if let Ok((pyth_price, pyth_expo)) = get_pyth_price(pyth_account, 60, 100) {
        let normalized = normalize_price(pyth_price, pyth_expo)?;
        prices.push((normalized, 90, OracleSource::Pyth));
    }

    // Try Switchboard
    if let Ok((sb_price, sb_decimals)) = get_switchboard_price(switchboard_account, 25) {
        let normalized = normalize_switchboard_price(sb_price, sb_decimals)?;
        prices.push((normalized, 85, OracleSource::Switchboard));
    }

    // Try TWAP (lowest priority but most manipulation-resistant)
    if let Ok(twap_price) = get_twap_price(twap_account) {
        prices.push((twap_price, 70, OracleSource::TWAP));
    }

    require!(!prices.is_empty(), ErrorCode::NoOracleDataAvailable);

    // If multiple sources, check deviation
    if prices.len() > 1 {
        let max_price = prices.iter().map(|(p, _, _)| p).max().unwrap();
        let min_price = prices.iter().map(|(p, _, _)| p).min().unwrap();

        let deviation = (max_price - min_price) as u128 * 10000 / (*min_price as u128);
        require!(
            deviation <= max_price_deviation_bps as u128,
            ErrorCode::OraclePriceDeviation
        );
    }

    // Return highest confidence price
    prices.sort_by_key(|(_, conf, _)| std::cmp::Reverse(*conf));
    let (price, confidence, source) = prices[0];

    Ok(OraclePrice { price, confidence, source })
}
```

**Common Mistakes:**
```rust
// DANGEROUS: Single oracle source
let price = get_pyth_price(...); // No fallback if Pyth is down

// DANGEROUS: No deviation checking between sources
// Oracles could disagree wildly
```

**Why the secure version works:**
- Multiple oracle sources increase reliability
- Deviation checking detects manipulation
- Prioritizes by confidence level
- Graceful degradation if sources fail

**Checklist:**
- [ ] At least 2 oracle sources
- [ ] Deviation threshold enforced if multiple sources available
- [ ] Clear prioritization logic
- [ ] Fails if all sources unavailable

---

### Pattern: Time-Weighted Average Price (TWAP) Calculation

**Category:** Oracle

**Purpose:**
Calculate manipulation-resistant TWAP from on-chain observations.

**The Secure Way:**
```rust
// SAFE: TWAP with overflow-safe accumulator
#[account]
pub struct TWAPOracle {
    pub price_cumulative: u128,      // Overflow-safe accumulator
    pub last_price: u64,
    pub last_update_timestamp: i64,
    pub observation_count: u64,
}

pub fn update_twap(
    oracle: &mut TWAPOracle,
    current_price: u64,
) -> Result<()> {
    let clock = Clock::get()?;

    // Time elapsed since last update
    let time_elapsed = clock.unix_timestamp
        .checked_sub(oracle.last_update_timestamp)
        .ok_or(ErrorCode::InvalidTimestamp)?;

    require!(time_elapsed >= 0, ErrorCode::InvalidTimestamp);

    // Add to cumulative (price * time)
    let price_time = (oracle.last_price as u128)
        .checked_mul(time_elapsed as u128)
        .ok_or(ErrorCode::MathOverflow)?;

    oracle.price_cumulative = oracle.price_cumulative
        .checked_add(price_time)
        .ok_or(ErrorCode::MathOverflow)?;

    // Update state
    oracle.last_price = current_price;
    oracle.last_update_timestamp = clock.unix_timestamp;
    oracle.observation_count = oracle.observation_count.checked_add(1)
        .ok_or(ErrorCode::MathOverflow)?;

    Ok(())
}

pub fn get_twap_price(
    oracle: &TWAPOracle,
    period_seconds: u64,
) -> Result<u64> {
    require!(period_seconds > 0, ErrorCode::InvalidPeriod);

    let clock = Clock::get()?;
    let elapsed_total = clock.unix_timestamp
        .checked_sub(oracle.last_update_timestamp)
        .ok_or(ErrorCode::InvalidTimestamp)?;

    // TWAP = price_cumulative / total_time
    let twap = oracle.price_cumulative
        .checked_div(period_seconds as u128)
        .ok_or(ErrorCode::MathOverflow)?;

    u64::try_from(twap).map_err(|_| ErrorCode::MathOverflow.into())
}
```

**Common Mistakes:**
```rust
// DANGEROUS: Using u64 for cumulative (overflows quickly)
pub price_cumulative: u64;

// DANGEROUS: Not accounting for time between updates
let avg_price = total_price / observation_count; // Treats all observations equally
```

**Why the secure version works:**
- u128 accumulator prevents overflow
- Time-weighted (longer periods have more weight)
- Manipulation requires sustained price deviation
- Simple to verify

**Checklist:**
- [ ] Accumulator uses u128 or wider
- [ ] Time deltas calculated with checked_sub
- [ ] Division by time period is checked
- [ ] Minimum observation period enforced

---

## 8. Token Transfer Patterns

### Pattern: Safe SPL Token Transfer via CPI

**Category:** Token

**Purpose:**
Transfer SPL tokens safely using Cross-Program Invocation (CPI) with proper account validation.

**The Secure Way:**
```rust
// SAFE: SPL token transfer with full validation
use anchor_spl::token::{self, Transfer, TokenAccount, Token};

#[derive(Accounts)]
pub struct SafeTransfer<'info> {
    #[account(mut)]
    pub from: Account<'info, TokenAccount>,

    #[account(mut)]
    pub to: Account<'info, TokenAccount>,

    pub authority: Signer<'info>,

    pub token_program: Program<'info, Token>,
}

pub fn safe_token_transfer(
    ctx: Context<SafeTransfer>,
    amount: u64,
) -> Result<()> {
    // Validation 1: Same mint
    require!(
        ctx.accounts.from.mint == ctx.accounts.to.mint,
        ErrorCode::MintMismatch
    );

    // Validation 2: Sufficient balance
    require!(
        ctx.accounts.from.amount >= amount,
        ErrorCode::InsufficientBalance
    );

    // Validation 3: Authority check (Anchor does this via Signer)
    // Validation 4: Not frozen
    require!(
        !ctx.accounts.from.is_frozen(),
        ErrorCode::AccountFrozen
    );

    let cpi_accounts = Transfer {
        from: ctx.accounts.from.to_account_info(),
        to: ctx.accounts.to.to_account_info(),
        authority: ctx.accounts.authority.to_account_info(),
    };

    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

    token::transfer(cpi_ctx, amount)?;

    Ok(())
}
```

**Common Mistakes:**
```rust
// DANGEROUS: No mint validation
// Could transfer from USDC account to SOL account

// DANGEROUS: Manual authority checks
require!(authority.key() == from.owner); // Missing signature check

// DANGEROUS: Skipping frozen check
// Frozen accounts should not transfer
```

**Why the secure version works:**
- Anchor's `Account<TokenAccount>` deserializes and validates
- `Signer` type ensures signature present
- Mint mismatch prevented
- Frozen account check prevents invalid transfers
- CPI to token program is atomic

**Checklist:**
- [ ] Both accounts are `Account<'info, TokenAccount>`
- [ ] Authority is `Signer<'info>`
- [ ] Mint equality checked
- [ ] Frozen state checked
- [ ] Amount validated against balance

---

### Pattern: Safe Token-2022 Transfer with Extension Handling

**Category:** Token

**Purpose:**
Transfer Token-2022 (Token Extensions) tokens safely, accounting for transfer hooks and fees.

**The Secure Way:**
```rust
// SAFE: Token-2022 transfer with extension awareness
use anchor_spl::token_interface::{self, TokenAccount, TokenInterface, TransferChecked};
use spl_token_2022::extension::{StateWithExtensions, transfer_fee};

#[derive(Accounts)]
pub struct Token2022Transfer<'info> {
    #[account(mut)]
    pub from: InterfaceAccount<'info, TokenAccount>,

    #[account(mut)]
    pub to: InterfaceAccount<'info, TokenAccount>,

    pub authority: Signer<'info>,

    pub mint: InterfaceAccount<'info, Mint>,

    pub token_program: Interface<'info, TokenInterface>,

    // Required for transfer hooks if present
    /// CHECK: Validated by token program
    #[account(mut)]
    pub extra_account_metas: Option<UncheckedAccount<'info>>,
}

pub fn safe_token_2022_transfer(
    ctx: Context<Token2022Transfer>,
    amount: u64,
) -> Result<u64> {
    // Validation
    require!(
        ctx.accounts.from.mint == ctx.accounts.to.mint,
        ErrorCode::MintMismatch
    );

    require!(
        ctx.accounts.from.mint == ctx.accounts.mint.key(),
        ErrorCode::MintMismatch
    );

    // Check for transfer fee extension
    let mint_info = ctx.accounts.mint.to_account_info();
    let mint_data = mint_info.try_borrow_data()?;
    let mint_with_extension = StateWithExtensions::<spl_token_2022::state::Mint>::unpack(&mint_data)?;

    let actual_received_amount = if let Ok(transfer_fee_config) = mint_with_extension.get_extension::<transfer_fee::TransferFeeConfig>() {
        let epoch = Clock::get()?.epoch;
        let fee = transfer_fee_config.calculate_epoch_fee(epoch, amount)
            .ok_or(ErrorCode::TransferFeeCalculationFailed)?;

        amount.checked_sub(fee)
            .ok_or(ErrorCode::MathOverflow)?
    } else {
        amount
    };

    // Use transfer_checked for Token-2022 (includes decimals)
    let cpi_accounts = TransferChecked {
        from: ctx.accounts.from.to_account_info(),
        mint: ctx.accounts.mint.to_account_info(),
        to: ctx.accounts.to.to_account_info(),
        authority: ctx.accounts.authority.to_account_info(),
    };

    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

    token_interface::transfer_checked(cpi_ctx, amount, ctx.accounts.mint.decimals)?;

    Ok(actual_received_amount)
}
```

**Common Mistakes:**
```rust
// DANGEROUS: Using old Token program interface
use anchor_spl::token::Transfer; // Doesn't support Token-2022

// DANGEROUS: Not checking for transfer fees
// Recipient expects X but receives X minus fee

// DANGEROUS: Not providing extra_account_metas for transfer hooks
// Transfer fails if hook extension present
```

**Why the secure version works:**
- Uses `TokenInterface` compatible with both Token and Token-2022
- Checks for and calculates transfer fees
- Uses `transfer_checked` which validates mint and decimals
- Returns actual received amount
- Supports transfer hook extension

**Checklist:**
- [ ] Uses `Interface<'info, TokenInterface>`
- [ ] Uses `InterfaceAccount<'info, TokenAccount>`
- [ ] Checks for transfer fee extension
- [ ] Calculates and returns net amount after fees
- [ ] Uses `transfer_checked` not `transfer`
- [ ] Provides extra accounts for transfer hooks if needed

---

### Pattern: Safe Associated Token Account Creation

**Category:** Token

**Purpose:**
Create associated token accounts safely, handling the case where they already exist.

**The Secure Way:**
```rust
// SAFE: ATA creation with idempotent handling
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{TokenAccount, Mint, Token};

#[derive(Accounts)]
pub struct InitializeATA<'info> {
    #[account(
        init_if_needed,
        payer = payer,
        associated_token::mint = mint,
        associated_token::authority = authority,
    )]
    pub associated_token_account: Account<'info, TokenAccount>,

    pub mint: Account<'info, Mint>,

    /// CHECK: Can be any account
    pub authority: UncheckedAccount<'info>,

    #[account(mut)]
    pub payer: Signer<'info>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

pub fn initialize_ata(ctx: Context<InitializeATA>) -> Result<()> {
    // Anchor's init_if_needed handles both creation and existing account cases
    // No additional logic needed - constraint does all validation

    // Optional: Verify the account is correct
    let expected_ata = anchor_spl::associated_token::get_associated_token_address(
        &ctx.accounts.authority.key(),
        &ctx.accounts.mint.key(),
    );
    require!(
        ctx.accounts.associated_token_account.key() == expected_ata,
        ErrorCode::InvalidATA
    );

    Ok(())
}
```

**Common Mistakes:**
```rust
// DANGEROUS: Using init instead of init_if_needed
#[account(init, ...)] // Fails if account exists

// DANGEROUS: Manual PDA derivation and creation
let (ata, bump) = Pubkey::find_program_address(...); // Error-prone

// DANGEROUS: Not validating the ATA is correct
// Attacker could pass non-ATA account
```

**Why the secure version works:**
- `init_if_needed` is idempotent
- Anchor validates ATA derivation
- Payer charged only if account doesn't exist
- Associated token program ensures correct PDA

**Checklist:**
- [ ] Uses `init_if_needed` not `init`
- [ ] Includes `associated_token::mint` constraint
- [ ] Includes `associated_token::authority` constraint
- [ ] Payer is mutable signer
- [ ] All three programs included (System, Token, AssociatedToken)

---

### Pattern: Safe Token Account Closure

**Category:** Token

**Purpose:**
Close token accounts safely, ensuring zero balance and returning rent.

**The Secure Way:**
```rust
// SAFE: Token account closure with validation
use anchor_spl::token::{self, CloseAccount, TokenAccount, Token};

#[derive(Accounts)]
pub struct CloseTokenAccount<'info> {
    #[account(
        mut,
        constraint = token_account.amount == 0 @ ErrorCode::AccountNotEmpty,
        constraint = token_account.owner == authority.key() @ ErrorCode::Unauthorized,
    )]
    pub token_account: Account<'info, TokenAccount>,

    pub authority: Signer<'info>,

    #[account(mut)]
    pub destination: SystemAccount<'info>,

    pub token_program: Program<'info, Token>,
}

pub fn close_token_account(ctx: Context<CloseTokenAccount>) -> Result<()> {
    // Additional runtime check (belt and suspenders)
    require!(
        ctx.accounts.token_account.amount == 0,
        ErrorCode::AccountNotEmpty
    );

    require!(
        !ctx.accounts.token_account.is_frozen(),
        ErrorCode::AccountFrozen
    );

    let cpi_accounts = CloseAccount {
        account: ctx.accounts.token_account.to_account_info(),
        destination: ctx.accounts.destination.to_account_info(),
        authority: ctx.accounts.authority.to_account_info(),
    };

    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

    token::close_account(cpi_ctx)?;

    Ok(())
}
```

**Common Mistakes:**
```rust
// DANGEROUS: Not checking balance is zero
// Tokens lost forever

// DANGEROUS: Not checking ownership
// Attacker closes victim's account

// DANGEROUS: Not checking frozen state
// Frozen accounts cannot be closed
```

**Why the secure version works:**
- Constraint ensures balance is zero
- Constraint validates authority
- Frozen state checked
- Rent returned to destination
- CPI to token program is atomic

**Checklist:**
- [ ] Balance checked to be zero
- [ ] Authority validated via constraint
- [ ] Frozen state checked
- [ ] Destination is mutable to receive rent
- [ ] Account marked as `mut`

---

### Pattern: Safe Wrapped SOL Handling

**Category:** Token

**Purpose:**
Handle native SOL wrapping/unwrapping safely via WSOL token accounts.

**The Secure Way:**
```rust
// SAFE: Wrapped SOL deposit with proper sync
use anchor_lang::system_program;
use anchor_spl::token::{self, SyncNative, Token, TokenAccount};

#[derive(Accounts)]
pub struct WrapSOL<'info> {
    #[account(
        mut,
        constraint = wsol_account.mint == spl_token::native_mint::id() @ ErrorCode::NotWSOL,
        constraint = wsol_account.owner == authority.key() @ ErrorCode::Unauthorized,
    )]
    pub wsol_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

pub fn wrap_sol(ctx: Context<WrapSOL>, amount: u64) -> Result<()> {
    // Step 1: Transfer SOL to the WSOL token account
    let transfer_accounts = system_program::Transfer {
        from: ctx.accounts.authority.to_account_info(),
        to: ctx.accounts.wsol_account.to_account_info(),
    };

    let transfer_ctx = CpiContext::new(
        ctx.accounts.system_program.to_account_info(),
        transfer_accounts,
    );

    system_program::transfer(transfer_ctx, amount)?;

    // Step 2: Sync the native account to update token amount
    let sync_accounts = SyncNative {
        account: ctx.accounts.wsol_account.to_account_info(),
    };

    let sync_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        sync_accounts,
    );

    token::sync_native(sync_ctx)?;

    Ok(())
}

// Unwrap: Close the WSOL account to get SOL back
pub fn unwrap_sol(ctx: Context<CloseTokenAccount>) -> Result<()> {
    // Use the CloseAccount pattern from above
    // WSOL account must have 0 token balance (all SOL withdrawn first if needed)
    close_token_account(ctx)
}
```

**Common Mistakes:**
```rust
// DANGEROUS: Forgetting to sync_native
// Token amount not updated after SOL transfer

// DANGEROUS: Not checking mint is native mint
// Could be any SPL token

// DANGEROUS: Transferring SOL without wrapped account
// SOL sent to token account without sync is lost
```

**Why the secure version works:**
- Validates account is native mint (WSOL)
- Transfers SOL first, then syncs
- Sync updates token amount to match lamports
- Authority validated

**Checklist:**
- [ ] Mint checked to be `spl_token::native_mint::id()`
- [ ] SOL transferred before sync_native
- [ ] sync_native called after every SOL transfer to WSOL account
- [ ] Unwrapping uses standard close_account (after balance withdrawn)

---

## 9. Error Handling Patterns

### Pattern: Effective Use of require! Macro

**Category:** Error Handling

**Purpose:**
Validate conditions and fail fast with descriptive errors.

**The Secure Way:**
```rust
// SAFE: require! with custom errors
use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Amount must be greater than zero")]
    AmountZero,

    #[msg("Insufficient balance for withdrawal")]
    InsufficientBalance,

    #[msg("Deposit exceeds maximum allowed")]
    DepositTooLarge,

    #[msg("Unauthorized: caller is not the owner")]
    Unauthorized,
}

pub fn process_deposit(
    ctx: Context<Deposit>,
    amount: u64,
    max_deposit: u64,
) -> Result<()> {
    // Check 1: Amount validation
    require!(amount > 0, ErrorCode::AmountZero);

    // Check 2: Max deposit limit
    require!(amount <= max_deposit, ErrorCode::DepositTooLarge);

    // Check 3: Authority check
    require!(
        ctx.accounts.user.key() == ctx.accounts.vault.owner,
        ErrorCode::Unauthorized
    );

    // Proceed with deposit logic
    ctx.accounts.vault.balance = ctx.accounts.vault.balance
        .checked_add(amount)
        .ok_or(ErrorCode::MathOverflow)?;

    Ok(())
}
```

**Common Mistakes:**
```rust
// DANGEROUS: Using assert! (panics are hard to debug)
assert!(amount > 0);

// DANGEROUS: Generic error messages
require!(amount > 0, "Invalid amount"); // String instead of error code

// DANGEROUS: Not using require! at all
if amount == 0 {
    return Err(ProgramError::InvalidArgument.into());
}
```

**Why the secure version works:**
- `require!` returns error instead of panicking
- Custom error codes with descriptive messages
- Client can decode error codes
- Logs show exact failure reason

**Checklist:**
- [ ] All validations use `require!` not `assert!`
- [ ] Custom error codes defined in `#[error_code]` enum
- [ ] Error messages are user-friendly
- [ ] Each error code is unique

---

### Pattern: Validation Ordering (Cheap Checks First)

**Category:** Error Handling

**Purpose:**
Order validations from cheapest to most expensive to save compute units.

**The Secure Way:**
```rust
// SAFE: Validations ordered by cost
pub fn optimized_validation(
    ctx: Context<ComplexOperation>,
    amount: u64,
    oracle_account: &AccountInfo,
) -> Result<()> {
    // 1. CHEAPEST: Simple comparisons (1-2 compute units)
    require!(amount > 0, ErrorCode::AmountZero);
    require!(amount <= 1_000_000_000, ErrorCode::AmountTooLarge);

    // 2. CHEAP: Account field checks (3-5 compute units)
    require!(
        ctx.accounts.user.key() == ctx.accounts.vault.owner,
        ErrorCode::Unauthorized
    );

    // 3. MODERATE: Arithmetic operations (5-20 compute units)
    let fee = calculate_fee(amount, 30)?; // checked math
    require!(fee > 0, ErrorCode::FeeTooLow);

    // 4. EXPENSIVE: Cross-program calls (1000+ compute units)
    let oracle_price = get_pyth_price(oracle_account, 60, 100)?;

    // 5. MOST EXPENSIVE: Account deserialization
    let external_state: ExternalAccount = Account::try_from(&ctx.accounts.external_account)?;
    require!(external_state.is_active, ErrorCode::InactiveAccount);

    Ok(())
}
```

**Common Mistakes:**
```rust
// DANGEROUS: Expensive checks first
let oracle_price = get_pyth_price(...)?; // 1000+ CU
require!(amount > 0, ...); // Should be first!

// DANGEROUS: No ordering consideration
// Random order wastes compute units on invalid inputs
```

**Why the secure version works:**
- Fails fast on simple invalid inputs
- Saves compute units (lower fees)
- Most common errors caught cheaply
- Expensive operations only run if needed

**Checklist:**
- [ ] Simple comparisons first
- [ ] Account field checks second
- [ ] Arithmetic operations third
- [ ] CPI calls near the end
- [ ] Account deserialization only if needed

---

### Pattern: Safe Array and Slice Access

**Category:** Error Handling

**Purpose:**
Access arrays and slices without panicking on out-of-bounds.

**The Secure Way:**
```rust
// SAFE: Bounds-checked array access
#[account]
pub struct VaultList {
    pub vaults: Vec<Pubkey>, // Dynamic array
}

pub fn get_vault_safely(
    vault_list: &VaultList,
    index: usize,
) -> Result<Pubkey> {
    // Method 1: get() returns Option
    vault_list.vaults
        .get(index)
        .copied()
        .ok_or(ErrorCode::InvalidVaultIndex.into())
}

pub fn iterate_safely(vault_list: &VaultList) -> Result<()> {
    // Method 2: Iterator (never panics)
    for (i, vault) in vault_list.vaults.iter().enumerate() {
        msg!("Vault {}: {}", i, vault);
    }

    Ok(())
}

// For fixed-size arrays in accounts
#[account]
pub struct FixedVaultList {
    pub vaults: [Pubkey; 10],
    pub count: u8, // Actual number of valid entries
}

pub fn get_fixed_vault_safely(
    vault_list: &FixedVaultList,
    index: u8,
) -> Result<Pubkey> {
    require!(
        index < vault_list.count,
        ErrorCode::InvalidVaultIndex
    );

    require!(
        (index as usize) < vault_list.vaults.len(),
        ErrorCode::InvalidVaultIndex
    );

    Ok(vault_list.vaults[index as usize])
}
```

**Common Mistakes:**
```rust
// DANGEROUS: Direct indexing
let vault = vault_list.vaults[index]; // Panics if out of bounds

// DANGEROUS: Unchecked index
let vault = vault_list.vaults[user_input as usize]; // User controls panic

// DANGEROUS: Not validating count field
let vault = fixed_list.vaults[index]; // Ignores count field
```

**Why the secure version works:**
- `.get()` returns `Option` instead of panicking
- Iterator-based loops never panic
- Explicit bounds checking with `require!`
- Count field tracks valid entries

**Checklist:**
- [ ] Use `.get()` instead of `[]` for dynamic access
- [ ] Use iterators when possible
- [ ] Validate indices before array access
- [ ] Track valid count separately for fixed arrays

---

### Pattern: Avoiding Panics in Instruction Handlers

**Category:** Error Handling

**Purpose:**
Ensure instruction handlers never panic, always return Result.

**The Secure Way:**
```rust
// SAFE: No panics, all errors handled
pub fn panic_free_handler(ctx: Context<MyAccounts>, data: Vec<u8>) -> Result<()> {
    // GOOD: Checked arithmetic
    let sum = ctx.accounts.vault.balance
        .checked_add(100)
        .ok_or(ErrorCode::MathOverflow)?;

    // GOOD: Safe array access
    let first_byte = data.get(0)
        .ok_or(ErrorCode::InvalidData)?;

    // GOOD: Safe deserialization
    let amount = u64::from_le_bytes(
        data.get(0..8)
            .ok_or(ErrorCode::InvalidData)?
            .try_into()
            .map_err(|_| ErrorCode::InvalidData)?
    );

    // GOOD: Safe unwrap with error
    let account = Account::<TokenAccount>::try_from(&ctx.accounts.token_account)?;

    // GOOD: Safe division
    let quotient = amount
        .checked_div(ctx.accounts.config.divisor)
        .ok_or(ErrorCode::DivisionByZero)?;

    Ok(())
}
```

**Common Mistakes:**
```rust
// DANGEROUS: Unwrap can panic
let amount = parse_amount(data).unwrap();

// DANGEROUS: Direct arithmetic
let sum = balance + 100; // Panics on overflow

// DANGEROUS: Unchecked indexing
let byte = data[0]; // Panics if empty

// DANGEROUS: Expect can panic
let account = Account::try_from(...).expect("Invalid account");
```

**Why the secure version works:**
- All operations return `Result` or `Option`
- No `unwrap()`, `expect()`, or `panic!()`
- Arithmetic uses `checked_*` methods
- Arrays accessed via `.get()`

**Checklist:**
- [ ] No `unwrap()` calls
- [ ] No `expect()` calls
- [ ] No `panic!()` calls
- [ ] No `assert!()` calls (use `require!`)
- [ ] All arithmetic uses `checked_*`
- [ ] All array access uses `.get()`

---

## 10. Timing & Ordering Safety

### Pattern: Safe Clock Sysvar Usage

**Category:** Timing

**Purpose:**
Access current time safely for deadline and cooldown enforcement.

**The Secure Way:**
```rust
// SAFE: Clock sysvar with proper validation
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct TimedOperation<'info> {
    #[account(mut)]
    pub state: Account<'info, TimedState>,
    pub user: Signer<'info>,
}

#[account]
pub struct TimedState {
    pub last_action_timestamp: i64,
    pub deadline: i64,
}

pub fn time_sensitive_action(ctx: Context<TimedOperation>) -> Result<()> {
    let clock = Clock::get()?;
    let current_time = clock.unix_timestamp;

    // Validation 1: Time must be positive (sanity check)
    require!(current_time > 0, ErrorCode::InvalidTimestamp);

    // Validation 2: Check deadline
    require!(
        current_time <= ctx.accounts.state.deadline,
        ErrorCode::DeadlineExceeded
    );

    // Validation 3: Cooldown period (e.g., 60 seconds)
    let time_since_last = current_time
        .checked_sub(ctx.accounts.state.last_action_timestamp)
        .ok_or(ErrorCode::InvalidTimestamp)?;

    require!(
        time_since_last >= 60,
        ErrorCode::CooldownNotElapsed
    );

    // Update timestamp
    ctx.accounts.state.last_action_timestamp = current_time;

    Ok(())
}
```

**Common Mistakes:**
```rust
// DANGEROUS: Not handling Clock::get() error
let clock = Clock::get().unwrap();

// DANGEROUS: Unchecked subtraction
let elapsed = current_time - last_time; // Can underflow

// DANGEROUS: Comparing timestamps without validation
if current_time > deadline { ... } // No checked_sub
```

**Why the secure version works:**
- `Clock::get()` returns `Result`, handled properly
- Timestamp subtraction uses `checked_sub`
- Deadlines enforced before state changes
- Sanity checks on timestamp values

**Checklist:**
- [ ] `Clock::get()?` with proper error handling
- [ ] Timestamp comparisons use `checked_sub`
- [ ] Deadlines checked before state mutations
- [ ] Timestamp values validated as positive

---

### Pattern: Deadline Enforcement

**Category:** Timing

**Purpose:**
Ensure operations complete before a user-specified deadline (prevent stale transactions).

**The Secure Way:**
```rust
// SAFE: Deadline enforcement with slippage protection
#[derive(Accounts)]
pub struct SwapWithDeadline<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(mut)]
    pub pool: Account<'info, Pool>,
}

pub fn swap_with_deadline(
    ctx: Context<SwapWithDeadline>,
    amount_in: u64,
    min_amount_out: u64,
    deadline: i64,
) -> Result<()> {
    let clock = Clock::get()?;

    // Deadline check FIRST (before any computation)
    require!(
        clock.unix_timestamp <= deadline,
        ErrorCode::TransactionExpired
    );

    // Prevent obviously stale deadlines
    require!(
        deadline > 0,
        ErrorCode::InvalidDeadline
    );

    // Prevent unreasonably far future deadlines (e.g., > 1 hour)
    let max_deadline = clock.unix_timestamp
        .checked_add(3600)
        .ok_or(ErrorCode::MathOverflow)?;

    require!(
        deadline <= max_deadline,
        ErrorCode::DeadlineTooFar
    );

    // Perform swap
    let amount_out = calculate_swap_output(amount_in, &ctx.accounts.pool)?;

    // Slippage check
    require!(
        amount_out >= min_amount_out,
        ErrorCode::SlippageExceeded
    );

    // Execute swap
    execute_swap(ctx, amount_in, amount_out)?;

    Ok(())
}
```

**Common Mistakes:**
```rust
// DANGEROUS: No deadline check
pub fn swap(amount: u64) -> Result<()> { ... } // Can execute anytime

// DANGEROUS: Deadline check after expensive operations
let output = calculate_swap(...); // Expensive
require!(clock.unix_timestamp <= deadline, ...); // Too late

// DANGEROUS: No maximum deadline
// User sets deadline to i64::MAX
```

**Why the secure version works:**
- Deadline checked immediately
- Validates deadline is reasonable (not 0, not too far future)
- Combined with slippage protection
- Prevents MEV via stale transactions

**Checklist:**
- [ ] Deadline checked before expensive operations
- [ ] Deadline validated as positive
- [ ] Maximum deadline enforced (e.g., 1 hour)
- [ ] Combined with slippage/min-output checks

---

### Pattern: Cooldown Period Enforcement

**Category:** Timing

**Purpose:**
Prevent spam or abuse by enforcing minimum time between actions.

**The Secure Way:**
```rust
// SAFE: Cooldown with per-user and global tracking
#[account]
pub struct UserState {
    pub last_claim_timestamp: i64,
    pub claim_count: u32,
}

#[account]
pub struct GlobalState {
    pub cooldown_seconds: i64,
    pub max_claims_per_period: u32,
    pub period_duration_seconds: i64,
}

pub fn claim_with_cooldown(
    ctx: Context<ClaimRewards>,
) -> Result<()> {
    let clock = Clock::get()?;
    let current_time = clock.unix_timestamp;
    let user_state = &mut ctx.accounts.user_state;
    let global_state = &ctx.accounts.global_state;

    // Check 1: Individual cooldown
    if user_state.last_claim_timestamp > 0 {
        let time_since_last = current_time
            .checked_sub(user_state.last_claim_timestamp)
            .ok_or(ErrorCode::InvalidTimestamp)?;

        require!(
            time_since_last >= global_state.cooldown_seconds,
            ErrorCode::CooldownNotElapsed
        );
    }

    // Check 2: Rate limiting (claims per period)
    let period_start = (current_time / global_state.period_duration_seconds)
        .checked_mul(global_state.period_duration_seconds)
        .ok_or(ErrorCode::MathOverflow)?;

    if user_state.last_claim_timestamp >= period_start {
        require!(
            user_state.claim_count < global_state.max_claims_per_period,
            ErrorCode::RateLimitExceeded
        );
        user_state.claim_count = user_state.claim_count
            .checked_add(1)
            .ok_or(ErrorCode::MathOverflow)?;
    } else {
        // New period, reset counter
        user_state.claim_count = 1;
    }

    // Update timestamp
    user_state.last_claim_timestamp = current_time;

    // Execute claim logic
    execute_claim(ctx)?;

    Ok(())
}
```

**Common Mistakes:**
```rust
// DANGEROUS: No cooldown enforcement
// Users can spam claims

// DANGEROUS: Using slot instead of timestamp for user-facing cooldowns
let elapsed_slots = current_slot - last_slot; // Slots vary in time

// DANGEROUS: No rate limiting
// Cooldown prevents spam but not aggregate abuse
```

**Why the secure version works:**
- Per-user cooldown prevents individual spam
- Rate limiting prevents aggregate abuse
- Timestamp-based (consistent for users)
- Period-based counter resets automatically

**Checklist:**
- [ ] Last action timestamp stored per user
- [ ] Cooldown duration configurable
- [ ] Rate limiting for additional protection
- [ ] Timestamps use checked_sub
- [ ] First action (timestamp = 0) handled

---

### Pattern: Slot vs Timestamp Trade-offs

**Category:** Timing

**Purpose:**
Choose appropriate time measurement (slot vs timestamp) for different use cases.

**The Secure Way:**
```rust
// SAFE: Slot-based for oracle/protocol timing
#[account]
pub struct ProtocolState {
    pub last_update_slot: u64,
    pub min_slots_between_updates: u64,
}

pub fn slot_based_update(ctx: Context<UpdateProtocol>) -> Result<()> {
    let clock = Clock::get()?;
    let current_slot = clock.slot;

    let slots_elapsed = current_slot
        .checked_sub(ctx.accounts.state.last_update_slot)
        .ok_or(ErrorCode::InvalidSlot)?;

    require!(
        slots_elapsed >= ctx.accounts.state.min_slots_between_updates,
        ErrorCode::UpdateTooFrequent
    );

    ctx.accounts.state.last_update_slot = current_slot;
    Ok(())
}

// SAFE: Timestamp-based for user-facing deadlines
#[account]
pub struct UserDeadline {
    pub expiry_timestamp: i64,
}

pub fn timestamp_based_action(ctx: Context<UserAction>) -> Result<()> {
    let clock = Clock::get()?;

    require!(
        clock.unix_timestamp <= ctx.accounts.deadline.expiry_timestamp,
        ErrorCode::Expired
    );

    Ok(())
}
```

**When to Use Each:**

| Use Case | Use Slots | Use Timestamps |
|----------|-----------|----------------|
| Oracle updates | ✓ | |
| TWAP calculations | ✓ | |
| Protocol rate limiting | ✓ | |
| User deadlines | | ✓ |
| Vesting schedules | | ✓ |
| Cooldown periods | | ✓ |
| Governance voting | | ✓ |

**Common Mistakes:**
```rust
// DANGEROUS: Using slots for user-facing deadlines
require!(clock.slot <= deadline_slot, ...); // Slot time varies

// DANGEROUS: Using timestamps for oracle updates
// Timestamp can be slightly manipulated
```

**Why the pattern works:**
- Slots are manipulation-resistant (consensus-driven)
- Timestamps are user-friendly (predictable)
- Each used for appropriate context
- Clear documentation of choice

**Checklist:**
- [ ] Slot-based for protocol/oracle timing
- [ ] Timestamp-based for user deadlines
- [ ] Both using checked_sub
- [ ] Comment explaining choice

---

## Additional Critical Patterns

### Pattern: Reentrancy Protection via CPI Guards

**Category:** Security

**Purpose:**
Prevent reentrancy attacks when making cross-program invocations.

**The Secure Way:**
```rust
// SAFE: Reentrancy guard using state flags
#[account]
pub struct Vault {
    pub balance: u64,
    pub is_locked: bool, // Reentrancy guard
}

pub fn withdraw_with_guard(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
    let vault = &mut ctx.accounts.vault;

    // Check 1: Not already in a withdrawal
    require!(!vault.is_locked, ErrorCode::ReentrancyDetected);

    // Check 2: Sufficient balance
    require!(vault.balance >= amount, ErrorCode::InsufficientBalance);

    // LOCK: Set guard before external call
    vault.is_locked = true;

    // State change BEFORE external call (checks-effects-interactions)
    vault.balance = vault.balance
        .checked_sub(amount)
        .ok_or(ErrorCode::MathOverflow)?;

    // External call (CPI to token transfer)
    transfer_tokens(ctx, amount)?;

    // UNLOCK: Clear guard after external call
    vault.is_locked = false;

    Ok(())
}
```

**Common Mistakes:**
```rust
// DANGEROUS: External call before state update
transfer_tokens(ctx, amount)?;
vault.balance -= amount; // Reentrancy vulnerability

// DANGEROUS: No reentrancy guard
// Callback could call withdraw again
```

**Why the secure version works:**
- Guard prevents concurrent execution
- State updated before external call
- Guard cleared at end
- Follows checks-effects-interactions pattern

**Checklist:**
- [ ] Reentrancy guard flag in state
- [ ] Guard checked at start
- [ ] Guard set before external calls
- [ ] State updated before external calls
- [ ] Guard cleared at end

---

### Pattern: PDA Derivation and Validation

**Category:** Security

**Purpose:**
Safely derive and validate Program Derived Addresses.

**The Secure Way:**
```rust
// SAFE: PDA derivation with bump validation
#[derive(Accounts)]
#[instruction(user: Pubkey)]
pub struct InitializeUserVault<'info> {
    #[account(
        init,
        payer = payer,
        space = 8 + UserVault::INIT_SPACE,
        seeds = [b"vault", user.as_ref()],
        bump,
    )]
    pub vault: Account<'info, UserVault>,

    #[account(mut)]
    pub payer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[account]
pub struct UserVault {
    pub owner: Pubkey,
    pub balance: u64,
    pub bump: u8, // Store bump for future use
}

pub fn initialize_user_vault(
    ctx: Context<InitializeUserVault>,
    user: Pubkey,
) -> Result<()> {
    let vault = &mut ctx.accounts.vault;
    vault.owner = user;
    vault.balance = 0;
    vault.bump = ctx.bumps.vault; // Store canonical bump

    Ok(())
}

// Later operations validate against stored bump
#[derive(Accounts)]
pub struct UseVault<'info> {
    #[account(
        mut,
        seeds = [b"vault", vault.owner.as_ref()],
        bump = vault.bump,
    )]
    pub vault: Account<'info, UserVault>,
}
```

**Common Mistakes:**
```rust
// DANGEROUS: Not storing bump
// Have to recompute on every transaction

// DANGEROUS: Using find_program_address in instruction
let (vault_pda, bump) = Pubkey::find_program_address(...); // Expensive

// DANGEROUS: Not validating PDA in constraints
// Manual validation is error-prone
```

**Why the secure version works:**
- Anchor constraint validates PDA derivation
- Canonical bump stored in account
- Future operations use stored bump
- No manual validation needed

**Checklist:**
- [ ] PDAs derived using `seeds` and `bump` constraints
- [ ] Bump stored in account data
- [ ] Seeds include unique identifiers
- [ ] No manual PDA validation in instruction logic

---

### Pattern: Account Ownership Validation

**Category:** Security

**Purpose:**
Ensure accounts are owned by expected programs.

**The Secure Way:**
```rust
// SAFE: Account ownership validation
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct ValidateOwnership<'info> {
    // Anchor automatically validates TokenAccount is owned by Token program
    #[account(mut)]
    pub token_account: Account<'info, TokenAccount>,

    // For non-Anchor account types
    /// CHECK: Validated via constraint
    #[account(
        constraint = external_account.owner == &expected_program::ID @ ErrorCode::InvalidOwner
    )]
    pub external_account: AccountInfo<'info>,

    // For system accounts
    #[account(
        constraint = user_account.owner == &system_program::ID @ ErrorCode::NotSystemAccount
    )]
    pub user_account: SystemAccount<'info>,
}

pub fn validate_ownership_example(ctx: Context<ValidateOwnership>) -> Result<()> {
    // For runtime checks on AccountInfo
    let account = &ctx.accounts.external_account;

    require!(
        account.owner == &expected_program::id(),
        ErrorCode::InvalidOwner
    );

    // Check if executable (if expecting a program)
    require!(
        !account.executable, // Most accounts should NOT be executable
        ErrorCode::UnexpectedExecutable
    );

    Ok(())
}
```

**Common Mistakes:**
```rust
// DANGEROUS: Not checking account ownership
let account_data = account.try_borrow_data()?; // Could be any program's account

// DANGEROUS: Assuming Account<T> validates ownership
// It does, but AccountInfo doesn't
```

**Why the secure version works:**
- `Account<T>` validates ownership automatically
- Constraints enforce ownership at deserialization
- Runtime checks for AccountInfo
- Clear error messages

**Checklist:**
- [ ] Use `Account<T>` for known types
- [ ] Add ownership constraints for `AccountInfo`
- [ ] Check executable flag when relevant
- [ ] Validate against correct program ID constant

---

## Summary Checklist

### Arithmetic Safety
- [ ] All addition uses `checked_add`
- [ ] All subtraction uses `checked_sub`
- [ ] All multiplication uses `checked_mul` with u128 intermediate
- [ ] All division uses `checked_div`
- [ ] Multiply before divide for percentages
- [ ] Rounding direction favors protocol
- [ ] Decimal scaling accounts for both sides

### Oracle Safety
- [ ] Staleness checked (time or slot)
- [ ] Confidence interval validated
- [ ] Price exponent accounted for
- [ ] Circuit breakers (min/max bounds)
- [ ] Fallback oracle sources
- [ ] Price deviation checks between sources

### Token Safety
- [ ] Mint equality validated
- [ ] Use CPI to token program, not manual transfers
- [ ] Token-2022: use TokenInterface and check extensions
- [ ] Transfer fees calculated and returned
- [ ] ATA creation uses `init_if_needed`
- [ ] Account closure validates zero balance
- [ ] WSOL: sync_native after SOL transfer

### Error Handling
- [ ] All validations use `require!` not `assert!`
- [ ] Custom error codes with messages
- [ ] Validations ordered cheapest-first
- [ ] No `unwrap()`, `expect()`, or `panic!()`
- [ ] Array access uses `.get()`
- [ ] Instruction handlers return `Result`

### Timing Safety
- [ ] Clock::get() error handled
- [ ] Timestamp math uses `checked_sub`
- [ ] Deadlines validated and enforced
- [ ] Cooldowns prevent spam
- [ ] Slots for protocol, timestamps for users

### General Security
- [ ] Reentrancy guards on external calls
- [ ] PDA bumps stored in account
- [ ] Account ownership validated
- [ ] No executable accounts where unexpected

---

## Confidence & Sources

**Confidence Level:** MEDIUM

This document is based on:
- Anchor framework documentation patterns (as of training data)
- SPL Token and Token-2022 program interfaces
- Common Solana security best practices from audits
- Pyth and Switchboard SDK patterns (may need verification)

**Requires verification:**
- Pyth SDK current API (check pyth-sdk-solana crate docs)
- Switchboard V2/V3 current API (check switchboard-v2 crate docs)
- Token-2022 extension handling (check spl-token-2022 docs)
- Latest Anchor framework patterns (check Anchor v0.29+ docs)

**Recommended next steps:**
1. Verify oracle integration examples with official SDKs
2. Test Token-2022 patterns with current extension set
3. Review Anchor changelog for new security features
4. Consult recent audit reports for emerging patterns

---

**Document Status:** Ready for review and verification against current documentation.
