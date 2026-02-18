# Off-Chain Common False Positives Guide
<!-- Patterns that look dangerous but are actually safe in context -->
<!-- Last updated: 2026-02-18 -->
<!-- Purpose: Reduce noise in audit reports by recognizing safe patterns -->

## Why This Matters

Reporting false positives wastes developer time, erodes trust in the audit, and buries real findings. Before flagging something, check this guide. If a pattern appears here, verify the specific context before reporting.

---

## 1. Development & Testing Artifacts

### FP-001: "Hardcoded secrets in .env.example"
**Why it's safe:** `.env.example` files contain placeholder values (not real secrets) to document required environment variables. Values like `your-api-key-here` or `changeme` are templates.
**Only flag if:** The values look like real credentials (high entropy strings, valid API key formats, actual private keys).

### FP-002: "Private keys in test files"
**Why it's safe:** Test files commonly include known test keypairs for local development (e.g., Solana's `Keypair.fromSecretKey` with a well-known test wallet). These never hold real funds.
**Only flag if:** Test keys match production keys, test files could be bundled into production builds, or test mnemonics are used as defaults in production code.

### FP-003: "Debug endpoints accessible"
**Why it's safe:** Endpoints like `/debug`, `/health`, `/metrics` are often behind authentication middleware or only bound to localhost in production.
**Only flag if:** No authentication is required AND the endpoint is accessible from external networks AND it exposes sensitive information.

### FP-004: "console.log with sensitive-looking variable names"
**Why it's safe:** Variable names like `token` or `secret` in logging may refer to non-sensitive values (CSRF tokens, public identifiers). The value matters, not the name.
**Only flag if:** The actual logged value contains real credentials, private keys, or PII.

### FP-005: "eval() in build tools or dev dependencies"
**Why it's safe:** Build tools (webpack, babel, esbuild) and dev dependencies legitimately use eval/Function for code transformation. These don't run in production.
**Only flag if:** eval() is in runtime production code with user-controlled input.

---

## 2. Framework Protections

### FP-006: "Missing CSRF protection" on API-only endpoints
**Why it's safe:** Pure JSON APIs with `Content-Type: application/json` enforcement are naturally protected against CSRF because browsers can't submit JSON via form submission. SameSite cookie defaults in modern browsers add another layer.
**Only flag if:** The API accepts `application/x-www-form-urlencoded` or `multipart/form-data`, OR cookies are used without SameSite attribute, OR CORS is misconfigured to allow credentials from any origin.

### FP-007: "SQL injection" in ORM queries with object syntax
**Why it's safe:** ORMs like Prisma, Sequelize (with object queries), and TypeORM automatically parameterize values in their standard query APIs.
**Only flag if:** `.raw()`, `.query()`, template literals, or string interpolation is used to build queries. The ORM's safe API must actually be used.

### FP-008: "XSS" in React JSX expressions
**Why it's safe:** React automatically escapes all values rendered in JSX expressions (`{variable}`). This is equivalent to HTML entity encoding.
**Only flag if:** `dangerouslySetInnerHTML` is used, or content is injected via `ref.innerHTML`, or user input flows into `href` attributes (javascript: protocol), or server-side rendering bypasses React's escaping.

### FP-009: "Missing input validation" on TypeScript-typed parameters
**Why it's safe (partially):** TypeScript types are compile-time only and don't validate runtime input. However, schemas like Zod, Joi, or class-validator DO validate at runtime.
**Always flag:** TypeScript types alone are NOT runtime validation. Check if runtime validation (Zod, Joi, etc.) exists at the API boundary. The false positive is only if runtime validation IS present.

### FP-010: "Prototype pollution" in JSON.parse
**Why it's safe:** `JSON.parse()` alone does NOT create `__proto__` properties. JSON spec doesn't support prototype chains. The parsed object is a plain object.
**Only flag if:** The parsed object is then passed to a deep merge/extend function that respects `__proto__`, OR a library like lodash.merge is used with the parsed data.

---

## 3. Infrastructure Patterns

### FP-011: "Running as root in Docker"
**Why it's safe (partially):** Many official Docker images (node, python) run as root by default. If the container has no exposed ports, minimal capabilities, and runs in a sandboxed environment (Kubernetes with security context), the risk is reduced.
**Still flag if:** The container is exposed to the network, handles untrusted input, has access to sensitive volumes, or runs with `--privileged` flag.

