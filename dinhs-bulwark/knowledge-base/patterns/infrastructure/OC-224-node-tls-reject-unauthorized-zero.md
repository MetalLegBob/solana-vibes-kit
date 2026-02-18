# OC-224: NODE_TLS_REJECT_UNAUTHORIZED=0 in Production

**Category:** Infrastructure
**Severity:** CRITICAL
**Auditors:** INFRA-04
**CWE:** CWE-295 (Improper Certificate Validation)
**OWASP:** A07:2021 - Identification and Authentication Failures

## Description

Setting the environment variable `NODE_TLS_REJECT_UNAUTHORIZED=0` globally disables TLS certificate validation for the entire Node.js process. Unlike per-request `rejectUnauthorized: false` (which affects a single connection), this environment variable affects every HTTPS request, every TLS database connection, and every secure WebSocket connection made by the application and all its dependencies.

This pattern is particularly dangerous because it is invisible at the code level. A developer may carefully configure TLS on every connection in their code, but a single `NODE_TLS_REJECT_UNAUTHORIZED=0` in the Dockerfile, docker-compose, or CI/CD environment renders all that work useless. Prisma Cloud specifically flags this in Dockerfiles as a policy violation.

The pattern typically originates during development when a self-signed certificate causes `UNABLE_TO_VERIFY_LEAF_SIGNATURE` errors. The "quick fix" of setting this environment variable is added to the Dockerfile or `.env` file, and since it silently "fixes" all TLS errors, it is never removed. The correct fix is to add the CA certificate to the Node.js trust store or configure the specific client connection with the custom CA.

## Detection

```
# Search for the environment variable in all config files
grep -rn "NODE_TLS_REJECT_UNAUTHORIZED" **/.env* **/Dockerfile* **/docker-compose*.yml **/*.yml **/*.yaml

# Search for it in code
grep -rn "NODE_TLS_REJECT_UNAUTHORIZED" **/*.ts **/*.js

# Search for it in CI/CD configs
grep -rn "NODE_TLS_REJECT_UNAUTHORIZED" **/.github/workflows/*.yml **/.gitlab-ci.yml

# Search for it in Kubernetes manifests
grep -rn "NODE_TLS_REJECT_UNAUTHORIZED" **/*.yml **/*.yaml | grep -i "env\|value"

# Search for npm config setting
grep -rn "strict-ssl.*false\|strict-ssl=false" **/.npmrc
```

## Vulnerable Code

```dockerfile
FROM node:20-alpine

WORKDIR /app
COPY . .
RUN npm ci

# Globally disables TLS validation for EVERY connection
ENV NODE_TLS_REJECT_UNAUTHORIZED=0

CMD ["node", "server.js"]
```

```yaml
# docker-compose.yml
services:
  api:
    build: .
    environment:
      - NODE_TLS_REJECT_UNAUTHORIZED=0  # All TLS validation disabled
      - DATABASE_URL=postgres://db:5432/app
```

```typescript
// startup.ts - sometimes hidden deep in initialization code
// "Fix" for self-signed cert error
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
```

## Secure Code

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Add custom CA certificate to system trust store
COPY certs/internal-ca.pem /usr/local/share/ca-certificates/internal-ca.crt
RUN update-ca-certificates

# Point Node.js to the CA bundle (adds to, doesn't replace)
ENV NODE_EXTRA_CA_CERTS=/usr/local/share/ca-certificates/internal-ca.crt

COPY . .
RUN npm ci --only=production

USER node
CMD ["node", "server.js"]
```

```typescript
// For specific connections only, configure the CA certificate
import https from "https";
import fs from "fs";

const internalCA = fs.readFileSync("/etc/ssl/certs/internal-ca.pem");

const agent = new https.Agent({
  ca: internalCA,            // Trust the internal CA
  rejectUnauthorized: true,  // Still validate certificates
});

// Use agent only for connections to internal services
const response = await fetch("https://internal-api.corp.com/data", {
  agent,
});
```

## Impact

Setting `NODE_TLS_REJECT_UNAUTHORIZED=0` in production:
- Disables ALL TLS certificate validation for the entire process
- Enables MITM attacks on every outbound connection
- Affects database connections, API calls, webhook deliveries
- Third-party libraries making HTTPS calls are also vulnerable
- Credential theft from any intercepted authenticated request
- Data modification on any intercepted connection
- Invisible to code review (set in environment, not in code)

## References

- Prisma Cloud Policy: "Dockerfile Node.js certificate validation is disabled with NODE_TLS_REJECT_UNAUTHORIZED"
- CVE-2021-31597: xmlhttprequest-ssl default disabled validation (CVSS 9.4)
- Node.js TLS documentation: https://nodejs.org/api/tls.html
- Bearer CLI: javascript_node_missing_tls_validation rule
- CWE-295: https://cwe.mitre.org/data/definitions/295.html
- NODE_EXTRA_CA_CERTS: https://nodejs.org/api/cli.html#node_extra_ca_certsfile
