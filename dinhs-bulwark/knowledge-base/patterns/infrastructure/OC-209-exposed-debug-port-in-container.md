# OC-209: Exposed Debug Port in Container

**Category:** Infrastructure
**Severity:** HIGH
**Auditors:** INFRA-01
**CWE:** CWE-489 (Active Debug Code)
**OWASP:** A05:2021 - Security Misconfiguration

## Description

Containers that expose debug ports (Node.js inspect on 9229, Java JDWP on 5005, Python debugpy on 5678, Go delve on 2345) in production configurations allow remote code execution by design. Debug protocols are intended for development and provide full control over the runtime: evaluating arbitrary expressions, modifying variables, and stepping through code.

Node.js's `--inspect` flag opens a WebSocket-based debugging protocol on port 9229 that allows arbitrary code execution via `Runtime.evaluate`. If this port is exposed from a container to the network, any attacker who can reach it obtains full RCE without authentication. The same applies to Java's JDWP (Java Debug Wire Protocol), which explicitly warns in its documentation that it "should only be used in trusted networks."

These debug ports are frequently left in Dockerfiles or docker-compose configurations from development setups that are never cleaned up before production deployment.

## Detection

```
# Search for Node.js inspect flag in Dockerfiles and configs
grep -rn "\-\-inspect" **/Dockerfile* **/*.yml **/*.yaml **/*.json
grep -rn "NODE_OPTIONS.*inspect" **/Dockerfile* **/.env*

# Search for exposed debug ports in Dockerfiles
grep -rn "EXPOSE.*\(9229\|5005\|5678\|2345\|8000\)" **/Dockerfile*

# Search for debug ports in docker-compose
grep -rn "\(9229\|5005\|5678\|2345\):.*\(9229\|5005\|5678\|2345\)" **/docker-compose*.yml

# Search for JDWP agent in Java configurations
grep -rn "jdwp" **/Dockerfile* **/*.yml **/*.properties
grep -rn "agentlib:jdwp" **/Dockerfile* **/*.sh
```

## Vulnerable Code

```dockerfile
FROM node:20-alpine

WORKDIR /app
COPY . .
RUN npm ci

# Debug port exposed in production Dockerfile
EXPOSE 3000
EXPOSE 9229

# --inspect allows remote code execution
CMD ["node", "--inspect=0.0.0.0:9229", "server.js"]
```

```yaml
# docker-compose.yml
services:
  api:
    build: .
    ports:
      - "3000:3000"
      - "9229:9229"  # Debug port exposed to host network
    command: ["node", "--inspect=0.0.0.0:9229", "server.js"]
```

## Secure Code

```dockerfile
FROM node:20-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .

# Only application port exposed
EXPOSE 3000

USER node
CMD ["node", "server.js"]
```

```yaml
# docker-compose.yml - use profiles for debug
services:
  api:
    build: .
    ports:
      - "3000:3000"
    command: ["node", "server.js"]

  api-debug:
    extends: api
    profiles: ["debug"]  # Only activated with --profile debug
    ports:
      - "127.0.0.1:9229:9229"  # Bind to localhost only
    command: ["node", "--inspect=0.0.0.0:9229", "server.js"]
```

## Impact

An attacker who reaches an exposed debug port can:
- Execute arbitrary code on the server (full RCE)
- Read all environment variables including secrets
- Modify application state and behavior at runtime
- Access the filesystem of the container
- Use the foothold to pivot to other services on the network
- Exfiltrate sensitive data from memory

## References

- CWE-489: https://cwe.mitre.org/data/definitions/489.html
- Node.js Debugging Guide: https://nodejs.org/en/docs/guides/debugging-getting-started/
- JDWP documentation: "JDWP should only run in trusted networks"
- Chrome DevTools Protocol specification (used by Node.js --inspect)
- OWASP Testing Guide: Debug Features in Production
