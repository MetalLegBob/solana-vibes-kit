---
pack: solana
topic: "Staking Reward Math"
decision: "How do I calculate and distribute staking rewards?"
confidence: 9/10
sources_checked: 20
last_updated: "2026-02-16"
---

# Staking Reward Math

> **Decision:** How do I calculate and distribute staking rewards?

## Context

Staking reward distribution is where precision errors, rounding exploits, and first-depositor attacks silently drain protocols. A single miscalculation in share-to-asset conversion can turn a yield vault into a honeypot for sophisticated attackers. The math appears simple—distribute rewards proportionally to stakers—but implementation details determine whether your protocol survives first contact with MEV searchers.

On Solana, this matters even more because liquid staking tokens (LSTs) like Marinade's mSOL, Jito's jitoSOL, and BlazeStake's bSOL collectively manage over $10.7 billion in TVL. These protocols must handle epoch-based reward distribution (every 2-3 days), maintain accurate exchange rates between LST and SOL, prevent precision loss in integer math, and defend against donation attacks that manipulate share prices. The reward math you choose affects everything: gas costs, capital efficiency, vulnerability to exploits, and DeFi composability.

Getting reward distribution wrong has real consequences. In May 2025, Marinade Finance lost $5 million when validators exploited a backwards unstake algorithm for 126 epochs—quietly gaming flawed auction logic. Sorra Finance lost $41K when their staking contract failed to track distributed rewards, allowing repeated withdrawals. These aren't edge cases; they're what happens when reward math meets production.

## Options

### 1. Reward-Per-Token Accumulator

**Pattern:** Track a global `rewardPerToken` that accumulates over time. User rewards = `userBalance * (currentRewardPerToken - userStartRewardPerToken)`.

**Formula:**
```
rewardPerToken = lastRewardPerToken + (rewards * PRECISION / totalStaked)
userReward = userBalance * (rewardPerToken - userRewardDebt)
```

**Used by:** Synthetix, Uniswap V3 staking, most DeFi staking contracts

**Pros:**
- Constant-time reward distribution (O(1) regardless of user count)
- No loops over user arrays
- Highly gas-efficient for claiming
- Supports dynamic reward rates

**Cons:**
- Precision loss on low balances if PRECISION constant too small
- Requires careful integer math (multiply before divide)
- Users must update debt on every balance change
- First depositor can receive inflated rewards if not handled

**Solana considerations:** Works well with Solana's account model. Each user account stores `userRewardDebt`. Global `rewardPerToken` lives in pool state.

### 2. Share-Based (Exchange Rate) – LST Standard

**Pattern:** Mint shares on deposit. Share price appreciates as rewards accrue. Redeem shares for underlying at current exchange rate.

**Formula:**
```
sharesOnDeposit = depositAmount * totalShares / totalStaked
exchangeRate = (totalStaked + rewards - totalClaimed) / totalShares
assetsOnRedeem = userShares * exchangeRate
```

**Used by:** Marinade mSOL, Jito jitoSOL, BlazeStake bSOL, all major Solana LSTs

**Pros:**
- Simple mental model: share price goes up over time
- No per-user reward tracking needed
- DeFi composable: shares are tradeable ERC-20/SPL tokens
- Supports auto-compounding

**Cons:**
- Vulnerable to first-depositor inflation attack
- Rounding down can drain small depositors
- Exchange rate manipulation via donation attacks
- Initial share minting requires careful bootstrapping

**Solana LST implementation:**
- **mSOL:** `price = totalStaked / tokensMinted`—increases each epoch as staking rewards flow in
- **jitoSOL:** Similar to mSOL but adds MEV rewards on top of base staking yield
- **bSOL:** Staked across 200+ validators for maximum decentralization, same share-price model

**Critical vulnerability:** Empty vault + donation = first depositor gets 0 shares.

### 3. Epoch-Based Checkpointing

**Pattern:** Divide time into epochs. Calculate and lock rewards at epoch boundaries. Users claim proportional share of epoch reward pool.

