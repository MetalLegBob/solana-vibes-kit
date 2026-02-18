# Off-Chain Exploit Patterns Index
<!-- Master catalog of all off-chain exploit patterns -->
<!-- OC-001 through OC-300 across 14 categories -->
<!-- Last updated: 2026-02-18 -->

## Overview

~300 exploit patterns covering the full off-chain attack surface. Each pattern is a standalone file with:
- Description of the vulnerability class
- Why it matters (impact)
- How to detect it (code patterns to search for)
- Example vulnerable code
- Example secure code
- Real-world references (CVE, incident, OWASP)

## Pattern Categories

| Category | ID Range | Count | Directory |
|----------|----------|-------|-----------|
| Secrets & Credentials | OC-001 – OC-020 | 20 | `patterns/secrets/` |
| Authentication & Authorization | OC-021 – OC-048 | 28 | `patterns/auth/` |
| Injection | OC-049 – OC-080 | 32 | `patterns/injection/` |
| Web Application Security | OC-081 – OC-105 | 25 | `patterns/web/` |
| Blockchain Interaction | OC-106 – OC-130 | 25 | `patterns/blockchain/` |
| API & Network | OC-131 – OC-155 | 25 | `patterns/api-network/` |
| Data Security | OC-156 – OC-185 | 30 | `patterns/data/` |
| Frontend & Client | OC-186 – OC-205 | 20 | `patterns/frontend/` |
| Infrastructure | OC-206 – OC-230 | 25 | `patterns/infrastructure/` |
| Supply Chain & Dependencies | OC-231 – OC-245 | 15 | `patterns/supply-chain/` |
| Automation & Bots | OC-246 – OC-265 | 20 | `patterns/automation/` |
| Error Handling & Resilience | OC-266 – OC-285 | 20 | `patterns/error-handling/` |
| Cryptographic Operations | OC-286 – OC-298 | 13 | `patterns/crypto/` |
| Business Logic | OC-299 – OC-312 | 14 | `patterns/business-logic/` |
| **TOTAL** | **OC-001 – OC-312** | **~312** | |

---

## Secrets & Credentials (OC-001 – OC-020)

| ID | Name | Severity | Auditors |
|----|------|----------|----------|
| OC-001 | Hardcoded private key in source | CRITICAL | SEC-01 |
| OC-002 | Private key in environment variable without encryption | HIGH | SEC-01 |
| OC-003 | Mnemonic/seed phrase in config file | CRITICAL | SEC-01 |
| OC-004 | Secret key in client-side bundle | CRITICAL | SEC-01, FE-01 |
| OC-005 | API key with excessive permissions | HIGH | SEC-02 |
| OC-006 | Committed .env file with real secrets | CRITICAL | SEC-02 |
| OC-007 | Secrets in Docker build args or layers | HIGH | SEC-02, INFRA-01 |
| OC-008 | Secrets in CI/CD logs | HIGH | SEC-02, INFRA-02 |
| OC-009 | No secret rotation mechanism | MEDIUM | SEC-02 |
| OC-010 | Shared secrets across environments | HIGH | SEC-02 |
| OC-011 | Secret in URL query parameter | HIGH | SEC-02, DATA-04 |
| OC-012 | Plaintext password in database | CRITICAL | SEC-02, DATA-01 |
| OC-013 | Key material not zeroized after use | MEDIUM | SEC-01 |
| OC-014 | Backup/export containing unencrypted keys | HIGH | SEC-01 |
| OC-015 | Default credentials in production | CRITICAL | SEC-02 |
| OC-016 | Secrets in git history (previously committed) | HIGH | SEC-02 |
| OC-017 | Hot wallet with excessive balance | HIGH | SEC-01 |
| OC-018 | Key derivation from predictable seed | CRITICAL | SEC-01, CRYPTO-01 |
| OC-019 | Shared signing key across services | HIGH | SEC-01 |
| OC-020 | No key access audit trail | MEDIUM | SEC-01 |

## Authentication & Authorization (OC-021 – OC-048)

