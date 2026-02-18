# OC-081: Reflected XSS

**Category:** Web Application Security
**Severity:** MEDIUM
**Auditors:** WEB-01
**CWE:** CWE-79
**OWASP:** A03:2021 - Injection

## Description

Reflected Cross-Site Scripting (XSS) occurs when user-supplied input is immediately echoed back in the HTTP response without proper sanitization or encoding. Unlike stored XSS, reflected XSS requires tricking a user into clicking a malicious link containing the payload.

In modern JavaScript frameworks, reflected XSS commonly appears in server-side rendered (SSR) pages, error messages that echo user input, and search result pages that display the query term. The React Router framework had a reflected XSS vulnerability (CVE-2025-59057) in its `meta()` API during SSR, demonstrating that even modern frameworks are not immune.

While browsers implement some XSS filtering, these protections are inconsistent and easily bypassed. The primary defense must be server-side output encoding applied at the point of rendering.

## Detection

```
# Server-side rendering with unescaped user input
grep -rn "res\.send.*req\.\(query\|params\|body\)" --include="*.ts" --include="*.js"
grep -rn "res\.write.*req\." --include="*.ts" --include="*.js"
grep -rn "innerHTML.*req\." --include="*.ts" --include="*.js"

# Template interpolation of request data without encoding
grep -rn "\\$\\{req\\." --include="*.ts" --include="*.js"
grep -rn "renderToString.*req\\." --include="*.tsx" --include="*.jsx"
```

## Vulnerable Code

```typescript
import express from 'express';

const app = express();

// Search endpoint that reflects user input in response
app.get('/search', (req, res) => {
  const query = req.query.q as string;
  // VULNERABLE: User input directly interpolated into HTML
  res.send(`
    <html>
      <body>
        <h1>Search Results for: ${query}</h1>
        <p>No results found.</p>
      </body>
    </html>
  `);
});

// Error page reflecting the requested path
app.use((req, res) => {
  res.status(404).send(`<h1>Page not found: ${req.path}</h1>`);
});
```

## Secure Code

```typescript
import express from 'express';
import { encode } from 'html-entities';

const app = express();

// Search endpoint with proper output encoding
app.get('/search', (req, res) => {
  const query = req.query.q as string;
  const safeQuery = encode(query);
  res.send(`
    <html>
      <body>
        <h1>Search Results for: ${safeQuery}</h1>
        <p>No results found.</p>
      </body>
    </html>
  `);
});

// Error page with encoded output
app.use((req, res) => {
  const safePath = encode(req.path);
  res.status(404).send(`<h1>Page not found: ${safePath}</h1>`);
});
```

## Impact

An attacker can craft a URL containing JavaScript that executes in the victim's browser session. This enables session hijacking, credential theft, defacement, and redirection to malicious sites. In authenticated contexts, the attacker can perform actions as the victim user.

## References

- CVE-2025-59057: React Router XSS in Framework Mode meta() APIs during SSR
- CWE-79: Improper Neutralization of Input During Web Page Generation
- OWASP XSS Prevention Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Scripting_Prevention_Cheat_Sheet.html
