# OC-132: Verbose Error Messages Leaking Internals

**Category:** API & Network
**Severity:** MEDIUM
**Auditors:** API-01
**CWE:** CWE-209
**OWASP:** API3:2023 - Broken Object Property Level Authorization, A05:2021 - Security Misconfiguration

## Description

Verbose error messages occur when an API returns detailed internal information in error responses, including stack traces, database query details, file paths, library versions, or internal IP addresses. While helpful during development, these messages provide attackers with a roadmap of the application's internals, significantly reducing the effort required to find and exploit vulnerabilities.

In Node.js/Express applications, the default error handler in development mode returns full stack traces. If `NODE_ENV` is not set to `production`, Express sends the entire error object including the stack property to the client. Frameworks like Sequelize and Mongoose include table names, column names, and constraint details in their error messages. GraphQL servers are particularly prone to this because detailed error messages help developers debug complex queries, and libraries like Apollo Server return full error details by default in non-production mode.

This vulnerability has been exploited in numerous real-world attacks. Attackers use leaked database column names to craft SQL injection payloads, use file paths to identify the framework and version for known CVE exploitation, and use internal IP addresses for SSRF attacks against internal services.

## Detection

```
# Express apps without production error handling
grep -rn "app.use.*err.*req.*res.*next" --include="*.ts" --include="*.js"
# Stack trace exposure
grep -rn "err\.stack\|error\.stack\|\.stack" --include="*.ts" --include="*.js" | grep -i "res\.\|json\|send"
# Sending full error objects
grep -rn "res\.json.*err\b\|res\.send.*err\b" --include="*.ts" --include="*.js"
# Missing NODE_ENV checks
grep -rn "NODE_ENV" --include="*.ts" --include="*.js" -L
# Verbose error formatters in GraphQL
grep -rn "formatError.*error\." --include="*.ts" --include="*.js"
```

## Vulnerable Code

```typescript
import express from 'express';

const app = express();

app.get('/api/users/:id', async (req, res) => {
  try {
    const user = await db.query(`SELECT * FROM users WHERE id = ${req.params.id}`);
    res.json(user);
  } catch (err) {
    // VULNERABLE: Full error with stack trace, query details, and file paths
    res.status(500).json({
      error: err.message,   // "relation \"users\" does not exist" or SQL details
      stack: err.stack,      // Full file paths and line numbers
      query: err.sql,        // The exact SQL query that failed
    });
  }
});

// VULNERABLE: Default Express error handler in production
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({
    message: err.message,
    error: err,  // Entire error object including internals
  });
});
```

## Secure Code

```typescript
import express from 'express';
import { randomUUID } from 'crypto';

const app = express();

app.get('/api/users/:id', async (req, res) => {
  try {
    const user = await db.query('SELECT id, name, email FROM users WHERE id = $1', [req.params.id]);
    res.json(user);
  } catch (err) {
    const errorId = randomUUID();
    // Log full details server-side for debugging
    logger.error({ errorId, error: err.message, stack: err.stack, path: req.path });
    // Return only safe, generic message to client
    res.status(500).json({
      error: 'Internal server error',
      errorId,  // Reference ID for support team
    });
  }
});

// Production-safe global error handler
app.use((err, req, res, next) => {
  const errorId = randomUUID();
  logger.error({ errorId, error: err.message, stack: err.stack });
  res.status(err.status || 500).json({
    error: err.status === 404 ? 'Not found' : 'Internal server error',
    errorId,
  });
});
```

## Impact

Leaked internal details allow attackers to enumerate database schema (table and column names), identify framework versions with known CVEs, discover internal network topology and IP addresses, craft precision SQL injection or path traversal payloads, and identify third-party services and their configurations. This information disclosure dramatically reduces the time and effort required for a successful attack.

## References

- CWE-209: Generation of Error Message Containing Sensitive Information
- OWASP: Improper Error Handling: https://owasp.org/www-community/Improper_Error_Handling
- Express.js error handling best practices: https://expressjs.com/en/guide/error-handling.html
- OWASP API Security Top 10 - API8:2023 Security Misconfiguration