### FP-012: "TLS certificate validation disabled" in development
**Why it's safe:** `NODE_TLS_REJECT_UNAUTHORIZED=0` or `rejectUnauthorized: false` in dev/test environments connecting to local services with self-signed certs is normal.
**Only flag if:** This setting applies to production code, production environment variables, or any code that connects to external production services.

### FP-013: "Exposed ports in docker-compose"
**Why it's safe:** docker-compose is typically for local development. Exposed ports (e.g., `5432:5432` for PostgreSQL) are development convenience, not production configuration.
**Only flag if:** docker-compose.yml is the actual production deployment config, or if sensitive services are exposed to `0.0.0.0` in production-like configurations.

### FP-014: "Missing HTTPS" on localhost
**Why it's safe:** Local development servers (`localhost`, `127.0.0.1`) don't need HTTPS. Browsers treat localhost as a secure context.
**Only flag if:** The same configuration is used for non-localhost deployments.

---

## 4. Authentication & Session

### FP-015: "JWT not encrypted" (only signed)
**Why it's safe:** JWTs are designed to be signed, not encrypted. The payload is base64-encoded (not encrypted) by design. Signature verification is the security mechanism.
**Only flag if:** Sensitive data (PII, secrets) is stored in the JWT payload. The issue is data exposure in the token, not the lack of encryption.

### FP-016: "Short session timeout" flagged as DoS
**Why it's safe:** Short session timeouts (15-30 minutes) are a security best practice, not a denial of service. They limit the window for session hijacking.
**Only flag if:** The timeout is so short it's genuinely unusable (< 1 minute), or refresh token rotation is broken causing unexpected logouts.

### FP-017: "Password stored in request body"
**Why it's safe:** Passwords SHOULD be sent in the request body (POST) over HTTPS. This is the standard pattern for login endpoints.
**Only flag if:** Passwords are sent as URL query parameters (logged in server logs), sent over HTTP (not HTTPS), or included in GET requests.

---

## 5. Blockchain Interaction

### FP-018: "Using processed commitment level"
**Why it's safe (partially):** `processed` commitment is fine for read-only display purposes (showing account balance in UI). Not all reads need `confirmed` or `finalized`.
**Only flag if:** `processed` commitment is used for financial decisions (balance checks before transfers, price oracle reads for trading, account state validation before transaction submission).

### FP-019: "Hardcoded program IDs"
**Why it's safe:** Program IDs (public keys) are meant to be constants. Unlike private keys, program IDs are public information. Hardcoding them prevents program substitution attacks.
**Only flag if:** The hardcoded ID is wrong (doesn't match the deployed program), or is from a different network (devnet ID in mainnet code).

### FP-020: "Transaction not using Jito/private mempool"
**Why it's safe:** Not all transactions need MEV protection. Simple operations (account creation, non-financial state changes) don't benefit from private submission.
**Only flag if:** The transaction involves swaps, liquidations, or other operations where frontrunning/sandwiching could cause financial harm.

---

## 6. Dependency & Supply Chain

### FP-021: "Vulnerable dependency" with no exploit path
**Why it's safe:** Many CVEs in dependencies affect features or code paths that the application doesn't use. A CVE in a library's XML parser doesn't matter if the app never parses XML.
**Still flag if:** The CVE severity is CRITICAL, the affected code path is possibly reachable, or you can't determine the exploit path with certainty. Note as "dependency CVE — impact assessment needed" rather than confirmed vulnerability.

### FP-022: "Outdated package" with no security patches
**Why it's safe:** Being behind the latest version isn't inherently a vulnerability. Many minor/patch releases are feature additions, not security fixes.
**Only flag if:** The package has known CVEs in the installed version, OR the package is so outdated it no longer receives security patches (end of life).

---

## How to Use This Guide

1. Before reporting a finding, check if it matches a pattern here
2. Read the "Only flag if" conditions carefully
3. If unsure, report it as **POTENTIAL** with a note: "Check FP-{N} — may be false positive if {condition}"
4. Never silently suppress a finding — document your reasoning