| ID | Name | Severity | Auditors |
|----|------|----------|----------|
| OC-021 | JWT algorithm confusion (none/HS256 on RS256) | CRITICAL | AUTH-01 |
| OC-022 | JWT secret in source code | CRITICAL | AUTH-01, SEC-02 |
| OC-023 | Missing JWT expiry validation | HIGH | AUTH-01 |
| OC-024 | JWT audience/issuer not validated | MEDIUM | AUTH-01 |
| OC-025 | Weak password hashing (MD5/SHA1/no salt) | HIGH | AUTH-01 |
| OC-026 | Bcrypt with insufficient rounds (< 10) | MEDIUM | AUTH-01 |
| OC-027 | OAuth redirect_uri validation bypass | HIGH | AUTH-01 |
| OC-028 | OAuth state parameter missing (CSRF) | HIGH | AUTH-01, WEB-03 |
| OC-029 | Brute force on login with no rate limit | HIGH | AUTH-01, ERR-03 |
| OC-030 | Account enumeration via error messages | MEDIUM | AUTH-01 |
| OC-031 | Account enumeration via timing | MEDIUM | AUTH-01 |
| OC-032 | Session fixation | HIGH | AUTH-02 |
| OC-033 | Session token insufficient entropy | HIGH | AUTH-02 |
| OC-034 | Missing HttpOnly flag on session cookie | MEDIUM | AUTH-02 |
| OC-035 | Missing Secure flag on session cookie | MEDIUM | AUTH-02 |
| OC-036 | Missing SameSite attribute on cookies | MEDIUM | AUTH-02 |
| OC-037 | Session not invalidated on logout | MEDIUM | AUTH-02 |
| OC-038 | Session not invalidated on password change | HIGH | AUTH-02 |
| OC-039 | Concurrent session handling gaps | MEDIUM | AUTH-02 |
| OC-040 | Missing authorization on endpoint | CRITICAL | AUTH-03 |
| OC-041 | Horizontal privilege escalation (IDOR) | HIGH | AUTH-03 |
| OC-042 | Vertical privilege escalation | CRITICAL | AUTH-03 |
| OC-043 | Authorization check only on frontend | HIGH | AUTH-03 |
| OC-044 | Role bypass via parameter manipulation | HIGH | AUTH-03 |
| OC-045 | API key in URL (logged by proxies/servers) | MEDIUM | AUTH-04 |
| OC-046 | Refresh token reuse without rotation | HIGH | AUTH-04 |
| OC-047 | Token not scoped to minimum permissions | MEDIUM | AUTH-04 |
| OC-048 | MFA bypass via fallback mechanism | HIGH | AUTH-01 |

## Injection (OC-049 – OC-080)