**Formula:**
```
userEpochReward = (userStakedInEpoch / totalStakedInEpoch) * epochRewardPool
```

**Used by:** Solana native staking, Rocket Pool (Ethereum), Avalanche P-Chain

**Pros:**
- Matches Solana's native epoch model (2-3 day epochs)
- Natural batch processing
- Prevents mid-epoch gaming
- Simpler accounting per epoch boundary

**Cons:**
- Rewards delayed until epoch end
- Complex tracking if users stake/unstake mid-epoch
- Requires warm-up period (newly staked SOL not active until next epoch)
- Poor UX for users expecting instant yield

**Solana native staking:** SOL staked with validators activates in the next epoch. Rewards distributed at epoch boundaries based on validator performance and commission.

### 4. Streaming Rewards (Continuous Vesting)

**Pattern:** Rewards vest linearly over time. Calculate claimable amount based on time elapsed since last claim.

**Formula:**
```
claimableReward = userShare * rewardRate * (currentTime - lastClaimTime)
```

**Used by:** Curve veCRV gauges, Jito restaking vaults (kySOL), vesting schedules

**Pros:**
- Smooth reward distribution
- Prevents dump-and-exit attacks
- Encourages long-term holding
- Natural rate limiting

**Cons:**
- Gas cost scales with claim frequency
- Complex state if users have multiple positions
- Timestamp manipulation risks (less on Solana than EVM)
- Requires oracle for accurate time-based calculations

**Jito restaking pattern:** kySOL combines staking rewards (via jitoSOL), MEV rewards, and restaking yields—all with different vesting schedules.

## Key Trade-offs

| Approach | Gas Efficiency | Precision | DeFi Composability | Attack Surface | Best For |
|----------|---------------|-----------|-------------------|----------------|----------|
| **Reward-Per-Token** | Excellent (O(1)) | Good with high PRECISION | Medium (requires claim) | Low (if debt tracked correctly) | Protocol staking, simple yield farms |
| **Share-Based** | Excellent | Vulnerable to rounding | Excellent (tradeable shares) | HIGH (first-depositor, donation) | Liquid staking (LSTs), yield aggregators |
| **Epoch-Based** | Good (batch processing) | Excellent | Low (delayed rewards) | Low | Native staking, consensus protocols |
| **Streaming** | Poor (per-second calc) | Good | Medium | Medium (timestamp dependency) | Vesting, long-term incentives |

## Recommendation

**For Solana liquid staking tokens (LSTs):** Use share-based exchange rate model with **mandatory first-depositor protections**:

1. **Bootstrap with dead shares:** Mint 1000-10000 shares to `address(0)` or protocol treasury on initialization
2. **Implement virtual shares + assets:** Use OpenZeppelin's decimal offset pattern (10^decimalsOffset virtual shares)
3. **Minimum first deposit:** Require meaningful initial deposit (e.g., 1 SOL minimum)
4. **Monitor exchange rate:** Set bounds on acceptable rate changes per epoch

**For protocol staking rewards (governance, LP staking):** Use reward-per-token accumulator:

```rust
// Solana program pattern
pub struct StakingPool {
    pub reward_per_token: u128,  // scaled by 1e18
    pub last_update_time: i64,
    pub reward_rate: u64,        // tokens per second
    pub total_staked: u64,
}

pub struct UserStake {
    pub amount: u64,
    pub reward_debt: u128,       // rewardPerToken at last update
}

// Update global accumulator
fn update_reward_per_token(pool: &mut StakingPool, current_time: i64) {
    if pool.total_staked == 0 { return; }

    let time_delta = current_time - pool.last_update_time;
    let rewards = (pool.reward_rate as u128) * (time_delta as u128);

    // Multiply first to preserve precision
    pool.reward_per_token += (rewards * PRECISION) / (pool.total_staked as u128);
    pool.last_update_time = current_time;
}

// Calculate user pending rewards
fn pending_rewards(pool: &StakingPool, user: &UserStake) -> u64 {
    let accumulated = (user.amount as u128) *
                     (pool.reward_per_token - user.reward_debt);
    (accumulated / PRECISION) as u64
}
```

