# OC-269: Missing Global Error Handler

**Category:** Error Handling & Resilience
**Severity:** MEDIUM
**Auditors:** ERR-01
**CWE:** CWE-754 (Improper Check for Unusual or Exceptional Conditions)
**OWASP:** A10:2025 -- Mishandling of Exceptional Conditions

## Description

A missing global error handler means the application has no last-resort mechanism to catch uncaught exceptions and unhandled promise rejections. In Node.js, this results in process termination on uncaught exceptions and (since v15) on unhandled rejections. In Express.js, the absence of a 4-parameter error middleware means errors that escape route handlers produce unformatted stack traces to clients, leaking implementation details.

Without global handlers, the application has two failure modes: either it crashes entirely (DoS), or it exposes raw error details including file paths, database queries, dependency versions, and stack traces (information disclosure). Both are exploitable. The crash path enables denial of service, while the information disclosure path gives attackers a roadmap of the application internals.

The OWASP "Improper Error Handling" guidance explicitly warns that detailed internal error messages such as stack traces, database dumps, and error codes displayed to users reveal implementation details that should never be revealed. Express.js in development mode renders full stack traces by default, and many applications ship to production without switching to a production error handler.

## Detection

```
grep -rn "process\.on.*uncaughtException" --include="*.ts" --include="*.js"
grep -rn "process\.on.*unhandledRejection" --include="*.ts" --include="*.js"
grep -rn "app\.use.*err.*req.*res.*next" --include="*.ts" --include="*.js"
grep -rn "NODE_ENV" --include="*.ts" --include="*.js" | grep -i "error\|stack"
```

Look for: absence of `process.on('uncaughtException')`, absence of `process.on('unhandledRejection')`, absence of Express 4-parameter error middleware, `NODE_ENV` not checked before rendering error details.

## Vulnerable Code

```typescript
import express from "express";

const app = express();

app.get("/api/data", async (req, res) => {
  const data = await db.query(`SELECT * FROM users WHERE id = ${req.query.id}`);
  res.json(data);
});

// VULNERABLE: No error-handling middleware
// If the DB query fails, Express returns the raw error with stack trace:
// "error": "ER_PARSE_ERROR: You have an error in your SQL syntax...",
// "stack": "Error: ER_PARSE_ERROR\n    at /app/node_modules/mysql2/..."

app.listen(3000);
// VULNERABLE: No process-level error handlers
// An uncaught exception in any async path crashes the server
```

## Secure Code

```typescript
import express, { Request, Response, NextFunction } from "express";

const app = express();

app.get("/api/data", async (req, res, next) => {
  try {
    const data = await db.query("SELECT * FROM users WHERE id = ?", [req.query.id]);
    res.json(data);
  } catch (error) {
    next(error);
  }
});

// SECURE: Global Express error handler (must be 4-parameter)
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  const requestId = req.headers["x-request-id"] || crypto.randomUUID();
  logger.error("Request error", {
    requestId,
    method: req.method,
    path: req.path,
    error: err.message,
    stack: err.stack,
  });

  // Never expose internals to the client
  res.status(500).json({
    error: "Internal server error",
    requestId, // Allow support correlation without leaking details
  });
});

// SECURE: Process-level handlers for last-resort safety
process.on("uncaughtException", (error) => {
  logger.fatal("Uncaught exception -- shutting down", { error: error.message });
  metrics.increment("uncaught_exception");
  process.exit(1); // Exit to let process manager restart cleanly
});

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled rejection", { reason });
  metrics.increment("unhandled_rejection");
});

app.listen(3000);
```

## Impact

Without global error handlers, an attacker can crash the server by triggering any unhandled error path, causing a denial of service. Alternatively, raw error messages expose database schema details, file system paths, dependency versions, and query structures, providing intelligence for further targeted attacks such as SQL injection or path traversal.

## References

- CWE-754: Improper Check for Unusual or Exceptional Conditions -- https://cwe.mitre.org/data/definitions/754.html
- OWASP: Improper Error Handling -- https://owasp.org/www-community/Improper_Error_Handling
- Express.js Error Handling Guide -- https://expressjs.com/en/guide/error-handling.html
- OWASP A10:2025 -- Mishandling of Exceptional Conditions
- CWE-209: Generation of Error Message Containing Sensitive Information