| ID | Name | Severity | Auditors |
|----|------|----------|----------|
| OC-049 | SQL injection via string interpolation | CRITICAL | INJ-01 |
| OC-050 | SQL injection via ORM raw query | HIGH | INJ-01 |
| OC-051 | NoSQL injection via operator ($gt, $ne) | HIGH | INJ-01 |
| OC-052 | NoSQL injection via $where clause | CRITICAL | INJ-01 |
| OC-053 | Second-order SQL injection | HIGH | INJ-01 |
| OC-054 | Blind SQL injection in search/filter | HIGH | INJ-01 |
| OC-055 | OS command injection via exec/spawn | CRITICAL | INJ-02 |
| OC-056 | Code injection via eval() | CRITICAL | INJ-02 |
| OC-057 | SSRF to cloud metadata (169.254.169.254) | CRITICAL | INJ-03 |
| OC-058 | SSRF to internal services | HIGH | INJ-03 |
| OC-059 | SSRF via redirect following | HIGH | INJ-03 |
| OC-060 | DNS rebinding attack | HIGH | INJ-03 |
| OC-061 | SSRF via URL parser differential | HIGH | INJ-03 |
| OC-062 | Path traversal in file read | HIGH | INJ-04 |
| OC-063 | Path traversal in file write | CRITICAL | INJ-04 |
| OC-064 | Filename injection in upload | HIGH | INJ-04 |
| OC-065 | Symlink following in file operations | HIGH | INJ-04 |
| OC-066 | Prototype pollution via deep merge | HIGH | INJ-05 |
| OC-067 | Prototype pollution to RCE via gadget chain | CRITICAL | INJ-05 |
| OC-068 | YAML deserialization RCE | CRITICAL | INJ-05 |
| OC-069 | Pickle/marshal deserialization RCE | CRITICAL | INJ-05 |
| OC-070 | XML external entity (XXE) injection | HIGH | INJ-05 |
| OC-071 | JSON prototype pollution (__proto__) | HIGH | INJ-05 |
| OC-072 | Server-side template injection (SSTI) | CRITICAL | INJ-06 |
| OC-073 | Template sandbox escape | CRITICAL | INJ-06 |
| OC-074 | Client-side template injection | MEDIUM | INJ-06, WEB-01 |
| OC-075 | LDAP injection | HIGH | INJ-01 |
| OC-076 | Header injection (CRLF) | HIGH | INJ-01 |
| OC-077 | Log injection | MEDIUM | INJ-01, DATA-04 |
| OC-078 | Dynamic require/import with user input | HIGH | INJ-02 |
| OC-079 | Regex injection (ReDoS) | MEDIUM | INJ-02, ERR-03 |
| OC-080 | GraphQL injection via batching | MEDIUM | INJ-01, API-02 |

## Web Application Security (OC-081 – OC-105)

| ID | Name | Severity | Auditors |
|----|------|----------|----------|
| OC-081 | Reflected XSS | MEDIUM | WEB-01 |
| OC-082 | Stored XSS | HIGH | WEB-01 |
| OC-083 | DOM-based XSS | MEDIUM | WEB-01 |
| OC-084 | XSS via dangerouslySetInnerHTML | HIGH | WEB-01 |
| OC-085 | XSS via markdown rendering | MEDIUM | WEB-01 |
| OC-086 | XSS via SVG upload | MEDIUM | WEB-01, DATA-03 |
| OC-087 | postMessage handler without origin check | HIGH | WEB-01, FE-01 |
| OC-088 | CORS wildcard with credentials | HIGH | WEB-02 |
| OC-089 | CORS origin reflection | HIGH | WEB-02 |
| OC-090 | Missing Content-Security-Policy | MEDIUM | WEB-02 |
| OC-091 | CSP with unsafe-inline/unsafe-eval | MEDIUM | WEB-02 |
| OC-092 | Missing X-Frame-Options / frame-ancestors | MEDIUM | WEB-02 |
| OC-093 | Missing HSTS header | MEDIUM | WEB-02 |
| OC-094 | Missing X-Content-Type-Options | LOW | WEB-02 |
| OC-095 | CSRF on state-changing endpoint | HIGH | WEB-03 |
| OC-096 | CSRF token not validated server-side | HIGH | WEB-03 |
| OC-097 | CSRF via CORS misconfiguration | HIGH | WEB-03, WEB-02 |
| OC-098 | SameSite cookie bypass | MEDIUM | WEB-03 |
| OC-099 | Open redirect via unvalidated URL | MEDIUM | WEB-04 |
| OC-100 | OAuth redirect_uri open redirect | HIGH | WEB-04, AUTH-01 |
| OC-101 | JavaScript protocol in redirect URL | HIGH | WEB-04 |
| OC-102 | Clickjacking via missing frame protection | MEDIUM | WEB-02 |
| OC-103 | Mixed content (HTTP on HTTPS page) | LOW | WEB-02 |
| OC-104 | Cookie scope too broad (domain/path) | MEDIUM | WEB-03, AUTH-02 |
| OC-105 | Subdomain takeover via dangling DNS | HIGH | WEB-04 |

## Blockchain Interaction (OC-106 – OC-130)

