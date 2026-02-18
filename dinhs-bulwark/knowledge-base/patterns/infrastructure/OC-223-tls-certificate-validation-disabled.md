# OC-223: TLS Certificate Validation Disabled

**Category:** Infrastructure
**Severity:** CRITICAL
**Auditors:** INFRA-04
**CWE:** CWE-295 (Improper Certificate Validation)
**OWASP:** A07:2021 - Identification and Authentication Failures

## Description

Disabling TLS certificate validation in HTTP clients, database connections, or API calls allows Man-in-the-Middle (MITM) attacks where an attacker can intercept, read, and modify all traffic that the application believes is encrypted. This is one of the most dangerous network security misconfigurations because it silently degrades TLS from authenticated encryption to effectively plaintext communication.

Common patterns include setting `rejectUnauthorized: false` in Node.js HTTPS options, `verify=False` in Python requests, `-k` or `--insecure` in curl commands, and `InsecureSkipVerify: true` in Go TLS configs. CVE-2021-31597 demonstrated the severity: the xmlhttprequest-ssl package for Node.js disabled SSL certificate validation by default because `rejectUnauthorized` when undefined was treated as false, earning a CVSS score of 9.4. CVE-2021-22939 affected all Node.js versions since v8.0.0, where certain usage patterns silently skipped certificate validation.

These configurations are typically added during development to avoid dealing with self-signed certificates and are never removed before production. In containerized environments, the pattern frequently appears in Dockerfiles or startup scripts as a "fix" for certificate issues.

## Detection

```
# Search for disabled TLS validation in Node.js
grep -rn "rejectUnauthorized.*false\|rejectUnauthorized.*0" **/*.ts **/*.js
grep -rn "TLS_REJECT_UNAUTHORIZED" **/*.ts **/*.js **/.env* **/Dockerfile*

# Search for disabled TLS in Python
grep -rn "verify=False\|verify\s*=\s*False" **/*.py
grep -rn "CURL_CA_BUNDLE.*''" **/*.py

# Search for disabled TLS in Go
grep -rn "InsecureSkipVerify.*true" **/*.go

# Search for insecure curl usage
grep -rn "curl.*-k\|curl.*--insecure" **/*.sh **/*.yml **/*.yaml

# Search for disabled TLS in database connections
grep -rn "sslmode=disable\|ssl=false\|useSSL=false" **/*.ts **/*.js **/.env* **/*.yml

# Search for custom HTTPS agents with disabled verification
grep -rn "new.*Agent.*rejectUnauthorized\|httpsAgent.*reject" **/*.ts **/*.js
```

## Vulnerable Code

```typescript
// api-client.ts - TLS validation disabled
import https from "https";
import axios from "axios";

// Disables certificate validation for all requests
const client = axios.create({
  baseURL: "https://api.partner.com",
  httpsAgent: new https.Agent({
    rejectUnauthorized: false,  // MITM attacks possible
  }),
});

// Even worse: disabling globally
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
```

```typescript
// database.ts - TLS disabled on database connection
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,  // Database MITM possible
  },
});
```

## Secure Code

```typescript
// api-client.ts - proper TLS validation
import https from "https";
import axios from "axios";
import fs from "fs";

// Use custom CA certificate if needed (e.g., internal CA)
const caCert = fs.readFileSync("/etc/ssl/certs/internal-ca.pem");

const client = axios.create({
  baseURL: "https://api.partner.com",
  httpsAgent: new https.Agent({
    rejectUnauthorized: true,  // Default, but explicit is better
    ca: caCert,                // Trust specific CA for internal services
    minVersion: "TLSv1.2",    // Minimum TLS version
  }),
});
```

```typescript
// database.ts - TLS with proper CA validation
import { Pool } from "pg";
import fs from "fs";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: true,
    ca: fs.readFileSync("/etc/ssl/certs/rds-combined-ca-bundle.pem"),
  },
});
```

## Impact

An attacker who exploits disabled TLS validation can:
- Intercept all traffic between the application and remote services
- Steal authentication tokens, API keys, and session cookies
- Read sensitive data including PII, financial information, and credentials
- Modify responses to inject malicious data or redirect transactions
- Impersonate upstream services to the application
- In database connections, read/modify all queries and results

## References

- CVE-2021-31597: xmlhttprequest-ssl disabled certificate validation by default (CVSS 9.4)
- CVE-2021-22939: Node.js HTTPS certificate non-validation vulnerability
- CWE-295: https://cwe.mitre.org/data/definitions/295.html
- Bearer CLI: Rule - Missing TLS validation (javascript_node_missing_tls_validation)
- Prisma Cloud: Docker Node.js certificate validation policy
- HTTP Toolkit: "HTTPS certificate non-validation vulnerability in Node.js"
