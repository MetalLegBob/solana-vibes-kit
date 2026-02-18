# OC-312: Reward/Yield Calculation Overflow

**Category:** Business Logic
**Severity:** HIGH
**Auditors:** LOGIC-02
**CWE:** CWE-190 (Integer Overflow or Wraparound), CWE-682 (Incorrect Calculation)
**OWASP:** A04:2021 – Insecure Design

## Description

Reward and yield calculation overflow occurs when the arithmetic used to compute staking rewards, interest accrual, or yield farming payouts exceeds the representable range of the data type, producing wildly incorrect results. Unlike general integer overflow (OC-307), this pattern is specific to compounding and time-based calculations where exponential growth or large multiplier chains create overflow conditions.

Yield calculations typically involve formulas like `reward = stakedAmount * rewardRate * duration / PRECISION`. When `stakedAmount` and `duration` are both large, their product can overflow even 64-bit integers. Compounding formulas (APY calculations) involve exponentiation, which grows far faster than linear multiplication. The Yearn yETH exploit (November 2025, ~$9M) demonstrated a related vulnerability: the attacker exploited numerical instability in a fixed-point iteration solver, causing the pool's product term to collapse to zero and effectively switching the pool from a stableswap invariant to a constant-sum invariant, then triggering arithmetic underflow to mint 235 septillion LP tokens from just 16 wei.

In off-chain services, yield calculations are performed to display estimated rewards, compute actual payout amounts, and aggregate yields across multiple positions. If the off-chain yield calculation overflows and produces a near-zero or inflated value, the subsequent on-chain payout instruction will be for the wrong amount. Even when the on-chain program has overflow protection, the off-chain service may compute and display incorrect APY figures, leading to user confusion or exploitation of display-driven arbitrage.

## Detection

```
grep -rn "reward\|yield\|apy\|apr\|interest\|accrual" --include="*.ts" --include="*.js"
grep -rn "compound\|compounding\|Math\.pow\|exponential" --include="*.ts" --include="*.js"
grep -rn "duration\s*\*\|elapsed\s*\*\|timespan\s*\*" --include="*.ts" --include="*.js"
grep -rn "PRECISION\|SCALE\|MULTIPLIER\|1e18\|1e9" --include="*.ts" --include="*.js"
grep -rn "rate\s*\*\*\|rate\s*\^" --include="*.ts" --include="*.js"
grep -rn "checked_mul\|checked_pow\|checked_add" --include="*.rs"
```

Look for: multiplication chains involving stake amounts, rates, and durations; exponentiation in compound interest formulas; large precision multipliers (1e18, 1e9); absence of overflow checks or BigInt usage in yield math; yield calculations that combine user-controlled values (stake amount, chosen duration) with protocol parameters (rate, precision) without range validation.

## Vulnerable Code

```typescript
// VULNERABLE: Overflow in yield calculation
function calculateStakingReward(
  stakedLamports: number,
  annualRateBps: number,
  stakeDurationSeconds: number
): number {
  const SECONDS_PER_YEAR = 365.25 * 24 * 3600;
  const PRECISION = 10000;

  // stakedLamports = 5e12 (5000 SOL), annualRateBps = 500 (5%)
  // stakeDurationSeconds = 31557600 (1 year)
  // Intermediate: 5e12 * 500 * 31557600 = 7.889e22
  // Exceeds Number.MAX_SAFE_INTEGER (9e15) — silently imprecise!
  const reward =
    (stakedLamports * annualRateBps * stakeDurationSeconds) /
    (PRECISION * SECONDS_PER_YEAR);

  return Math.floor(reward);
}

// VULNERABLE: Compounding calculation overflow
function calculateCompoundYield(
  principal: number,
  ratePerPeriod: number,
  periods: number
): number {
  // Math.pow can produce Infinity for large periods
  // Or lose precision for small rates and many periods
  return principal * Math.pow(1 + ratePerPeriod, periods);
}
```

## Secure Code

```typescript
// SECURE: BigInt-based yield calculation with overflow protection
function calculateStakingReward(
  stakedLamports: bigint,
  annualRateBps: bigint,
  stakeDurationSeconds: bigint
): bigint {
  const SECONDS_PER_YEAR = 31557600n; // 365.25 * 24 * 3600
  const BPS_DENOMINATOR = 10000n;

  // Order of operations: multiply first (preserves precision),
  // divide last (single truncation point)
  // No overflow: BigInt has arbitrary precision
  const numerator = stakedLamports * annualRateBps * stakeDurationSeconds;
  const denominator = BPS_DENOMINATOR * SECONDS_PER_YEAR;

  return numerator / denominator;
}

// SECURE: Safe compound yield using iterative approach with BigInt
function calculateCompoundYield(
  principalCents: bigint,
  rateNumerator: bigint,  // e.g., 5 for 5%
  rateDenominator: bigint, // e.g., 100
  periods: number
): bigint {
  if (periods < 0 || periods > 365 * 30) {
    throw new Error("Invalid compounding periods");
  }

  let result = principalCents;
  const PRECISION = 1_000_000n; // Extra precision for intermediate calcs

  for (let i = 0; i < periods; i++) {
    // result = result * (1 + rate/denom) with precision scaling
    result = (result * (rateDenominator * PRECISION + rateNumerator * PRECISION))
      / (rateDenominator * PRECISION);
  }

  return result;
}

// SECURE: Validate inputs are within sane ranges
function validateYieldInputs(
  stakedAmount: bigint,
  rateBps: bigint,
  durationSeconds: bigint
): void {
  if (stakedAmount <= 0n) throw new Error("Stake must be positive");
  if (rateBps <= 0n || rateBps > 100_000n) throw new Error("Invalid rate");
  if (durationSeconds <= 0n || durationSeconds > 315576000n) {
    throw new Error("Duration must be between 0 and 10 years");
  }
}
```

## Impact

Overflow in yield calculations can produce wildly incorrect reward amounts. If the overflow produces a near-zero value, stakers are shortchanged. If it wraps around to a large value, the protocol may pay out far more rewards than intended, draining the reward pool. In the Yearn yETH exploit, arithmetic underflow in the supply calculation enabled minting an astronomically large number of tokens, leading to $9M in losses. Off-chain yield miscalculation can cause incorrect APY display (misleading users), wrong payout amounts in reward distribution transactions, and exploitable discrepancies between displayed and actual yields.

## References

- Yearn yETH Exploit: $9M via numerical solver flaw and arithmetic underflow (November 2025) — https://research.checkpoint.com/2025/16-wei/
- Yearn yETH Post-Mortem by SlowMist — https://slowmist.medium.com/9-million-stolen-analysis-of-the-yearn-yeth-pool-vulnerability-557237092054
- Yearn yETH analysis by Verichains — https://blog.verichains.io/p/yearn-finance-and-the-16-wei-deposit
- Cetus Protocol Exploit: ~$223M via overflow in AMM math (May 2025) — https://www.quillaudits.com/blog/hack-analysis/cetus-protocol-hack-analysis
- Sec3: Understanding Arithmetic Overflow/Underflows in Rust and Solana — https://www.sec3.dev/blog/understanding-arithmetic-overflow-underflows-in-rust-and-solana-smart-contracts
- CWE-190: Integer Overflow or Wraparound — https://cwe.mitre.org/data/definitions/190.html
