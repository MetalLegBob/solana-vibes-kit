# OC-182: PII in Logs or Error Messages

**Category:** Data Security
**Severity:** HIGH
**Auditors:** DATA-06
**CWE:** CWE-532 (Insertion of Sensitive Information into Log File)
**OWASP:** A09:2021 – Security Logging and Monitoring Failures

## Description

Logging or displaying PII (Personally Identifiable Information) in application logs, error messages, or monitoring dashboards creates a secondary exposure channel with typically weaker access controls than the primary database. PII in logs propagates to backup systems, monitoring platforms, log aggregation services, and developer environments, multiplying the attack surface for sensitive data.

While OC-172 covers sensitive data in logs broadly (including credentials and tokens), this pattern focuses specifically on PII: names, emails, addresses, phone numbers, SSNs, dates of birth, IP addresses, and other personal identifiers. PII in logs has distinct regulatory implications: GDPR Article 5(1)(f) requires "appropriate security" of personal data, and logging PII without necessity violates the data minimization principle (Article 5(1)(c)). A 2024 study from Polytechnique Montreal found PII in logs across 77% of surveyed open-source projects, with email addresses, usernames, and IP addresses being the most common types.

Twitter's 2018 incident — accidentally logging 330 million passwords in an internal plaintext log — demonstrated that even world-class engineering organizations can inadvertently log sensitive data. The fix requires both proactive sanitization (stripping PII before logging) and reactive monitoring (scanning logs for PII patterns).

## Detection

```
grep -rn "console\.log\|logger\.\(info\|warn\|error\|debug\)" --include="*.ts" --include="*.js"
grep -rn "email\|phone\|address\|ssn\|name\|dob\|birth" --include="*.ts" --include="*.js"
grep -rn "user\.\|customer\.\|profile\.\|account\." --include="*.ts" --include="*.js"
grep -rn "JSON\.stringify.*user\|JSON\.stringify.*profile\|JSON\.stringify.*customer" --include="*.ts" --include="*.js"
```

Look for: logging entire user/customer/profile objects, error messages including user details for debugging, structured logging fields that include PII, request logging that captures form data with personal information.

## Vulnerable Code

```typescript
import express from "express";
import logger from "./logger";

const app = express();

// VULNERABLE: Logging full user object (contains PII)
app.get("/api/user/:id", async (req, res) => {
  const user = await getUserById(req.params.id);
  logger.info("User fetched", { user });
  // Log: {"user":{"id":"123","name":"Jane Doe","email":"jane@example.com",
  //        "ssn":"123-45-6789","address":"123 Main St","phone":"555-1234"}}
  res.json(user);
});

// VULNERABLE: PII in error context
app.post("/api/kyc/verify", async (req, res) => {
  try {
    await verifyIdentity(req.body);
  } catch (err: any) {
    logger.error("KYC verification failed", {
      error: err.message,
      userData: req.body, // Contains SSN, DOB, address, ID document
    });
    res.status(400).json({ error: "Verification failed" });
  }
});

// VULNERABLE: PII in search/audit logs
app.get("/api/search", async (req, res) => {
  logger.info(`User searched for: ${req.query.q}`);
  // User searches for "john.doe@company.com" → PII in search log
});
```

## Secure Code

```typescript
import express from "express";
import logger from "./logger";

// PII-safe logging: only log identifiers, never personal data
function safeUserContext(user: any): object {
  return {
    userId: user.id,
    role: user.role,
    // No name, email, SSN, address, phone
  };
}

const app = express();

// SECURE: Only log user ID, not PII
app.get("/api/user/:id", async (req, res) => {
  const user = await getUserById(req.params.id);
  logger.info("User fetched", { userId: user.id });
  res.json(user);
});

// SECURE: Error context without PII
app.post("/api/kyc/verify", async (req, res) => {
  try {
    await verifyIdentity(req.body);
  } catch (err: any) {
    logger.error("KYC verification failed", {
      error: err.message,
      userId: req.user?.id,
      verificationStep: err.step,
      // No req.body — contains PII
    });
    res.status(400).json({ error: "Verification failed" });
  }
});

// SECURE: Mask PII in necessary logging
function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  return `${local[0]}***@${domain}`;
}

function maskPhone(phone: string): string {
  return `***${phone.slice(-4)}`;
}

// Use masking when some context is needed
logger.info("Notification sent", {
  recipientMasked: maskEmail(user.email),
  channel: "email",
});
```

## Impact

PII in logs is a GDPR, CCPA, and HIPAA violation in itself, regardless of whether a breach occurs. If log data is compromised, it constitutes a personal data breach requiring notification. PII accumulation in logs creates an attractive target — a single log aggregation breach can expose years of personal data from every user. Log data is also more difficult to delete (for right-to-deletion requests) because it is replicated across backup systems.

## References

- Twitter password logging incident (2018): 330 million passwords in plaintext log
- Research: "An Empirical Study of Sensitive Information in Logs" (2024): PII found in 77% of projects
- GDPR Article 5(1)(c): Data Minimization Principle
- GDPR Article 5(1)(f): Integrity and Confidentiality Principle
- CWE-532: Insertion of Sensitive Information into Log File — https://cwe.mitre.org/data/definitions/532.html
- OWASP A09:2021 – Security Logging and Monitoring Failures
