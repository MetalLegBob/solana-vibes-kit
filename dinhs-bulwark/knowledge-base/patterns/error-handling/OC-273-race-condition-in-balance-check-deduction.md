# OC-273: Race Condition in Balance Check + Deduction

**Category:** Error Handling & Resilience
**Severity:** CRITICAL
**Auditors:** ERR-02
**CWE:** CWE-362 (Concurrent Execution Using Shared Resource with Improper Synchronization)
**OWASP:** A10:2025 -- Mishandling of Exceptional Conditions

## Description

This pattern specifically addresses the read-check-write anti-pattern for financial balance operations in Node.js applications. Unlike OC-272 which covers the general double-spend concept, this pattern focuses on the code-level mechanics: reading the balance in JavaScript, performing an arithmetic comparison, and writing the new balance back -- all as separate async operations with `await` boundaries between them.

Node.js developers are often lulled into a false sense of security by the single-threaded nature of the runtime. However, every `await` yields execution back to the event loop, creating a window where another request handler can run. This means two concurrent requests can interleave as follows: Request A reads balance (1000), Request B reads balance (1000), Request A writes balance (1000-800=200), Request B writes balance (1000-800=200). The user has withdrawn 1600 but only 800 was actually deducted.

The Doyensec security team documented this exact pattern in their 2024 research on database race conditions in web applications, finding it prevalent even in applications that use database transactions -- because the default `READ COMMITTED` isolation level does not prevent this interleaving. The async-mutex library on npm exists specifically to address this class of bug in Node.js applications.

## Detection

```
grep -rn "\.balance\|\.credits\|\.points\|\.tokens" --include="*.ts" --include="*.js" -A 5 | grep "\-\s*=\|\-=\|balance\s*-"
grep -rn "account\.\w\+\s*-\s*amount\|user\.\w\+\s*-\s*amount" --include="*.ts" --include="*.js"
grep -rn "save()\|update(" --include="*.ts" --include="*.js" -B 10 | grep "\.balance\|\.credits"
grep -rn "set.*balance.*-\|balance:.*-" --include="*.ts" --include="*.js"
```

Look for: `account.balance = account.balance - amount` followed by `account.save()`, any pattern where a numeric field is read into a JavaScript variable, modified, and written back in separate async steps.

## Vulnerable Code

```typescript
// VULNERABLE: Classic ORM-based read-modify-write pattern
async function purchaseItem(userId: string, itemId: string) {
  const user = await User.findById(userId);        // await #1: read
  const item = await Item.findById(itemId);         // await #2: read

  if (user.balance < item.price) {                  // check in JS
    throw new InsufficientFundsError();
  }

  // RACE WINDOW: between findById and save(), another request can
  // read the same balance and also pass the check

  user.balance = user.balance - item.price;         // modify in JS
  await user.save();                                // await #3: write

  await Order.create({ userId, itemId, amount: item.price });
  return { newBalance: user.balance };
}

// With Prisma/TypeORM -- same problem, different syntax
async function deductCredits(userId: string, amount: number) {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (user.credits < amount) {
    throw new Error("Not enough credits");
  }

  // Another request can interleave here
  return prisma.user.update({
    where: { id: userId },
    data: { credits: user.credits - amount }, // Application-side calculation
  });
}
```

## Secure Code

```typescript
// SECURE: Atomic conditional update -- no application-side calculation
async function purchaseItem(userId: string, itemId: string) {
  const item = await Item.findById(itemId);

  // Single atomic operation: decrement only if sufficient balance
  const result = await User.updateOne(
    { _id: userId, balance: { $gte: item.price } },
    { $inc: { balance: -item.price } }
  );

  if (result.modifiedCount === 0) {
    throw new InsufficientFundsError();
  }

  await Order.create({ userId, itemId, amount: item.price });
  const user = await User.findById(userId);
  return { newBalance: user.balance };
}

// SECURE with Prisma: Use raw SQL for atomic conditional update
async function deductCredits(userId: string, amount: number) {
  const result = await prisma.$executeRaw`
    UPDATE users
    SET credits = credits - ${amount}
    WHERE id = ${userId} AND credits >= ${amount}
  `;

  if (result === 0) {
    throw new Error("Not enough credits");
  }

  return prisma.user.findUnique({ where: { id: userId } });
}

// SECURE with application-level mutex (for non-DB resources)
import { Mutex } from "async-mutex";

const userLocks = new Map<string, Mutex>();

function getUserMutex(userId: string): Mutex {
  if (!userLocks.has(userId)) {
    userLocks.set(userId, new Mutex());
  }
  return userLocks.get(userId)!;
}

async function deductWithMutex(userId: string, amount: number) {
  const mutex = getUserMutex(userId);
  return mutex.runExclusive(async () => {
    const user = await User.findById(userId);
    if (user.balance < amount) throw new InsufficientFundsError();
    user.balance -= amount;
    await user.save();
    return user;
  });
}
```

## Impact

An attacker can drain account balances, redeem more credits than they possess, or purchase items without paying. By sending simultaneous requests (easily done with HTTP/2 or scripted parallel connections), they exploit every `await` boundary in the read-check-write pattern. In cryptocurrency or fintech applications, the direct financial impact can be severe. The attack scales linearly: 10 concurrent requests can potentially multiply the exploit by 10x.

## References

- CWE-362: Concurrent Execution Using Shared Resource -- https://cwe.mitre.org/data/definitions/362.html
- Doyensec: Database Race Conditions Research (2024) -- https://blog.doyensec.com/2024/07/11/database-race-conditions.html
- async-mutex npm package: Mutex for JavaScript concurrency control -- https://www.npmjs.com/package/async-mutex
- Kroll: How to Prevent Race Conditions in Web Applications -- https://www.kroll.com/en/publications/cyber/race-condition-web-applications
- PortSwigger: Race Conditions -- https://portswigger.net/web-security/race-conditions
