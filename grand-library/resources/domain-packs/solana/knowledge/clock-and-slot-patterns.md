---
pack: solana
confidence: 8/10
sources_checked: 15
last_updated: "2026-02-16"
---

# How do I handle time-dependent logic on Solana?

Time on Solana is deceptively complex. The network provides multiple time sources (slots, unix_timestamp, epochs), each with different properties, drift characteristics, and failure modes. Programs that handle time-dependent logic incorrectly can be exploited through timing manipulation, suffer from clock drift bugs, or break during epoch boundaries.

## Three Ways to Measure Time

Solana provides three distinct time measurements, each appropriate for different use cases:

### 1. Slot Number (sequential counter)
- **What it is**: Monotonically increasing counter, incremented every ~400ms
- **Accessed via**: `Clock::get()?.slot`
- **Best for**: Ordering events, relative time measurements, counting blocks
- **Guarantees**: Never goes backward, always increases by exactly 1 per slot
- **Example**: "This auction ends in 10,000 slots" (roughly 1.1 hours)

### 2. Unix Timestamp (consensus time)
- **What it is**: Stake-weighted median of validator-submitted UTC timestamps
- **Accessed via**: `Clock::get()?.unix_timestamp`
- **Best for**: Real-world deadlines, cross-chain time references, user-facing timestamps
- **Guarantees**: Roughly aligned with wall-clock time (within drift bounds)
- **Example**: "Vesting unlocks at timestamp 1735689600" (January 1, 2025)

### 3. Epoch Number (long-term periods)
- **What it is**: Fixed-duration periods (currently ~2.5 days per epoch)
- **Accessed via**: `Clock::get()?.epoch`
- **Best for**: Reward distribution cycles, protocol upgrades, long-term scheduling
- **Example**: "Staking rewards are calculated per epoch"

## Critical Gotcha: Slot Time Variance

**The 400ms slot time is a target, not a guarantee.** Solana enforces asymmetric drift limits on unix_timestamp:

```
Allowed drift per slot:
- 25% fast: minimum 0.3 seconds per slot (instead of 0.4s)
- 150% slow: maximum 1.0 second per slot (instead of 0.4s)
```

This means:
- **10 slots could span 3 to 10 seconds** (not a fixed 4 seconds)
- **Time can "speed up" or "slow down"** relative to wall-clock time
- **Validator hardware affects timing**: Weaker validators (older hardware or the Agave client) may skip voting rather than processing blocks within 400ms, creating verification lag

### Real-World Impact

In 2022, Solana's clock drifted 30 minutes behind real-world UTC due to sustained slow block production during a network degradation event. Programs that assumed 400ms == 1 slot broke.

**Design rule**: Never assume `(current_slot - start_slot) * 400ms` equals real elapsed time. Use unix_timestamp for wall-clock calculations.

## Patterns for Time-Dependent Logic

### Pattern 1: Auction Expirations (use slots)

```rust
#[account]
pub struct Auction {
    pub end_slot: u64,
    pub highest_bid: u64,
    pub winner: Pubkey,
}

pub fn place_bid(ctx: Context<PlaceBid>, bid_amount: u64) -> Result<()> {
    let clock = Clock::get()?;
    let auction = &mut ctx.accounts.auction;

    // Use slot number for auction expiry
    require!(clock.slot < auction.end_slot, ErrorCode::AuctionEnded);
    require!(bid_amount > auction.highest_bid, ErrorCode::BidTooLow);

    auction.highest_bid = bid_amount;
    auction.winner = ctx.accounts.bidder.key();
    Ok(())
}
```

**Why slots?** Auctions care about block ordering, not wall-clock time. Using slots prevents timing manipulation and simplifies testing.

### Pattern 2: Vesting Schedules (use unix_timestamp)

```rust
#[account]
pub struct VestingSchedule {
    pub cliff_timestamp: i64,  // Note: i64, not u64 (historical reasons)
    pub end_timestamp: i64,
    pub total_amount: u64,
}

pub fn claim_vested(ctx: Context<ClaimVested>) -> Result<()> {
    let clock = Clock::get()?;
    let schedule = &ctx.accounts.vesting_schedule;

    // Use unix_timestamp for real-world deadlines
    require!(
        clock.unix_timestamp >= schedule.cliff_timestamp,
        ErrorCode::CliffNotReached
    );

    let elapsed = clock.unix_timestamp - schedule.cliff_timestamp;
    let duration = schedule.end_timestamp - schedule.cliff_timestamp;
    let vested_amount = schedule.total_amount
        .checked_mul(elapsed as u64)
        .unwrap()
        .checked_div(duration as u64)
        .unwrap();

    // Transfer vested tokens...
    Ok(())
}
```

