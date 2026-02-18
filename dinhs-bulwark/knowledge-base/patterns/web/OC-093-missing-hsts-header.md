# OC-093: Missing HSTS Header

**Category:** Web Application Security
**Severity:** MEDIUM
**Auditors:** WEB-02
**CWE:** CWE-319
**OWASP:** A05:2021 - Security Misconfiguration

## Description

HTTP Strict Transport Security (HSTS) is a response header that instructs browsers to only communicate with the server over HTTPS for a specified duration. Without HSTS, even sites that redirect HTTP to HTTPS are vulnerable to SSL stripping attacks, where a man-in-the-middle attacker intercepts the initial HTTP request before the redirect and downgrades the connection to plaintext.

The `Strict-Transport-Security` header takes the form: `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`. The `max-age` directive (in seconds) tells the browser how long to enforce HTTPS-only. `includeSubDomains` extends protection to all subdomains. `preload` signals eligibility for browser preload lists, which hardcode HSTS for the domain.

Without HSTS, users are vulnerable during the critical first connection (or after the HSTS max-age expires). An attacker on the same network (public Wi-Fi, compromised router) can perform an SSL stripping attack using tools like `sslstrip`, serving the user a plaintext HTTP version of the site while proxying HTTPS to the real server.

## Detection

```
# Check for HSTS header configuration
grep -rn "Strict-Transport-Security\|strictTransportSecurity\|hsts" --include="*.ts" --include="*.js"
grep -rn "max-age" --include="*.ts" --include="*.js" --include="*.conf"

# Helmet.js HSTS configuration
grep -rn "helmet\.hsts\|helmet()" --include="*.ts" --include="*.js"

# Nginx/Apache HSTS configuration
grep -rn "Strict-Transport-Security" --include="*.conf" --include="*.config"

# Check if max-age is too short (less than 1 year)
grep -rn "max-age=\d" --include="*.ts" --include="*.js" --include="*.conf"
```

## Vulnerable Code

```typescript
import express from 'express';

const app = express();

// VULNERABLE: HTTP to HTTPS redirect without HSTS
app.use((req, res, next) => {
  if (req.protocol === 'http') {
    // This redirect can be intercepted by MITM before it completes
    return res.redirect(`https://${req.headers.host}${req.url}`);
  }
  next();
});

// No HSTS header means browser will try HTTP again next time
app.get('/', (req, res) => {
  res.send('<html><body>Welcome</body></html>');
});

app.listen(443);
```

## Secure Code

```typescript
import express from 'express';
import helmet from 'helmet';

const app = express();

// SECURE: Enable HSTS with recommended settings
app.use(
  helmet.hsts({
    maxAge: 31536000,       // 1 year in seconds
    includeSubDomains: true, // Protect all subdomains
    preload: true,           // Eligible for browser preload list
  }),
);

// Redirect HTTP to HTTPS (handled in reverse proxy ideally)
app.use((req, res, next) => {
  if (req.protocol === 'http') {
    return res.redirect(301, `https://${req.headers.host}${req.url}`);
  }
  next();
});

app.get('/', (req, res) => {
  // Browser will now refuse to connect via HTTP for 1 year
  res.send('<html><body>Welcome</body></html>');
});

app.listen(443);
```

## Impact

Without HSTS, attackers on the network path can perform SSL stripping attacks to intercept credentials, session tokens, API keys, and sensitive data transmitted during the vulnerable window. This is especially dangerous on public Wi-Fi networks, compromised routers, and in environments where DNS spoofing is possible. For cryptocurrency applications, SSL stripping can enable transaction manipulation or credential theft.

## References

- CWE-319: Cleartext Transmission of Sensitive Information
- TraceSecurity: "Understanding the Missing HSTS Header Vulnerability" (2024)
- OWASP: HTTP Strict Transport Security Cheat Sheet
- Cobalt Vulnerability Wiki: Missing Strict Transport Security Header
- MDN: Strict-Transport-Security header reference
- hstspreload.org: HSTS preload list submission
