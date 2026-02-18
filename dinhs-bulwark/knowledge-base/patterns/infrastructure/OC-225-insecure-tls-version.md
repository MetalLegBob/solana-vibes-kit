# OC-225: Insecure TLS Version (1.0/1.1)

**Category:** Infrastructure
**Severity:** MEDIUM
**Auditors:** INFRA-04
**CWE:** CWE-326 (Inadequate Encryption Strength)
**OWASP:** A02:2021 - Cryptographic Failures

## Description

TLS 1.0 (1999) and TLS 1.1 (2006) contain known cryptographic weaknesses that enable attacks such as BEAST, POODLE, and CRIME. Both versions were officially deprecated by RFC 8996 in March 2021. Major browsers dropped support for TLS 1.0/1.1 in 2020. PCI DSS 3.2 required migration away from TLS 1.0 by June 2018.

Despite this, many application configurations still permit TLS 1.0/1.1 for "backward compatibility." In Node.js, the `tls.DEFAULT_MIN_VERSION` is TLS 1.2 since Node.js 12, but applications can override this to accept older versions. Nginx, Apache, and reverse proxy configurations frequently still list TLS 1.0/1.1 in their cipher suites.

In containerized environments, TLS version configuration often appears in reverse proxy configs (nginx.conf, haproxy.cfg), application server settings, or load balancer configurations. Internal service-to-service communication is also affected: even if external-facing TLS is properly configured, internal services using TLS 1.0/1.1 are vulnerable to any attacker who gains internal network access.

## Detection

```
# Search for TLS 1.0/1.1 in nginx configs
grep -rn "TLSv1[^.]\|TLSv1\.0\|TLSv1\.1\|ssl_protocols.*TLSv1[^.2]" **/nginx*.conf **/*.conf

# Search for minimum TLS version overrides in Node.js
grep -rn "minVersion.*TLSv1\b\|minVersion.*TLSv1\.0\|minVersion.*TLSv1\.1" **/*.ts **/*.js
grep -rn "tls\.DEFAULT_MIN_VERSION" **/*.ts **/*.js

# Search for weak cipher suites
grep -rn "RC4\|DES\|MD5\|NULL\|EXPORT\|aNULL\|eNULL" **/nginx*.conf **/*.conf **/*.ts **/*.js

# Search for TLS version in Terraform/cloud configs
grep -rn "TLS_1_0\|TLS_1_1\|tls_1_0\|tls_1_1" **/*.tf **/*.yml

# Search for insecure protocol in database connections
grep -rn "sslversion\|tls_version" **/*.ts **/*.js **/.env*
```

## Vulnerable Code

```nginx
# nginx.conf - allows TLS 1.0 and 1.1
server {
    listen 443 ssl;
    server_name app.example.com;

    ssl_protocols TLSv1 TLSv1.1 TLSv1.2 TLSv1.3;  # 1.0 and 1.1 are insecure
    ssl_ciphers HIGH:!aNULL:!MD5;  # Too broad
    ssl_prefer_server_ciphers on;
}
```

```typescript
// server.ts - allows TLS 1.0
import tls from "tls";
import https from "https";

const server = https.createServer({
  key: fs.readFileSync("key.pem"),
  cert: fs.readFileSync("cert.pem"),
  minVersion: "TLSv1",  // Allows vulnerable TLS 1.0
});
```

## Secure Code

```nginx
# nginx.conf - TLS 1.2+ only with strong ciphers
server {
    listen 443 ssl http2;
    server_name app.example.com;

    ssl_protocols TLSv1.2 TLSv1.3;  # Only secure versions
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;   # Let client choose (for TLS 1.3)
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:10m;
    ssl_session_tickets off;

    # HSTS header
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains" always;
}
```

```typescript
// server.ts - TLS 1.2 minimum
import https from "https";
import fs from "fs";

const server = https.createServer({
  key: fs.readFileSync("key.pem"),
  cert: fs.readFileSync("cert.pem"),
  minVersion: "TLSv1.2",  // Minimum secure version
  ciphers: [
    "TLS_AES_128_GCM_SHA256",
    "TLS_AES_256_GCM_SHA384",
    "ECDHE-RSA-AES128-GCM-SHA256",
  ].join(":"),
});
```

## Impact

Allowing TLS 1.0/1.1 connections exposes the application to:
- BEAST attack: decrypt encrypted data in TLS 1.0 CBC cipher suites
- POODLE attack: exploit CBC padding in TLS 1.0
- CRIME/BREACH: compress-and-observe attacks on TLS-compressed data
- Downgrade attacks: force clients to negotiate weaker TLS versions
- PCI DSS non-compliance for payment processing systems
- Regulatory non-compliance (many frameworks now require TLS 1.2+)

## References

- RFC 8996: "Deprecating TLS 1.0 and TLS 1.1" (March 2021)
- CWE-326: https://cwe.mitre.org/data/definitions/326.html
- PCI DSS 3.2: TLS 1.0 migration deadline June 2018
- Mozilla SSL Configuration Generator: https://ssl-config.mozilla.org/
- Qualys SSL Labs: https://www.ssllabs.com/ssltest/
- NIST SP 800-52 Rev. 2: Guidelines for TLS Implementations
