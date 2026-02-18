# AI-Generated Code Pitfalls: Error Handling & Resilience
<!-- Domain: error-handling -->
<!-- Relevant auditors: ERR-01, ERR-02, ERR-03 -->

## Overview

AI code generators (Copilot, ChatGPT, Claude, Cursor) produce code that prioritizes "working on first try" over resilience. Error handling is where this bias is most dangerous: the model generates the happy path correctly but wraps it in catch blocks that swallow, ignore, or incorrectly recover from errors. Training data is dominated by tutorials and Stack Overflow answers where error handling is minimal ("// TODO: handle error"), and these patterns are reproduced verbatim.

The core problem areas are: empty catch blocks from skeleton code, fail-open defaults that bypass security on error, missing timeouts that create hanging-forever patterns, non-atomic check-then-act operations that invite race conditions, and overly broad try/catch blocks that mask the source of failures. AI-generated error handling is almost always "technically present but functionally absent" -- the code compiles, the linter is quiet, but the application is fragile and exploitable.

## Pitfalls

### AIP-139: Empty Catch Block with Comment Placeholder
**Frequency:** Very Frequent
**Why AI does this:** AI models generate try/catch as structural boilerplate. The catch block contains a comment like `// handle error` or `// TODO` because the training data is full of incomplete examples, blog posts, and tutorials where the author deferred error handling. The model does not understand that an empty catch block is functionally equivalent to deleting the error.
**What to look for:**
- `catch (error) { }` or `catch (e) { /* TODO */ }`
- `catch (_)` with no body or only a comment
- `catch (error) { console.log(error) }` with no recovery or re-throw

**Vulnerable (AI-generated):**
```typescript
async function updateUserProfile(userId: string, data: ProfileUpdate) {
  try {
    await db.users.update({ where: { id: userId }, data });
    await cache.invalidate(`user:${userId}`);
  } catch (error) {
    // Handle error
  }
}
```

**Secure (corrected):**
```typescript
async function updateUserProfile(userId: string, data: ProfileUpdate) {
  try {
    await db.users.update({ where: { id: userId }, data });
  } catch (error) {
    logger.error("Failed to update user profile", { userId, error: error.message });
    throw new AppError("Profile update failed", 500);
  }
  try {
    await cache.invalidate(`user:${userId}`);
  } catch (error) {
    logger.warn("Cache invalidation failed (non-critical)", { userId });
    // Acceptable to continue -- cache will expire via TTL
  }
}
```

### AIP-140: Fail-Open Default in Authentication Catch Block
**Frequency:** Common
**Why AI does this:** When generating authentication middleware, models prioritize the "working" path. If the auth service call is wrapped in try/catch and the model needs to provide something in the catch block, it defaults to `next()` (continue the request) because that is the most common pattern in Express middleware. The model does not reason about the security implications of allowing unauthenticated requests.
**What to look for:**
- `catch (error) { next() }` in auth middleware
- `catch (error) { req.user = null; next() }` with no subsequent auth check
- Default user objects assigned in catch blocks: `req.user = { role: "user" }`

**Vulnerable (AI-generated):**
```typescript
async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    const user = await verifyToken(token);
    req.user = user;
  } catch (error) {
    console.error("Auth error:", error);
  }
  next(); // Always proceeds, even on auth failure
}
```

**Secure (corrected):**
```typescript
async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "No token provided" });
    }
    const user = await verifyToken(token);
    req.user = user;
    next();
  } catch (error) {
    logger.warn("Authentication failed", { error: error.message, ip: req.ip });
    return res.status(401).json({ error: "Authentication failed" });
  }
}
```

