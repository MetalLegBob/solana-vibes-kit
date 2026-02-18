# AI-Generated Code Pitfalls: Infrastructure
<!-- Domain: infrastructure -->
<!-- Relevant auditors: INFRA-01, INFRA-02, INFRA-03, INFRA-04, INFRA-05 -->

AI code generators (Copilot, ChatGPT, Claude) produce infrastructure configurations that work correctly but contain systematic security flaws. These pitfalls are dangerous because the generated code runs without errors, passes basic tests, and appears production-ready. Developers who are not infrastructure security specialists have no reason to suspect the output is insecure.

---

## AIP-104: Dockerfiles Generated Without USER Directive

**Severity:** MEDIUM
**Related patterns:** OC-206
**Auditors:** INFRA-01

AI generators almost universally produce Dockerfiles that run as root. When asked "create a Dockerfile for a Node.js app," the output will include `FROM`, `COPY`, `RUN npm install`, and `CMD` but will never include a `USER` directive. The container runs every process as UID 0.

**AI typically generates:**
```dockerfile
FROM node:20
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```

**What it should generate:**
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
RUN chown -R appuser:appgroup /app
USER appuser
EXPOSE 3000
CMD ["node", "server.js"]
```

**Detection:** Audit all AI-generated Dockerfiles for the presence of `USER` directive.

---

## AIP-105: Docker Compose with Privileged Mode for Convenience

**Severity:** HIGH
**Related patterns:** OC-210, OC-212
**Auditors:** INFRA-01

When developers ask AI to fix container permission errors ("my container can't access /dev/video0"), the AI suggests `privileged: true` as the solution. This disables all container isolation. The AI also routinely suggests Docker socket mounts (`/var/run/docker.sock`) when asked about Docker-in-Docker workflows.

**AI typically generates:**
```yaml
services:
  app:
    build: .
    privileged: true
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
```

**What it should generate:**
```yaml
services:
  app:
    build: .
    cap_drop: [ALL]
    cap_add: [specific_capability_needed]
    security_opt: [no-new-privileges:true]
    read_only: true
```

**Detection:** Search AI-generated docker-compose files for `privileged: true` and Docker socket mounts.

---

## AIP-106: Secrets Passed as Docker Build Args

**Severity:** HIGH
**Related patterns:** OC-207
**Auditors:** INFRA-01, SEC-02

AI consistently suggests `ARG` and `--build-arg` for passing secrets during Docker builds. When asked "how to use a private npm registry in Docker," every major AI generator produces a Dockerfile with `ARG NPM_TOKEN` followed by `RUN echo "//registry.npmjs.org/:_authToken=${NPM_TOKEN}" > .npmrc`. The token persists in image layer history.

**AI typically generates:**
```dockerfile
ARG NPM_TOKEN
RUN echo "//registry.npmjs.org/:_authToken=${NPM_TOKEN}" > .npmrc
RUN npm ci
RUN rm .npmrc
```

**What it should generate:**
```dockerfile
# syntax=docker/dockerfile:1.4
RUN --mount=type=secret,id=npmrc,target=/app/.npmrc npm ci
```

**Detection:** Search for `ARG` directives containing `TOKEN`, `SECRET`, `PASSWORD`, or `KEY` in Dockerfiles.

---

## AIP-107: GitHub Actions Workflows with Unsafe Expression Interpolation

**Severity:** CRITICAL
**Related patterns:** OC-214
**Auditors:** INFRA-02

AI generates GitHub Actions workflows that directly interpolate `${{ github.event.* }}` values into `run:` blocks. When asked to create a workflow that greets PR authors or labels issues based on title, the AI produces code vulnerable to command injection. The March 2025 tj-actions attack exploited exactly this pattern.

**AI typically generates:**
```yaml
- run: echo "PR title: ${{ github.event.pull_request.title }}"
- run: |
    TITLE="${{ github.event.issue.title }}"
    if echo "$TITLE" | grep -q "bug"; then
      gh issue edit ${{ github.event.issue.number }} --add-label bug
    fi
```

**What it should generate:**
```yaml
- env:
    PR_TITLE: ${{ github.event.pull_request.title }}
  run: echo "PR title: ${PR_TITLE}"