**For MEV + staking combos (Jito-style):** Hybrid approach:
- Base staking rewards: Share-based (jitoSOL exchange rate)
- MEV tips: Epoch-based distribution at epoch boundaries
- Restaking rewards: Streaming vesting for security commitment

**Critical implementation rules:**
- **Always multiply before divide** to minimize precision loss
- **Use 128-bit integers** for intermediate calculations
- **Scale by large constant** (1e18 or 1e9 depending on token decimals)
- **Check for zero totalSupply** before any division
- **Reentrancy guards** on claim/withdraw functions

## Lessons from Production

### First-Depositor Attack (Inflation Attack)

**What happened:** Empty ERC4626 vaults allow attacker to mint 1 wei share, donate large amount to vault, causing next depositor's shares to round to zero.

**Attack steps:**
1. Vault deployed with 0 shares, 0 assets
2. Attacker deposits 1 wei → receives 1 share
3. Attacker donates 10,000 tokens directly to vault (not via deposit)
4. Exchange rate = 10,000 tokens / 1 share = 10,000:1
5. Victim deposits 10,000 tokens
6. Victim shares = 10,000 * 1 / 10,000 = 1 (rounds down to 0 due to Solidity)
7. Attacker redeems 1 share → gets 20,000 tokens

**Real impact:** Affected multiple Solana stake pool implementations. Wise Finance lost funds to similar attack (Ethereum).

**Prevention:**
```rust
// Bootstrap pattern: mint dead shares on initialization
pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
    let pool = &mut ctx.accounts.pool;

    // Mint 1000 shares to burn address (never redeemable)
    pool.total_shares = 1000;
    pool.total_staked = 1000 * INITIAL_LAMPORTS_PER_SHARE;

    Ok(())
}

// Or: virtual offset (OpenZeppelin pattern)
fn convert_to_shares(assets: u64, pool: &StakingPool) -> u64 {
    let virtual_shares = 10_u64.pow(DECIMALS_OFFSET);  // 1e8
    let virtual_assets = 1_u64;

    if pool.total_shares == 0 {
        return assets;  // First real deposit
    }

    ((assets as u128) * (pool.total_shares + virtual_shares) as u128
     / (pool.total_staked + virtual_assets) as u128) as u64
}
```

### Marinade Validator Gaming (May 2025)

**What happened:** Marinade's Stake Auction Market (SAM) used backwards comparison logic. Validators bid for stake delegation. Flawed code kicked out highest bidders instead of lowest.

**The exploit:**
- Validators bid high to win stake → got selected
- Immediately dropped bid to near-zero (dust)
- Broken logic kept them in pool instead of removing them
- Low-performing validators earned fees while contributing minimal rewards
- Ran for 126 epochs (8+ months) undetected

**Cost:** $5 million in lost yield to mSOL holders

**Root cause:**
```rust
// Intended: remove validators with lowest bids
// Actual: removed validators with highest bids
if validator.bid > threshold {  // BACKWARDS
    remove_validator(validator);
}

// Should be:
if validator.bid < threshold {
    remove_validator(validator);
}
```

**Lesson:** Reward distribution logic must be **adversarially tested**. Validators/stakers are economically incentivized to find edge cases.

### Sorra Finance Repeated Withdrawal (Jan 2025)

**What happened:** `getPendingRewards()` calculated rewards without tracking previous withdrawals. Attacker called `withdraw()` repeatedly, claiming same rewards multiple times.

**The bug:**
```solidity
function getPendingRewards() public view returns (uint256) {
    uint256 duration = block.timestamp - user.lastStakeTime;
    return user.stakedAmount * duration * rewardRate;
    // Missing: subtract already-claimed rewards
}

function withdraw() public {
    uint256 rewards = getPendingRewards();
    token.transfer(msg.sender, rewards);  // No state update!
}
```

