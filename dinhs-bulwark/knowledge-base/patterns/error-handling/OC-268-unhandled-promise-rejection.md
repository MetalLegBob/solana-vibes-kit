# OC-268: Unhandled Promise Rejection

**Category:** Error Handling & Resilience
**Severity:** MEDIUM
**Auditors:** ERR-01
**CWE:** CWE-755 (Improper Handling of Exceptional Conditions)
**OWASP:** A10:2025 -- Mishandling of Exceptional Conditions

## Description

An unhandled promise rejection occurs when an async operation fails (a Promise rejects) and no `.catch()` handler or `try/catch` wrapper exists to handle the error. In Node.js 15+, unhandled promise rejections terminate the process by default. In earlier versions, they produced a deprecation warning but allowed the process to continue in a potentially corrupt state.

This is not just a code quality issue -- it is a denial-of-service vector. If an attacker can trigger an unhandled rejection in a Node.js server (for example, by sending malformed input to an async handler), they can crash the entire process. In Express.js, errors thrown inside async route handlers do not automatically reach the error middleware -- they become unhandled rejections that crash the server. A DZone investigation documented a production outage caused by a single missing `await` that led to an unhandled rejection, memory leak, and cascading failure.

Starting with Node.js v15 (October 2020), the `--unhandled-rejections=throw` behavior became the default, meaning any unhandled rejection crashes the process. This was an intentional design decision to force developers to handle errors properly, but it means that legacy code migrated to newer Node.js versions can suddenly become vulnerable to DoS.

## Detection

```
grep -rn "async\s\+function\|async\s\+(" --include="*.ts" --include="*.js" | grep -v "try\|catch\|\.catch"
grep -rn "new Promise" --include="*.ts" --include="*.js" -A 5 | grep -v "\.catch\|reject"
grep -rn "app\.\(get\|post\|put\|delete\|patch\)" --include="*.ts" --include="*.js" | grep "async"
grep -rn "process\.on.*unhandledRejection" --include="*.ts" --include="*.js"
```

Look for: async route handlers without try/catch, Promise chains without .catch(), missing `process.on('unhandledRejection')` global handler, `Promise.all` without catch.

## Vulnerable Code

```typescript
import express from "express";

const app = express();

// VULNERABLE: Async route handler without try/catch
// If db.findUser throws, it becomes an unhandled rejection and crashes
app.get("/api/users/:id", async (req, res) => {
  const user = await db.findUser(req.params.id);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }
  res.json(user);
});

// VULNERABLE: Promise without .catch()
function prefetchData() {
  fetch("https://external-api.example.com/data")
    .then((res) => res.json())
    .then((data) => cache.set("external", data));
  // No .catch() -- network failure crashes the process
}

// VULNERABLE: Detached promise in event handler
app.post("/api/webhooks", (req, res) => {
  processWebhookAsync(req.body); // Fire-and-forget with no error handling
  res.status(200).send("OK");
});
```

## Secure Code

```typescript
import express from "express";

const app = express();

// SECURE: Async error wrapper for Express routes
const asyncHandler = (fn: Function) => (req: any, res: any, next: any) =>
  Promise.resolve(fn(req, res, next)).catch(next);

app.get("/api/users/:id", asyncHandler(async (req, res) => {
  const user = await db.findUser(req.params.id);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }
  res.json(user);
}));

// SECURE: Promise with proper error handling
function prefetchData() {
  fetch("https://external-api.example.com/data")
    .then((res) => res.json())
    .then((data) => cache.set("external", data))
    .catch((error) => {
      logger.error("Failed to prefetch external data", { error: error.message });
    });
}

// SECURE: Fire-and-forget with error handling
app.post("/api/webhooks", (req, res) => {
  processWebhookAsync(req.body).catch((error) => {
    logger.error("Webhook processing failed", { error: error.message });
  });
  res.status(200).send("OK");
});

// SECURE: Global safety net (does NOT replace proper handling)
process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled promise rejection", { reason });
  metrics.increment("unhandled_rejection");
});
```

## Impact

An attacker who can trigger an unhandled promise rejection in a Node.js 15+ application can crash the entire server process, causing a denial of service. In pre-v15 environments, unhandled rejections leave the application in an undefined state where security invariants may no longer hold. Repeated unhandled rejections can also cause memory leaks that degrade service over time.

## References

- CWE-755: Improper Handling of Exceptional Conditions -- https://cwe.mitre.org/data/definitions/755.html
- Node.js v15 release: unhandled rejections now throw -- https://nodejs.org/en/blog/release/v15.0.0
- DZone: "The Tiny Mistake That Crashed Our Node.js App" -- unhandled rejection production outage
- Express.js error handling documentation on async errors
- OWASP A10:2025 -- Mishandling of Exceptional Conditions