| ID | Name | Severity | Auditors |
|----|------|----------|----------|
| OC-106 | Transaction instruction injection | CRITICAL | CHAIN-01 |
| OC-107 | Transaction reordering before signing | HIGH | CHAIN-01 |
| OC-108 | Missing simulation before submission | MEDIUM | CHAIN-01 |
| OC-109 | Simulation result not validated | HIGH | CHAIN-01 |
| OC-110 | Partial signing vulnerability | HIGH | CHAIN-01 |
| OC-111 | Transaction content not shown to user | HIGH | CHAIN-01 |
| OC-112 | Compute budget manipulation | MEDIUM | CHAIN-01 |
| OC-113 | RPC endpoint spoofing | HIGH | CHAIN-02 |
| OC-114 | RPC response used in security decision | HIGH | CHAIN-02 |
| OC-115 | No RPC failover (single point of failure) | MEDIUM | CHAIN-02 |
| OC-116 | Stale RPC data in financial decision | HIGH | CHAIN-02 |
| OC-117 | Processed commitment for financial operations | HIGH | CHAIN-02, CHAIN-04 |
| OC-118 | Wallet adapter event injection | HIGH | CHAIN-03 |
| OC-119 | Message signing misuse (replay) | HIGH | CHAIN-03 |
| OC-120 | Wallet spoofing / fake wallet injection | HIGH | CHAIN-03 |
| OC-121 | Missing nonce in sign-in-with-solana | HIGH | CHAIN-03 |
| OC-122 | On-chain/off-chain state desync | HIGH | CHAIN-04 |
| OC-123 | Double-processing of blockchain events | HIGH | CHAIN-04 |
| OC-124 | Missing reorg handling in indexer | HIGH | CHAIN-04 |
| OC-125 | WebSocket reconnection loses events | MEDIUM | CHAIN-04 |
| OC-126 | Commitment level mismatch between read and act | HIGH | CHAIN-04 |
| OC-127 | Frontrunnable transaction (no MEV protection) | HIGH | CHAIN-05 |
| OC-128 | Sandwich attack on swap | HIGH | CHAIN-05 |
| OC-129 | Hardcoded slippage too high | MEDIUM | CHAIN-05 |
| OC-130 | Off-chain PDA derivation mismatch with on-chain | HIGH | CHAIN-06 |

## API & Network (OC-131 – OC-155)

| ID | Name | Severity | Auditors |
|----|------|----------|----------|
| OC-131 | Mass assignment / over-posting | HIGH | API-01 |
| OC-132 | Verbose error messages leaking internals | MEDIUM | API-01 |
| OC-133 | Missing rate limiting on sensitive endpoint | MEDIUM | API-01, ERR-03 |
| OC-134 | Response data over-exposure | MEDIUM | API-01 |
| OC-135 | No request body size limit | MEDIUM | API-01, ERR-03 |
| OC-136 | GraphQL introspection in production | MEDIUM | API-02 |
| OC-137 | GraphQL query depth unlimited | HIGH | API-02 |
| OC-138 | GraphQL batching attack | HIGH | API-02 |
| OC-139 | GraphQL field-level authorization missing | HIGH | API-02 |
| OC-140 | WebSocket without authentication | HIGH | API-03 |
| OC-141 | WebSocket message validation missing | HIGH | API-03 |
| OC-142 | WebSocket broadcast channel authorization | HIGH | API-03 |
| OC-143 | WebSocket connection flooding | MEDIUM | API-03 |
| OC-144 | Webhook signature not verified | HIGH | API-04 |
| OC-145 | Webhook replay attack (no timestamp check) | MEDIUM | API-04 |
| OC-146 | Webhook handler not idempotent | MEDIUM | API-04 |
| OC-147 | SSRF via user-configurable webhook URL | HIGH | API-04, INJ-03 |
| OC-148 | Webhook timing attack in signature comparison | MEDIUM | API-04 |
| OC-149 | Email header injection (CRLF) | HIGH | API-05 |
| OC-150 | SMS injection / premium number abuse | HIGH | API-05 |
| OC-151 | Notification content spoofing | MEDIUM | API-05 |
| OC-152 | No rate limit on notification sending | MEDIUM | API-05 |
| OC-153 | API versioning exposes deprecated vulnerable code | MEDIUM | API-01 |
| OC-154 | Pagination allowing full database dump | MEDIUM | API-01 |
| OC-155 | GraphQL subscription without auth | HIGH | API-02 |

