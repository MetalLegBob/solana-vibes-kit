# OC-301: Negative Quantity/Amount Accepted

**Category:** Business Logic
**Severity:** HIGH
**Auditors:** LOGIC-01
**CWE:** CWE-20 (Improper Input Validation)
**OWASP:** A04:2021 – Insecure Design

## Description

This vulnerability exists when an application accepts negative values for quantities, amounts, or counts in financial or transactional operations. When a negative quantity is processed through arithmetic that was designed for positive values only, the results can be catastrophic: debits become credits, prices become negative (resulting in refunds instead of charges), and inventory counts grow instead of shrinking.

The classic example is an ecommerce checkout where submitting `quantity: -5` for a $20 item results in a -$100 line item, reducing the cart total. In more severe cases, a negative transfer amount in a banking or payment application can reverse the direction of funds -- debiting the recipient and crediting the sender. PortSwigger documents this as a canonical business logic flaw where applications fail to apply "domain-specific" input validation.

In Solana/DeFi off-chain services, negative amounts can appear in withdrawal requests, staking deposit calculations, fee computations, and reward distributions. If a backend service constructs transaction instructions using unchecked user-provided amounts, the resulting on-chain transactions may behave contrary to the application's intent.

## Detection

```
grep -rn "quantity\|amount\|count\|units" --include="*.ts" --include="*.js"
grep -rn "req\.body\.\(amount\|quantity\|count\)" --include="*.ts" --include="*.js"
grep -rn "parseInt\|parseFloat\|Number(" --include="*.ts" --include="*.js"
grep -rn "z\.number()\|Joi\.number()" --include="*.ts" --include="*.js" | grep -v "min\|positive"
```

Look for: numeric input fields without minimum value constraints; schema validations that check type but not range; arithmetic operations that assume positive inputs without explicit guards; absence of `.min(0)`, `.positive()`, or `> 0` checks on financial values.

## Vulnerable Code

```typescript
// VULNERABLE: No validation that amount is positive
app.post("/api/transfer", async (req, res) => {
  const { fromAccount, toAccount, amount } = req.body;

  // amount could be -500, reversing the transfer direction
  await db.accounts.update(fromAccount, {
    balance: db.raw(`balance - ${amount}`),
  });
  await db.accounts.update(toAccount, {
    balance: db.raw(`balance + ${amount}`),
  });

  return res.json({ success: true });
  // Attacker sends amount: -500
  // fromAccount: balance - (-500) = balance + 500 (gains money!)
  // toAccount: balance + (-500) = balance - 500 (loses money!)
});
```

## Secure Code

```typescript
import { z } from "zod";

const transferSchema = z.object({
  fromAccount: z.string().uuid(),
  toAccount: z.string().uuid(),
  amount: z.number().positive("Amount must be positive").max(1_000_000),
});

app.post("/api/transfer", async (req, res) => {
  const parsed = transferSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues });
  }

  const { fromAccount, toAccount, amount } = parsed.data;

  if (fromAccount === toAccount) {
    return res.status(400).json({ error: "Cannot transfer to same account" });
  }

  // Use parameterized query with validated positive amount
  await db.transaction(async (trx) => {
    const sender = await trx("accounts")
      .where("id", fromAccount)
      .forUpdate()
      .first();

    if (sender.balance < amount) {
      throw new Error("Insufficient balance");
    }

    await trx("accounts").where("id", fromAccount).decrement("balance", amount);
    await trx("accounts").where("id", toAccount).increment("balance", amount);
  });

  return res.json({ success: true });
});
```

## Impact

Negative amounts can reverse the direction of financial operations, allowing attackers to steal funds by making debits into credits. A negative quantity in an order can generate a refund instead of a charge. In aggregate, this can cause significant financial loss, inventory corruption, and accounting discrepancies. In DeFi, negative amounts in withdrawal or staking operations could allow users to extract funds they never deposited.

## References

- CWE-20: Improper Input Validation — https://cwe.mitre.org/data/definitions/20.html
- PortSwigger: Domain-specific flaws / business logic vulnerabilities — https://portswigger.net/web-security/logic-flaws/examples
- OWASP Testing Guide: WSTG-BUSL-01 – Test Business Logic Data Validation — https://owasp.org/www-project-web-security-testing-guide/v42/4-Web_Application_Security_Testing/10-Business_Logic_Testing/01-Test_Business_Logic_Data_Validation
- HackerOne: Multiple disclosed reports of negative quantity/price abuse in ecommerce
