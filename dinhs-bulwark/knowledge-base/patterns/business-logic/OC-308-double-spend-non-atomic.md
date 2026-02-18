# OC-308: Double-Spend via Non-Atomic Balance Check

**Category:** Business Logic
**Severity:** CRITICAL
**Auditors:** LOGIC-02, ERR-02
**CWE:** CWE-362 (Concurrent Execution using Shared Resource with Improper Synchronization), CWE-367 (TOCTOU Race Condition)
**OWASP:** A04:2021 – Insecure Design

## Description

This vulnerability occurs when a balance check (read) and balance deduction (write) are performed as separate, non-atomic operations, allowing concurrent requests to exploit the time gap between the check and the update. This is the classic Time-of-Check-to-Time-of-Use (TOCTOU) race condition applied to financial balances.

The attack pattern is straightforward: an attacker with a $100 balance sends two simultaneous withdrawal requests for $100 each. Both requests read the balance as $100, both pass the sufficiency check, and both deduct $100 -- but from the same original value. The result is that the attacker withdraws $200 from a $100 balance. This is the foundational example in PortSwigger's research paper "Smashing the state machine: the true potential of web race conditions" (August 2023).

In real-world fintech and crypto applications, this manifests in withdrawal endpoints, transfer APIs, reward claims, and any operation that checks a value and then modifies it. Modern Treasury's engineering documentation specifically addresses this as a primary concern: "To prevent a double-spend situation, your ledger needs to be able to record transactions that are conditional on the state of an account balance." PostgreSQL race condition testing research (February 2026) demonstrates exactly this pattern: two concurrent $50 credits to a $100 balance resulting in $150 instead of $200.

## Detection

```
grep -rn "balance\s*>=\|balance\s*>\|balance\s*<" --include="*.ts" --include="*.js"
grep -rn "findOne.*balance\|findById.*then.*update" --include="*.ts" --include="*.js"
grep -rn "SELECT.*balance.*UPDATE\|select.*balance" --include="*.ts" --include="*.js" --include="*.sql"
grep -rn "\.save()\|\.update(" --include="*.ts" --include="*.js" | grep -i "balance\|amount"
grep -rn "FOR UPDATE\|SERIALIZABLE\|forUpdate" --include="*.ts" --include="*.js"
```

Look for: separate SELECT-then-UPDATE patterns on balance columns; balance check in an `if` statement followed by a later write; absence of `FOR UPDATE`, `SELECT...FOR UPDATE`, or database transactions with appropriate isolation; ORM `findOne` + `save` without row-level locking; any pattern where the read value is used in a condition that gates a later write.

## Vulnerable Code

```typescript
// VULNERABLE: Non-atomic balance check and deduction
app.post("/api/withdraw", async (req, res) => {
  const { userId, amount } = req.body;

  // Step 1: READ balance
  const account = await db.accounts.findById(userId);

  // Step 2: CHECK balance (race window starts here)
  if (account.balance < amount) {
    return res.status(400).json({ error: "Insufficient balance" });
  }

  // Step 3: DEDUCT balance (concurrent request may have already passed step 2)
  account.balance -= amount;
  await account.save();

  // Between steps 1 and 3, another request can read the same balance
  // Two concurrent requests for $100 on a $100 balance both succeed
  await transferService.send(userId, amount);
  return res.json({ success: true, newBalance: account.balance });
});
```

## Secure Code

```typescript
// SECURE: Atomic balance check and deduction using database transaction
app.post("/api/withdraw", async (req, res) => {
  const { userId, amount } = req.body;

  if (amount <= 0) {
    return res.status(400).json({ error: "Amount must be positive" });
  }

  try {
    const result = await db.transaction(async (trx) => {
      // Row-level lock prevents concurrent reads of stale balance
      const account = await trx("accounts")
        .where("id", userId)
        .forUpdate() // SELECT ... FOR UPDATE acquires row lock
        .first();

      if (!account || account.balance < amount) {
        throw new Error("Insufficient balance");
      }

      // Atomic conditional update — only succeeds if balance is still sufficient
      const updated = await trx("accounts")
        .where("id", userId)
        .where("balance", ">=", amount)
        .decrement("balance", amount);

      if (updated === 0) {
        throw new Error("Balance changed during transaction");
      }

      return account.balance - amount;
    });

    await transferService.send(userId, amount);
    return res.json({ success: true, newBalance: result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Transaction failed";
    return res.status(400).json({ error: message });
  }
});

// ALTERNATIVE: Single atomic SQL statement (no separate check needed)
// UPDATE accounts SET balance = balance - $1
// WHERE id = $2 AND balance >= $1
// RETURNING balance;
```

## Impact

Double-spend via non-atomic balance check is a critical vulnerability that allows direct theft of funds. An attacker can withdraw, transfer, or spend more than their available balance. In high-frequency systems, this can be automated to rapidly drain accounts or protocol reserves. The financial impact is typically the full balance of the targeted account, multiplied by the number of successful concurrent exploits. In DeFi, this pattern in off-chain relayers or backend services can drain hot wallets or treasury accounts.

## References

- PortSwigger Research: Smashing the state machine — the true potential of web race conditions (2023) — https://portswigger.net/research/smashing-the-state-machine
- Modern Treasury: How to Handle Concurrent Transactions — https://www.moderntreasury.com/journal/how-to-handle-concurrent-transactions
- PostgreSQL race condition research (2026) — https://www.lirbank.com/harnessing-postgres-race-conditions
- CWE-367: Time-of-check Time-of-use (TOCTOU) Race Condition — https://cwe.mitre.org/data/definitions/367.html
- CAPEC-29: Leveraging Time-of-Check and Time-of-Use Race Conditions — https://capec.mitre.org/data/definitions/29.html
- Lightning Security: Exploiting and Protecting Against Race Conditions — https://lightningsecurity.io/blog/race-conditions/