## Data Security (OC-156 – OC-185)

| ID | Name | Severity | Auditors |
|----|------|----------|----------|
| OC-156 | Database connection without TLS | HIGH | DATA-01 |
| OC-157 | Database credentials hardcoded | CRITICAL | DATA-01, SEC-02 |
| OC-158 | Connection pool exhaustion vulnerability | MEDIUM | DATA-01 |
| OC-159 | Sensitive data stored unencrypted | HIGH | DATA-01, DATA-05 |
| OC-160 | Database user with excessive privileges | MEDIUM | DATA-01 |
| OC-161 | Migration with destructive operation (no safeguard) | MEDIUM | DATA-01 |
| OC-162 | Redis/Memcached without authentication | HIGH | DATA-02 |
| OC-163 | Cache poisoning via user-controlled key | HIGH | DATA-02 |
| OC-164 | Sensitive data cached without TTL | MEDIUM | DATA-02 |
| OC-165 | Cache key collision / predictability | MEDIUM | DATA-02 |
| OC-166 | Deserialization of cached objects | HIGH | DATA-02, INJ-05 |
| OC-167 | Unrestricted file type upload | HIGH | DATA-03 |
| OC-168 | File size limit missing or too large | MEDIUM | DATA-03 |
| OC-169 | Server-side file execution via upload | CRITICAL | DATA-03 |
| OC-170 | Stored XSS via uploaded HTML/SVG | HIGH | DATA-03, WEB-01 |
| OC-171 | S3 bucket ACL misconfiguration | HIGH | DATA-03, INFRA-03 |
| OC-172 | Sensitive data in application logs | HIGH | DATA-04 |
| OC-173 | Stack traces exposed to users | MEDIUM | DATA-04 |
| OC-174 | Debug mode enabled in production | HIGH | DATA-04 |
| OC-175 | Source maps served in production | MEDIUM | DATA-04 |
| OC-176 | Log injection enabling log forging | MEDIUM | DATA-04 |
| OC-177 | Weak encryption algorithm (DES, RC4, ECB) | HIGH | DATA-05 |
| OC-178 | Hardcoded encryption key or IV | CRITICAL | DATA-05 |
| OC-179 | IV/nonce reuse in encryption | HIGH | DATA-05 |
| OC-180 | Missing encryption for data at rest | HIGH | DATA-05 |
| OC-181 | PII stored without encryption | HIGH | DATA-06 |
| OC-182 | PII in logs or error messages | HIGH | DATA-06 |
| OC-183 | No data retention/deletion policy | MEDIUM | DATA-06 |
| OC-184 | User data export without authorization | HIGH | DATA-06 |
| OC-185 | Right-to-deletion not implemented | MEDIUM | DATA-06 |

## Frontend & Client (OC-186 – OC-205)

