# OC-089: CORS Origin Reflection

**Category:** Web Application Security
**Severity:** HIGH
**Auditors:** WEB-02
**CWE:** CWE-942
**OWASP:** A05:2021 - Security Misconfiguration

## Description

CORS origin reflection occurs when a server dynamically sets the `Access-Control-Allow-Origin` response header to whatever value is sent in the request's `Origin` header, without validating it against an allowlist. Combined with `Access-Control-Allow-Credentials: true`, this creates a universal bypass of the browser's Same-Origin Policy for authenticated requests.

This vulnerability is frequently discovered in penetration tests and bug bounties. SonarSource documented a real-world case in Whistle, a popular HTTP debugging proxy (14k+ GitHub stars), where SonarQube Cloud detected a CORS misconfiguration that reflected arbitrary origins. The Eramba GRC platform (CVE-2025-55462) exhibited the same pattern in v3.26.0.

Origin reflection often appears when developers use middleware that echoes the Origin header, or write custom CORS handlers with regex patterns that can be bypassed (e.g., checking for `example.com` but matching `evil-example.com` or `example.com.evil.com`).

## Detection

```
# Direct origin header reflection
grep -rn "req\.headers\.origin\|req\.header('origin')" --include="*.ts" --include="*.js"
grep -rn "Access-Control-Allow-Origin.*req\." --include="*.ts" --include="*.js"

# Regex-based origin validation (may be bypassable)
grep -rn "origin.*match\|origin.*test\|origin.*includes\|origin.*indexOf\|origin.*endsWith" --include="*.ts" --include="*.js"

# CORS configuration reflecting origin dynamically
grep -rn "origin:\s*true" --include="*.ts" --include="*.js"
grep -rn "origin.*req\.\|origin.*callback\(null,\s*true\)" --include="*.ts" --include="*.js"
```

## Vulnerable Code

```typescript
import express from 'express';

const app = express();

// VULNERABLE: Regex allows bypasses like "evil-example.com"
const ORIGIN_REGEX = /example\.com$/;

app.use((req, res, next) => {
  const origin = req.headers.origin;

  // Bug: "evil-example.com" matches this regex
  if (origin && ORIGIN_REGEX.test(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  next();
});

// ALSO VULNERABLE: Using includes() check
app.use((req, res, next) => {
  const origin = req.headers.origin;
  // Bug: "https://example.com.evil.com" includes "example.com"
  if (origin && origin.includes('example.com')) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  next();
});
```

## Secure Code

```typescript
import express from 'express';

const app = express();

// SECURE: Exact-match allowlist
const ALLOWED_ORIGINS = new Set([
  'https://app.example.com',
  'https://admin.example.com',
  'https://dashboard.example.com',
]);

app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Vary', 'Origin');
  }

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Max-Age', '86400');
    return res.sendStatus(204);
  }

  next();
});
```

## Impact

An attacker registers a domain that passes the flawed origin validation (e.g., `evil-example.com` or `example.com.attacker.com`) and hosts a page that makes credentialed requests to the vulnerable API. The attacker can read any API response the victim user can access, exfiltrating personal data, tokens, financial information, and admin API keys.

## References

- CVE-2025-55462: Eramba CORS origin reflection vulnerability
- SonarSource: "Never Underestimate CSRF: Why Origin Reflection is a Bad Idea" -- Whistle HTTP proxy CORS bug
- CWE-942: Permissive Cross-domain Policy with Untrusted Domains
- Hackviser: "CORS Misconfiguration Attack Guide"
- PortSwigger Web Security Academy: CORS vulnerability with trusted insecure protocols
