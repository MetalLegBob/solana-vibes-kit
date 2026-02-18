# OC-306: Rounding Error Accumulation

**Category:** Business Logic
**Severity:** MEDIUM
**Auditors:** LOGIC-02
**CWE:** CWE-682 (Incorrect Calculation)
**OWASP:** A04:2021 – Insecure Design

## Description

Rounding error accumulation occurs when repeated rounding operations across multiple calculations cause cumulative drift from the mathematically correct result. While a single rounding operation might introduce a sub-cent error, applying rounding at each step of a multi-step calculation (subtotal per line item, then tax per line item, then sum of taxes) compounds these errors. This is the real-world version of the "Office Space" / "Superman III" attack: collecting fractions of cents across millions of transactions.

The problem manifests in several common patterns: rounding line items individually versus computing the total first then rounding once; applying percentage-based discounts and taxes at each step; and "round-trip" conversions between currencies or denomination units. Shopify's engineering blog on "hanging pennies" describes how their platform handles this at scale, noting that even $0.01 discrepancies per order become material at millions of daily transactions.

In DeFi, rounding error accumulation is critical in yield calculations, fee distributions, and liquidity pool share computations. The Balancer V2 exploit (November 2025, ~$94M stolen) was fundamentally a rounding error exploitation: the attacker found that rounding direction in pool math could be systematically exploited to drain funds. The Yearn yETH exploit (November 2025, ~$9M stolen) demonstrated how arithmetic underflow in supply calculations enabled minting 235 septillion tokens from a 16-wei deposit.

## Detection

```
grep -rn "\.toFixed\|Math\.round\|Math\.floor\|Math\.ceil" --include="*.ts" --include="*.js"
grep -rn "\.round(\|\.dp(\|\.decimalPlaces(" --include="*.ts" --include="*.js"
grep -rn "ROUND_DOWN\|ROUND_UP\|ROUND_HALF" --include="*.ts" --include="*.js"
grep -rn "for.*total\s*+=.*round\|for.*sum\s*+=.*toFixed" --include="*.ts" --include="*.js"
```

Look for: `toFixed()` or `Math.round()` applied inside loops; rounding applied to intermediate calculations before summing; inconsistent rounding modes across different operations in the same flow; tax/fee calculations that round per-item rather than on the aggregate; absence of a defined rounding policy.

## Vulnerable Code

```typescript
// VULNERABLE: Rounding at each step compounds errors
function distributePayment(
  totalPayment: number,
  recipients: Array<{ id: string; sharePercent: number }>
) {
  const distributions: Array<{ id: string; amount: number }> = [];

  for (const recipient of recipients) {
    // Rounding each share individually loses fractions
    const share = Math.round(totalPayment * (recipient.sharePercent / 100) * 100) / 100;
    distributions.push({ id: recipient.id, amount: share });
  }

  // Sum of rounded shares may not equal totalPayment
  // $100 split 3 ways: $33.33 + $33.33 + $33.33 = $99.99 (lost $0.01)
  return distributions;
}

function calculateTax(items: Array<{ price: number; qty: number }>) {
  let totalTax = 0;
  for (const item of items) {
    // Rounding tax per item instead of on the total
    const itemTax = Math.round(item.price * item.qty * 0.0825 * 100) / 100;
    totalTax += itemTax; // Errors accumulate
  }
  return totalTax;
}
```

## Secure Code

```typescript
import Big from "big.js";

// SECURE: Largest-remainder method for exact distribution
function distributePayment(
  totalPaymentCents: number,
  recipients: Array<{ id: string; sharePercent: number }>
) {
  // Calculate exact shares
  const exactShares = recipients.map((r) => ({
    id: r.id,
    exact: (totalPaymentCents * r.sharePercent) / 100,
    floored: Math.floor((totalPaymentCents * r.sharePercent) / 100),
  }));

  // Distribute remainder using largest-remainder method
  const flooredTotal = exactShares.reduce((s, r) => s + r.floored, 0);
  let remainder = totalPaymentCents - flooredTotal;

  // Sort by fractional part descending, give extra cents to largest fractions
  const sorted = [...exactShares].sort(
    (a, b) => (b.exact - b.floored) - (a.exact - a.floored)
  );

  return sorted.map((r) => {
    const extra = remainder > 0 ? 1 : 0;
    remainder -= extra;
    return { id: r.id, amountCents: r.floored + extra };
  });
  // Sum always equals totalPaymentCents exactly
}

// SECURE: Compute tax on aggregate, not per-item
function calculateTax(items: Array<{ price: string; qty: number }>) {
  const subtotal = items.reduce(
    (sum, item) => sum.plus(new Big(item.price).times(item.qty)),
    new Big(0)
  );

  // Round once, using banker's rounding
  const tax = subtotal.times("0.0825").round(2, Big.roundHalfEven);
  return { subtotal: subtotal.toFixed(2), tax: tax.toFixed(2) };
}
```

## Impact

Rounding error accumulation causes financial discrepancies that grow proportionally with transaction volume. At scale, pennies per transaction become thousands of dollars. Inconsistent totals between invoice line items and the charged amount lead to failed reconciliation, chargebacks, and regulatory issues. In DeFi, systematic rounding exploitation can drain protocol funds, as demonstrated by the Balancer V2 exploit. Attackers can perform many small transactions designed to accumulate rounding in their favor.

## References

- Balancer V2 Exploit Post-Mortem: ~$94M via rounding error exploitation (November 2025) — https://medium.com/balancer-protocol/nov-3-exploit-post-mortem-51dcbeb6b020
- Yearn yETH Exploit: $9M via arithmetic underflow in supply calculation (November 2025) — https://research.checkpoint.com/2025/16-wei/
- Shopify Engineering: Bound to Round — 8 Tips for Dealing with Hanging Pennies — https://shopify.engineering/eight-tips-for-hanging-pennies
- CWE-682: Incorrect Calculation — https://cwe.mitre.org/data/definitions/682.html
