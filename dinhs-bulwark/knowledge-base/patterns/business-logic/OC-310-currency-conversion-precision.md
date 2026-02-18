# OC-310: Currency Conversion Precision Loss

**Category:** Business Logic
**Severity:** MEDIUM
**Auditors:** LOGIC-02
**CWE:** CWE-681 (Incorrect Conversion between Numeric Types)
**OWASP:** A04:2021 – Insecure Design

## Description

Currency conversion precision loss occurs when converting between currencies (fiat-to-fiat, fiat-to-crypto, or between token denominations) using imprecise arithmetic or inappropriate rounding strategies. Each conversion step introduces a potential rounding error, and round-trip conversions (A -> B -> A) can systematically lose or gain value. When these errors are predictable and directional, they become exploitable.

A historical example from the Euro adoption (December 2001) illustrates the issue: when Belgian Francs were converted to euros at the official rate of 40.3399 BEF per euro, merchants exploited the mandatory rounding to nearest cent. Round-trip conversions (BEF -> EUR -> BEF) amplified these errors, and consumer watchdog Test-Achats documented systematic overcharging. The same pattern applies to any multi-hop currency conversion: USD -> EUR -> JPY -> USD will not return the original amount.

In crypto applications, this problem is amplified by the diversity of token decimals. SOL uses 9 decimals, USDC uses 6, and Bitcoin uses 8. Converting between tokens with different decimal places requires careful handling to avoid truncation. An off-chain service that computes swap amounts, aggregates prices across DEXes with different decimal conventions, or converts between on-chain units and display units is vulnerable if it uses floating-point arithmetic or rounds in the wrong direction at conversion boundaries.

## Detection

```
grep -rn "convert\|exchange\|swap.*rate\|rate.*swap" --include="*.ts" --include="*.js"
grep -rn "exchangeRate\|conversionRate\|fxRate" --include="*.ts" --include="*.js"
grep -rn "decimals\|DECIMALS\|\.decimals" --include="*.ts" --include="*.js"
grep -rn "10\s*\*\*\s*\d\|1e[0-9]\|Math\.pow(10" --include="*.ts" --include="*.js"
grep -rn "toFixed.*convert\|parseFloat.*convert" --include="*.ts" --include="*.js"
```

Look for: multiple sequential conversions that multiply or divide by exchange rates; floating-point arithmetic in conversion functions; inconsistent handling of token decimals (e.g., mixing 6-decimal USDC and 9-decimal SOL without explicit scaling); round-trip conversions without precision guarantees; conversion functions that use `Number()` or `parseFloat()` on large token amounts.

## Vulnerable Code

```typescript
// VULNERABLE: Floating-point currency conversion with precision loss
function convertUsdToEur(amountUsd: number, rate: number): number {
  return parseFloat((amountUsd * rate).toFixed(2));
}

function convertEurToUsd(amountEur: number, rate: number): number {
  return parseFloat((amountEur / rate).toFixed(2));
}

// Round-trip: $100.00 -> EUR -> USD may not return $100.00
// $100.00 * 0.92 = $92.00 EUR, $92.00 / 0.92 = $99.999... -> $100.00 (lucky)
// But: $33.33 * 0.92 = $30.6636 -> $30.66, $30.66 / 0.92 = $33.326... -> $33.33
// Not always lucky: $10.15 * 0.92 = $9.338 -> $9.34, $9.34 / 0.92 = $10.152... -> $10.15

// VULNERABLE: Token conversion losing precision across decimal places
function solToUsdc(solAmount: number, solPrice: number): number {
  // SOL has 9 decimals, USDC has 6 — this loses 3 decimals of precision
  const usdcAmount = solAmount * solPrice;
  return Math.floor(usdcAmount * 1e6) / 1e6; // Truncation compounds
}
```

## Secure Code

```typescript
import Big from "big.js";

// SECURE: Arbitrary-precision currency conversion
function convertCurrency(
  amount: string,
  rate: string,
  targetDecimals: number,
  roundingMode: 0 | 1 | 2 | 3 = Big.roundHalfEven
): string {
  const result = new Big(amount).times(rate);
  return result.round(targetDecimals, roundingMode).toFixed(targetDecimals);
}

// SECURE: Token conversion with explicit decimal handling using BigInt
function convertTokenAmount(
  amount: bigint,
  sourceDecimals: number,
  targetDecimals: number,
  rateNumerator: bigint,
  rateDenominator: bigint
): bigint {
  // Scale to common precision first, then apply rate
  const decimalDiff = targetDecimals - sourceDecimals;
  let scaled: bigint;

  if (decimalDiff >= 0) {
    scaled = amount * BigInt(10 ** decimalDiff);
  } else {
    // When reducing decimals, round conservatively (truncate)
    scaled = amount / BigInt(10 ** Math.abs(decimalDiff));
  }

  // Apply exchange rate: amount * numerator / denominator
  // Multiply first to preserve precision, divide last
  return (scaled * rateNumerator) / rateDenominator;
}

// Example: Convert 1.5 SOL to USDC at $150/SOL
// convertTokenAmount(1_500_000_000n, 9, 6, 150n, 1n)
// = (1_500_000_000n / 1000n) * 150n / 1n = 225_000_000n (225 USDC)
```

## Impact

Currency conversion precision loss causes financial discrepancies in cross-currency transactions. Systematic rounding in one direction enables arbitrage: an attacker can repeatedly convert back and forth, extracting fractions of a cent each time. In high-frequency trading, these fractions compound rapidly. In crypto, imprecise token conversions can cause slippage beyond what is expected, shortchanging users or creating exploitable price discrepancies between platforms.

## References

- Belgian Franc/Euro conversion rounding exploitation (2001) — documented by Test-Achats consumer organization
- The Sneaky Cost of Precision: How Currency Conversion Can Keep A Team Up All Night — https://medium.com/@rana.co/the-sneaky-cost-of-precision-how-currency-conversion-can-keep-a-team-up-all-night-b7c23360d1fa
- Modern Treasury: Floats Don't Work For Storing Cents — https://www.moderntreasury.com/journal/floats-dont-work-for-storing-cents
- CWE-681: Incorrect Conversion between Numeric Types — https://cwe.mitre.org/data/definitions/681.html
- Atomic Object: Floating Point Numbers and Currency Rounding Errors — https://spin.atomicobject.com/currency-rounding-errors/
