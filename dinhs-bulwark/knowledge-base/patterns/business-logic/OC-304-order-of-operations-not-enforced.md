# OC-304: Order of Operations Not Enforced

**Category:** Business Logic
**Severity:** MEDIUM
**Auditors:** LOGIC-01
**CWE:** CWE-696 (Incorrect Behavior Order)
**OWASP:** WSTG-BUSL-06 – Testing for the Circumvention of Work Flows

## Description

This vulnerability occurs when an application does not enforce the required sequence of operations, allowing users to perform actions in an unintended order. Unlike a full state machine bypass (OC-299) which skips steps entirely, this pattern involves calling legitimate operations out of order -- for example, modifying an order after payment has been authorized but before it has been captured, or adding items to a cart after a discount was applied but before checkout finalization.

The distinction is subtle but important: each individual operation may be valid in isolation, but the sequence in which they are performed creates an exploitable condition. A common example is the "modify-after-approval" pattern in financial applications, where a loan amount can be increased after approval but before disbursement, or a trade quantity can be altered after price-locking but before execution.

In DeFi contexts, order-of-operations violations frequently appear in multi-step protocols: a user deposits collateral, then initiates a borrow, but between collateral verification and borrow execution, they withdraw the collateral via a different endpoint. This is related to but distinct from race conditions (OC-308) because it may not require concurrency -- the operations are simply not sequentially locked.

## Detection

```
grep -rn "pendingApproval\|approved\|authorized" --include="*.ts" --include="*.js"
grep -rn "\.update.*amount\|\.update.*quantity" --include="*.ts" --include="*.js"
grep -rn "modifyOrder\|updateOrder\|editTransaction" --include="*.ts" --include="*.js"
grep -rn "lockPrice\|priceGuarantee\|reserveAmount" --include="*.ts" --include="*.js"
```

Look for: endpoints that allow modification of entities in intermediate states; update operations that do not re-validate preconditions; multi-step processes where later steps do not verify earlier step outcomes are still valid; missing "frozen" or "locked" states that prevent modification during processing.

## Vulnerable Code

```typescript
// VULNERABLE: Order can be modified after payment is authorized
app.put("/api/orders/:id/items", async (req, res) => {
  const order = await db.orders.findById(req.params.id);
  if (!order) return res.status(404).json({ error: "Not found" });

  // Does not check if payment has already been authorized
  // Attacker can add expensive items after the $50 payment was locked in
  const { itemId, quantity } = req.body;
  const product = await db.products.findById(itemId);

  order.items.push({ productId: itemId, quantity, price: product.price });
  order.total = order.items.reduce(
    (sum: number, item: { price: number; quantity: number }) =>
      sum + item.price * item.quantity, 0
  );
  await order.save();

  return res.json({ order });
  // Original total was $50 (authorized), now it's $500 but the charge
  // captures only the original $50 authorization
});
```

## Secure Code

```typescript
// SECURE: Prevent modifications after payment authorization
app.put("/api/orders/:id/items", async (req, res) => {
  const order = await db.orders.findById(req.params.id);
  if (!order) return res.status(404).json({ error: "Not found" });

  // Orders can only be modified in 'draft' state
  const modifiableStates = ["draft", "cart"];
  if (!modifiableStates.includes(order.status)) {
    return res.status(409).json({
      error: `Cannot modify order in '${order.status}' state`,
    });
  }

  const { itemId, quantity } = req.body;
  const product = await db.products.findById(itemId);
  if (!product || !product.available) {
    return res.status(400).json({ error: "Product unavailable" });
  }

  order.items.push({ productId: itemId, quantity, price: product.price });
  order.total = order.items.reduce(
    (sum: number, item: { price: number; quantity: number }) =>
      sum + item.price * item.quantity, 0
  );

  // Invalidate any existing payment authorization
  if (order.paymentAuthorizationId) {
    await paymentService.voidAuthorization(order.paymentAuthorizationId);
    order.paymentAuthorizationId = null;
    order.status = "draft"; // Reset to require new payment
  }

  await order.save();
  return res.json({ order });
});
```

## Impact

Attackers who exploit order-of-operations flaws can receive goods worth more than what they paid, modify approved loan amounts before disbursement, change trade parameters after price locking, or add items to an order after a discount was calculated. In DeFi, this can mean withdrawing collateral after a borrow was approved but before execution, or modifying staking amounts after a reward snapshot.

## References

- CWE-696: Incorrect Behavior Order — https://cwe.mitre.org/data/definitions/696.html
- OWASP WSTG-BUSL-06: Testing for the Circumvention of Work Flows — https://owasp.org/www-project-web-security-testing-guide/v42/4-Web_Application_Security_Testing/10-Business_Logic_Testing/06-Testing_for_the_Circumvention_of_Work_Flows
- PortSwigger: Business logic vulnerabilities — Making flawed assumptions about the sequence of events — https://portswigger.net/web-security/logic-flaws/examples
