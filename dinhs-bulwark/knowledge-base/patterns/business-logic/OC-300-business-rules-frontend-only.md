# OC-300: Business Rules Enforced Only on Frontend

**Category:** Business Logic
**Severity:** HIGH
**Auditors:** LOGIC-01
**CWE:** CWE-602 (Client-Side Enforcement of Server-Side Security)
**OWASP:** A04:2021 – Insecure Design

## Description

This vulnerability occurs when critical business logic validations -- such as price checks, quantity limits, eligibility rules, or access controls -- are implemented exclusively in frontend JavaScript and not replicated on the server. Attackers bypass these checks by directly calling the API, modifying requests in a proxy like Burp Suite, or using cURL/Postman to submit requests that skip all client-side validation.

This is an extremely common finding in security audits. The frontend might enforce that a user cannot order more than 10 items, that a discount code requires a minimum purchase of $50, or that a withdrawal amount must be positive. If the backend API blindly trusts the values sent by the client, every one of these rules can be violated. PortSwigger's business logic vulnerability labs demonstrate repeated examples of applications that trust client-supplied parameters for pricing and limits.

In Solana/DeFi dApps, this manifests when transaction parameters are constructed entirely client-side without backend verification. For example, a frontend may calculate a swap amount or fee percentage and pass it to the backend for signing, but the backend signs whatever it receives without re-validating the amounts against on-chain state.

## Detection

```
grep -rn "req\.body\." --include="*.ts" --include="*.js" | grep -v "valid"
grep -rn "price\|amount\|quantity\|discount\|fee" --include="*.ts" --include="*.js"
grep -rn "// validated on frontend\|// client validates" --include="*.ts" --include="*.js"
grep -rn "trust.*client\|client.*trust" --include="*.ts" --include="*.js"
```

Look for: API endpoints that accept price, quantity, or financial amounts from request body without server-side validation; missing schema validation middleware (e.g., no Zod, Joi, or express-validator); backend routes that accept computed values (totals, fees, discounts) instead of recomputing from source data.

## Vulnerable Code

```typescript
// VULNERABLE: Backend trusts client-sent price and discount
app.post("/api/checkout", async (req, res) => {
  const { items, totalPrice, discountAmount } = req.body;

  // Frontend computed totalPrice and discountAmount — backend just uses them
  const finalAmount = totalPrice - discountAmount;

  const charge = await stripe.charges.create({
    amount: Math.round(finalAmount * 100), // Attacker can send totalPrice=0
    currency: "usd",
    source: req.body.paymentToken,
  });

  await db.orders.create({
    userId: req.user.id,
    items,
    total: finalAmount,
    chargeId: charge.id,
  });

  return res.json({ success: true });
});
```

## Secure Code

```typescript
// SECURE: Server recomputes all financial values from source data
app.post("/api/checkout", async (req, res) => {
  const { items, couponCode, paymentToken } = req.body;

  // Server fetches prices from database, never trusts client values
  const lineItems = await Promise.all(
    items.map(async (item: { productId: string; quantity: number }) => {
      const product = await db.products.findById(item.productId);
      if (!product) throw new Error(`Product ${item.productId} not found`);
      if (item.quantity < 1 || item.quantity > product.maxPerOrder) {
        throw new Error(`Invalid quantity for ${product.name}`);
      }
      return { product, quantity: item.quantity, price: product.price };
    })
  );

  const subtotal = lineItems.reduce(
    (sum, li) => sum + li.price * li.quantity, 0
  );

  // Server validates and applies discount from its own rules
  let discount = 0;
  if (couponCode) {
    const coupon = await db.coupons.findOne({ code: couponCode, active: true });
    if (coupon && subtotal >= coupon.minimumPurchase) {
      discount = Math.min(coupon.discountAmount, subtotal);
    }
  }

  const finalAmount = subtotal - discount;

  const charge = await stripe.charges.create({
    amount: Math.round(finalAmount * 100),
    currency: "usd",
    source: paymentToken,
  });

  await db.orders.create({
    userId: req.user.id,
    items: lineItems,
    subtotal,
    discount,
    total: finalAmount,
    chargeId: charge.id,
  });

  return res.json({ success: true });
});
```

## Impact

An attacker can purchase items at arbitrary prices (including $0), exceed quantity limits, bypass eligibility checks, apply unauthorized discounts, and circumvent any business rule that exists only in client-side JavaScript. In financial applications, this can result in direct monetary loss. In DeFi, trusting client-computed transaction parameters can lead to signing transactions with manipulated amounts, fees, or slippage values.

## References

- CWE-602: Client-Side Enforcement of Server-Side Security — https://cwe.mitre.org/data/definitions/602.html
- PortSwigger: Examples of business logic vulnerabilities — https://portswigger.net/web-security/logic-flaws/examples
- OWASP A04:2021 – Insecure Design — https://owasp.org/Top10/A04_2021-Insecure_Design/
- HackerOne disclosed reports: Multiple ecommerce platforms accepting client-supplied prices
