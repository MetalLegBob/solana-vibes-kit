# OC-299: State Machine Bypass (Skip Steps)

**Category:** Business Logic
**Severity:** HIGH
**Auditors:** LOGIC-01
**CWE:** CWE-841 (Improper Enforcement of Behavioral Workflow)
**OWASP:** WSTG-BUSL-06 – Testing for the Circumvention of Work Flows

## Description

State machine bypass occurs when an application assumes users will follow a prescribed sequence of steps (e.g., cart -> checkout -> payment -> confirmation) but fails to enforce that order server-side. Attackers can skip intermediate steps by directly calling endpoints out of sequence, manipulating hidden state parameters, or dropping intermediate HTTP requests.

This is one of the most impactful business logic vulnerability classes because it can bypass payment, KYC verification, approval workflows, and multi-step authentication. PortSwigger's Web Security Academy documents a classic example where dropping the role-selection request after login causes the application to default the user to an administrator role. The OWASP Business Logic Abuse Top 10 highlights workflow circumvention as a universal vulnerability class that transcends technology stacks.

In DeFi and fintech contexts, state machine bypasses can be devastating. A staking protocol that allows direct claim of rewards without verifying the lock-up period has elapsed, or a lending platform where collateral withdrawal proceeds without validating outstanding debt, are real-world instances. The fundamental issue is that state transitions are validated only on the frontend or not validated at all.

## Detection

```
grep -rn "status\s*=\s*['\"]" --include="*.ts" --include="*.js"
grep -rn "step\s*[=<>]" --include="*.ts" --include="*.js"
grep -rn "state\s*===\s*['\"]" --include="*.ts" --include="*.js"
grep -rn "workflow\|currentStep\|phase\|stage" --include="*.ts" --include="*.js"
grep -rn "\.update.*status" --include="*.ts" --include="*.js"
```

Look for: endpoints that change entity status without validating the current status, state transitions driven by client-provided values, direct UPDATE queries on status fields without WHERE clauses checking the prior state.

## Vulnerable Code

```typescript
// VULNERABLE: No server-side state validation
app.post("/api/orders/:id/confirm", async (req, res) => {
  const order = await db.orders.findById(req.params.id);
  if (!order) return res.status(404).json({ error: "Not found" });

  // Directly confirms order — does not check if payment was completed
  order.status = "confirmed";
  order.confirmedAt = new Date();
  await order.save();

  // Ships the product without verifying payment
  await fulfillmentService.ship(order);
  return res.json({ success: true, order });
});

// Attacker can call POST /api/orders/123/confirm directly,
// skipping the payment step entirely
```

## Secure Code

```typescript
// SECURE: Enforce state machine transitions
const VALID_TRANSITIONS: Record<string, string[]> = {
  created: ["pending_payment"],
  pending_payment: ["paid"],
  paid: ["confirmed"],
  confirmed: ["shipped"],
  shipped: ["delivered"],
};

app.post("/api/orders/:id/confirm", async (req, res) => {
  const order = await db.orders.findById(req.params.id);
  if (!order) return res.status(404).json({ error: "Not found" });

  // Verify the order is in a state that allows confirmation
  const allowedFrom = "paid";
  if (order.status !== allowedFrom) {
    return res.status(409).json({
      error: `Cannot confirm order in '${order.status}' state. Must be '${allowedFrom}'.`,
    });
  }

  // Verify payment was actually received
  const payment = await paymentService.verifyPayment(order.paymentId);
  if (!payment || payment.status !== "settled") {
    return res.status(402).json({ error: "Payment not settled" });
  }

  order.status = "confirmed";
  order.confirmedAt = new Date();
  await order.save();
  await fulfillmentService.ship(order);
  return res.json({ success: true, order });
});
```

## Impact

An attacker who bypasses state machine steps can obtain goods or services without paying, skip identity verification or KYC checks, escalate privileges by skipping role-assignment steps, or bypass approval workflows in admin panels. In DeFi, this can mean claiming staking rewards before the lock-up period, withdrawing collateral from a lending protocol without repaying debt, or executing restricted operations by skipping governance approval.

## References

- PortSwigger Lab: Authentication bypass via flawed state machine — https://portswigger.net/web-security/logic-flaws/examples/lab-logic-flaws-authentication-bypass-via-flawed-state-machine
- CWE-841: Improper Enforcement of Behavioral Workflow — https://cwe.mitre.org/data/definitions/841.html
- OWASP WSTG-BUSL-06: Testing for the Circumvention of Work Flows — https://owasp.org/www-project-web-security-testing-guide/v42/4-Web_Application_Security_Testing/10-Business_Logic_Testing/06-Testing_for_the_Circumvention_of_Work_Flows
- OWASP Top 10 for Business Logic Abuse — https://owasp.org/www-project-top-10-for-business-logic-abuse/
