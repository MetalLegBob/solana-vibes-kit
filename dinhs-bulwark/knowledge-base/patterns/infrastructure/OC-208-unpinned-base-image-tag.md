# OC-208: Unpinned Base Image Tag

**Category:** Infrastructure
**Severity:** MEDIUM
**Auditors:** INFRA-01
**CWE:** CWE-829 (Inclusion of Functionality from Untrusted Control Sphere)
**OWASP:** A06:2021 - Vulnerable and Outdated Components

## Description

Using unpinned or mutable tags like `latest`, `lts`, or bare version numbers (e.g., `node:20`) in Dockerfile `FROM` directives means the base image can change without notice. When the upstream publisher updates the tag to point to a new digest, subsequent builds will silently pull a different image. This undermines build reproducibility and can introduce supply chain attacks if the upstream image is compromised.

The risk escalated significantly after the Ultralytics supply chain attack (December 2024), where malicious versions were published to PyPI. In the container world, a compromised base image affects every application built on top of it. Tags like `latest` are mutable pointers, not immutable references; only digest pinning (`node:20@sha256:abc123...`) guarantees that the exact same image is used across builds.

Unpinned tags also cause subtle environment drift between development, staging, and production. An image rebuilt weeks later may include different library versions, security patches (or regressions), or even different operating system packages.

## Detection

```
# Search for unpinned FROM directives
grep -rn "^FROM.*:latest" **/Dockerfile*
grep -rn "^FROM.*[^@]$" **/Dockerfile*

# Search for FROM without sha256 digest
grep -rn "^FROM" **/Dockerfile* | grep -v "sha256:"

# Search for mutable tags
grep -rn "^FROM.*:\(latest\|stable\|lts\|edge\|alpine\)$" **/Dockerfile*

# Check docker-compose for unpinned images
grep -rn "image:.*:latest" **/docker-compose*.yml
grep -rn "image:.*[^\"']$" **/docker-compose*.yml | grep -v "sha256:"
```

## Vulnerable Code

```dockerfile
# Mutable tag - different image on every build
FROM node:latest

WORKDIR /app
COPY . .
RUN npm ci
CMD ["node", "server.js"]
```

```dockerfile
# Version tag is still mutable (node:20 can be updated)
FROM node:20-alpine
WORKDIR /app
COPY . .
RUN npm ci
CMD ["node", "server.js"]
```

## Secure Code

```dockerfile
# Pinned to exact digest - immutable and reproducible
FROM node:20-alpine@sha256:c01011c1e67dbf38402930b2f3e68d5b27de91cfba0d1c0b3fc7a35a81e8e5d6

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
USER node
CMD ["node", "server.js"]
```

```yaml
# In CI/CD, verify digest before building
# .github/workflows/build.yml
steps:
  - name: Verify base image digest
    run: |
      EXPECTED="sha256:c01011c1e67dbf38402930b2f3e68d5b27de91cfba"
      ACTUAL=$(docker manifest inspect node:20-alpine | jq -r '.config.digest')
      if [ "$EXPECTED" != "$ACTUAL" ]; then
        echo "Base image digest mismatch!" && exit 1
      fi
```

## Impact

An attacker who compromises an upstream base image (or a supply chain intermediary) can:
- Inject backdoors, cryptominers, or data exfiltration code into every downstream build
- Introduce vulnerable library versions silently
- Cause environment drift leading to production failures
- Compromise the entire software supply chain for all consumers of the image

## References

- Ultralytics AI supply chain attack (December 2024) - malicious versions published to PyPI
- Docker Content Trust documentation: https://docs.docker.com/engine/security/trust/
- CWE-829: https://cwe.mitre.org/data/definitions/829.html
- SLSA Supply Chain Integrity framework: https://slsa.dev/
- Chainguard: "Why You Should Pin Docker Image Digests"
