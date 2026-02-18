# OC-302: Coupon/Discount Stacking Abuse

**Category:** Business Logic
**Severity:** MEDIUM
**Auditors:** LOGIC-01
**CWE:** CWE-837 (Improper Enforcement of a Single, Unique Action)
**OWASP:** A04:2021 – Insecure Design

## Description

Coupon and discount stacking abuse occurs when an application allows multiple promotional codes, referral credits, or loyalty discounts to be combined in ways not intended by the business. This includes applying the same coupon multiple times, stacking percentage discounts that together exceed 100%, combining first-time-user promotions with referral bonuses, or exploiting race conditions to apply a single-use coupon concurrently from multiple sessions.

Industry data indicates coupon fraud costs ecommerce businesses an estimated $300-600 million annually, with up to 73% of retailers reporting some form of promotional code abuse. The most common attack vectors include creating multiple accounts to reuse single-use codes, sharing codes intended for specific audiences, and exploiting timing windows to apply coupons concurrently before the "used" flag is set.

In crypto/DeFi applications, analogous abuse exists in referral bonus programs, airdrop eligibility gaming, and stacking yield incentives across protocols. An attacker might use multiple wallets to claim referral bonuses repeatedly, or exploit a race condition to claim a limited-supply promotional allocation multiple times.

## Detection

```
grep -rn "coupon\|promo\|discount\|voucher\|referral" --include="*.ts" --include="*.js"
grep -rn "applyDiscount\|applyCoupon\|redeemCode" --include="*.ts" --include="*.js"
grep -rn "discountPercent\|discountAmount" --include="*.ts" --include="*.js"
grep -rn "stackable\|combinable\|exclusive" --include="*.ts" --include="*.js"
```

Look for: discount application logic that does not check if a coupon was already applied; missing uniqueness constraints on coupon redemption; absence of mutual exclusivity checks between promotion types; coupon validation that reads then writes without atomicity.

## Vulnerable Code

```typescript
// VULNERABLE: No stacking prevention, no atomicity
app.post("/api/cart/apply-coupon", async (req, res) => {
  const { cartId, couponCode } = req.body;
  const cart = await db.carts.findById(cartId);
  const coupon = await db.coupons.findOne({ code: couponCode, active: true });

  if (!coupon) return res.status(400).json({ error: "Invalid coupon" });

  // No check if this coupon was already applied to this cart
  // No check if another coupon is already active
  // No atomicity — race condition allows concurrent application
  const discountAmount = cart.subtotal * (coupon.percentOff / 100);
  cart.discounts.push({ code: couponCode, amount: discountAmount });
  cart.total = cart.subtotal - cart.discounts.reduce(
    (sum: number, d: { amount: number }) => sum + d.amount, 0
  );

  // Total can go negative if enough coupons are stacked
  await cart.save();

  coupon.usageCount += 1;
  await coupon.save(); // TOCTOU: concurrent requests can both pass the check

  return res.json({ cart });
});
```

## Secure Code

```typescript
// SECURE: Atomic coupon application with stacking prevention
app.post("/api/cart/apply-coupon", async (req, res) => {
  const { cartId, couponCode } = req.body;

  const result = await db.transaction(async (trx) => {
    const cart = await trx("carts").where("id", cartId).forUpdate().first();
    if (!cart) throw new Error("Cart not found");

    // Check if any discount is already applied (no stacking)
    const existingDiscount = await trx("cart_discounts")
      .where("cart_id", cartId)
      .first();
    if (existingDiscount) {
      throw new Error("Only one coupon can be applied per order");
    }

    // Atomically claim the coupon with row-level lock
    const updated = await trx("coupons")
      .where("code", couponCode)
      .where("active", true)
      .where("usage_count", "<", trx.raw("max_uses"))
      .increment("usage_count", 1);

    if (updated === 0) {
      throw new Error("Coupon invalid, expired, or usage limit reached");
    }

    const coupon = await trx("coupons").where("code", couponCode).first();
    const discountAmount = Math.min(
      cart.subtotal * (coupon.percent_off / 100),
      coupon.max_discount_amount ?? Infinity
    );

    // Ensure total never goes below zero
    const newTotal = Math.max(0, cart.subtotal - discountAmount);

    await trx("cart_discounts").insert({
      cart_id: cartId,
      coupon_code: couponCode,
      amount: discountAmount,
    });

    await trx("carts").where("id", cartId).update({ total: newTotal });

    return { total: newTotal, discount: discountAmount };
  });

  return res.json({ success: true, ...result });
});
```

## Impact

Discount stacking abuse leads to direct revenue loss through products sold below cost or for free. Attackers who can stack discounts to achieve negative totals may generate store credit or refunds. Widespread coupon abuse erodes marketing ROI and can bankrupt promotional campaigns. In crypto, referral bonus gaming and airdrop farming through multiple wallets can drain promotional token allocations or inflate user metrics used for fundraising.

## References

- CWE-837: Improper Enforcement of a Single, Unique Action — https://cwe.mitre.org/data/definitions/837.html
- ReferralCandy: How to Prevent Coupon Fraud in Ecommerce — https://www.referralcandy.com/blog/how-to-prevent-coupon-fraud-in-ecommerce-protecting-your-profit-margins
- FraudNet: Coupon/Discount Abuse — https://www.fraud.net/glossary/coupon-discount-abuse
- TryHackMe: Race Condition — coupon code double-application via concurrent requests