```

**Detection:** Search for `${{ github.event.` inside `run:` blocks in workflow files.

---

## AIP-108: CI/CD Workflows with Over-Scoped Permissions

**Severity:** HIGH
**Related patterns:** OC-215
**Auditors:** INFRA-02

AI-generated GitHub Actions workflows either omit the `permissions:` key entirely (defaulting to broad read/write) or set `permissions: write-all`. The AI does not understand the principle of least privilege for CI/CD. When asked to create a deployment workflow, it also generates long-lived AWS credential usage via `AWS_ACCESS_KEY_ID` instead of OIDC federation.

**AI typically generates:**
```yaml
on: push
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

**What it should generate:**
```yaml
on:
  push:
    branches: [main]
permissions:
  contents: read
  id-token: write
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456:role/DeployRole
```

**Detection:** Check for missing `permissions:` block and presence of `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` in workflows.

---

## AIP-109: NODE_TLS_REJECT_UNAUTHORIZED=0 as a "Fix"

**Severity:** CRITICAL
**Related patterns:** OC-223, OC-224
**Auditors:** INFRA-04

When a developer reports a TLS certificate error ("UNABLE_TO_VERIFY_LEAF_SIGNATURE"), AI generators universally suggest `process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"` or `rejectUnauthorized: false` as the fix. This disables all TLS validation for the entire process, enabling Man-in-the-Middle attacks. The AI never suggests the correct fix: adding the CA certificate via `NODE_EXTRA_CA_CERTS` or configuring the specific connection with the custom CA.

**AI typically generates:**
```typescript
// "Fix" for certificate error
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
```

**What it should generate:**
```dockerfile
ENV NODE_EXTRA_CA_CERTS=/etc/ssl/certs/internal-ca.pem
```

**Detection:** Search for `NODE_TLS_REJECT_UNAUTHORIZED` and `rejectUnauthorized.*false` in all files.

---

## AIP-110: Terraform with Wildcard IAM Permissions

**Severity:** HIGH
**Related patterns:** OC-218, OC-219
**Auditors:** INFRA-03

AI-generated Terraform code consistently uses `Action: "*"` and `Resource: "*"` in IAM policies. When asked "create a Terraform IAM role for my Lambda function," the AI produces a policy that grants full account access rather than scoping to the specific resources the Lambda needs. Similarly, S3 bucket configurations omit `aws_s3_bucket_public_access_block` resources.

**AI typically generates:**
```hcl
resource "aws_iam_role_policy" "lambda" {
  policy = jsonencode({
    Statement = [{
      Effect   = "Allow"
      Action   = "*"
      Resource = "*"
    }]
  })
}
```

**What it should generate:**
```hcl
resource "aws_iam_role_policy" "lambda" {
  policy = jsonencode({
    Statement = [{
      Effect   = "Allow"
      Action   = ["s3:GetObject"]
      Resource = ["arn:aws:s3:::my-bucket/*"]
    }]
  })
}
```

**Detection:** Search Terraform files for `Action.*"\\*"` and `Resource.*"\\*"`.

---

## AIP-111: Unpinned Base Images in Generated Dockerfiles

**Severity:** MEDIUM
**Related patterns:** OC-208
**Auditors:** INFRA-01

AI always generates `FROM node:20` or `FROM python:3.12` without SHA256 digest pinning. The generated Dockerfiles use mutable tags that can change between builds, breaking reproducibility and potentially introducing supply chain attacks. AI never suggests digest pinning because it does not have access to current image digests.

**AI typically generates:**
```dockerfile
FROM node:20-alpine
```

**What it should generate:**
```dockerfile
FROM node:20-alpine@sha256:<specific-digest>
```

**Detection:** Search for `FROM` directives that do not contain `@sha256:`.

---

## AIP-112: Debug Ports Left in Production Dockerfiles

**Severity:** HIGH
**Related patterns:** OC-209, OC-222
**Auditors:** INFRA-01

When developers ask AI to create a Dockerfile with debugging support, the AI generates configurations that expose debug ports (9229 for Node.js, 5005 for Java) without any warning that these must be removed before production deployment. The `EXPOSE 9229` and `--inspect=0.0.0.0` directives provide unauthenticated remote code execution.

**AI typically generates:**
```dockerfile
EXPOSE 3000
EXPOSE 9229
CMD ["node", "--inspect=0.0.0.0:9229", "server.js"]
```

**What it should generate:**
```dockerfile
EXPOSE 3000
CMD ["node", "server.js"]
# Use docker-compose profiles for debug mode in development only
```

**Detection:** Search for `EXPOSE 9229`, `EXPOSE 5005`, `--inspect`, and `jdwp` in Dockerfiles.

---

## AIP-113: Environment Variables Without Validation

**Severity:** MEDIUM
**Related patterns:** OC-221
**Auditors:** INFRA-03

AI-generated configuration files read environment variables with `process.env.X || "default"` without any validation. The defaults are often insecure (empty JWT secrets, development database URLs, debug mode enabled). AI never generates startup validation that would fail-fast on missing or malformed environment variables.

**AI typically generates:**
```typescript
const config = {
  jwtSecret: process.env.JWT_SECRET || "development-secret",
  dbUrl: process.env.DATABASE_URL || "postgres://localhost/app",
  debug: process.env.DEBUG || "true",
};
```

**What it should generate:**
```typescript
import { cleanEnv, str, url, bool } from "envalid";
const config = cleanEnv(process.env, {
  JWT_SECRET: str({ desc: "Must be 32+ chars" }),
  DATABASE_URL: url(),
  DEBUG: bool({ default: false }),
});
```

**Detection:** Search for `process.env.X || ""` and `process.env.X || "default"` patterns without validation libraries.

---

## AIP-114: Secrets Echoed in CI/CD Pipeline Steps

**Severity:** HIGH
**Related patterns:** OC-213
**Auditors:** INFRA-02

AI-generated CI/CD workflows include `echo` statements with secrets for debugging, `set -x` in shell blocks (which prints expanded variables), and verbose flags on package managers that dump configuration including tokens. The AI does not understand that CI logs are broadly accessible and often retained indefinitely.

**AI typically generates:**
```yaml
- run: |
    set -x
    echo "Deploying with token: ${{ secrets.DEPLOY_TOKEN }}"
    npm ci --loglevel verbose
```

**What it should generate:**
```yaml
- run: |
    set +x
    npm ci --loglevel warn
  env:
    NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

**Detection:** Search for `echo.*secret`, `set -x`, and `--verbose`/`--loglevel verbose` in workflow files.

---

## AIP-115: Internal Services Without TLS

**Severity:** HIGH
**Related patterns:** OC-227
**Auditors:** INFRA-04

When AI generates microservice configurations, docker-compose files, or service client code, it uses `http://` for all internal service communication. Database connections use `sslmode=disable`, Redis connections use `redis://` instead of `rediss://`, and gRPC channels use `createInsecure()`. The AI treats internal network as inherently trusted.

**AI typically generates:**
```yaml
services:
  api:
    environment:
      - USER_SERVICE=http://user-svc:3001
      - DATABASE_URL=postgres://user:pass@db:5432/app
      - REDIS_URL=redis://cache:6379
```

**What it should generate:**
```yaml
services:
  api:
    environment:
      - USER_SERVICE=https://user-svc:3001
      - DATABASE_URL=postgres://user:pass@db:5432/app?sslmode=verify-full
      - REDIS_URL=rediss://cache:6379
```

**Detection:** Search docker-compose and configuration files for `http://` internal URLs and `sslmode=disable`.

---

## AIP-116: Metrics Endpoints Without Authentication

**Severity:** MEDIUM
**Related patterns:** OC-228, OC-229, OC-230
**Auditors:** INFRA-05

AI-generated observability code registers `/metrics` and `/health` endpoints on the main application router without any authentication middleware. When asked to add Prometheus metrics to an Express app, the AI mounts the metrics endpoint alongside public routes, making it accessible to anyone who can reach the application. It also includes user IDs and other PII in metric label names.

**AI typically generates:**
```typescript
app.get("/metrics", async (req, res) => {
  res.end(await register.metrics());
});
app.get("/health", (req, res) => {
  res.json({ db: "ok", redis: "ok", uptime: process.uptime(), memory: process.memoryUsage() });
});
```

**What it should generate:**
```typescript
// Metrics on separate internal port
const internal = express();
internal.get("/metrics", metricsAuthMiddleware, async (req, res) => {
  res.end(await register.metrics());
});
internal.listen(9090, "127.0.0.1");
// Minimal health on public port
app.get("/health", (req, res) => res.json({ status: "ok" }));
```

**Detection:** Search for `/metrics` and `/health` routes without preceding auth middleware.

---

## AIP-117: Containers Without Resource Limits

**Severity:** MEDIUM
**Related patterns:** OC-211
**Auditors:** INFRA-01

AI-generated docker-compose files and Kubernetes manifests never include resource limits (CPU, memory, PIDs). When asked to create a multi-service docker-compose setup, the AI produces configurations where any single service can consume all host resources. Kubernetes deployments lack both `requests` and `limits` sections, resulting in BestEffort QoS pods that are first to be evicted but can starve other pods before that happens.

**AI typically generates:**
```yaml
services:
  api:
    build: .
    ports:
      - "3000:3000"
    # No resource constraints at all
```

**What it should generate:**
```yaml
services:
  api:
    build: .
    ports:
      - "3000:3000"
    deploy:
      resources:
        limits:
          cpus: "1.0"
          memory: 512M
    pids_limit: 100
```

**Detection:** Search docker-compose and Kubernetes manifests for missing `resources:`, `mem_limit`, or `deploy.resources` sections.

---

## AIP-118: Hardcoded Cloud Credentials in AI-Generated Config

**Severity:** CRITICAL
**Related patterns:** OC-220
**Auditors:** INFRA-03, SEC-02

When AI generates example cloud integration code, it often includes placeholder credentials that look like real credentials (AKIA..., full connection strings with passwords) in inline code rather than using environment variables. Developers copy-paste these examples and replace the placeholder values with real credentials in the same file, which then gets committed. AI also generates Terraform provider blocks with inline `access_key` and `secret_key` fields.

**AI typically generates:**
```typescript
const s3 = new S3Client({
  credentials: {
    accessKeyId: "AKIAIOSFODNN7EXAMPLE",
    secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
  },
});
```

**What it should generate:**
```typescript
// Uses AWS SDK default credential chain (env vars, IAM role, etc.)
const s3 = new S3Client({ region: process.env.AWS_REGION });
```

**Detection:** Search for `AKIA` prefixes, `credentials:` objects, and `access_key`/`secret_key` in source code and Terraform files.