**Cost:** 3,071,721 SOR tokens drained ($41K)

**Fix:**
```rust
pub struct UserStake {
    pub amount: u64,
    pub last_claim_time: i64,
    pub total_claimed: u64,  // Track cumulative claims
}

pub fn claim_rewards(ctx: Context<Claim>) -> Result<()> {
    let user = &mut ctx.accounts.user_stake;
    let pool = &ctx.accounts.pool;

    let pending = calculate_pending(user, pool, Clock::get()?.unix_timestamp);

    // Transfer rewards
    transfer_tokens(ctx, pending)?;

    // Update state BEFORE transfer completes
    user.total_claimed += pending;
    user.last_claim_time = Clock::get()?.unix_timestamp;

    Ok(())
}
```

### Precision Loss in Integer Division

**Scenario:** Small stakers receive 0 rewards due to rounding.

**Example:**
```rust
// Bad: precision lost
let user_reward = (user_amount * total_rewards) / total_staked;
// User: 100 tokens staked
// Pool: 10,000,000 tokens staked
// Rewards: 50 tokens
// Calc: (100 * 50) / 10,000,000 = 5,000 / 10,000,000 = 0

// Good: scale up intermediate values
const PRECISION: u128 = 1_000_000_000_000_000_000;  // 1e18
let user_reward = ((user_amount as u128) * (total_rewards as u128) * PRECISION
                  / (total_staked as u128)) / PRECISION;
// Calc: (100 * 50 * 1e18) / 10,000,000 / 1e18 = 500
```

**Real case:** Early Solana stake pool implementations lost fractions of lamports per transaction. Scaled to millions of transactions = meaningful value leaked.

**Prevention:**
- Use u128 for intermediate calculations
- Multiply by large constant (1e9 for SOL due to 9 decimals, 1e18 for precision)
- Always multiply before divide
- Check result != 0 before recording claim

### SwissBorg Kiln API Exploit (Sep 2025)

**What happened:** SwissBorg's Solana Earn program used third-party Kiln API for staking. Hackers compromised Kiln API, drained 192,600 SOL ($41M).

**Lesson:** Staking reward calculations that depend on external oracles/APIs introduce trust assumptions.

**Mitigation:**
- Calculate rewards on-chain using Solana's native epoch reward data
- If using oracle, require multi-sig threshold (N of M oracles must agree)
- Set bounds on acceptable reward rate changes
- Implement circuit breakers for anomalous distributions

## Sources