### AIP-141: Missing Timeout on fetch/axios Calls
**Frequency:** Very Frequent
**Why AI does this:** When generating HTTP client code, models produce `fetch()` or `axios.get()` calls without timeout configuration because the training data overwhelmingly omits timeouts (they are optional parameters). The model optimizes for the shortest working code, and timeouts add complexity. Neither `fetch` nor `axios` has a default timeout, so the omission means "wait forever."
**What to look for:**
- `fetch(url)` without `signal` parameter
- `axios.get(url)` without `timeout` property
- Any HTTP client call without explicit timeout configuration

**Vulnerable (AI-generated):**
```typescript
async function getPrice(tokenMint: string): Promise<number> {
  const response = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${tokenMint}&vs_currencies=usd`
  );
  const data = await response.json();
  return data[tokenMint].usd;
}
```

**Secure (corrected):**
```typescript
async function getPrice(tokenMint: string): Promise<number> {
  const response = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${tokenMint}&vs_currencies=usd`,
    { signal: AbortSignal.timeout(5_000) }
  );
  if (!response.ok) {
    throw new Error(`Price API returned ${response.status}`);
  }
  const data = await response.json();
  if (!data[tokenMint]?.usd) {
    throw new Error(`No price data for ${tokenMint}`);
  }
  return data[tokenMint].usd;
}
```

### AIP-142: Non-Atomic Balance Check Then Deduction
**Frequency:** Common
**Why AI does this:** When generating financial operations, models produce the intuitive human-readable pattern: read the balance, compare it, then update it. This is how a human would describe the logic ("check if the user has enough money, then deduct it"), and the model translates this directly into sequential `await` calls. The model does not reason about concurrency or understand that each `await` creates a race window.
**What to look for:**
- `const user = await findUser(); if (user.balance >= amount) { user.balance -= amount; await user.save(); }`
- Any read-check-write pattern with `await` between the read and the write
- Application-side arithmetic on database values (instead of `UPDATE ... SET balance = balance - ?`)

**Vulnerable (AI-generated):**
```typescript
async function purchaseItem(userId: string, itemId: string) {
  const user = await User.findById(userId);
  const item = await Item.findById(itemId);

  if (user.balance < item.price) {
    throw new Error("Insufficient balance");
  }

  user.balance -= item.price;
  await user.save();
  await Order.create({ userId, itemId, price: item.price });
}
```

**Secure (corrected):**
```typescript
async function purchaseItem(userId: string, itemId: string) {
  const item = await Item.findById(itemId);

  const result = await User.updateOne(
    { _id: userId, balance: { $gte: item.price } },
    { $inc: { balance: -item.price } }
  );

  if (result.modifiedCount === 0) {
    throw new Error("Insufficient balance or user not found");
  }

  await Order.create({ userId, itemId, price: item.price });
}
```

### AIP-143: Overly Broad Try/Catch Wrapping Entire Function
**Frequency:** Frequent
**Why AI does this:** Models wrap entire function bodies in a single try/catch because it is the simplest way to ensure "no unhandled errors." This makes it impossible to distinguish between different failure modes (database down vs. validation error vs. auth failure) and forces a single generic error response for all failures.
**What to look for:**
- A single try/catch around 20+ lines of code with multiple await calls
- Catch block returning generic 500 for all errors
- No error type discrimination in the catch block

**Vulnerable (AI-generated):**
```typescript
app.post("/api/transfer", async (req, res) => {
  try {
    const { from, to, amount } = req.body;
    const sender = await db.findUser(from);
    const receiver = await db.findUser(to);
    await validateTransfer(sender, receiver, amount);
    await db.debit(from, amount);
    await db.credit(to, amount);
    await notifyUsers(sender, receiver, amount);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Transfer failed" });
  }
});
```

**Secure (corrected):**
```typescript
app.post("/api/transfer", async (req, res) => {
  const { from, to, amount } = req.body;

  let sender, receiver;
  try {
    sender = await db.findUser(from);
    receiver = await db.findUser(to);
  } catch (error) {
    return res.status(502).json({ error: "Database unavailable" });
  }

  try {
    await validateTransfer(sender, receiver, amount);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }

  const trx = await db.beginTransaction();
  try {
    await trx.debit(from, amount);
    await trx.credit(to, amount);
    await trx.commit();
  } catch (error) {
    await trx.rollback();
    logger.error("Transfer failed", { from, to, amount, error: error.message });
    return res.status(500).json({ error: "Transfer failed" });
  }

  // Notification is non-critical -- log but don't fail the transfer
  notifyUsers(sender, receiver, amount).catch((err) =>
    logger.warn("Notification failed", { error: err.message })
  );

  res.json({ success: true });
});
```

### AIP-144: Dangerous Regex Pattern in User Input Validation
**Frequency:** Common
**Why AI does this:** When asked to validate email addresses, URLs, or other structured strings, models produce regex patterns copied from training data that contain nested quantifiers, overlapping character classes, or unbounded alternation. The model selects the regex that "looks most complete" without analyzing backtracking complexity. Classic email regex patterns like `/^([a-zA-Z0-9._%-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6})*$/` are common in AI output.
**What to look for:**
- Regex with `(.*)+`, `(a+)+`, or `([a-z]+)*` patterns
- Complex URL or email regexes with nested groups
- `new RegExp(userInput)` without escaping

**Vulnerable (AI-generated):**
```typescript
function validateUrl(url: string): boolean {
  const urlRegex = /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}(\.[a-zA-Z0-9()]{1,6})*\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/;
  return urlRegex.test(url);
}
```

**Secure (corrected):**
```typescript
function validateUrl(input: string): boolean {
  if (input.length > 2048) return false;
  try {
    const url = new URL(input);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}
```

### AIP-145: Async Route Handler Without Error Wrapper
**Frequency:** Very Frequent
**Why AI does this:** When generating Express routes, models produce `async (req, res) => { ... }` handlers without wrapping them in an error-catching utility. Express 4 does not automatically catch promise rejections from async handlers, so any thrown error becomes an unhandled rejection that crashes the process. The model follows the async/await pattern it sees most frequently, which omits the Express-specific error forwarding.
**What to look for:**
- `app.get("/...", async (req, res) => { ... })` without try/catch or wrapper
- No `asyncHandler` or `express-async-errors` import in the project
- Async Express routes without `.catch(next)` chains

**Vulnerable (AI-generated):**
```typescript
app.get("/api/users/:id", async (req, res) => {
  const user = await db.findUser(req.params.id); // Throws on DB error
  res.json(user);
});
```

**Secure (corrected):**
```typescript
import "express-async-errors"; // Patches Express to catch async errors
// OR use a wrapper:
const asyncHandler = (fn: Function) => (req: any, res: any, next: any) =>
  Promise.resolve(fn(req, res, next)).catch(next);

app.get("/api/users/:id", asyncHandler(async (req, res) => {
  const user = await db.findUser(req.params.id);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }
  res.json(user);
}));
```

### AIP-146: Connection Pool Without Timeout Configuration
**Frequency:** Common
**Why AI does this:** When generating database connection code, models produce `new Pool({ connectionString, max: 20 })` and omit timeout configuration because the training data (documentation quick-starts, tutorials) focuses on getting a connection working, not on production resilience. The model does not add `connectionTimeoutMillis`, `idleTimeoutMillis`, or `statement_timeout` because these are not required for the code to "work."
**What to look for:**
- `new Pool()` with only `connectionString` and optional `max`
- Missing `connectionTimeoutMillis` (defaults to wait forever in pg)
- Missing `statement_timeout` (queries can run indefinitely)
- Missing `idleTimeoutMillis` (connections never recycled)

**Vulnerable (AI-generated):**
```typescript
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
});

export default pool;
```

**Secure (corrected):**
```typescript
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  min: 2,
  connectionTimeoutMillis: 5_000,
  idleTimeoutMillis: 30_000,
  maxUses: 7500,
  statement_timeout: 30_000,
});

pool.on("error", (err) => {
  logger.error("Unexpected pool client error", { error: err.message });
});

export default pool;
```

### AIP-147: Swallowed Error in Promise.all with Partial Failure
**Frequency:** Common
**Why AI does this:** When generating concurrent operations, models use `Promise.all()` because it is the most common concurrency pattern in training data. However, they often fail to handle partial failures correctly: either the entire operation fails atomically (desirable) or individual failures are silently swallowed via `Promise.allSettled()` without checking the results. The model does not reason about what should happen when 3 of 5 concurrent operations succeed.
**What to look for:**
- `Promise.allSettled()` where results are not inspected for rejections
- `Promise.all()` without understanding that one failure rejects all
- `Promise.all(items.map(async (item) => { try { ... } catch {} }))` -- catching inside the map swallows all errors

**Vulnerable (AI-generated):**
```typescript
async function sendNotifications(userIds: string[], message: string) {
  await Promise.all(
    userIds.map(async (userId) => {
      try {
        await notificationService.send(userId, message);
      } catch (error) {
        // Silently swallowed -- no logging, no counting, no alerting
      }
    })
  );
  return { sent: userIds.length }; // Reports all as sent, even failures
}
```

**Secure (corrected):**
```typescript
async function sendNotifications(userIds: string[], message: string) {
  const results = await Promise.allSettled(
    userIds.map((userId) => notificationService.send(userId, message))
  );

  const succeeded = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected");

  if (failed.length > 0) {
    logger.warn("Some notifications failed", {
      total: userIds.length,
      failed: failed.length,
      errors: failed.map((r) => (r as PromiseRejectedResult).reason?.message),
    });
  }

  return { sent: succeeded, failed: failed.length, total: userIds.length };
}
```

### AIP-148: Missing Process-Level Error Handlers
**Frequency:** Frequent
**Why AI does this:** When generating Express server boilerplate, models produce `app.listen(3000)` and focus on routes and middleware. Process-level handlers for `uncaughtException` and `unhandledRejection` are rarely present in tutorials or quick-start examples, so the model omits them. The model also rarely generates Express error middleware (the 4-parameter `(err, req, res, next)` handler) because it is not part of the standard route pattern.
**What to look for:**
- No `process.on("uncaughtException", ...)` anywhere in the codebase
- No `process.on("unhandledRejection", ...)` anywhere in the codebase
- No 4-parameter error middleware in Express app setup
- `app.listen(port)` as the final line with no error handlers above it

**Vulnerable (AI-generated):**
```typescript
import express from "express";

const app = express();
app.use(express.json());

app.get("/api/health", (req, res) => res.json({ status: "ok" }));
app.get("/api/users/:id", async (req, res) => {
  const user = await db.findUser(req.params.id);
  res.json(user);
});

app.listen(3000, () => console.log("Server running on port 3000"));
// No error handlers at all -- crashes expose stack traces to clients
```

**Secure (corrected):**
```typescript
import express, { Request, Response, NextFunction } from "express";

const app = express();
app.use(express.json({ limit: "256kb" }));

app.get("/api/health", (req, res) => res.json({ status: "ok" }));
app.get("/api/users/:id", async (req, res, next) => {
  try {
    const user = await db.findUser(req.params.id);
    if (!user) return res.status(404).json({ error: "Not found" });
    res.json(user);
  } catch (error) {
    next(error);
  }
});

// Error middleware (must have 4 parameters)
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error("Request error", { error: err.message, path: req.path });
  res.status(500).json({ error: "Internal server error" });
});

// Process-level safety nets
process.on("uncaughtException", (error) => {
  logger.fatal("Uncaught exception", { error: error.message });
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled rejection", { reason });
});

const server = app.listen(3000, () => logger.info("Server started on port 3000"));
server.requestTimeout = 30_000;
server.headersTimeout = 20_000;
```
