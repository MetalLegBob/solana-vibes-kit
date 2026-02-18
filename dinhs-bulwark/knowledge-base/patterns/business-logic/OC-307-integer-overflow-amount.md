# OC-307: Integer Overflow in Amount Calculation

**Category:** Business Logic
**Severity:** HIGH
**Auditors:** LOGIC-02
**CWE:** CWE-190 (Integer Overflow or Wraparound)
**OWASP:** A04:2021 – Insecure Design

## Description

Integer overflow in amount calculations occurs when arithmetic operations on financial values exceed the maximum representable value of the data type, causing the result to wrap around to a small or negative number. In JavaScript, `Number.MAX_SAFE_INTEGER` (2^53 - 1, or 9,007,199,254,740,991) is the largest integer that can be represented exactly. In Rust (used by Solana programs), `u64::MAX` is 18,446,744,073,709,551,615. When computations exceed these limits without overflow checks, the results silently produce incorrect values.

The Cetus Protocol exploit (May 2025, ~$223M stolen on Sui blockchain) was caused by an arithmetic overflow bug in the AMM's tick math. The attacker manipulated input parameters to trigger an overflow in the liquidity calculation, allowing them to extract far more tokens than their position warranted. The Truebit Protocol hack (January 2026, ~$26.4M stolen) exploited an integer overflow in the token purchase logic -- the attacker used a loop to manipulate large input values and trigger incorrect ETH calculations, enabled by Solidity ^0.6.10 which lacks built-in overflow checks.

In off-chain JavaScript/TypeScript code, integer overflow is more subtle than in Solidity because JavaScript silently loses precision rather than wrapping. When values exceed `MAX_SAFE_INTEGER`, arithmetic becomes imprecise: `Number.MAX_SAFE_INTEGER + 2 === Number.MAX_SAFE_INTEGER + 1` evaluates to `true`. For token amounts with 9+ decimals, this precision boundary can be reached with quantities in the billions.

## Detection

```
grep -rn "MAX_SAFE_INTEGER\|Number\.MAX\|Number\.isSafeInteger" --include="*.ts" --include="*.js"
grep -rn "amount\s*\*\|balance\s*\*\|quantity\s*\*" --include="*.ts" --include="*.js"
grep -rn "parseInt\|Number(\|parseFloat" --include="*.ts" --include="*.js" | grep -i "amount\|balance\|price"
grep -rn "BigInt\|bigint\|BigNumber\|BN(" --include="*.ts" --include="*.js"
grep -rn "checked_add\|checked_mul\|checked_sub" --include="*.rs"
```

Look for: multiplication of two large numeric values (e.g., amount * price * 10^decimals); absence of overflow checks in arithmetic chains; conversion of large `BigInt` or `BN` values to `Number`; Rust arithmetic using `+`, `-`, `*` without `checked_` variants; token amount calculations that multiply by 10^9 or 10^18.

## Vulnerable Code

```typescript
// VULNERABLE: Integer overflow in JavaScript amount calculations
function calculateTotalValue(
  tokenAmount: number,
  pricePerToken: number,
  decimals: number
) {
  // If tokenAmount = 5_000_000_000 and decimals = 9:
  // 5_000_000_000 * 1_000_000_000 = 5e18, exceeds MAX_SAFE_INTEGER (9e15)
  const rawAmount = tokenAmount * Math.pow(10, decimals);
  const totalValue = rawAmount * pricePerToken;
  return totalValue; // Silently imprecise!
}

// VULNERABLE: Unsafe BigInt-to-Number conversion
function lamportsToUsd(lamports: bigint, solPrice: number): number {
  // Number(lamports) loses precision for large values
  const sol = Number(lamports) / 1e9;
  return sol * solPrice;
}

// VULNERABLE: Rust without overflow protection (Solana program)
// pub fn calculate_reward(stake: u64, rate: u64, duration: u64) -> u64 {
//     stake * rate * duration / 1_000_000  // Can overflow on multiplication
// }
```

## Secure Code

```typescript
// SECURE: Use BigInt for token amount arithmetic
function calculateTotalValue(
  tokenAmount: bigint,
  priceNumerator: bigint,
  priceDenominator: bigint,
  decimals: number
): string {
  const scaleFactor = BigInt(10 ** decimals);

  // All arithmetic in BigInt — no precision loss
  const rawValue = tokenAmount * priceNumerator;
  const totalValue = rawValue / priceDenominator;

  // Convert to display string only at the end
  const whole = totalValue / scaleFactor;
  const fraction = (totalValue % scaleFactor).toString().padStart(decimals, "0");
  return `${whole}.${fraction}`;
}

// SECURE: Safe lamport conversion
function lamportsToUsd(lamports: bigint, solPriceCents: bigint): string {
  // Keep everything in BigInt: lamports * priceCents / (1e9 * 100)
  const usdCents = (lamports * solPriceCents) / BigInt(1e9);
  const dollars = usdCents / 100n;
  const cents = (usdCents % 100n).toString().padStart(2, "0");
  return `${dollars}.${cents}`;
}

// SECURE: Rust with checked arithmetic (Solana program)
// pub fn calculate_reward(stake: u64, rate: u64, duration: u64) -> Result<u64> {
//     let product = (stake as u128)
//         .checked_mul(rate as u128)
//         .ok_or(ErrorCode::MathOverflow)?
//         .checked_mul(duration as u128)
//         .ok_or(ErrorCode::MathOverflow)?;
//     let result = product.checked_div(1_000_000)
//         .ok_or(ErrorCode::MathOverflow)?;
//     u64::try_from(result).map_err(|_| ErrorCode::MathOverflow.into())
// }
```

## Impact

Integer overflow in financial calculations can produce wildly incorrect amounts: overflowed values may be near-zero (allowing purchases at negligible cost) or astronomically large (enabling extraction of excessive funds). In the Cetus Protocol exploit, the attacker extracted ~$223M by triggering an overflow in liquidity math. In the Truebit hack, ~$26.4M was stolen via overflow in token purchase calculations. In off-chain JavaScript, precision loss above MAX_SAFE_INTEGER silently corrupts financial accounting.

## References

- Cetus Protocol Exploit: ~$223M loss via arithmetic overflow (May 2025) — https://www.quillaudits.com/blog/hack-analysis/cetus-protocol-hack-analysis
- Truebit Protocol Hack: $26.4M via integer overflow (January 2026) — https://www.kucoin.com/news/flash/truebit-protocol-hacked-for-26-44m-due-to-integer-overflow-vulnerability
- CVE-2025-3277: Integer overflow in SQLite concat_ws() — https://www.cve.news/cve-2025-3277/
- Sec3: Understanding Arithmetic Overflow/Underflows in Rust and Solana — https://www.sec3.dev/blog/understanding-arithmetic-overflow-underflows-in-rust-and-solana-smart-contracts
- SlowMist: Solana Smart Contract Security Best Practices — integer overflow section
- CWE-190: Integer Overflow or Wraparound — https://cwe.mitre.org/data/definitions/190.html
