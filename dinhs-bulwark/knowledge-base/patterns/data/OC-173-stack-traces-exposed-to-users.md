# OC-173: Stack Traces Exposed to Users

**Category:** Data Security
**Severity:** MEDIUM
**Auditors:** DATA-04
**CWE:** CWE-209 (Generation of Error Message Containing Sensitive Information)
**OWASP:** A05:2021 – Security Misconfiguration

## Description

When applications return stack traces, error details, or debugging information in HTTP responses, they leak internal implementation details that help attackers plan targeted attacks. Stack traces reveal file paths, function names, library versions, database query structures, and sometimes variable values including secrets.

This information disclosure is especially dangerous because it directly maps the application's internal architecture. An attacker can identify which ORM is in use (enabling targeted SQL injection), which template engine processes input (enabling SSTI attacks), which authentication library is used (enabling known vulnerability exploitation), and the exact code paths involved in security-sensitive operations.

Express.js in development mode includes full stack traces in error responses by default. Many applications accidentally ship with development error handling enabled in production, or custom error handlers that fall through to the default handler. The `NODE_ENV` not being set to `production` is a common deployment oversight that enables verbose error responses across multiple frameworks and libraries.

## Detection

```
grep -rn "stack\|stackTrace\|err\.message\|error\.message" --include="*.ts" --include="*.js"
grep -rn "res\.status.*json.*error\|res\.send.*error\|res\.json.*err" --include="*.ts" --include="*.js"
grep -rn "NODE_ENV\|development\|debug" --include="*.ts" --include="*.js" --include="*.env"
grep -rn "showStackTrace\|verbose.*error\|detailed.*error" --include="*.ts" --include="*.js"
```

Look for: error handlers that include `err.stack` or `err.message` in the response body, missing production error handler middleware, `NODE_ENV` not set to `production` in deployment configs, catch blocks that forward raw error objects to the response.

## Vulnerable Code

```typescript
import express from "express";

const app = express();

// VULNERABLE: Raw error details sent to client
app.get("/api/user/:id", async (req, res) => {
  try {
    const user = await db.query("SELECT * FROM users WHERE id = $1", [req.params.id]);
    res.json(user);
  } catch (err: any) {
    // Leaks: file paths, query structure, database type, library versions
    res.status(500).json({
      error: err.message,
      stack: err.stack,
      query: err.query,  // Leaks SQL query structure
    });
  }
});

// VULNERABLE: Default Express error handler in production
// (NODE_ENV !== 'production' → full stack traces)
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  res.status(err.status || 500).json({
    message: err.message,
    stack: err.stack, // Full stack trace
  });
});
```

## Secure Code

```typescript
import express from "express";
import crypto from "crypto";
import logger from "./logger";

const app = express();

app.get("/api/user/:id", async (req, res) => {
  try {
    const user = await db.query("SELECT * FROM users WHERE id = $1", [req.params.id]);
    res.json(user);
  } catch (err) {
    // SECURE: Generate error ID for correlation, log details server-side
    const errorId = crypto.randomUUID();
    logger.error("Database query failed", {
      errorId,
      error: err,
      path: req.path,
      userId: req.user?.id,
    });
    res.status(500).json({
      error: "Internal server error",
      errorId, // Client can reference this for support
    });
  }
});

// SECURE: Production error handler — no details leaked
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  const errorId = crypto.randomUUID();
  logger.error("Unhandled error", { errorId, error: err, path: req.path });

  if (process.env.NODE_ENV === "production") {
    res.status(err.status || 500).json({
      error: "An unexpected error occurred",
      errorId,
    });
  } else {
    // Only in development
    res.status(err.status || 500).json({
      error: err.message,
      stack: err.stack,
    });
  }
});
```

## Impact

Stack traces reveal internal file structure, dependency versions, database schemas, and code logic to attackers. This information enables targeted exploitation of known vulnerabilities in specific library versions, construction of precise SQL injection payloads matching the ORM, identification of authentication and authorization code paths, and social engineering using internal project details.

## References

- CWE-209: Error Message Containing Sensitive Information — https://cwe.mitre.org/data/definitions/209.html
- OWASP A05:2021 – Security Misconfiguration
- Express.js: Production best practices — error handling
- OWASP Improper Error Handling: https://owasp.org/www-community/Improper_Error_Handling