**Why unix_timestamp?** Vesting is a legal commitment tied to calendar dates. Users expect "January 1, 2025" to mean the same thing regardless of network conditions.

### Pattern 3: Rate Limiting (use slots + account nonce)

```rust
#[account]
pub struct RateLimitedAction {
    pub last_action_slot: u64,
    pub min_slot_interval: u64,  // e.g., 225 slots = ~90 seconds
}

pub fn perform_action(ctx: Context<PerformAction>) -> Result<()> {
    let clock = Clock::get()?;
    let state = &mut ctx.accounts.state;

    let slots_since_last = clock.slot.saturating_sub(state.last_action_slot);
    require!(
        slots_since_last >= state.min_slot_interval,
        ErrorCode::ActionTooSoon
    );

    state.last_action_slot = clock.slot;
    // Perform rate-limited action...
    Ok(())
}
```

**Why slots?** Rate limiting is about transaction ordering, not wall-clock time. Slots prevent timing attacks where users manipulate unix_timestamp drift.

## Historical Clock Bugs

### The i64 Timestamp Bug
The `unix_timestamp` field is `i64` (signed), not `u64` (unsigned), meaning it can represent negative values even though time cannot be negative. This is a historical quirk from early Solana development.

**Mitigation**: Always cast to `u64` after validating `timestamp >= 0` if you need unsigned arithmetic.

### Bank Timestamp Correction (2020)
Early Solana had a bug where timestamps could go backward across slots. The "Bank Timestamp Correction" proposal fixed this by enforcing monotonicity, but legacy programs written before this fix may have defensive checks for backward-moving time.

**Reference**: See [Agave Bank Timestamp Correction docs](https://docs.anza.xyz/implemented-proposals/bank-timestamp-correction)

## Testing Time-Dependent Programs

### Problem: Clock::get() returns network time
You can't manipulate the Clock sysvar in tests the same way you can in EVM (where you can set block.timestamp arbitrarily).

### Solution 1: Inject a "mock clock" account
```rust
#[account]
pub struct MockClock {
    pub slot: u64,
    pub timestamp: i64,
}

pub fn process_with_time(ctx: Context<Process>, use_real_clock: bool) -> Result<()> {
    let (slot, timestamp) = if use_real_clock {
        let clock = Clock::get()?;
        (clock.slot, clock.unix_timestamp)
    } else {
        let mock = &ctx.accounts.mock_clock;
        (mock.slot, mock.timestamp)
    };

    // Use slot/timestamp for logic...
    Ok(())
}
```

In tests, pass `use_real_clock: false` and manipulate the MockClock account.

### Solution 2: Time-travel with solana-test-validator
The `solana-test-validator` supports `--warp-slot` to advance the clock:

```bash
# Jump forward 1000 slots (~400 seconds)
solana-test-validator --warp-slot 1000
```

This advances both slot number and unix_timestamp proportionally.

## 2026 Audit Considerations

**Firedancer + Agave Client Differences**: With the multi-client era (Firedancer validator launched in late 2024), programs must account for different timing behaviors between clients. Audits in 2026 now check:

1. **Valid-until-slot tolerances**: Does the program handle slot variance (300-1000ms per slot)?
2. **Slippage on time-dependent swaps**: Oracle timestamps may lag behind 400ms block production
3. **Micro-reorg risk**: Transactions included quickly may finalize later due to timing games between validators

**Localized Fee Markets (LFM)**: If your time-dependent logic involves high-frequency writes to a shared state account, consider that LFM (introduced in 2025) makes hot accounts expensive. Design for per-user time-tracking accounts instead of a global clock account.

## When to Use Each Time Source

| Use Case | Preferred Time Source | Rationale |
|----------|----------------------|-----------|
| Auction deadlines | Slot number | Ordering matters more than wall-clock time |
| Vesting schedules | Unix timestamp | Legal deadlines tied to calendar dates |
| Oracle staleness checks | Unix timestamp | Must match off-chain wall-clock time |
| Rate limiting | Slot number | Prevents timing manipulation |
| Epoch-based rewards | Epoch number | Aligned with network reward cycles |
| Relative time windows | Slot number | No drift concerns, simpler math |
| Absolute time deadlines | Unix timestamp | Matches user expectations |

## Summary

- **Slot number**: Use for ordering, relative time, rate limiting
- **Unix timestamp**: Use for wall-clock deadlines, cross-chain time
- **Never assume 400ms/slot**: Time can drift 25% fast or 150% slow
- **Test with clock variance**: Programs must handle non-uniform slot times
- **i64 timestamp is a quirk**: Validate non-negative before casting to u64

Time on Solana is a leaky abstraction. Design defensively, test extensively, and always ask: "What happens if the clock drifts 30 minutes?"
