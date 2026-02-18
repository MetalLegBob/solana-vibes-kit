# OC-272: Double-Spend via Concurrent Requests

**Category:** Error Handling & Resilience
**Severity:** CRITICAL
**Auditors:** ERR-02
**CWE:** CWE-362 (Concurrent Execution Using Shared Resource with Improper Synchronization)
**OWASP:** A10:2025 -- Mishandling of Exceptional Conditions

## Description

A double-spend via concurrent requests occurs when an attacker sends multiple identical requests simultaneously to exploit the gap between reading a value and modifying it. If the application checks "does the user have sufficient balance?" and then performs the deduction as separate operations, two concurrent requests can both pass the balance check before either deduction is recorded, allowing the user to spend the same funds twice.

This is the financial manifestation of TOCTOU, and it is one of the most costly application-level vulnerabilities. Bug bounty programs consistently report race condition double-spends as high-severity findings. A 2026 write-up by spyboy documented exploiting a web application's coupon redemption system by sending concurrent requests that each passed the "coupon unused" check before either could record the redemption. The PortSwigger Web Security Academy's research on "limit overrun" race conditions found these vulnerabilities in payment systems, coupon redemptions, and credit-based operations across major web applications.

The attack is straightforward: an attacker uses tools like Burp Suite's Turbo Intruder or simple concurrent HTTP/2 requests to send 10-50 identical requests within the same millisecond. Even though the application is "single-threaded" in Node.js, each `await` yields to the event loop, creating race windows between async operations.

## Detection

```
grep -rn "balance\|credit\|funds\|wallet" --include="*.ts" --include="*.js" -A 10 | grep -i "deduct\|subtract\|withdraw\|transfer"
grep -rn "findOne.*balance" --include="*.ts" --include="*.js" -A 5 | grep "update\|save"
grep -rn "SELECT.*balance\|SELECT.*credits" --include="*.ts" --include="*.js" -A 5 | grep "UPDATE"
grep -rn "if.*>=.*amount\|if.*>.*amount" --include="*.ts" --include="*.js" -A 5 | grep "update\|decrement"
```

Look for: balance check (read) separated from balance deduction (write) by one or more `await` calls, non-atomic read-modify-write patterns on financial fields, absence of database-level locking or atomic operations.

## Vulnerable Code

```typescript
import { Request, Response } from "express";

// VULNERABLE: Non-atomic balance check + deduction
async function withdraw(req: Request, res: Response) {
  const { amount } = req.body;
  const userId = req.user.id;

  // Read the current balance
  const account = await db.findOne("accounts", { userId });

  // Check if balance is sufficient
  if (account.balance < amount) {
    return res.status(400).json({ error: "Insufficient funds" });
  }

  // RACE WINDOW: Another request can read the same balance here
  // Both requests see balance=1000, both pass the check for amount=800

  // Deduct the balance
  await db.update("accounts", { userId }, {
    balance: account.balance - amount, // Calculated in application, not DB
  });

  await recordWithdrawal(userId, amount);
  res.json({ newBalance: account.balance - amount });
}
```

## Secure Code

```typescript
import { Request, Response } from "express";

// SECURE: Atomic balance check + deduction at the database level
async function withdraw(req: Request, res: Response) {
  const { amount } = req.body;
  const userId = req.user.id;

  // Atomic conditional update: only deducts if balance is sufficient
  // This is a single SQL statement -- no race window
  const result = await db.query(
    `UPDATE accounts
     SET balance = balance - ?
     WHERE user_id = ? AND balance >= ?`,
    [amount, userId, amount]
  );

  if (result.affectedRows === 0) {
    return res.status(400).json({ error: "Insufficient funds" });
  }

  // Read the new balance after atomic deduction
  const account = await db.findOne("accounts", { userId });

  await recordWithdrawal(userId, amount);
  res.json({ newBalance: account.balance });
}

// ALTERNATIVE: Using SELECT ... FOR UPDATE with a transaction
async function withdrawWithLock(req: Request, res: Response) {
  const { amount } = req.body;
  const userId = req.user.id;

  const trx = await db.beginTransaction();
  try {
    // Lock the row -- concurrent requests will wait
    const [account] = await trx.query(
      "SELECT balance FROM accounts WHERE user_id = ? FOR UPDATE",
      [userId]
    );

    if (account.balance < amount) {
      await trx.rollback();
      return res.status(400).json({ error: "Insufficient funds" });
    }

    await trx.query(
      "UPDATE accounts SET balance = balance - ? WHERE user_id = ?",
      [amount, userId]
    );

    await trx.commit();
    res.json({ newBalance: account.balance - amount });
  } catch (error) {
    await trx.rollback();
    throw error;
  }
}
```

## Impact

Successful double-spend attacks allow an attacker to withdraw or transfer more funds than their actual balance, redeem rewards multiple times, or drain financial systems. In cryptocurrency applications, this can result in direct monetary loss. The attack requires no special skills -- only the ability to send concurrent HTTP requests -- and can be automated to scale losses rapidly.

## References

- CWE-362: Concurrent Execution Using Shared Resource -- https://cwe.mitre.org/data/definitions/362.html
- PortSwigger: Limit Overrun Race Conditions -- https://portswigger.net/web-security/race-conditions
- spyboy: "This Is How I Hacked a Web App Using Race Conditions" (2026 write-up)
- Doyensec: "A Race to the Bottom -- Database Transactions Undermining Your AppSec" -- https://blog.doyensec.com/2024/07/11/database-race-conditions.html
- Aditya Bhatt: "Exploiting Race Conditions for Infinite Discounts" (Bug Bounty Write-up)
