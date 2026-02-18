# OC-091: CSP with unsafe-inline/unsafe-eval

**Category:** Web Application Security
**Severity:** MEDIUM
**Auditors:** WEB-02
**CWE:** CWE-693
**OWASP:** A05:2021 - Security Misconfiguration

## Description

A Content-Security-Policy that includes `'unsafe-inline'` in its `script-src` directive permits execution of inline `<script>` tags and event handlers (`onclick`, `onerror`, etc.), effectively neutralizing CSP's primary protection against XSS. Similarly, `'unsafe-eval'` allows `eval()`, `new Function()`, `setTimeout('string')`, and `setInterval('string')`, enabling attackers to execute arbitrary code from string-based injection points.

These directives are commonly added during development to resolve CSP violations without refactoring code to use nonces or external scripts. The SANS/GIAC research paper on CSP bypass techniques (2021) documented how `unsafe-inline` and `unsafe-eval` trivially negate CSP protection in complex applications. PortSwigger Research demonstrated CSP bypass via DOM clobbering even in nonce-based policies when `strict-dynamic` is present.

Many CSP configurations also list overly broad domains (e.g., `*.googleapis.com`, `*.cloudflare.com`) in `script-src`, which can be exploited via JSONP endpoints or hosted script files on those CDNs to bypass CSP entirely.

## Detection

```
# Check for unsafe-inline and unsafe-eval in CSP
grep -rn "unsafe-inline\|unsafe-eval" --include="*.ts" --include="*.js" --include="*.json"
grep -rn "unsafe-inline\|unsafe-eval" --include="*.html" --include="*.ejs"

# Helmet CSP config with unsafe directives
grep -rn "scriptSrc.*unsafe" --include="*.ts" --include="*.js"

# Overly broad domain allowlists
grep -rn "script-src.*\*\.\|scriptSrc.*\*\." --include="*.ts" --include="*.js"

# CSP report-only mode (not enforcing)
grep -rn "Content-Security-Policy-Report-Only" --include="*.ts" --include="*.js"
```

## Vulnerable Code

```typescript
import express from 'express';
import helmet from 'helmet';

const app = express();

// VULNERABLE: unsafe-inline and unsafe-eval negate CSP protection
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'",  // Allows inline <script> tags and event handlers
        "'unsafe-eval'",    // Allows eval(), new Function(), etc.
        '*.googleapis.com', // Overly broad - JSONP endpoints can be abused
      ],
      styleSrc: ["'self'", "'unsafe-inline'"],
    },
  }),
);

// With this CSP, an XSS payload like <img src=x onerror="eval(atob('...'))"
// will execute without restriction
```

## Secure Code

```typescript
import express from 'express';
import helmet from 'helmet';
import crypto from 'crypto';

const app = express();

// Generate a unique nonce per request
app.use((req, res, next) => {
  res.locals.nonce = crypto.randomBytes(16).toString('base64');
  next();
});

// SECURE: Nonce-based CSP without unsafe-inline or unsafe-eval
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'strict-dynamic'",
        (req, res) => `'nonce-${res.locals.nonce}'`,
      ],
      styleSrc: [
        "'self'",
        (req, res) => `'nonce-${res.locals.nonce}'`,
      ],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
    },
  }),
);

// All inline scripts must include the nonce
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <script nonce="${res.locals.nonce}">
          // Only this script executes; injected inline scripts are blocked
          console.log('Authorized script');
        </script>
      </head>
      <body>App</body>
    </html>
  `);
});
```

## Impact

With `unsafe-inline`, any XSS injection can execute inline JavaScript, rendering the CSP meaningless. With `unsafe-eval`, string-to-code execution via `eval()` or `new Function()` is permitted, allowing exploitation of injection points that would otherwise be harmless. The CSP provides a false sense of security while offering no real protection.

## References

- CWE-693: Protection Mechanism Failure
- SANS/GIAC: "Content Security Policy Bypass: Exploiting Misconfigurations" (2021)
- PortSwigger Research: "Bypassing CSP via DOM clobbering" (2023)
- ProjectDiscovery: "CSP Bypass (DAST) - Nuclei Templates v10.1.5" (2025)
- Google CSP Evaluator: https://csp-evaluator.withgoogle.com/
