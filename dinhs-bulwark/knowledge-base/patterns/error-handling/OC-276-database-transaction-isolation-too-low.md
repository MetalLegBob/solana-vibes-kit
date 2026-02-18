# OC-276: Database Transaction Isolation Too Low

**Category:** Error Handling & Resilience
**Severity:** HIGH
**Auditors:** ERR-02
**CWE:** CWE-362 (Concurrent Execution Using Shared Resource with Improper Synchronization)
**OWASP:** A10:2025 -- Mishandling of Exceptional Conditions

## Description

Database transaction isolation levels determine how concurrent transactions interact. When an application uses an isolation level that is too low for its access pattern, race conditions can corrupt data even when operations are wrapped in transactions. Many developers incorrectly assume that wrapping operations in a transaction eliminates all concurrency issues -- this is a dangerous misconception.

The four standard isolation levels (READ UNCOMMITTED, READ COMMITTED, REPEATABLE READ, SERIALIZABLE) each prevent different classes of anomalies. PostgreSQL defaults to READ COMMITTED, which prevents dirty reads but allows non-repeatable reads, phantom reads, and lost updates. MySQL/InnoDB defaults to REPEATABLE READ, which prevents non-repeatable reads but still allows phantom reads and certain write skew anomalies.

The Doyensec security team's 2024 research demonstrated that applications using READ COMMITTED isolation with check-then-act patterns are vulnerable to double-spend attacks even when using transactions. The PostgreSQL documentation explicitly warns that only SERIALIZABLE isolation "is guaranteed to produce the same effect as running [transactions] one at a time in some order." The gap between developer expectations ("I used a transaction, so it's safe") and reality (READ COMMITTED allows concurrent reads of pre-update state) is where vulnerabilities live.

## Detection

```
grep -rn "beginTransaction\|startTransaction\|BEGIN" --include="*.ts" --include="*.js"
grep -rn "isolationLevel\|isolation_level\|SET TRANSACTION ISOLATION" --include="*.ts" --include="*.js"
grep -rn "READ COMMITTED\|READ_COMMITTED\|ReadCommitted" --include="*.ts" --include="*.js"
grep -rn "SELECT.*FROM" --include="*.ts" --include="*.js" -A 5 | grep -v "FOR UPDATE\|FOR SHARE\|SERIALIZABLE"
```

Look for: transactions that perform read-then-write without `SELECT ... FOR UPDATE`, absence of explicit isolation level configuration (relying on defaults), use of READ COMMITTED for financial or security-sensitive operations.

## Vulnerable Code

```typescript
// VULNERABLE: Transaction with default READ COMMITTED isolation
// Two concurrent transfers can both read the same balance
async function transfer(fromId: string, toId: string, amount: number) {
  const trx = await knex.transaction(); // Default: READ COMMITTED

  try {
    // Both concurrent transactions read the same balance
    const sender = await trx("accounts").where({ id: fromId }).first();
    const receiver = await trx("accounts").where({ id: toId }).first();

    if (sender.balance < amount) {
      await trx.rollback();
      throw new Error("Insufficient funds");
    }

    // Both transactions see sufficient balance and proceed
    await trx("accounts").where({ id: fromId }).update({
      balance: sender.balance - amount, // Application-side arithmetic
    });
    await trx("accounts").where({ id: toId }).update({
      balance: receiver.balance + amount,
    });

    await trx.commit();
  } catch (error) {
    await trx.rollback();
    throw error;
  }
}
```

## Secure Code

```typescript
// SECURE Option 1: SELECT ... FOR UPDATE to prevent concurrent reads
async function transfer(fromId: string, toId: string, amount: number) {
  const trx = await knex.transaction();

  try {
    // FOR UPDATE locks the rows -- concurrent transactions must wait
    const sender = await trx("accounts")
      .where({ id: fromId })
      .forUpdate() // Row-level lock
      .first();

    if (sender.balance < amount) {
      await trx.rollback();
      throw new Error("Insufficient funds");
    }

    // Use database-side arithmetic, not application-side
    await trx("accounts").where({ id: fromId }).decrement("balance", amount);
    await trx("accounts").where({ id: toId }).increment("balance", amount);

    await trx.commit();
  } catch (error) {
    await trx.rollback();
    throw error;
  }
}

// SECURE Option 2: SERIALIZABLE isolation with retry on serialization failure
async function transferSerializable(fromId: string, toId: string, amount: number) {
  const MAX_RETRIES = 3;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      await knex.transaction(async (trx) => {
        // Set SERIALIZABLE isolation
        await trx.raw("SET TRANSACTION ISOLATION LEVEL SERIALIZABLE");

        const sender = await trx("accounts").where({ id: fromId }).first();
        if (sender.balance < amount) {
          throw new Error("Insufficient funds");
        }

        await trx("accounts").where({ id: fromId }).decrement("balance", amount);
        await trx("accounts").where({ id: toId }).increment("balance", amount);
      });
      return; // Success
    } catch (error) {
      if (error.code === "40001" && attempt < MAX_RETRIES - 1) {
        // Serialization failure -- retry
        continue;
      }
      throw error;
    }
  }
}
```

## Impact

Insufficient transaction isolation enables double-spend attacks, lost updates, and data corruption in concurrent operations. An attacker who sends concurrent financial transactions can overdraw accounts, duplicate transfers, or corrupt aggregate calculations. The impact is especially severe in financial applications, where the integrity of balance operations is critical.

## References

- CWE-362: Concurrent Execution Using Shared Resource -- https://cwe.mitre.org/data/definitions/362.html
- PostgreSQL Transaction Isolation Documentation -- https://www.postgresql.org/docs/current/transaction-iso.html
- Doyensec: "A Race to the Bottom" -- database race conditions in web applications (2024)
- Kunal Sinha: "Why Transactions Don't Eliminate Race Conditions" (2025)
- OWASP A10:2025 -- Mishandling of Exceptional Conditions
