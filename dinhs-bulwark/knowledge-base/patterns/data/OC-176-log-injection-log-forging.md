# OC-176: Log Injection Enabling Log Forging

**Category:** Data Security
**Severity:** MEDIUM
**Auditors:** DATA-04
**CWE:** CWE-117 (Improper Output Neutralization for Logs)
**OWASP:** A09:2021 – Security Logging and Monitoring Failures

## Description

Log injection occurs when user-controlled input is written to log files without sanitization, allowing an attacker to inject newlines, control characters, or ANSI escape sequences that forge log entries, corrupt log integrity, or exploit log viewers. A forged log entry can mask an attack in progress, frame another user for malicious activity, or inject commands that are executed by log processing pipelines.

In Node.js applications, the most common vector is logging user input (usernames, URLs, headers, query parameters) that contains newline characters (`\n`, `\r\n`). An attacker who submits a username containing `\n[INFO] Admin login successful user=admin` creates a fake log entry that appears legitimate. If log processing pipelines use pattern matching to trigger alerts or automated responses, injected log entries can trigger false actions.

More advanced attacks target log viewers that interpret ANSI escape sequences (terminal-based log tailing) or HTML entities (web-based log dashboards). The Log4Shell vulnerability (CVE-2021-44228) demonstrated the extreme case where log injection led to JNDI lookups and remote code execution in Java applications — while Node.js is not vulnerable to Log4Shell specifically, the principle of untrusted data in logs enabling exploitation of log processing infrastructure remains relevant.

## Detection

```
grep -rn "logger\.\(info\|warn\|error\|debug\).*req\.\|console\.log.*req\." --include="*.ts" --include="*.js"
grep -rn "log.*\${.*req\.\|log.*\+.*req\." --include="*.ts" --include="*.js"
grep -rn "sanitize.*log\|escape.*log\|log.*sanitize" --include="*.ts" --include="*.js"
grep -rn "username\|userAgent\|referer\|query" --include="*.ts" --include="*.js"
```

Look for: template literals or string concatenation including `req.params`, `req.query`, `req.headers`, or `req.body` in log statements, absence of input sanitization before logging, user-controllable values passed directly to logger functions.

## Vulnerable Code

```typescript
import express from "express";
import logger from "./logger";

const app = express();

// VULNERABLE: User input directly in log message
app.post("/auth/login", async (req, res) => {
  const { username, password } = req.body;
  logger.info(`Login attempt for user: ${username}`);
  // Attacker sends username: "admin\n[INFO] 2026-02-18 Login successful user=admin"
  // Log shows TWO entries, one forged

  try {
    await authenticate(username, password);
    logger.info(`Login successful for user: ${username}`);
  } catch {
    logger.warn(`Login failed for user: ${username}`);
    // Attacker: "victim\n[WARN] Brute force detected from IP: 10.0.0.1"
    res.status(401).json({ error: "Invalid credentials" });
  }
});

// VULNERABLE: User-Agent in logs (attacker-controlled header)
app.use((req, res, next) => {
  logger.info(`Request from ${req.headers["user-agent"]} to ${req.path}`);
  next();
});
```

## Secure Code

```typescript
import express from "express";
import logger from "./logger";

// Sanitize strings for safe logging
function sanitizeForLog(input: string): string {
  return input
    .replace(/[\n\r]/g, "")    // Remove newlines
    .replace(/[\x00-\x1f]/g, "") // Remove control characters
    .substring(0, 200);         // Limit length
}

const app = express();

// SECURE: Sanitized user input in structured logs
app.post("/auth/login", async (req, res) => {
  const username = sanitizeForLog(req.body.username || "");

  // SECURE: Structured logging (key-value, not interpolated strings)
  logger.info("Login attempt", { username, ip: req.ip });

  try {
    await authenticate(req.body.username, req.body.password);
    logger.info("Login successful", { username, ip: req.ip });
  } catch {
    logger.warn("Login failed", { username, ip: req.ip });
    res.status(401).json({ error: "Invalid credentials" });
  }
});

// SECURE: Structured logging with sanitized headers
app.use((req, res, next) => {
  logger.info("Request received", {
    userAgent: sanitizeForLog(req.headers["user-agent"] || ""),
    path: req.path,
    method: req.method,
  });
  next();
});
```

## Impact

Log injection enables attackers to forge log entries masking ongoing attacks, corrupt audit trails that may be used as evidence, trigger false alerts in security monitoring systems, and potentially exploit log processing pipelines that interpret log content (SIEM rules, automated response scripts). In extreme cases like Log4Shell, log injection leads to remote code execution.

## References

- CVE-2021-44228: Log4Shell — log injection leading to RCE in Java (Log4j)
- CWE-117: Improper Output Neutralization for Logs — https://cwe.mitre.org/data/definitions/117.html
- OWASP A09:2021 – Security Logging and Monitoring Failures
- OWASP Log Injection: https://owasp.org/www-community/attacks/Log_Injection
