# OC-172: Sensitive Data in Application Logs

**Category:** Data Security
**Severity:** HIGH
**Auditors:** DATA-04
**CWE:** CWE-532 (Insertion of Sensitive Information into Log File)
**OWASP:** A09:2021 – Security Logging and Monitoring Failures

## Description

Sensitive data in application logs occurs when PII, credentials, tokens, financial data, or health information is written to log files, observability platforms, or console output. This creates a secondary data store that typically has weaker access controls than the primary database, and data in logs propagates to backup systems, monitoring tools, developer laptops, and third-party log aggregation services.

In 2018, Twitter accidentally logged 330 million unmasked passwords to an internal log, affecting all users and prompting a forced password reset. This incident demonstrated that even organizations with mature security practices can inadvertently log sensitive data. Research from Polytechnique Montreal (2024) found PII in logs across multiple categories: usernames, emails, IP addresses, session tokens, and quasi-identifiers that enable re-identification.

The risk is amplified in microservice architectures where each service logs independently, and request/response payloads are routinely logged for debugging. A single `console.log(req.body)` in a login handler logs every user's password. Log aggregation services (Datadog, Splunk, ELK) may retain logs for months or years, and their access controls are often broader than the application's database.

## Detection

```
grep -rn "console\.log\|console\.error\|console\.warn\|console\.info" --include="*.ts" --include="*.js"
grep -rn "logger\.\(info\|warn\|error\|debug\)\|log\.\(info\|warn\|error\|debug\)" --include="*.ts" --include="*.js"
grep -rn "req\.body\|req\.headers\|password\|token\|secret\|ssn\|creditCard" --include="*.ts" --include="*.js"
grep -rn "JSON\.stringify.*req\|JSON\.stringify.*user\|JSON\.stringify.*body" --include="*.ts" --include="*.js"
```

Look for: `console.log(req.body)` in authentication handlers, logging of entire request/response objects, error handlers that log exception details including user data, debug logging of tokens or secrets.

## Vulnerable Code

```typescript
import express from "express";
import logger from "./logger";

const app = express();

// VULNERABLE: Logging entire request body (includes password)
app.post("/auth/login", async (req, res) => {
  logger.info("Login attempt", { body: req.body });
  // Log output: {"body":{"email":"user@example.com","password":"MySecret123"}}

  try {
    const user = await authenticate(req.body.email, req.body.password);
    logger.info("Login successful", { user }); // May log PII
    res.json({ token: user.token });
  } catch (err) {
    logger.error("Login failed", { error: err, body: req.body });
    // Logs password on every failed attempt
    res.status(401).json({ error: "Invalid credentials" });
  }
});

// VULNERABLE: Logging payment details
app.post("/payment", async (req, res) => {
  console.log("Payment request:", JSON.stringify(req.body));
  // Logs: {"cardNumber":"4111111111111111","cvv":"123","amount":99.99}
});

// VULNERABLE: Logging auth headers
app.use((req, res, next) => {
  logger.debug("Request", { headers: req.headers });
  // Logs Authorization: Bearer <token>, Cookie: session=<value>
  next();
});
```

## Secure Code

```typescript
import express from "express";
import logger from "./logger";

const SENSITIVE_FIELDS = new Set([
  "password", "token", "secret", "authorization", "cookie",
  "ssn", "creditCard", "cardNumber", "cvv", "accountNumber",
]);

function sanitizeForLogging(obj: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_FIELDS.has(key.toLowerCase())) {
      sanitized[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null) {
      sanitized[key] = sanitizeForLogging(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

const app = express();

// SECURE: Sanitize before logging
app.post("/auth/login", async (req, res) => {
  logger.info("Login attempt", { email: req.body.email }); // Only log email

  try {
    const user = await authenticate(req.body.email, req.body.password);
    logger.info("Login successful", { userId: user.id }); // Only log ID
    res.json({ token: user.token });
  } catch (err) {
    logger.warn("Login failed", { email: req.body.email, reason: "invalid_credentials" });
    res.status(401).json({ error: "Invalid credentials" });
  }
});

// SECURE: Structured logging with field sanitization
app.use((req, res, next) => {
  logger.debug("Request", {
    method: req.method,
    path: req.path,
    ip: req.ip,
    // Headers and body NOT logged
  });
  next();
});
```

## Impact

Sensitive data in logs is accessible to anyone with log access: developers, operators, third-party services, and attackers who compromise the logging infrastructure. Credentials in logs enable account takeover. PII in logs triggers GDPR, CCPA, and HIPAA notification requirements. Log data persists in backups and replication, making remediation extremely difficult after the fact.

## References

- Twitter password logging incident (2018): 330 million passwords logged in plaintext
- CWE-532: Insertion of Sensitive Information into Log File — https://cwe.mitre.org/data/definitions/532.html
- Research: "An Empirical Study of Sensitive Information in Logs" (2024, Polytechnique Montreal)
- OWASP A09:2021 – Security Logging and Monitoring Failures
- Skyflow: "How to Keep Sensitive Data Out of Your Logs: 9 Best Practices"
