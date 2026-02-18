# OC-092: Missing X-Frame-Options / frame-ancestors

**Category:** Web Application Security
**Severity:** MEDIUM
**Auditors:** WEB-02
**CWE:** CWE-1021
**OWASP:** A05:2021 - Security Misconfiguration

## Description

When a web page does not include an `X-Frame-Options` header or CSP `frame-ancestors` directive, it can be embedded in an iframe on any other website. This enables clickjacking (UI redressing) attacks where an attacker overlays the target page with transparent or hidden iframes, tricking users into clicking on elements they cannot see -- such as "Delete Account," "Transfer Funds," or "Approve Transaction" buttons.

The `X-Frame-Options` header supports three values: `DENY`, `SAMEORIGIN`, and `ALLOW-FROM` (deprecated). The modern replacement is the CSP `frame-ancestors` directive, which offers more granular control and is supported by all modern browsers. Cure53 research demonstrated that `X-Frame-Options` protects against more than just clickjacking -- it also mitigates drag-and-drop XSS, copy-and-paste XSS, and cross-origin information leaks.

Recent research by Ukani et al. (2025) showed that local frames (`about:blank` iframes) can inherit the parent origin and bypass content blockers, demonstrating that framing protections remain an active area of security concern.

## Detection

```
# Missing X-Frame-Options header
grep -rn "X-Frame-Options\|x-frame-options\|xFrameOptions\|frameguard" --include="*.ts" --include="*.js"

# Missing frame-ancestors in CSP
grep -rn "frame-ancestors\|frameAncestors" --include="*.ts" --include="*.js"

# Helmet.js frameguard configuration
grep -rn "frameguard\|helmet(" --include="*.ts" --include="*.js"

# Check if any framing protection exists
grep -rn "DENY\|SAMEORIGIN\|frame-ancestors" --include="*.ts" --include="*.js" --include="*.conf"
```

## Vulnerable Code

```typescript
import express from 'express';

const app = express();

// VULNERABLE: No framing protection headers
app.get('/settings/delete-account', (req, res) => {
  res.send(`
    <html>
      <body>
        <h1>Delete Account</h1>
        <form method="POST" action="/api/account/delete">
          <button type="submit" class="btn-danger">
            Confirm Delete Account
          </button>
        </form>
      </body>
    </html>
  `);
});

// Attacker's page can iframe this and overlay a "Click to Win" button
// positioned exactly over the "Confirm Delete Account" button
```

## Secure Code

```typescript
import express from 'express';
import helmet from 'helmet';

const app = express();

// SECURE: Apply framing protection globally
app.use(helmet.frameguard({ action: 'deny' }));

// Or use CSP frame-ancestors for more control
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      frameAncestors: ["'none'"], // No site can frame this page
      // Or for specific allowed parents:
      // frameAncestors: ["'self'", "https://trusted-parent.example.com"],
    },
  }),
);

app.get('/settings/delete-account', (req, res) => {
  // X-Frame-Options: DENY is automatically set by helmet
  res.send(`
    <html>
      <body>
        <h1>Delete Account</h1>
        <form method="POST" action="/api/account/delete">
          <input type="hidden" name="_csrf" value="${req.csrfToken()}" />
          <button type="submit" class="btn-danger">
            Confirm Delete Account
          </button>
        </form>
      </body>
    </html>
  `);
});
```

## Impact

Clickjacking enables attackers to trick authenticated users into performing unintended actions: changing account settings, initiating financial transfers, approving OAuth authorizations, deleting accounts, or changing email/password. In cryptocurrency applications, clickjacking can be used to approve wallet transactions or change withdrawal addresses.

## References

- CWE-1021: Improper Restriction of Rendered UI Layers or Frames
- Cure53: "X-Frame-Options: All about Clickjacking?" (2013) -- broader impacts beyond clickjacking
- Ukani et al.: "Local Frames: Exploiting Inherited Origins to Bypass Content Blockers" (2025)
- Chrome Lighthouse: "Mitigate clickjacking with XFO or CSP"
- BrowserStack: "frame-ancestors: A Guide to Web Security and Clickjacking Protection" (2025)
