# OC-174: Debug Mode Enabled in Production

**Category:** Data Security
**Severity:** HIGH
**Auditors:** DATA-04
**CWE:** CWE-489 (Active Debug Code), CWE-215 (Insertion of Sensitive Information Into Debugging Code)
**OWASP:** A05:2021 – Security Misconfiguration

## Description

Debug mode left enabled in production exposes verbose error messages, stack traces, internal application state, environment variables, database queries, and sometimes interactive debuggers or REPL consoles. This provides attackers with a comprehensive map of the application's internals and can directly enable remote code execution in some frameworks.

In Node.js/Express applications, the primary indicator is `NODE_ENV` not set to `production`. This single oversight cascades across the entire stack: Express serves verbose error pages, many ORMs log full SQL queries, template engines show source templates on error, and libraries like Morgan log full request/response details. Frameworks like Django (Python) and Laravel (PHP) expose interactive debug pages with environment variables including database passwords and API keys.

Beyond information disclosure, some debug configurations create direct exploitation vectors. The `--inspect` flag exposes a Chrome DevTools debugging protocol that allows arbitrary code execution. Debug endpoints like `/debug/pprof`, `/__debug__`, or `/console` provide direct access to application internals. Express debug middleware can expose middleware configuration and routing tables.

## Detection

```
grep -rn "NODE_ENV\|debug\|DEBUG" --include="*.ts" --include="*.js" --include="*.env" --include="*.yaml"
grep -rn "inspect\|--inspect\|--debug" --include="*.json" --include="*.yaml" --include="Dockerfile"
grep -rn "morgan.*dev\|verbose\|silly" --include="*.ts" --include="*.js"
grep -rn "errorhandler\|express-debug\|debug-mode" --include="*.ts" --include="*.js" --include="package.json"
```

Look for: `NODE_ENV !== 'production'` in deployment configs, `--inspect` flag in production Dockerfiles or process managers, debug-level logging in production config, debug middleware imported and mounted, `DEBUG=*` environment variable.

## Vulnerable Code

```typescript
import express from "express";
import errorHandler from "errorhandler";
import morgan from "morgan";

const app = express();

// VULNERABLE: Debug middleware in production
app.use(morgan("dev")); // Logs full request/response
app.use(errorHandler()); // Interactive error page with stack traces

// VULNERABLE: Debug endpoint left in production
app.get("/__debug__", (req, res) => {
  res.json({
    env: process.env,        // All environment variables including secrets
    memoryUsage: process.memoryUsage(),
    uptime: process.uptime(),
    versions: process.versions,
  });
});

// VULNERABLE: Verbose ORM logging in production
const prisma = new PrismaClient({
  log: ["query", "info", "warn", "error"], // Full query logging
});

// Dockerfile: VULNERABLE — inspector enabled in production
// CMD ["node", "--inspect=0.0.0.0:9229", "dist/server.js"]
```

## Secure Code

```typescript
import express from "express";
import morgan from "morgan";

const app = express();
const isProduction = process.env.NODE_ENV === "production";

// SECURE: Environment-appropriate logging
if (isProduction) {
  app.use(morgan("combined")); // Structured access logs only
} else {
  app.use(morgan("dev"));
}

// SECURE: No debug endpoints in production
if (!isProduction) {
  app.get("/__debug__", (req, res) => {
    res.json({ memoryUsage: process.memoryUsage() });
  });
}

// SECURE: Environment-appropriate error handling
if (isProduction) {
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    res.status(500).json({ error: "Internal server error" });
  });
} else {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  app.use(require("errorhandler")());
}

// SECURE: Minimal ORM logging in production
const prisma = new PrismaClient({
  log: isProduction ? ["warn", "error"] : ["query", "info", "warn", "error"],
});

// Dockerfile: SECURE — no inspector
// CMD ["node", "dist/server.js"]
```

## Impact

Debug mode exposes environment variables (including database passwords, API keys, and secrets), full SQL queries revealing schema and data, stack traces mapping internal code structure, and potentially an interactive debugger enabling remote code execution. This is often the first vulnerability an attacker exploits because it provides the intelligence needed for all subsequent attacks.

## References

- CWE-489: Active Debug Code — https://cwe.mitre.org/data/definitions/489.html
- CWE-215: Insertion of Sensitive Information Into Debugging Code — https://cwe.mitre.org/data/definitions/215.html
- OWASP A05:2021 – Security Misconfiguration
- Express.js production best practices: https://expressjs.com/en/advanced/best-practice-performance.html
- Node.js Inspector security: https://nodejs.org/en/docs/guides/debugging-getting-started
