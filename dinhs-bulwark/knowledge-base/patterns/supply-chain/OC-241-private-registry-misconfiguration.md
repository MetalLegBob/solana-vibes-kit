# OC-241: Private Registry Misconfiguration

**Category:** Supply Chain & Dependencies
**Severity:** HIGH
**Auditors:** DEP-01
**CWE:** CWE-923 (Improper Restriction of Communication Channel to Intended Endpoints)
**OWASP:** A05:2021 -- Security Misconfiguration

## Description

Private registry misconfiguration occurs when an organization's npm registry setup allows packages to be resolved from unintended sources, fails to authenticate properly, or leaks authentication tokens. Common misconfigurations include missing scope-to-registry mappings (enabling dependency confusion), storing registry tokens in committed `.npmrc` files, using HTTP instead of HTTPS for registry communication, and failing to configure fallback behavior when the private registry is unavailable.

The most dangerous misconfiguration is the absence of scope-to-registry mapping. Without explicit configuration telling npm "all @company-scoped packages come from our private registry," npm's default behavior is to check the public registry. Alex Birsan's 2021 dependency confusion disclosure demonstrated that this default behavior is exploitable at scale: simply publishing higher-version packages to npmjs.org caused Apple, Microsoft, PayPal, and other major corporations to install attacker-controlled code during their builds.

Another critical misconfiguration is leaking registry authentication tokens. The `.npmrc` file often contains `_authToken` values that grant publish access to the private registry. If this file is committed to git (or the token is embedded in a Dockerfile), anyone with access to the repository can publish packages to the organization's private registry. The September 2025 npm attack chain began with stolen maintainer tokens obtained through phishing, demonstrating the high value of registry credentials.

## Detection

```
# Check for .npmrc with embedded tokens
grep -rn "_authToken\|_auth\|_password" .npmrc .yarnrc 2>/dev/null
git log --all -p -- .npmrc | grep -i "authtoken\|_auth"

# Check if .npmrc is committed
git ls-files .npmrc

# Check for missing scope configuration
grep "@" .npmrc | grep -v "registry"

# Check for HTTP (non-TLS) registry URLs
grep "http://" .npmrc .yarnrc .yarnrc.yml 2>/dev/null

# Check for fallback to public registry
npm config get registry
```

Look for: `.npmrc` files committed to version control containing tokens, missing scope-to-registry mapping for organization-scoped packages, HTTP registry URLs, `_authToken` values in environment variables without rotation, packages resolving to unexpected registries in lockfiles.

## Vulnerable Code

```ini
# .npmrc -- VULNERABLE: token committed to source control, no scope mapping
registry=https://registry.npmjs.org/
//npm.company.com/:_authToken=npm_REAL_TOKEN_THAT_GRANTS_PUBLISH_ACCESS
```

```dockerfile
# Dockerfile -- VULNERABLE: token in build layer
FROM node:20-slim
COPY .npmrc /root/.npmrc
RUN npm ci
# Token persists in image layer even if .npmrc is deleted later
```

```json
{
  "dependencies": {
    "company-utils": "^2.0.0"
  }
}
```

## Secure Code

```ini
# .npmrc -- SECURE: scope mapping, token from environment variable
@company:registry=https://npm.company.com/
//npm.company.com/:_authToken=${NPM_PRIVATE_TOKEN}
registry=https://registry.npmjs.org/
```

```dockerfile
# Dockerfile -- SECURE: multi-stage build, token not in final image
FROM node:20-slim AS builder
ARG NPM_PRIVATE_TOKEN
RUN echo "//npm.company.com/:_authToken=${NPM_PRIVATE_TOKEN}" > /root/.npmrc
RUN echo "@company:registry=https://npm.company.com/" >> /root/.npmrc
COPY package*.json ./
RUN npm ci --ignore-scripts
RUN rm -f /root/.npmrc

FROM node:20-slim
COPY --from=builder /app/node_modules ./node_modules
COPY . .
```

```gitignore
# .gitignore -- Always exclude .npmrc with tokens
.npmrc
```

## Impact

A misconfigured private registry enables multiple attack vectors. Missing scope mapping opens the door to dependency confusion attacks, where an attacker publishes malicious packages to the public registry that shadow internal package names. Leaked registry tokens allow an attacker to publish malicious package versions to the private registry, poisoning the internal supply chain. HTTP registry connections enable man-in-the-middle attacks that can substitute packages in transit. For Solana projects at organizations with private registries for internal tooling, these misconfigurations can lead to compromised build pipelines, stolen deployment credentials, and ultimately fund theft.

## References

- Alex Birsan: Dependency Confusion disclosure affecting Apple, Microsoft, PayPal (February 2021)
- Snyk: npm package aliasing extends dependency confusion attack surface (November 2021)
- September 2025 npm attack: initiated via stolen maintainer tokens from phishing
- Coinspect: Supply-Chain Guardrails for npm, pnpm, and Yarn (September 2025)
- npm documentation: Configuring npm -- https://docs.npmjs.com/cli/v10/using-npm/config
- CWE-923: https://cwe.mitre.org/data/definitions/923.html
