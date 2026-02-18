# OC-305: Floating-Point for Financial Calculations

**Category:** Business Logic
**Severity:** HIGH
**Auditors:** LOGIC-02
**CWE:** CWE-681 (Incorrect Conversion between Numeric Types)
**OWASP:** A04:2021 – Insecure Design

## Description

Using IEEE 754 floating-point numbers (`Number` type in JavaScript/TypeScript, `float`/`double` in other languages) for financial calculations introduces precision errors that can accumulate over time and produce incorrect monetary values. The classic demonstration is `0.1 + 0.2 === 0.30000000000000004` in JavaScript -- a result that is unacceptable in any financial system.

JavaScript's `Number` type is a 64-bit double-precision float with only 52 bits of mantissa, providing roughly 15-17 significant decimal digits. Values like 0.1 and 0.2 cannot be represented exactly in binary floating-point, leading to small errors that compound through arithmetic operations. Modern Treasury's engineering blog documents this as a fundamental architecture decision: they use integers (cents) exclusively and never convert to floating-point.

In Solana/DeFi off-chain applications, this is especially dangerous. Token amounts are natively stored as integers (lamports for SOL, smallest unit for SPL tokens), but off-chain services frequently convert these to floating-point for display, calculation, and fee computation. A yield calculation service that uses `parseFloat()` to compute rewards across thousands of positions can accumulate errors of multiple dollars or more. The Balancer V2 exploit ($94-128M, November 2025) demonstrated how rounding errors in pool math can be exploited for catastrophic fund drainage.

## Detection

```
grep -rn "parseFloat\|toFixed\|\.toFixed(" --include="*.ts" --include="*.js"
grep -rn "price\s*\*\|amount\s*\*\|balance\s*\*" --include="*.ts" --include="*.js"
grep -rn "Math\.round.*price\|Math\.floor.*amount" --include="*.ts" --include="*.js"
grep -rn "Number(.*amount\|Number(.*price" --include="*.ts" --include="*.js"
grep -rn "total\s*[+\-*/]=\s*" --include="*.ts" --include="*.js"
```

Look for: financial arithmetic using native `+`, `-`, `*`, `/` operators on decimal values; `parseFloat()` applied to monetary strings; `toFixed()` used for intermediate calculations (not just display); absence of BigNumber/Decimal libraries; token amounts converted to floating-point for computation and then back to integer.

## Vulnerable Code

```typescript
// VULNERABLE: Floating-point arithmetic for financial calculations
function calculateInvoiceTotal(items: Array<{ price: number; qty: number }>) {
  let subtotal = 0;
  for (const item of items) {
    subtotal += item.price * item.qty; // Floating-point multiplication
  }

  const taxRate = 0.0825;
  const tax = subtotal * taxRate; // Compounds floating-point error
  const total = subtotal + tax;

  // toFixed returns a STRING but devs often parseFloat it back
  return parseFloat(total.toFixed(2)); // Still imprecise!
}

// Example: 100 items at $1.01 each
// Expected: subtotal = $101.00, tax = $8.3325, total = $109.33
// Actual: may produce $109.32 or $109.34 depending on accumulation

function convertTokenAmount(lamports: bigint, decimals: number): number {
  // VULNERABLE: Converting bigint to float loses precision for large values
  return Number(lamports) / Math.pow(10, decimals);
}
```

## Secure Code

```typescript
import Big from "big.js";

// SECURE: Use arbitrary-precision decimal arithmetic
function calculateInvoiceTotal(items: Array<{ price: string; qty: number }>) {
  let subtotal = new Big(0);
  for (const item of items) {
    subtotal = subtotal.plus(new Big(item.price).times(item.qty));
  }

  const taxRate = new Big("0.0825");
  const tax = subtotal.times(taxRate).round(2, Big.roundHalfEven);
  const total = subtotal.plus(tax);

  return {
    subtotal: subtotal.toFixed(2),
    tax: tax.toFixed(2),
    total: total.toFixed(2),
  };
}

// ALTERNATIVE: Integer arithmetic using smallest currency unit (cents)
function calculateInvoiceTotalCents(
  items: Array<{ priceInCents: number; qty: number }>
) {
  const subtotalCents = items.reduce(
    (sum, item) => sum + item.priceInCents * item.qty, 0
  );

  // Tax calculation in cents, rounded
  const taxCents = Math.round(subtotalCents * 0.0825);
  const totalCents = subtotalCents + taxCents;

  return { subtotalCents, taxCents, totalCents };
}

// SECURE: Token amount conversion preserving precision
function formatTokenAmount(lamports: bigint, decimals: number): string {
  const divisor = BigInt(10 ** decimals);
  const whole = lamports / divisor;
  const fraction = (lamports % divisor).toString().padStart(decimals, "0");
  return `${whole}.${fraction}`;
}
```

## Impact

Floating-point errors in financial calculations cause incorrect charges, over- or under-payment of invoices, accounting discrepancies that compound over time, and exploitable arbitrage. In high-volume systems processing thousands of transactions per second, penny-fraction errors accumulate into material losses. In DeFi, imprecise token calculations can create exploitable price discrepancies between expected and actual amounts, as demonstrated by the Balancer V2 rounding error exploit.

## References

- Balancer V2 Exploit: $94-128M rounding error exploitation (November 2025) — https://medium.com/balancer-protocol/nov-3-exploit-post-mortem-51dcbeb6b020
- OpenZeppelin analysis of Balancer V2 exploit — https://www.openzeppelin.com/news/understanding-the-balancer-v2-exploit
- David Goldberg: What Every Computer Scientist Should Know About Floating-Point Arithmetic (1991)
- Modern Treasury: Why We Use Integers for Cents — https://www.moderntreasury.com/journal/floats-dont-work-for-storing-cents
- Robin Wieruch: JavaScript Rounding Errors in Financial Applications — https://robinwieruch.de/javascript-rounding-errors
- CWE-681: Incorrect Conversion between Numeric Types — https://cwe.mitre.org/data/definitions/681.html
