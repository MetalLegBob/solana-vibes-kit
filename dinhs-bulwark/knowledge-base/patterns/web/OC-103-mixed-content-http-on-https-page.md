# OC-103: Mixed Content (HTTP on HTTPS Page)

**Category:** Web Application Security
**Severity:** LOW
**Auditors:** WEB-02
**CWE:** CWE-319
**OWASP:** A05:2021 - Security Misconfiguration

## Description

Mixed content occurs when an HTTPS page loads sub-resources (scripts, stylesheets, images, iframes, fonts, XHR/fetch requests) over plain HTTP. This undermines the HTTPS guarantee because an attacker on the network path can tamper with the HTTP-loaded resources through a man-in-the-middle attack.

Browsers classify mixed content into two categories: (1) "active" mixed content (scripts, stylesheets, iframes, XHR/fetch) is blocked by modern browsers by default because it can manipulate the entire page, and (2) "passive" mixed content (images, audio, video) is typically allowed with a warning because it cannot execute code, though it can still be replaced or tracked.

In practice, mixed content frequently appears in: hardcoded `http://` URLs for CDN resources, API endpoints configured with HTTP in development that persist to production, third-party widget embeds, image URLs stored in databases from before HTTPS migration, and dynamically generated URLs that use `http://` protocol.

## Detection

```
# Hardcoded HTTP URLs in source code
grep -rn "http://" --include="*.ts" --include="*.js" --include="*.tsx" --include="*.jsx" --include="*.html" --include="*.css" | grep -v "localhost\|127\.0\.0\.1\|http://schemas\|http://www\.w3\.org"

# Fetch/XHR to HTTP endpoints
grep -rn "fetch\s*(\s*['\"]http:" --include="*.ts" --include="*.js" --include="*.tsx"
grep -rn "XMLHttpRequest.*http:" --include="*.ts" --include="*.js"

# HTTP URLs in configuration
grep -rn "apiUrl.*http:\|baseUrl.*http:\|endpoint.*http:" --include="*.ts" --include="*.js" --include="*.json" --include="*.env"

# Image/script/link tags with HTTP sources
grep -rn "src=\"http:\|href=\"http:" --include="*.html" --include="*.ejs" --include="*.tsx"
```

## Vulnerable Code

```typescript
// VULNERABLE: Mixed content in React application
import React from 'react';

const config = {
  apiUrl: 'http://api.example.com',  // HTTP in production!
  cdnUrl: 'http://cdn.example.com',
};

function Dashboard() {
  return (
    <div>
      {/* Active mixed content -- blocked by browsers */}
      <script src="http://cdn.example.com/analytics.js" />

      {/* Passive mixed content -- allowed but insecure */}
      <img src="http://cdn.example.com/logo.png" alt="Logo" />

      {/* Fetch to HTTP endpoint -- blocked */}
      <button onClick={() => {
        fetch('http://api.example.com/data', { credentials: 'include' })
          .then(r => r.json())
          .then(console.log);
      }}>
        Load Data
      </button>
    </div>
  );
}
```

## Secure Code

```typescript
// SECURE: All resources loaded over HTTPS
import React from 'react';

const config = {
  apiUrl: 'https://api.example.com',
  cdnUrl: 'https://cdn.example.com',
};

function Dashboard() {
  return (
    <div>
      <script src="https://cdn.example.com/analytics.js" />
      <img src="https://cdn.example.com/logo.png" alt="Logo" />
      <button onClick={() => {
        fetch('https://api.example.com/data', { credentials: 'include' })
          .then(r => r.json())
          .then(console.log);
      }}>
        Load Data
      </button>
    </div>
  );
}

// Server-side: Force HTTPS via CSP upgrade-insecure-requests
// This tells the browser to upgrade all HTTP requests to HTTPS
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      upgradeInsecureRequests: [],
    },
  }),
);
```

## Impact

Active mixed content (scripts, stylesheets) can be tampered with by a MITM attacker to inject malicious JavaScript, steal credentials, or redirect users. Passive mixed content (images) can be replaced to deface the page or tracked for surveillance. In cryptocurrency applications, a MITM attack on a mixed-content API call could modify transaction parameters such as recipient addresses or amounts.

## References

- CWE-319: Cleartext Transmission of Sensitive Information
- MDN: Mixed content reference
- Chrome: Mixed content behavior and blocking policies
- CSP: upgrade-insecure-requests directive
- OWASP: Transport Layer Security Cheat Sheet
