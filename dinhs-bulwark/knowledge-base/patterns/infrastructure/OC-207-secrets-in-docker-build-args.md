# OC-207: Secrets in Docker Build Args

**Category:** Infrastructure
**Severity:** HIGH
**Auditors:** INFRA-01, SEC-02
**CWE:** CWE-538 (Insertion of Sensitive Information into Externally-Accessible File or Directory)
**OWASP:** A05:2021 - Security Misconfiguration

## Description

Docker build arguments (`ARG`) are commonly misused to pass secrets like API keys, passwords, and tokens during the image build process. Developers assume these values are ephemeral, but Docker stores every build argument in the image layer metadata and history. Anyone with access to the image can extract these secrets using `docker history --no-trunc` or by inspecting the image layers directly.

This is a widespread problem in CI/CD pipelines where private package registries require authentication. Teams commonly pass credentials via `--build-arg NPM_TOKEN=xxx` or `--build-arg PIP_INDEX_URL=https://user:pass@registry/`. These credentials persist in the final image even if the Dockerfile attempts to unset them, because Docker image layers are immutable.

The correct approach is to use Docker BuildKit's `--mount=type=secret` feature, which mounts secrets as temporary files during the build without persisting them in any image layer.

## Detection

```
# Search Dockerfiles for ARG that look like secrets
grep -rn "ARG.*\(TOKEN\|PASSWORD\|SECRET\|KEY\|CREDENTIAL\|AUTH\)" **/Dockerfile*

# Search for build-arg in CI/CD configs
grep -rn "\-\-build-arg" **/*.yml **/*.yaml **/Dockerfile*

# Search for ARG used in ENV (persisted in image)
grep -rn "ENV.*\$\{.*TOKEN\|PASSWORD\|SECRET\}" **/Dockerfile*

# Search docker-compose for build args
grep -A5 "build:" **/docker-compose*.yml | grep -i "token\|password\|secret\|key"
```

## Vulnerable Code

```dockerfile
FROM node:20 AS builder

# Secret persisted in image layer metadata
ARG NPM_TOKEN
ARG GITHUB_TOKEN

# Token visible in image history
RUN echo "//registry.npmjs.org/:_authToken=${NPM_TOKEN}" > .npmrc
RUN npm ci

# Even deleting .npmrc does not help - previous layer retains it
RUN rm -f .npmrc

COPY . .
RUN npm run build
```

## Secure Code

```dockerfile
# syntax=docker/dockerfile:1.4
FROM node:20 AS builder

WORKDIR /app
COPY package*.json ./

# Mount secret at build time - never persisted in image layers
RUN --mount=type=secret,id=npmrc,target=/app/.npmrc \
    npm ci

COPY . .
RUN npm run build

# Multi-stage: final image has no build secrets at all
FROM node:20-slim
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
USER node
CMD ["node", "dist/server.js"]
```

```bash
# Build with secret mount
DOCKER_BUILDKIT=1 docker build \
  --secret id=npmrc,src=$HOME/.npmrc \
  -t myapp .
```

## Impact

An attacker who gains access to the Docker image (via registry, CI artifact, or compromised host) can:
- Extract all build-time secrets from image history via `docker history --no-trunc`
- Access private registries, APIs, and services using the leaked credentials
- Impersonate CI/CD service accounts
- Pivot laterally using compromised tokens
- In public or shared registries, secrets become available to any puller

## References

- Microsoft ISE Developer Blog: "The Hidden Risks of Docker Build Time Arguments" (March 2025)
- Xygeni: "Docker Build Args: Hidden Vector for Leaks in Images" (November 2025)
- Xygeni: "Dockerfile Secrets: Why Layers Keep Your Sensitive Data Forever" (November 2025)
- Wiz: "Docker Secrets: Guide to Secure Container Secrets Management"
- Docker BuildKit secrets documentation: https://docs.docker.com/build/building/secrets/
- CWE-538: https://cwe.mitre.org/data/definitions/538.html
