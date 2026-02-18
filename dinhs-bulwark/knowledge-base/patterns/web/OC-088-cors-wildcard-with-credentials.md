# OC-088: CORS Wildcard with Credentials

**Category:** Web Application Security
**Severity:** HIGH
**Auditors:** WEB-02
**CWE:** CWE-942
**OWASP:** A05:2021 - Security Misconfiguration

## Description

Cross-Origin Resource Sharing (CORS) controls which external origins can access a server's resources. A critical misconfiguration occurs when a server sets `Access-Control-Allow-Origin: *` (wildcard) alongside `Access-Control-Allow-Credentials: true`. While browsers block this exact combination, developers often work around it by dynamically reflecting the requesting origin, effectively creating a wildcard-with-credentials configuration.

This pattern is extremely common in development environments where developers add permissive CORS headers to "fix" cross-origin errors and forget to restrict them before production. Eramba (CVE-2025-55462) had a CORS misconfiguration in v3.26.0 that reflected attacker-controlled Origin headers with credentials, enabling session hijacking and data exfiltration.

The core danger is that an attacker's malicious website can make authenticated cross-origin requests to the target API and read the responses, completely bypassing the Same-Origin Policy. This turns any API endpoint into an attacker-readable resource.

## Detection

```
# Wildcard CORS configuration
grep -rn "Access-Control-Allow-Origin.*\*" --include="*.ts" --include="*.js"
grep -rn "allowOrigin.*\*\|origin.*\*" --include="*.ts" --include="*.js" --include="*.json"

# CORS middleware configuration
grep -rn "cors(" --include="*.ts" --include="*.js"
grep -rn "credentials:\s*true" --include="*.ts" --include="*.js"

# Express/Fastify CORS config
grep -rn "origin:\s*true\|origin:\s*\*" --include="*.ts" --include="*.js"
```

## Vulnerable Code

```typescript
import express from 'express';
import cors from 'cors';

const app = express();

// VULNERABLE: Allows all origins with credentials
app.use(cors({
  origin: true, // Reflects any requesting origin
  credentials: true,
}));

// Or the manual equivalent:
app.use((req, res, next) => {
  // VULNERABLE: Reflects the Origin header directly
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  next();
});

app.get('/api/user/profile', (req, res) => {
  // Attacker's site at evil.com can now read this authenticated response
  res.json({ email: 'user@example.com', apiKey: 'sk_live_abc123' });
});
```

## Secure Code

```typescript
import express from 'express';
import cors from 'cors';

const ALLOWED_ORIGINS = new Set([
  'https://app.example.com',
  'https://admin.example.com',
]);

const app = express();

// SECURE: Explicit allowlist of origins
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (same-origin, server-to-server)
    if (!origin || ALLOWED_ORIGINS.has(origin)) {
      callback(null, origin || false);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400,
}));

app.get('/api/user/profile', (req, res) => {
  res.json({ email: 'user@example.com' });
});
```

## Impact

An attacker can host a malicious page that makes authenticated requests to the vulnerable API and reads the responses. This enables exfiltration of user data, API keys, session tokens, and any sensitive information returned by API endpoints. It effectively removes all Same-Origin Policy protections for authenticated endpoints.

## References

- CVE-2025-55462: Eramba CORS misconfiguration enabling session hijacking
- CWE-942: Permissive Cross-domain Policy with Untrusted Domains
- SonarSource: "Never Underestimate CSRF: Why Origin Reflection is a Bad Idea" (2024)
- OWASP: CORS Misconfiguration (https://owasp.org/www-community/attacks/CORS_OriginHeaderScrutiny)
