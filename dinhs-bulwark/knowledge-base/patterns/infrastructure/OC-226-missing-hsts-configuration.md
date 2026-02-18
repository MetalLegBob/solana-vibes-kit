# OC-226: Missing HSTS Configuration

**Category:** Infrastructure
**Severity:** MEDIUM
**Auditors:** INFRA-04
**CWE:** CWE-319 (Cleartext Transmission of Sensitive Information)
**OWASP:** A05:2021 - Security Misconfiguration

## Description

HTTP Strict Transport Security (HSTS) is a response header that instructs browsers to only communicate with the server over HTTPS for a specified period. Without HSTS, users who type `http://example.com` or follow HTTP links are vulnerable to SSL stripping attacks, where a Man-in-the-Middle downgrades the connection from HTTPS to HTTP before the redirect occurs.

The classic SSL stripping attack works as follows: (1) user connects to `http://example.com`, (2) attacker intercepts the HTTP request, (3) attacker proxies to the real HTTPS site, (4) user sees the page over HTTP while the attacker reads everything. HSTS prevents this because after the first successful HTTPS visit, the browser remembers to always use HTTPS, even for manually typed HTTP URLs.

HSTS configuration should include `max-age` of at least 31536000 (one year), the `includeSubDomains` directive to protect all subdomains, and ideally the `preload` directive for inclusion in browser preload lists. Missing or misconfigured HSTS on infrastructure like load balancers, CDNs, or reverse proxies leaves users vulnerable even if the application code itself uses HTTPS.

## Detection

```
# Search for HSTS header in nginx/reverse proxy configs
grep -rn "Strict-Transport-Security" **/nginx*.conf **/*.conf
grep -rL "Strict-Transport-Security" **/nginx*.conf **/*.conf

# Search for HSTS in application code
grep -rn "Strict-Transport-Security\|hsts" **/*.ts **/*.js | grep -v "node_modules"

# Search for helmet configuration (Express.js HSTS)
grep -rn "helmet\|hsts" **/*.ts **/*.js | grep -v "node_modules"

# Search for short max-age (less than 1 year)
grep -rn "max-age=\([0-9]\{1,6\}\)" **/*.conf **/*.ts **/*.js

# Search for Terraform/CDN HSTS config
grep -rn "strict_transport_security\|hsts" **/*.tf **/*.yml
```

## Vulnerable Code

```nginx
# nginx.conf - no HSTS header
server {
    listen 443 ssl;
    server_name app.example.com;

    # Missing: add_header Strict-Transport-Security
    # Users on HTTP are vulnerable to SSL stripping

    location / {
        proxy_pass http://app:3000;
    }
}

server {
    listen 80;
    server_name app.example.com;
    # Redirect works, but first HTTP request can be intercepted
    return 301 https://$server_name$request_uri;
}
```

```typescript
// app.ts - no HSTS
import express from "express";
const app = express();

// No helmet or HSTS middleware configured
app.listen(3000);
```

## Secure Code

```nginx
# nginx.conf - with HSTS
server {
    listen 443 ssl http2;
    server_name app.example.com;

    # HSTS: 2 years, include subdomains, allow preloading
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;

    location / {
        proxy_pass http://app:3000;
    }
}

server {
    listen 80;
    server_name app.example.com;
    return 301 https://$server_name$request_uri;
}
```

```typescript
// app.ts - with helmet HSTS
import express from "express";
import helmet from "helmet";

const app = express();

app.use(helmet.hsts({
  maxAge: 63072000,        // 2 years in seconds
  includeSubDomains: true,
  preload: true,
}));

// Or full helmet (includes HSTS and many other headers)
app.use(helmet());
```

## Impact

Without HSTS, an attacker on the same network can:
- Perform SSL stripping attacks on the first HTTP request
- Intercept credentials, session tokens, and sensitive data
- Redirect users to phishing pages that mimic the real site
- Modify page content to inject malicious scripts
- Downgrade HTTPS to HTTP for any user not typing `https://` explicitly
- Intercept cookie values sent over the initial HTTP request

## References

- CWE-319: https://cwe.mitre.org/data/definitions/319.html
- HSTS Preload List: https://hstspreload.org/
- RFC 6797: HTTP Strict Transport Security (HSTS)
- OWASP: HTTP Strict Transport Security Cheat Sheet
- sslstrip tool: demonstration of SSL stripping attacks
- Mozilla: "HTTP Strict Transport Security" developer documentation
