# OC-153: API Versioning Exposes Deprecated Vulnerable Code

**Category:** API & Network
**Severity:** MEDIUM
**Auditors:** API-01
**CWE:** CWE-1104
**OWASP:** API9:2023 - Improper Inventory Management

## Description

API versioning vulnerabilities occur when deprecated API versions remain accessible in production, exposing older code that lacks security fixes, input validation, or authorization checks present in newer versions. Attackers discover these deprecated endpoints and use them to bypass security controls that were only applied to the current API version.

Organizations typically version their APIs as `/api/v1/`, `/api/v2/`, `/api/v3/` and add security improvements to the latest version while forgetting to backport fixes or decommission older versions. Common scenarios include: v1 lacking rate limiting that v2 added, v1 having a mass assignment vulnerability that v2 fixed with DTOs, v1 returning verbose error messages that v2 sanitized, or v1 using a vulnerable authentication scheme that v2 replaced.

OWASP API Security Top 10 (2023) ranks this as API9:2023 (Improper Inventory Management), noting that organizations often lose track of which API versions and endpoints are deployed. The problem is compounded by internal APIs, staging endpoints, and documentation endpoints that are not intended for public access but remain reachable. API discovery tools like swagger-ui, openapi.json, and .well-known endpoints can reveal deprecated versions that attackers then target.

## Detection

```
# Multiple API version routes
grep -rn "\/api\/v[0-9]\|\/v[0-9]\/" --include="*.ts" --include="*.js"
# Version-specific route files
ls -la routes/v1/ routes/v2/ 2>/dev/null
# Deprecated markers in code
grep -rn "@deprecated\|deprecated\|DEPRECATED\|legacy\|old_api" --include="*.ts" --include="*.js"
# OpenAPI/Swagger docs exposing multiple versions
grep -rn "swagger\|openapi\|api-docs" --include="*.ts" --include="*.js" --include="*.json" --include="*.yaml"
# Version routing without uniform security middleware
grep -rn "app\.use.*v1\|router.*v1" --include="*.ts" --include="*.js"
```

## Vulnerable Code

```typescript
import express from 'express';
import v1Router from './routes/v1';
import v2Router from './routes/v2';

const app = express();

// VULNERABLE: v1 still accessible without v2's security improvements
app.use('/api/v1', v1Router); // No rate limiting, no input validation
app.use('/api/v2', rateLimiter, v2Router); // Has rate limiting

// In routes/v1/users.ts -- OLD CODE, never updated:
router.post('/users', (req, res) => {
  const user = new User(req.body); // Mass assignment (fixed in v2)
  user.save();
  res.json(user); // Returns all fields including hash (fixed in v2)
});

// In routes/v2/users.ts -- NEWER CODE with fixes:
router.post('/users', validateDTO(CreateUserSchema), (req, res) => {
  const { email, name, password } = req.body; // Allowlisted fields
  const user = new User({ email, name, password: hash(password), role: 'user' });
  user.save();
  res.json(toPublicUser(user)); // Filtered response
});

// Attacker simply uses /api/v1/users instead of /api/v2/users
```

## Secure Code

```typescript
import express from 'express';
import v2Router from './routes/v2';

const app = express();

// SECURE: Apply security middleware to ALL API versions
const globalApiSecurity = [
  rateLimiter,
  helmet(),
  cors(corsOptions),
  express.json({ limit: '1mb' }),
];

app.use('/api', ...globalApiSecurity);

// SECURE: Deprecated versions return 410 Gone or redirect
app.use('/api/v1', (req, res) => {
  res.status(410).json({
    error: 'API v1 has been deprecated',
    message: 'Please upgrade to /api/v2. See https://docs.myapp.com/migration',
    currentVersion: '/api/v2',
  });
});

// Current version with full security stack
app.use('/api/v2', v2Router);

// SECURE: Sunset header on versions approaching deprecation
app.use('/api/v2', (req, res, next) => {
  res.setHeader('Sunset', 'Sat, 01 Jan 2027 00:00:00 GMT');
  res.setHeader('Deprecation', 'true');
  res.setHeader('Link', '</api/v3>; rel="successor-version"');
  next();
});

app.use('/api/v3', v3Router);
```

## Impact

Deprecated API versions allow attackers to bypass rate limiting, input validation, and authorization controls added in newer versions, exploit known vulnerabilities that were patched only in the latest version, access endpoints with mass assignment, verbose errors, or missing auth checks, discover internal API structure through deprecated documentation endpoints, and use legacy authentication schemes (API keys, basic auth) that were replaced with stronger methods. This effectively negates all security improvements made to the API over time.

## References

- CWE-1104: Use of Unmaintained Third Party Components (applied to self-authored deprecated APIs)
- OWASP API9:2023 - Improper Inventory Management: https://owasp.org/API-Security/editions/2023/en/0xa9-improper-inventory-management/
- IETF RFC 8594: The Sunset HTTP Header Field
- OWASP: API Security Best Practices - Versioning