| ID | Name | Severity | Auditors |
|----|------|----------|----------|
| OC-186 | Sensitive data in localStorage | HIGH | FE-01 |
| OC-187 | Auth token in localStorage (XSS accessible) | HIGH | FE-01 |
| OC-188 | Client-side data not cleared on logout | MEDIUM | FE-01 |
| OC-189 | PII stored in IndexedDB without encryption | MEDIUM | FE-01 |
| OC-190 | Cross-tab state synchronization leak | MEDIUM | FE-01 |
| OC-191 | Third-party script without SRI | MEDIUM | FE-02 |
| OC-192 | Analytics script capturing sensitive data | HIGH | FE-02 |
| OC-193 | CDN compromise / supply chain via scripts | HIGH | FE-02 |
| OC-194 | postMessage listener trusting any origin | HIGH | FE-02, WEB-01 |
| OC-195 | Third-party iframe data exfiltration | MEDIUM | FE-02 |
| OC-196 | Deep link parameter injection | HIGH | FE-03 |
| OC-197 | WebView JavaScript bridge exposure | CRITICAL | FE-03 |
| OC-198 | Mobile local storage without keychain | HIGH | FE-03 |
| OC-199 | Missing certificate pinning | MEDIUM | FE-03 |
| OC-200 | React Native bridge call injection | HIGH | FE-03 |
| OC-201 | Client-side crypto with Math.random | HIGH | FE-01, CRYPTO-01 |
| OC-202 | Exposure of internal APIs via client bundle | MEDIUM | FE-01 |
| OC-203 | Browser extension injection vector | MEDIUM | FE-02 |
| OC-204 | Service worker cache poisoning | MEDIUM | FE-01 |
| OC-205 | Client-side route guard bypass | HIGH | FE-01, AUTH-03 |

## Infrastructure (OC-206 – OC-230)

| ID | Name | Severity | Auditors |
|----|------|----------|----------|
| OC-206 | Container running as root | MEDIUM | INFRA-01 |
| OC-207 | Secrets in Docker build args | HIGH | INFRA-01, SEC-02 |
| OC-208 | Unpinned base image tag | MEDIUM | INFRA-01 |
| OC-209 | Exposed debug port in container | HIGH | INFRA-01 |
| OC-210 | Privileged container mode | HIGH | INFRA-01 |
| OC-211 | No resource limits on container | MEDIUM | INFRA-01 |
| OC-212 | Sensitive volume mount | HIGH | INFRA-01 |
| OC-213 | CI/CD secrets in pipeline logs | HIGH | INFRA-02 |
| OC-214 | PR-based pipeline command injection | CRITICAL | INFRA-02 |
| OC-215 | Deployment credential over-scoping | HIGH | INFRA-02 |
| OC-216 | Malicious postinstall script in dependency | HIGH | INFRA-02, DEP-01 |
| OC-217 | Build artifact not verified | MEDIUM | INFRA-02 |
| OC-218 | Overly permissive IAM policy | HIGH | INFRA-03 |
| OC-219 | Public S3 bucket / storage | CRITICAL | INFRA-03 |
| OC-220 | Hardcoded cloud credentials | CRITICAL | INFRA-03, SEC-02 |
| OC-221 | Missing environment variable validation | MEDIUM | INFRA-03 |
| OC-222 | Debug mode via feature flag in production | HIGH | INFRA-03 |
| OC-223 | TLS certificate validation disabled | CRITICAL | INFRA-04 |
| OC-224 | NODE_TLS_REJECT_UNAUTHORIZED=0 in production | CRITICAL | INFRA-04 |
| OC-225 | Insecure TLS version (1.0/1.1) | MEDIUM | INFRA-04 |
| OC-226 | Missing HSTS configuration | MEDIUM | INFRA-04 |
| OC-227 | Internal service communication without TLS | HIGH | INFRA-04 |
| OC-228 | Unauthenticated metrics endpoint | MEDIUM | INFRA-05 |
| OC-229 | Sensitive data in metric labels | HIGH | INFRA-05 |
| OC-230 | pprof/debug endpoint exposed in production | HIGH | INFRA-05 |

## Supply Chain & Dependencies (OC-231 – OC-245)