- [Marinade Finance Validator Gaming Exploit - Rekt News](https://rekt.news/slow-roasted-stake) — detailed breakdown of 126-epoch validator gaming attack
- [Marinade mSOL Documentation](https://docs.marinade.finance/marinade-protocol/protocol-overview/marinade-liquid/what-is-msol) — share-based exchange rate formula used by mSOL
- [Jito Foundation: Liquid Staking Basics](https://www.jito.network/docs/jitosol/jitosol-liquid-staking/liquid-staking-basics/) — jitoSOL architecture and MEV reward distribution
- [DeFi Staking Rewards Explanation (GitHub)](https://github.com/TSxo/staking-rewards) — reward-per-token accumulator pattern with Foundry tests
- [OpenZeppelin ERC4626 Inflation Attack Defense](https://www.openzeppelin.com/news/a-novel-defense-against-erc4626-inflation-attacks) — virtual shares + decimals offset pattern
- [Shieldify: Inflation Attack From Idea to Code](https://www.shieldify.org/post/inflation-attack) — step-by-step attack walkthrough with mitigations
- [Sorra Finance Hack Analysis - QuillAudits](https://www.quillaudits.com/blog/hack-analysis/sorra-finance-hack-smart-contract-exploit) — repeated withdrawal bug due to missing state tracking
- [Solana Stake Pool Audit - OtterSec PDF](https://resources.cryptocompare.com/asset-management/17259/1727966398210.pdf) — front-run deposits vulnerability in SPL stake pool
- [Helius: Solana Program Security Guide](https://www.helius.dev/blog/a-hitchhikers-guide-to-solana-program-security) — Solana-specific attack vectors and mitigations
- [Cantina: Securing Solana Developer Guide](https://cantina.xyz/blog/securing-solana-a-developers-guide) — precision truncation and account validation issues
- [Rocket Pool RPIP-53 Rewards Specification](https://rpips.rocketpool.net/assets/rpip-53/rewards-calculation-spec) — integer arithmetic rules for reward calculations
- [SSR: Safeguarding Staking Rewards (arXiv)](https://arxiv.org/html/2601.05827v1) — taxonomy of staking reward defects including SVM and RT vulnerabilities
- [Uniswap V3 Staker RewardMath.sol](https://github.com/Uniswap/v3-staker/blob/4328b957701de8bed83689aa22c32eda7928d5ab/contracts/libraries/RewardMath.sol) — production reward-per-token implementation
- [DEV Community: Detecting ERC4626 First Depositor Attack](https://dev.to/ohmygod/how-to-detect-erc4626-first-depositor-attack-a-security-researchers-guide-19bo) — security researcher patterns for auditing vaults
- [Euler Finance: Exchange Rate Manipulation in ERC4626](https://www.euler.finance/blog/exchange-rate-manipulation-in-erc4626-vaults) — donation attacks and oracle manipulation
- [The DeFi Report: Solana Liquid Staking Thesis](https://thedefireport.substack.com/p/solana-liquid-staking-revisiting) — Jito vs Marinade comparison with TVL data
- [Marinade vs Jito Comparison](https://marinade.finance/blog/marinade-vs-jito) — validator set distribution and fee structures
- [Everstake: Lessons in Validator Ethics](https://everstake.one/blog/lessons-in-validator-ethics-from-a-recent-delegation-mechanism-exploit) — Marinade auction mechanism exploitation details
- [Kyros Liquid Restaking - Messari Report](https://messari.io/report/kyros-the-rise-of-solana-liquid-restaking) — kySOL architecture combining multiple reward streams
- [StakePoint: jitoSOL vs mSOL vs bSOL (2026)](https://stakepoint.app/blog/jitosol-vs-msol-vs-bsol-best-solana-liquid-staking-2026) — current APY rates and validator distribution

## Gaps & Caveats

**What's still uncertain:**

- **MEV reward predictability:** Jito's MEV rewards fluctuate based on network activity. No reliable formula exists for projecting MEV yield beyond historical averages.

- **Validator slashing on Solana:** Currently Solana has no slashing mechanism (unlike Ethereum). If/when slashing is implemented, reward math must account for negative balance changes.

- **Cross-program reward aggregation:** Protocols like Kyros combine staking (jitoSOL) + restaking (Jito NCN) + DeFi yield. No standardized accounting framework exists for calculating combined APY across multiple yield sources.

- **Epoch boundary edge cases:** What happens if a user stakes 1 lamport before epoch boundary and unstakes immediately after? Do they receive full epoch rewards or prorated? Different protocols handle this differently.

- **Inflation rate changes:** Solana's inflation schedule decreases 15% per year until reaching 1.5% long-term rate. LST exchange rate formulas must account for declining base yield over time.

**Known limitations:**

- Most Solana LSTs use simple division for share calculations. With 9-decimal SOL, precision loss on small amounts (<0.001 SOL) is unavoidable.

- Native Solana staking has 2-3 day warmup/cooldown periods. No LST can eliminate this—instant unstake requires liquidity pools.

- Validator performance varies. Even with 100+ validator delegation, actual APY can differ from projected due to downtime, commission changes, and MEV capture efficiency.

**Under-documented patterns:**

- How to handle rewards when totalSupply drops to zero mid-epoch (all users exit)
- Optimal PRECISION constant for different token decimal counts
- Gas-optimal claim strategies when users have multiple staking positions
- Integration patterns for LSTs used as collateral in lending protocols (compounding exchange rate affects liquidation math)
