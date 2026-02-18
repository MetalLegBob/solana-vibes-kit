# OC-007: Secrets in Docker Build Args or Layers

**Category:** Secrets & Credentials
**Severity:** HIGH
**Auditors:** SEC-02, INFRA-01
**CWE:** CWE-538 (Insertion of Sensitive Information into Externally-Accessible File or Directory)
**OWASP:** A05:2021 – Security Misconfiguration

## Description

Docker build arguments (`ARG`) and environment instructions (`ENV`) in Dockerfiles persist in image layers and metadata. Even in multi-stage builds, build arguments are recorded in build attestations (Provenance metadata) introduced in Buildkit 0.11+, which are enabled by default in modern Docker tooling. Any user who can `docker pull` or `docker inspect` the image can extract these secrets.

RWTH Aachen University researchers found that 9% of nearly 400,000 Docker Hub images leaked unverified secrets, exposing 52,107 private keys and 3,158 API secrets. Redhunt Labs found 46,076 public Dockerfiles exposing sensitive information. Flare's 2024 research identified over 10,000 Docker Hub images leaking credentials including AI model API keys. Docker's own documentation now explicitly warns: "It is not recommended to use build-time variables for passing secrets."

The introduction of Build Attestations made this worse: even multi-stage builds that discard intermediate layers can leak `ARG` values through provenance metadata attached to the final image.

## Detection

```
grep -rn "ARG.*SECRET\|ARG.*KEY\|ARG.*PASSWORD\|ARG.*TOKEN\|ARG.*CREDENTIAL" --include="Dockerfile*"
grep -rn "ENV.*SECRET\|ENV.*KEY\|ENV.*PASSWORD\|ENV.*TOKEN" --include="Dockerfile*"
grep -rn "docker build.*--build-arg.*SECRET\|--build-arg.*KEY\|--build-arg.*PASSWORD" --include="*.sh" --include="*.yml" --include="*.yaml"
```

Inspect built images with: `docker history --no-trunc <image>` and `docker buildx imagetools inspect <image>`.

## Vulnerable Code

```dockerfile
# VULNERABLE: Secret passed as build argument persists in image metadata
FROM node:20-alpine

ARG NPM_TOKEN
ARG DATABASE_PASSWORD
ARG SOLANA_PRIVATE_KEY

RUN echo "//registry.npmjs.org/:_authToken=${NPM_TOKEN}" > .npmrc
RUN npm install
RUN rm .npmrc  # Deletion doesn't help — secret is in previous layer

ENV DATABASE_URL=postgresql://admin:${DATABASE_PASSWORD}@db:5432/app
COPY . .
CMD ["node", "dist/index.js"]
```

## Secure Code

```dockerfile
# SECURE: Use Docker BuildKit secret mounts
# syntax=docker/dockerfile:1
FROM node:20-alpine

# Secret is mounted at build time only, never persisted in any layer
RUN --mount=type=secret,id=npm_token \
    NPM_TOKEN=$(cat /run/secrets/npm_token) && \
    echo "//registry.npmjs.org/:_authToken=${NPM_TOKEN}" > .npmrc && \
    npm install && \
    rm .npmrc

COPY . .
CMD ["node", "dist/index.js"]

# Build command:
# DOCKER_BUILDKIT=1 docker build --secret id=npm_token,src=.npm_token .

# For runtime secrets, use Docker Swarm secrets or mount from external store
# Never bake credentials into the image
```

## Impact

Any user or system with access to the Docker image can extract secrets from image layers, metadata, or build attestations. This includes anyone with pull access to a container registry, CI/CD systems that cache images, and deployment environments. Compromised secrets can include private keys, database passwords, API tokens, and registry credentials that provide lateral movement capabilities.

## References

- RWTH Aachen: 9% of Docker Hub images leak secrets (52K private keys, 3K API secrets)
- Flare Research: 10,000+ Docker Hub images leaking credentials (2024)
- Docker Docs: SecretsUsedInArgOrEnv — https://docs.docker.com/reference/build-checks/secrets-used-in-arg-or-env/
- Akshath: Leaked Build Arguments via Build Attestations in multi-stage builds (2023)
- TruffleHog: "How Secrets Leak out of Docker Images" (September 2023)