| ID | Name | Severity | Auditors |
|----|------|----------|----------|
| OC-231 | Critical CVE in dependency | CRITICAL | DEP-01 |
| OC-232 | High CVE in dependency | HIGH | DEP-01 |
| OC-233 | Dependency with known RCE | CRITICAL | DEP-01 |
| OC-234 | Lockfile not committed | MEDIUM | DEP-01 |
| OC-235 | Lockfile integrity mismatch | HIGH | DEP-01 |
| OC-236 | Typosquatting package | CRITICAL | DEP-01 |
| OC-237 | Dependency confusion attack vector | HIGH | DEP-01 |
| OC-238 | Unmaintained dependency (EOL) | MEDIUM | DEP-01 |
| OC-239 | Excessive transitive dependencies | LOW | DEP-01 |
| OC-240 | Package with install hooks | MEDIUM | DEP-01 |
| OC-241 | Private registry misconfiguration | HIGH | DEP-01 |
| OC-242 | Pinned to vulnerable version range | MEDIUM | DEP-01 |
| OC-243 | Missing npm/yarn audit in CI | LOW | DEP-01 |
| OC-244 | Import from CDN without integrity hash | MEDIUM | DEP-01, FE-02 |
| OC-245 | Bundled dependency with modifications | MEDIUM | DEP-01 |

## Automation & Bots (OC-246 – OC-265)

| ID | Name | Severity | Auditors |
|----|------|----------|----------|
| OC-246 | Automated signing without approval | HIGH | BOT-01 |
| OC-247 | No fund limit per operation | HIGH | BOT-01 |
| OC-248 | No kill switch / emergency shutdown | HIGH | BOT-01 |
| OC-249 | Infinite retry on failed operations | MEDIUM | BOT-01 |
| OC-250 | Fee escalation in retry loop | HIGH | BOT-01 |
| OC-251 | No monitoring/alerting on failures | MEDIUM | BOT-01 |
| OC-252 | Non-idempotent automated operation | HIGH | BOT-01 |
| OC-253 | Hardcoded slippage in trading bot | HIGH | BOT-02 |
| OC-254 | Oracle price without staleness check | HIGH | BOT-02 |
| OC-255 | No maximum trade size limit | HIGH | BOT-02 |
| OC-256 | No loss limit / circuit breaker | HIGH | BOT-02 |
| OC-257 | Exchange API key with withdrawal permission | CRITICAL | BOT-02 |
| OC-258 | Bot sandwich-able transaction | HIGH | BOT-02, CHAIN-05 |
| OC-259 | Poison message in queue (no DLQ) | MEDIUM | BOT-03 |
| OC-260 | Message processed multiple times | HIGH | BOT-03 |
| OC-261 | Queue without authentication | HIGH | BOT-03 |
| OC-262 | Unbounded message size | MEDIUM | BOT-03 |
| OC-263 | Message ordering assumption violation | MEDIUM | BOT-03 |
| OC-264 | Cron job overlap (no lock) | HIGH | BOT-01 |
| OC-265 | Keeper operating on stale state | HIGH | BOT-01, CHAIN-04 |

## Error Handling & Resilience (OC-266 – OC-285)

| ID | Name | Severity | Auditors |
|----|------|----------|----------|
| OC-266 | Fail-open error handling | HIGH | ERR-01 |
| OC-267 | Swallowed exception hiding security failure | HIGH | ERR-01 |
| OC-268 | Unhandled promise rejection | MEDIUM | ERR-01 |
| OC-269 | Missing global error handler | MEDIUM | ERR-01 |
| OC-270 | Error recovery skipping security checks | HIGH | ERR-01 |
| OC-271 | TOCTOU race condition | HIGH | ERR-02 |
| OC-272 | Double-spend via concurrent requests | CRITICAL | ERR-02 |
| OC-273 | Race condition in balance check + deduction | CRITICAL | ERR-02 |
| OC-274 | File access race condition | MEDIUM | ERR-02 |
| OC-275 | Cache invalidation race | MEDIUM | ERR-02 |
| OC-276 | Database transaction isolation too low | HIGH | ERR-02 |
| OC-277 | Shared mutable state without synchronization | HIGH | ERR-02 |
| OC-278 | Missing rate limit on auth endpoint | HIGH | ERR-03 |
| OC-279 | ReDoS (Regular expression DoS) | MEDIUM | ERR-03 |
| OC-280 | Request body size unlimited | MEDIUM | ERR-03 |
| OC-281 | Connection pool exhaustion | MEDIUM | ERR-03 |
| OC-282 | CPU exhaustion via complex operation | MEDIUM | ERR-03 |
| OC-283 | No timeout on external API calls | MEDIUM | ERR-03 |
| OC-284 | Algorithmic complexity attack (hash collision) | MEDIUM | ERR-03 |
| OC-285 | Memory exhaustion via large payload | MEDIUM | ERR-03 |

