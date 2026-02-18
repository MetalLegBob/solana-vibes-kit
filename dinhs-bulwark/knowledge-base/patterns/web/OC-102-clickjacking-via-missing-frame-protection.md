# OC-102: Clickjacking via Missing Frame Protection

**Category:** Web Application Security
**Severity:** MEDIUM
**Auditors:** WEB-02
**CWE:** CWE-1021
**OWASP:** A04:2021 - Insecure Design

## Description

Clickjacking (UI redressing) is an attack where a malicious site embeds the target application in a transparent or hidden iframe and overlays it with deceptive UI elements. Users believe they are interacting with the visible page, but their clicks are actually hitting buttons and links on the invisible embedded page. This can trick authenticated users into performing sensitive actions like approving transactions, changing settings, or granting permissions.

This pattern differs from OC-092 (missing headers) by focusing on the attack scenario and detection of frameable sensitive pages specifically. While OC-092 focuses on the missing header, this pattern targets pages with sensitive actions that should never be frameable -- transaction confirmations, account deletion, OAuth consent screens, and admin panels.

Huntress (2025) documented how clickjacking attacks have become a major concern because of their simplicity and devastating consequences. Pragmatic Web Security research noted that even APIs are threatened by frame-based attacks, as they interact with browser cookies and authentication mechanisms.

## Detection

```
# Sensitive pages without frame protection
grep -rn "delete-account\|transfer\|approve\|confirm\|authorize\|consent\|admin" --include="*.ts" --include="*.js" --include="*.tsx"

# Check if these pages have frame protection
grep -rn "X-Frame-Options\|frame-ancestors\|frameguard" --include="*.ts" --include="*.js"

# OAuth consent/authorize pages
grep -rn "\/authorize\|\/consent\|\/approve" --include="*.ts" --include="*.js"

# Forms with critical actions
grep -rn "method=\"POST\"\|method=\"post\"" --include="*.html" --include="*.ejs" --include="*.tsx" | grep -i "delete\|transfer\|withdraw\|approve"
```

## Vulnerable Code

```typescript
import express from 'express';

const app = express();

// VULNERABLE: Transaction approval page with no frame protection
app.get('/approve-transaction', (req, res) => {
  const { txId, amount, to } = req.query;

  // No X-Frame-Options or CSP frame-ancestors header
  res.send(`
    <html>
      <body>
        <h1>Approve Transaction</h1>
        <p>Send ${amount} SOL to ${to}</p>
        <form method="POST" action="/api/transactions/${txId}/approve">
          <button type="submit" class="btn-primary">Approve</button>
        </form>
      </body>
    </html>
  `);
});

// Attacker's clickjacking page:
// <iframe src="https://target.com/approve-transaction?txId=malicious&amount=100&to=attacker"
//         style="opacity: 0; position: absolute; top: 0; left: 0; width: 100%; height: 100%;">
// </iframe>
// <button style="position: absolute; top: 300px; left: 200px;">
//   Click to claim your prize!
// </button>
```

## Secure Code

```typescript
import express from 'express';
import helmet from 'helmet';

const app = express();

// SECURE: Global frame protection
app.use(helmet.frameguard({ action: 'deny' }));
app.use(helmet.contentSecurityPolicy({
  directives: {
    frameAncestors: ["'none'"],
  },
}));

// SECURE: Additional protection on critical pages
app.get('/approve-transaction', (req, res) => {
  const { txId } = req.query;
  const tx = db.transactions.findById(txId as string);

  // Extra frame-busting header for critical pages
  res.setHeader('X-Frame-Options', 'DENY');

  res.send(`
    <html>
      <body>
        <h1>Approve Transaction</h1>
        <p>Send ${tx.amount} SOL to ${tx.to}</p>
        <form method="POST" action="/api/transactions/${tx.id}/approve">
          <input type="hidden" name="_csrf" value="${req.csrfToken()}" />
          <!-- Require re-authentication for high-value actions -->
          <input type="password" name="confirmPassword"
                 placeholder="Enter password to confirm" required />
          <button type="submit" class="btn-primary">Approve</button>
        </form>
      </body>
    </html>
  `);
});
```

## Impact

Clickjacking enables attackers to trick users into performing arbitrary authenticated actions. In financial applications, this includes approving wire transfers, authorizing cryptocurrency transactions, or changing withdrawal addresses. In OAuth flows, clickjacking can trick users into granting permissions to malicious applications.

## References

- CWE-1021: Improper Restriction of Rendered UI Layers or Frames
- Huntress: "What Is Clickjacking? UI Redress Attacks Explained" (2025)
- Pragmatic Web Security: "Current best practices to restrict framing in the browser" (2020)
- Cure53: "X-Frame-Options: All about Clickjacking?" -- frame-based attacks beyond clickjacking
- OWASP: Clickjacking Defense Cheat Sheet
