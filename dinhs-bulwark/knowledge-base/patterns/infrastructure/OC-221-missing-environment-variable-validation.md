# OC-221: Missing Environment Variable Validation

**Category:** Infrastructure
**Severity:** MEDIUM
**Auditors:** INFRA-03
**CWE:** CWE-20 (Improper Input Validation)
**OWASP:** A05:2021 - Security Misconfiguration

## Description

Applications that read configuration from environment variables without validating their presence, format, or values can fail in unsafe ways. A missing `DATABASE_URL` might cause the application to fall back to an insecure default. A missing `JWT_SECRET` might cause authentication to be bypassed if the code defaults to an empty string. An injected environment variable value can modify application behavior in unexpected ways.

CVE-2025-24959 demonstrated environment variable injection in Google's `zx` tool, where an attacker with control over environment variable values could inject unintended variables into `process.env`, leading to arbitrary command execution. CVE-2024-40647 showed how Sentry's Python SDK unintentionally exposed environment variables to subprocesses despite `env={}` settings. The Shellshock vulnerability (CVE-2014-6271) remains the canonical example of environment variable injection leading to remote code execution.

In containerized environments, environment variables are the primary configuration mechanism (per the 12-factor app methodology). This makes environment variable validation critical: every security-sensitive variable should be validated at startup, and the application should fail-closed (refuse to start) if required variables are missing or malformed.

## Detection

```
# Search for process.env usage without validation
grep -rn "process\.env\." **/*.ts **/*.js | grep -v "node_modules"

# Search for missing validation libraries
grep -rL "envalid\|joi\|zod\|dotenv-safe\|env-var" **/package.json

# Search for environment variable fallbacks to insecure defaults
grep -rn 'process\.env\..*\|\|.*""' **/*.ts **/*.js
grep -rn 'process\.env\..*\?\?' **/*.ts **/*.js
grep -rn "getenv.*default\|os\.environ\.get.*," **/*.py

# Search for NODE_ENV checks that gate security features
grep -rn "NODE_ENV.*development\|NODE_ENV.*test" **/*.ts **/*.js | grep -i "security\|auth\|tls\|ssl"

# Search for Dockerfile ENV with empty defaults
grep -rn "ENV.*=$" **/Dockerfile*
```

## Vulnerable Code

```typescript
// config.ts - no validation, unsafe defaults
const config = {
  // Missing JWT_SECRET defaults to empty string - auth bypass!
  jwtSecret: process.env.JWT_SECRET || "",

  // Missing DATABASE_URL falls back to localhost without TLS
  databaseUrl: process.env.DATABASE_URL || "postgres://localhost:5432/app",

  // Missing NODE_ENV defaults to development (debug mode)
  nodeEnv: process.env.NODE_ENV || "development",

  // No validation of format - could be any value
  port: process.env.PORT || "3000",

  // API key not validated for presence or format
  apiKey: process.env.API_KEY,
};
```

## Secure Code

```typescript
// config.ts - validated environment variables
import { cleanEnv, str, port, url, bool } from "envalid";

// Fail-fast: application refuses to start if validation fails
const config = cleanEnv(process.env, {
  // Required with minimum length
  JWT_SECRET: str({ desc: "JWT signing secret", example: "min-32-char-secret" }),

  // Must be a valid URL
  DATABASE_URL: url({ desc: "PostgreSQL connection string" }),

  // Enum validation
  NODE_ENV: str({
    choices: ["production", "staging", "development", "test"],
    default: "production",  // Safe default
  }),

  // Port with valid range
  PORT: port({ default: 3000 }),

  // Required in production
  API_KEY: str({ desc: "External API key" }),

  // Boolean with safe default
  ENABLE_DEBUG: bool({ default: false }),
});

// Validate JWT_SECRET length
if (config.JWT_SECRET.length < 32) {
  throw new Error("JWT_SECRET must be at least 32 characters");
}

export default config;
```

## Impact

Missing environment variable validation can lead to:
- Authentication bypass if JWT secrets default to empty strings
- Data exposure if database connections fall back to unencrypted defaults
- Debug features enabled in production via missing NODE_ENV
- Environment variable injection enabling command execution (CVE-2025-24959)
- Fail-open behavior where missing security configuration disables protections
- Inconsistent behavior between environments causing security gaps

## References

- CVE-2025-24959: Environment Variable Injection in Google zx (GHSA-qwp8-x4ff-5h87)
- CVE-2024-40647: Sentry Python SDK environment variable exposure
- CVE-2014-6271: Shellshock - environment variable code injection in Bash
- CWE-20: https://cwe.mitre.org/data/definitions/20.html
- 12-Factor App: https://12factor.net/config
- envalid npm package: https://github.com/af/envalid