## Cryptographic Operations (OC-286 – OC-298)

| ID | Name | Severity | Auditors |
|----|------|----------|----------|
| OC-286 | Math.random for security purposes | HIGH | CRYPTO-01 |
| OC-287 | Predictable nonce/salt | HIGH | CRYPTO-01 |
| OC-288 | UUID v1 for security identifiers | MEDIUM | CRYPTO-01 |
| OC-289 | Nonce reuse in encryption | CRITICAL | CRYPTO-01 |
| OC-290 | Weak random seed | HIGH | CRYPTO-01 |
| OC-291 | Non-constant-time comparison | MEDIUM | CRYPTO-01, AUTH-01 |
| OC-292 | AES in ECB mode | HIGH | CRYPTO-01 |
| OC-293 | Short encryption key (< 256 bits) | MEDIUM | CRYPTO-01 |
| OC-294 | PBKDF2 with insufficient iterations | MEDIUM | CRYPTO-01 |
| OC-295 | MD5/SHA1 for password hashing | HIGH | CRYPTO-01, AUTH-01 |
| OC-296 | Custom crypto implementation | HIGH | CRYPTO-01 |
| OC-297 | Encryption without authentication (no AEAD) | HIGH | CRYPTO-01 |
| OC-298 | Key derivation from low-entropy input | HIGH | CRYPTO-01 |

## Business Logic (OC-299 – OC-312)

| ID | Name | Severity | Auditors |
|----|------|----------|----------|
| OC-299 | State machine bypass (skip steps) | HIGH | LOGIC-01 |
| OC-300 | Business rules enforced only on frontend | HIGH | LOGIC-01 |
| OC-301 | Negative quantity/amount accepted | HIGH | LOGIC-01 |
| OC-302 | Coupon/discount stacking abuse | MEDIUM | LOGIC-01 |
| OC-303 | Feature flag enabling admin functionality | HIGH | LOGIC-01 |
| OC-304 | Order of operations not enforced | MEDIUM | LOGIC-01 |
| OC-305 | Floating-point for financial calculations | HIGH | LOGIC-02 |
| OC-306 | Rounding error accumulation | MEDIUM | LOGIC-02 |
| OC-307 | Integer overflow in amount calculation | HIGH | LOGIC-02 |
| OC-308 | Double-spend via non-atomic balance check | CRITICAL | LOGIC-02, ERR-02 |
| OC-309 | Fee calculation manipulation (dust/zero) | MEDIUM | LOGIC-02 |
| OC-310 | Currency conversion precision loss | MEDIUM | LOGIC-02 |
| OC-311 | Negative amount handling (credit instead of debit) | CRITICAL | LOGIC-02 |
| OC-312 | Reward/yield calculation overflow | HIGH | LOGIC-02 |

---

## Auditor Cross-Reference

Each pattern lists which auditor(s) should look for it. This enables:
1. Primary auditor: The auditor whose category matches the pattern
2. Cross-cutting auditors: Other auditors that should also check for this pattern

## File Format

Each pattern file follows this structure:
```markdown
# OC-{NNN}: {Pattern Name}

**Category:** {Category}
**Severity:** {CRITICAL | HIGH | MEDIUM | LOW}
**Auditors:** {Comma-separated auditor IDs}
**CWE:** {CWE-ID if applicable}
**OWASP:** {OWASP category if applicable}

## Description
{What the vulnerability is and why it matters}

## Detection
{What to grep for, what code patterns indicate this vulnerability}

## Vulnerable Code
```{language}
{Example of vulnerable code}
```

## Secure Code
```{language}
{Example of secure code}
```

## Impact
{What an attacker can achieve}

## References
- {Link to CVE, OWASP, blog post, or incident}
```
