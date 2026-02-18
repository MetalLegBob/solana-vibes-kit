# OC-222: Debug Mode via Feature Flag in Production

**Category:** Infrastructure
**Severity:** HIGH
**Auditors:** INFRA-03
**CWE:** CWE-489 (Active Debug Code)
**OWASP:** A05:2021 - Security Misconfiguration

## Description

Feature flags or environment variables that enable debug functionality in production expose internal application state, bypass security controls, and leak sensitive information. Common patterns include `DEBUG=true` enabling verbose logging of sensitive data, `ENABLE_SWAGGER=true` exposing API documentation with all endpoint details, or custom feature flags that disable authentication for "testing purposes."

The danger is amplified when feature flags are stored in environment variables, config files, or remote feature flag services that can be modified without a code deployment. An attacker who gains access to the feature flag system (or who exploits an environment variable injection) can enable debug mode in production without any code change.

Debug modes typically expose: stack traces with source paths and variable values, database queries with parameter values, request/response headers including auth tokens, internal service topology, and performance profiling data. In web3 applications, debug modes may expose wallet addresses, transaction signing details, or RPC endpoint configurations that can be used for targeted attacks.

## Detection

```
# Search for debug flags in environment configs
grep -rn "DEBUG=true\|DEBUG=1\|DEBUG=\*" **/.env* **/docker-compose*.yml **/*.yml
grep -rn "ENABLE_DEBUG\|ENABLE_SWAGGER\|ENABLE_GRAPHQL_PLAYGROUND" **/.env* **/*.yml

# Search for debug conditionals in code
grep -rn "process\.env\.DEBUG\|process\.env\.ENABLE_DEBUG" **/*.ts **/*.js
grep -rn "if.*debug.*true\|if.*isDebug" **/*.ts **/*.js

# Search for swagger/playground in production configs
grep -rn "swagger\|playground\|graphiql\|altair" **/*.ts **/*.js | grep -v "node_modules\|test"

# Search for feature flags that control security
grep -rn "DISABLE_AUTH\|SKIP_AUTH\|BYPASS_AUTH\|NO_AUTH" **/.env* **/*.yml **/*.ts **/*.js

# Search for NODE_ENV not being checked before enabling debug
grep -rn "app\.use.*morgan\|app\.use.*errorHandler" **/*.ts **/*.js
```

## Vulnerable Code

```typescript
// app.ts - debug features gated only by env var
import express from "express";
import swaggerUi from "swagger-ui-express";

const app = express();

// Feature flag enables swagger in production
if (process.env.ENABLE_SWAGGER === "true") {
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}

// Debug flag bypasses authentication
if (process.env.DEBUG === "true") {
  app.use((req, res, next) => {
    // Skip auth in debug mode - ships to prod with DEBUG=true
    req.user = { id: "debug-user", role: "admin" };
    next();
  });
}

// Verbose error handler active in production
app.use((err, req, res, next) => {
  res.status(500).json({
    error: err.message,
    stack: process.env.DEBUG ? err.stack : undefined,
    // Leaks: file paths, line numbers, variable values
    query: process.env.DEBUG ? req.query : undefined,
    headers: process.env.DEBUG ? req.headers : undefined,
  });
});
```

## Secure Code

```typescript
// app.ts - debug features only in development
import express from "express";

const app = express();
const isProduction = process.env.NODE_ENV === "production";

// Swagger only in non-production environments
if (!isProduction) {
  const swaggerUi = await import("swagger-ui-express");
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}

// NEVER bypass authentication based on environment variables
// Authentication middleware always active
app.use(authMiddleware);

// Safe error handler - no internals leaked in production
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  // Log full error internally
  logger.error("Unhandled error", {
    error: err.message,
    stack: err.stack,
    requestId: req.id,
  });

  // Return safe error to client
  res.status(500).json({
    error: isProduction ? "Internal server error" : err.message,
    requestId: req.id,  // For support correlation only
  });
});
```

## Impact

Debug mode enabled in production allows an attacker to:
- View full stack traces revealing internal code structure
- Access API documentation showing all endpoints and schemas
- Bypass authentication if debug mode disables security checks
- View sensitive data in verbose logs (tokens, PII, queries)
- Map internal service topology from debug information
- Access profiling tools that can cause denial-of-service

## References

- CWE-489: https://cwe.mitre.org/data/definitions/489.html
- OWASP: "Don't ship debug code to production"
- Django DEBUG=True vulnerability pattern (leaks settings, database info)
- Express.js error handling best practices: https://expressjs.com/en/guide/error-handling.html
- CVE-2019-11248: Kubernetes debug/pprof endpoint exposure
