# DB Auditor Catalog

A comprehensive catalog of off-chain security auditor lenses. During Phase 0, the scan detects which components exist in the codebase and selects the relevant subset of auditors to deploy in Phase 1.

**Design:** Define every lens → detect what's present → select the best N → deploy.

## How Selection Works

1. **Phase 0 scans** the codebase for technology indicators (frameworks, libraries, patterns)
2. Each auditor has **detection triggers** — signals that make it relevant
3. Auditors matching triggers are **auto-selected**; others are available for manual add
4. User confirms the selection before Phase 1 deploys agents
5. **Tier budget** sets the minimum deployment: quick=8-10, standard=12-20, deep=all matched (can be 30+)
6. **Catalog total:** ~50 auditor definitions across 12 categories

## Mandatory Output Sections

Every auditor agent MUST produce ALL of the following sections in its context output file. Missing sections will be flagged by the quality gate.

| Section | Purpose |
|---------|---------|
| `CONDENSED_SUMMARY` | 2-3 paragraph executive summary for synthesis (between `<!-- CONDENSED_SUMMARY_START -->` / `<!-- CONDENSED_SUMMARY_END -->` markers) |
| `INVARIANTS` | Security invariants discovered, with enforcement status (Enforced / Partially Enforced / Not Enforced) |
| `ASSUMPTIONS` | Security assumptions made by the code, with validation status |
| `FULL_ANALYSIS` | Detailed per-file analysis with code references |
| `RISK_ASSESSMENT` | Priority-ranked concerns for this focus area |
| `CROSS_CUTTING` | How this focus area's findings interact with other auditors' domains |
| `ATTACK_SURFACE` | Externally-accessible entry points relevant to this lens |

---

## Catalog

### Category: Secrets & Credentials

#### SEC-01: Private Key & Wallet Security

**Triggers:** `Keypair`, `secretKey`, `privateKey`, `wallet`, `@solana/web3.js`, `ethers`, `mnemonic`, `seed`, `HDKey`, `.pem`, `.key`

**Key Concerns:**
- Private keys in source, env vars, or config files
- Key derivation and storage patterns
- Hot wallet vs cold wallet architecture
- Key rotation procedures and backup
- HSM/KMS integration (or lack thereof)
- Client-side key exposure in frontend bundles

**Focus Guidance:**
Trace every path a private key travels — from generation/import through storage to usage in signing. Check for keys in logs, error messages, stack traces. Verify keys aren't embedded in client bundles. Check if key material is zeroized after use. Look for hardcoded mnemonics or seeds in test files that leak into production.

---

#### SEC-02: Secret & Credential Management

**Triggers:** `.env`, `process.env`, `os.environ`, `API_KEY`, `SECRET`, `TOKEN`, `PASSWORD`, `connectionString`, `dotenv`, `vault`, `aws-sdk`, `@aws-sdk`

**Key Concerns:**
- Secrets in version control (committed .env files)
- Environment variable handling and validation
- Secret rotation and revocation procedures
- Third-party API key scoping and least privilege
- Database connection string exposure
- Secret sharing between services

**Focus Guidance:**
Map every secret in the system — where it's defined, how it's loaded, where it's used, whether it's ever logged or exposed in error responses. Check .gitignore for .env exclusion. Look for secrets in Docker build args, CI/CD configs, or client-side code. Verify secrets have appropriate scoping (read-only API keys, database user permissions).

---

### Category: Authentication & Authorization

#### AUTH-01: Authentication Mechanisms

**Triggers:** `passport`, `jsonwebtoken`, `jwt`, `bcrypt`, `argon2`, `OAuth`, `auth0`, `firebase/auth`, `supabase`, `login`, `signin`, `signIn`, `authenticate`, `password`, `hash`

**Key Concerns:**
- Password hashing algorithm and configuration
- JWT signing algorithm (RS256 vs HS256 vs none)
- JWT secret/key management and rotation
- Token expiry and refresh mechanisms
- OAuth flow implementation (CSRF, redirect validation)
- MFA implementation gaps
- Brute force protection
- Account enumeration via error messages or timing

**Focus Guidance:**
Trace the full authentication flow from credential submission to session establishment. Check JWT configuration (algorithm enforcement, expiry, audience validation). Look for `alg: none` vulnerability. Check password hashing (bcrypt rounds >= 10, no MD5/SHA1). Verify OAuth redirect_uri validation is strict. Check for timing side-channels in authentication comparisons.

---

#### AUTH-02: Session Management

**Triggers:** `express-session`, `cookie`, `session`, `redis` + `session`, `connect-redis`, `sessionStorage`, `localStorage`, `Set-Cookie`, `csrf`

**Key Concerns:**
- Session token generation (entropy, predictability)
- Cookie flags (HttpOnly, Secure, SameSite, Path, Domain)
- Session fixation and hijacking vectors
- Session timeout and idle expiry
- Concurrent session handling
- Session invalidation on logout/password change
- CSRF protection mechanisms

**Focus Guidance:**
Map the session lifecycle: creation → storage → validation → destruction. Check cookie configuration flags. Verify session IDs have sufficient entropy (>= 128 bits). Check if sessions are properly invalidated on logout, password change, and privilege change. Look for session data in URLs. Verify CSRF tokens are per-request or per-session with proper validation.

---

#### AUTH-03: Authorization & Access Control

**Triggers:** `role`, `permission`, `admin`, `isAdmin`, `authorize`, `rbac`, `abac`, `middleware`, `guard`, `canActivate`, `policy`, `casl`, `casbin`

**Key Concerns:**
- Missing authorization checks on sensitive endpoints
- Horizontal privilege escalation (accessing other users' data)
- Vertical privilege escalation (user → admin)
- IDOR (Insecure Direct Object Reference)
- Role/permission bypass via parameter manipulation
- Inconsistent auth check patterns across routes
- Default deny vs default allow

**Focus Guidance:**
Map every route/endpoint and verify authorization middleware is applied consistently. Check for IDOR by looking at how object ownership is verified. Look for endpoints that check authentication but not authorization. Verify admin routes can't be accessed by manipulating role claims. Check if authorization decisions are made on server side, not just client side.

---

#### AUTH-04: API Key & Token Management

**Triggers:** `apiKey`, `api_key`, `x-api-key`, `bearer`, `Authorization`, `token`, `refresh_token`, `apiKeyAuth`, `createToken`, `revokeToken`

**Key Concerns:**
- API key generation entropy
- Key scoping (read/write, resource-level)
- Key rotation and revocation
- Key transmission security (headers vs query params)
- Token refresh race conditions
- Refresh token rotation (reuse detection)
- Token storage on client side

**Focus Guidance:**
Trace API key/token lifecycle: generation → distribution → usage → rotation → revocation. Check if keys are transmitted in URL query parameters (logged by default). Verify refresh tokens are single-use with rotation. Check for token reuse detection. Look for overly-permissive API keys that grant full access.

---

### Category: Input & Injection

#### INJ-01: SQL & NoSQL Injection

**Triggers:** `sequelize`, `typeorm`, `prisma`, `knex`, `pg`, `mysql`, `mongoose`, `mongodb`, `query(`, `$where`, `$regex`, `raw(`, `sql\``, `db.`

**Key Concerns:**
- Raw SQL queries with string interpolation
- ORM bypass via raw queries
- NoSQL operator injection ($gt, $regex, $where)
- Stored procedure injection
- Second-order injection (stored then retrieved)
- Blind injection in search/filter endpoints

**Focus Guidance:**
Find every database query in the codebase. Check if user input flows into queries without parameterization. For ORMs, look for `.raw()`, `.query()`, or template literal queries. For MongoDB, check for user input in query operators. Look for query building patterns where filters are constructed from user input.

---

#### INJ-02: Command & Code Injection

**Triggers:** `exec(`, `execSync`, `spawn`, `child_process`, `subprocess`, `os.system`, `os.popen`, `eval(`, `Function(`, `new Function`, `vm.runIn`, `require(` + variable

**Key Concerns:**
- Shell command construction from user input
- eval() with user-controlled strings
- Dynamic require/import with user input
- Template literal injection in shell commands
- Prototype pollution leading to code execution
- Deserialization of untrusted data

**Focus Guidance:**
Find every call to exec/spawn/subprocess and trace whether any argument can be influenced by user input. Check for eval() or Function() with dynamic content. Look for child_process calls where commands are built via string concatenation. Check for unvalidated dynamic imports. Verify all user input is sanitized before shell execution.

---

#### INJ-03: SSRF (Server-Side Request Forgery)

**Triggers:** `fetch(`, `axios`, `http.get`, `http.request`, `urllib`, `requests.get`, `got(`, `node-fetch`, `url` + user input, `redirect`, `proxy`

**Key Concerns:**
- URL parameters used in server-side requests
- Redirect following to internal networks
- DNS rebinding attacks
- Cloud metadata endpoint access (169.254.169.254)
- Protocol smuggling (file://, gopher://)
- IP address bypass (0x7f000001, 0177.0.0.1)

**Focus Guidance:**
Find every place the server makes an outbound HTTP request. Trace whether the URL, host, or any part of the request can be influenced by user input. Check for URL validation (allowlist vs blocklist). Look for redirect following that could reach internal services. Check if cloud metadata endpoints are accessible.

---

#### INJ-04: Path Traversal & File Access

**Triggers:** `fs.readFile`, `fs.writeFile`, `path.join`, `path.resolve`, `open(`, `readFile`, `writeFile`, `createReadStream`, `multer`, `formidable`, `upload`

**Key Concerns:**
- File paths constructed from user input
- Directory traversal (../) in file operations
- Unrestricted file upload (type, size, name)
- File overwrite via crafted filenames
- Symlink following
- Temporary file race conditions

**Focus Guidance:**
Find every file system operation and trace whether the path can be influenced by user input. Check for path normalization before use. Look for ../ sequences that aren't stripped. Check file upload handling: type validation, filename sanitization, storage location, execution prevention. Verify uploaded files can't overwrite critical system files.

---

### Category: Web Application Security

#### WEB-01: XSS & Client-Side Injection

**Triggers:** `dangerouslySetInnerHTML`, `innerHTML`, `v-html`, `document.write`, `DOMParser`, `jQuery`, `$(`, `.html(`, `template literal` + user content, `marked`, `sanitize`, `dompurify`

**Key Concerns:**
- Reflected XSS via URL parameters
- Stored XSS via database content
- DOM-based XSS via client-side routing
- Markdown rendering without sanitization
- SVG/HTML injection in user content
- Template injection in frontend frameworks
- postMessage handler XSS

**Focus Guidance:**
Find every place user-controlled content is rendered in HTML. Check React components for dangerouslySetInnerHTML. Look for raw HTML insertion in Vue (v-html) or jQuery (.html()). Check markdown renderers for XSS. Verify postMessage handlers validate origin. Look for URL-sourced content rendered without encoding. Check if CSP would mitigate found issues.

---

#### WEB-02: CORS, CSP & Security Headers

**Triggers:** `cors`, `Access-Control`, `helmet`, `Content-Security-Policy`, `X-Frame-Options`, `Strict-Transport-Security`, `origin`, `allowedOrigins`

**Key Concerns:**
- CORS misconfiguration (`*` origin with credentials)
- Origin reflection without validation
- Missing or permissive CSP
- Missing security headers (HSTS, X-Frame-Options, etc.)
- Clickjacking via missing frame options
- MIME sniffing via missing X-Content-Type-Options

**Focus Guidance:**
Find CORS configuration and check if origins are validated or wildcard. Check if Access-Control-Allow-Credentials is used with permissive origins. Look for security header middleware (helmet in Express). Verify CSP is present and doesn't use unsafe-inline/unsafe-eval unnecessarily. Check for X-Frame-Options or frame-ancestors CSP directive.

---

#### WEB-03: CSRF & Request Forgery

**Triggers:** `csrf`, `csurf`, `_csrf`, `csrfToken`, `X-CSRF`, `SameSite`, `state` parameter in OAuth, `referer`, `origin` check

**Key Concerns:**
- Missing CSRF protection on state-changing endpoints
- Token-based CSRF with weak token generation
- SameSite cookie attribute reliance
- CSRF in JSON APIs (content-type enforcement)
- Cross-origin state-changing via CORS misconfiguration
- OAuth CSRF via missing state parameter

**Focus Guidance:**
Identify all state-changing endpoints (POST, PUT, DELETE, PATCH). Verify CSRF protection is applied to each. Check if SameSite=Lax/Strict is set on session cookies. For JSON APIs, verify Content-Type enforcement prevents cross-origin form submission. Check OAuth flows for state parameter validation.

---

### Category: Blockchain Interaction

#### CHAIN-01: Transaction Construction & Signing

**Triggers:** `Transaction`, `VersionedTransaction`, `TransactionInstruction`, `signTransaction`, `sendTransaction`, `signAllTransactions`, `Instruction`, `SystemProgram`, `TOKEN_PROGRAM_ID`, `anchor.`

**Key Concerns:**
- Transaction instruction manipulation before signing
- Missing instruction validation in multi-instruction TXs
- Simulation result spoofing
- Pre-flight check bypasses
- Transaction data not shown to user before signing
- Partial signing vulnerabilities
- Compute budget manipulation

**Focus Guidance:**
Trace every transaction from construction to submission. Check if instructions can be injected or reordered between construction and signing. Verify simulation results are validated before proceeding. Check if transaction contents are displayed to the user for approval. Look for transactions signed without user awareness. Check for proper error handling on failed submissions.

---

#### CHAIN-02: RPC Client & Node Trust

**Triggers:** `Connection`, `clusterApiUrl`, `rpcUrl`, `RPC_URL`, `getAccountInfo`, `getProgramAccounts`, `getBalance`, `getTransaction`, `provider`, `JsonRpcProvider`

**Key Concerns:**
- RPC endpoint trust (self-hosted vs third-party)
- Response validation (can RPC lie?)
- Failover handling (what if RPC returns errors?)
- Rate limiting and request batching
- RPC response data used in security decisions
- Stale data from slow/cached RPC responses
- WebSocket subscription reliability

**Focus Guidance:**
Find every RPC call and determine what decisions are made based on the response. Check if RPC responses are validated before use in security-critical logic. Look for hardcoded RPC URLs vs configurable. Check failover behavior — does a failed RPC call fail-open or fail-closed? Verify account data freshness assumptions.

---

#### CHAIN-03: Wallet Integration & Adapter Security

**Triggers:** `wallet-adapter`, `@solana/wallet-adapter`, `useWallet`, `WalletProvider`, `signMessage`, `connect`, `disconnect`, `phantom`, `solflare`, `backpack`

**Key Concerns:**
- Wallet connection flow vulnerabilities
- Message signing misuse (sign-in-with-solana patterns)
- Transaction approval UI manipulation
- Wallet adapter event handling
- Multiple wallet connection state
- Wallet spoofing / fake wallet injection
- Popup blocking affecting signing

**Focus Guidance:**
Trace the wallet connection lifecycle. Check if signed messages are validated properly (nonce, domain, expiry). Look for transaction construction that could be manipulated between wallet approval UI and actual signing. Check if wallet disconnection is handled gracefully. Verify the app doesn't blindly trust wallet-reported public keys.

---

#### CHAIN-04: On-Chain/Off-Chain State Synchronization

**Triggers:** `subscribe`, `onAccountChange`, `onProgramAccountChange`, `websocket`, `polling`, `indexer`, `geyser`, `helius`, `triton`, `accountInfo`, `slot`, `commitment`

**Key Concerns:**
- State consistency between on-chain and off-chain
- Stale data from delayed synchronization
- Reorg handling (chain reorganizations)
- Double-processing of transactions/events
- Missing events (websocket disconnection)
- Race conditions between state reads and writes
- Commitment level mismatches (processed vs confirmed vs finalized)

**Focus Guidance:**
Map every place off-chain code reads on-chain state. Check commitment levels used (processed is not safe for financial decisions). Look for polling intervals that could lead to stale data. Check websocket reconnection logic and event replay. Verify idempotent processing of blockchain events. Look for reorg handling in indexers.

---

#### CHAIN-05: MEV & Transaction Ordering

**Triggers:** `priority_fee`, `priorityFee`, `computeBudget`, `jito`, `tip`, `bundle`, `sandwich`, `frontrun`, `backrun`, `slippage`, `swap`, `dex`, `jupiter`, `raydium`

**Key Concerns:**
- Frontrunning of user transactions
- Sandwich attack vectors
- Slippage tolerance manipulation
- MEV protection mechanisms (Jito bundles, private mempools)
- Transaction ordering dependencies
- Time-sensitive operations without protection

**Focus Guidance:**
Identify all transactions that could be profitably frontrun or sandwiched. Check slippage settings and whether users can set them. Look for swap transactions without slippage protection. Check if Jito bundles or private submission is used for sensitive operations. Verify priority fee calculation logic.

---

### Category: API & Network

#### API-01: REST API Security

**Triggers:** `express`, `fastify`, `koa`, `hapi`, `nest`, `app.get`, `app.post`, `router.`, `@Get`, `@Post`, `res.json`, `res.send`

**Key Concerns:**
- Missing input validation on request body/params/query
- Mass assignment / over-posting
- Verbose error messages leaking internal details
- Missing rate limiting on sensitive endpoints
- Response data over-exposure (returning full objects)
- API versioning and deprecation security
- Pagination abuse (excessive data retrieval)

**Focus Guidance:**
Map every API endpoint with its HTTP method, authentication requirement, and input validation. Check for mass assignment (blindly spreading request body into database operations). Verify error responses don't leak stack traces or internal paths. Check rate limiting on authentication and resource-intensive endpoints. Look for endpoints that return more data than necessary.

---

#### API-02: GraphQL Security

**Triggers:** `graphql`, `apollo`, `type-graphql`, `nexus`, `gql\``, `schema`, `resolver`, `mutation`, `subscription`, `introspection`

**Key Concerns:**
- Introspection enabled in production
- Query depth/complexity limits missing
- Batching attacks (multiple queries in one request)
- Authorization on individual fields/resolvers
- N+1 query amplification
- Subscription abuse
- Field-level information disclosure

**Focus Guidance:**
Check if introspection is disabled in production. Verify query depth and complexity limits are configured. Check authorization on every resolver, not just top-level queries. Look for batching that bypasses rate limiting. Verify subscriptions require authentication and have rate limits.

---

#### API-03: WebSocket & Real-Time Security

**Triggers:** `ws`, `socket.io`, `WebSocket`, `wss://`, `io(`, `socket.on`, `socket.emit`, `pusher`, `ably`, `supabase` + `realtime`

**Key Concerns:**
- Missing authentication on WebSocket connections
- Message validation and sanitization
- Connection-level rate limiting
- Broadcast channel authorization
- Connection hijacking
- Resource exhaustion via connection flooding
- Message replay attacks

**Focus Guidance:**
Check if WebSocket connections require authentication (token in handshake or first message). Verify all incoming messages are validated and typed. Check for broadcast channel authorization (can users subscribe to others' channels?). Look for rate limiting on message frequency. Check reconnection logic for state consistency.

---

#### API-04: Webhook & Callback Security

**Triggers:** `webhook`, `callback`, `notify`, `ipn`, `stripe` + `webhook`, `hmac`, `signature`, `X-Signature`, `verify_signature`, `svix`

**Key Concerns:**
- Missing signature verification on incoming webhooks
- Replay attacks (no timestamp validation)
- SSRF via webhook URL configuration
- Webhook URL validation (user-provided callback URLs)
- Timing attacks in signature comparison
- Idempotency of webhook handlers
- Secret rotation for webhook signing keys

**Focus Guidance:**
Find every webhook receiver endpoint. Verify signature validation is present and uses constant-time comparison. Check for timestamp validation to prevent replay attacks. If users can configure webhook URLs, check for SSRF. Verify webhook handlers are idempotent (same event processed twice should be safe).

---

### Category: Data Security

#### DATA-01: Database & Query Security

**Triggers:** `sequelize`, `typeorm`, `prisma`, `knex`, `mongoose`, `pg`, `mysql2`, `better-sqlite3`, `drizzle`, `pool`, `createPool`, `createClient`

**Key Concerns:**
- Database connection security (TLS, authentication)
- Connection pool exhaustion
- Transaction isolation level issues
- Sensitive data stored unencrypted
- Database user privilege escalation
- Backup security and access
- Migration security (destructive migrations)

**Focus Guidance:**
Check database connection configuration (TLS enabled, credentials not hardcoded). Verify connection pool limits are set. Look for sensitive data stored in plaintext (passwords, keys, PII). Check database user permissions (principle of least privilege). Verify migration scripts don't have destructive operations without safeguards.

---

#### DATA-02: Cache & Session Store Security

**Triggers:** `redis`, `memcached`, `ioredis`, `node-cache`, `lru-cache`, `cache`, `ttl`, `setex`, `hset`

**Key Concerns:**
- Cache poisoning (attacker-controlled cache keys)
- Sensitive data in cache without encryption
- Cache key collision / predictability
- Cache invalidation race conditions
- Redis/Memcached without authentication
- Cache timing side channels
- Deserialization of cached objects

**Focus Guidance:**
Find every cache operation. Check if cache keys can be influenced by user input (cache poisoning). Verify Redis/Memcached requires authentication. Check if sensitive data is cached and whether TTLs are appropriate. Look for race conditions between cache reads and invalidation.

---

#### DATA-03: File Upload & Storage Security

**Triggers:** `multer`, `formidable`, `busboy`, `upload`, `S3`, `putObject`, `createWriteStream`, `file`, `attachment`, `blob`

**Key Concerns:**
- Unrestricted file type upload
- File size limits missing or too large
- Filename injection (path traversal via filename)
- Stored XSS via uploaded HTML/SVG
- Server-side file execution
- Cloud storage ACL misconfiguration
- Incomplete upload cleanup

**Focus Guidance:**
Find all file upload endpoints. Check file type validation (allowlist, not blocklist; check content, not just extension). Verify file size limits. Check filename sanitization before storage. Verify uploaded files are stored outside web root or with proper content-type. Check S3 bucket ACLs.

---

#### DATA-04: Logging & Information Disclosure

**Triggers:** `console.log`, `logger`, `winston`, `pino`, `bunyan`, `morgan`, `debug`, `console.error`, `stack`, `trace`, `verbose`

**Key Concerns:**
- Sensitive data in logs (passwords, keys, tokens, PII)
- Stack traces exposed to users in error responses
- Debug endpoints left enabled in production
- Log injection (user input in log messages)
- Excessive information in API error responses
- Source maps exposed in production

**Focus Guidance:**
Find all logging statements and check what data they include. Look for passwords, tokens, keys, or PII being logged. Check error handler middleware for stack trace exposure. Verify debug/verbose logging is disabled in production. Check for source maps served in production. Look for debug endpoints (/debug, /status, /health with too much info).

---

#### DATA-05: Encryption & Data Protection

**Triggers:** `crypto`, `bcrypt`, `argon2`, `scrypt`, `aes`, `encrypt`, `decrypt`, `cipher`, `createCipheriv`, `nacl`, `tweetnacl`, `sodium`

**Key Concerns:**
- Weak encryption algorithms (DES, RC4, ECB mode)
- Hardcoded encryption keys or IVs
- Missing encryption for sensitive data at rest
- Improper IV/nonce handling (reuse)
- Timing side-channels in crypto operations
- PRNG quality for key generation
- Key derivation function configuration

**Focus Guidance:**
Find all cryptographic operations. Check algorithm choices (AES-256-GCM preferred, no ECB mode). Verify IVs/nonces are never reused. Check key derivation (PBKDF2 iterations, bcrypt rounds). Look for hardcoded keys or IVs. Verify CSPRNG is used for all security-sensitive random values. Check for timing-safe comparison of MACs/signatures.

---

### Category: Frontend & Client

#### FE-01: Client-Side State & Storage

**Triggers:** `localStorage`, `sessionStorage`, `IndexedDB`, `cookie`, `document.cookie`, `Cookies.set`, `AsyncStorage`, `SecureStore`

**Key Concerns:**
- Sensitive data in localStorage (tokens, keys, PII)
- XSS access to stored data
- Client-side token storage patterns
- IndexedDB encryption (or lack thereof)
- Cookie scope and security flags
- Client-side data persistence after logout
- Cross-tab state synchronization vulnerabilities

**Focus Guidance:**
Find all client-side storage operations. Check what's stored in localStorage vs sessionStorage vs cookies. Verify sensitive tokens use httpOnly cookies, not localStorage. Check if data is cleared on logout. Look for PII or keys stored client-side without encryption. Verify cookie scope is properly restricted.

---

#### FE-02: Third-Party Script & Dependency Security

**Triggers:** `<script src=`, `CDN`, `gtag`, `analytics`, `facebook`, `pixel`, `hotjar`, `intercom`, `integrity=`, `crossorigin`

**Key Concerns:**
- Third-party scripts loaded without SRI
- Analytics scripts with full page access
- CDN compromise / supply chain risk
- Inline script injection via third-party widgets
- Data exfiltration via tracking pixels
- Third-party iframe communication

**Focus Guidance:**
Find all external script inclusions. Check for Subresource Integrity (SRI) hashes. Identify what data third-party scripts can access. Verify analytics scripts don't capture sensitive page content. Check for eval() or dynamic script creation from third-party data. Look for postMessage listeners that trust any origin.

---

### Category: Infrastructure

#### INFRA-01: Container & Deployment Security

**Triggers:** `Dockerfile`, `docker-compose`, `FROM`, `ENTRYPOINT`, `CMD`, `kubernetes`, `k8s`, `helm`, `terraform`, `pulumi`, `.deploy`

**Key Concerns:**
- Running as root in containers
- Secrets in Docker build args or layers
- Base image vulnerabilities (unpinned tags)
- Exposed ports and services
- Volume mount security
- Resource limits missing
- Orchestrator privilege escalation

**Focus Guidance:**
Read all Dockerfiles and docker-compose files. Check for USER directive (not running as root). Verify secrets aren't in build args or COPY'd files. Check base images are pinned to digest, not floating tags. Look for exposed debug ports. Verify resource limits are set. Check for privileged mode or host network.

---

#### INFRA-02: CI/CD & Build Pipeline Security

**Triggers:** `.github/workflows`, `.gitlab-ci`, `Jenkinsfile`, `circleci`, `.travis`, `buildkite`, `npm run build`, `postinstall`, `prepare`

**Key Concerns:**
- Secrets exposed in CI/CD logs
- Untrusted code execution in pipelines
- Missing artifact verification
- Deployment credential scope
- PR-based pipeline injection
- Build script tampering
- OIDC token misuse

**Focus Guidance:**
Read all CI/CD configuration files. Check how secrets are handled (secret masking, scoped access). Look for untrusted input in pipeline commands (PR titles, branch names). Verify deployment credentials are scoped to minimum privilege. Check for postinstall scripts in dependencies that could execute malicious code.

---

#### INFRA-03: Cloud & Environment Configuration

**Triggers:** `AWS`, `GCP`, `azure`, `s3`, `lambda`, `cloudflare`, `vercel`, `netlify`, `heroku`, `.env`, `config`, `settings`

**Key Concerns:**
- Overly permissive IAM policies
- Public S3 buckets or storage
- Hardcoded cloud credentials
- Missing environment variable validation
- Debug mode enabled in production
- Open security groups / network rules
- Serverless function timeout and memory abuse

**Focus Guidance:**
Check for cloud provider configuration files and IAM policies. Look for overly permissive policies (*, admin access). Verify storage buckets have appropriate ACLs. Check environment variable loading and validation — what happens if a required env var is missing? Look for feature flags that could enable debug mode.

---

#### INFRA-04: TLS & Network Security

**Triggers:** `https`, `tls`, `ssl`, `certificate`, `rejectUnauthorized`, `NODE_TLS_REJECT_UNAUTHORIZED`, `ca:`, `pfx`, `cert`

**Key Concerns:**
- TLS certificate validation disabled
- Self-signed certificates in production
- Insecure TLS versions (TLS 1.0/1.1)
- Mixed content (HTTP resources on HTTPS pages)
- Certificate pinning (or lack thereof)
- HSTS configuration
- Internal service communication without TLS

**Focus Guidance:**
Search for TLS configuration and check for disabled certificate validation (`rejectUnauthorized: false`, `NODE_TLS_REJECT_UNAUTHORIZED=0`). Verify HTTPS is enforced. Check for mixed content. Look for internal service communication that should use TLS but doesn't. Verify HSTS is configured with appropriate max-age.

---

### Category: Dependency & Supply Chain

#### DEP-01: Package & Dependency Security

**Triggers:** `package.json`, `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`, `requirements.txt`, `Pipfile.lock`, `Cargo.lock`, `go.sum`

**Key Concerns:**
- Known vulnerabilities in dependencies (CVEs)
- Outdated packages with security patches
- Unused dependencies increasing attack surface
- Lockfile integrity (has it been tampered with?)
- Transitive dependency risks
- License compliance issues masking security
- Dependency confusion attacks

**Focus Guidance:**
Run dependency audit tools. Check for critical/high CVEs. Look for very outdated packages (2+ major versions behind). Check for private registry configuration that could enable dependency confusion. Verify lockfiles are committed and not in .gitignore. Look for packages that seem unnecessary or suspicious.

---

### Category: Automation & Bot Logic

#### BOT-01: Keeper & Crank Security

**Triggers:** `crank`, `keeper`, `cron`, `setInterval`, `schedule`, `job`, `worker`, `queue`, `bull`, `agenda`, `node-cron`

**Key Concerns:**
- Automated signing without human approval
- Error handling in automated loops (fail-open?)
- Fund drainage via repeated failed operations
- Gas/fee escalation in retry loops
- Idempotency of automated operations
- Monitoring and alerting gaps
- Kill switch / emergency shutdown

**Focus Guidance:**
Find all automated/scheduled operations. Check error handling — does a failed operation retry indefinitely? Are there fund limits per operation and per time period? Is there a kill switch to stop automation in emergencies? Check if failures are monitored and alerted. Verify idempotency — what happens if the same operation runs twice?

---

#### BOT-02: Trading & DeFi Bot Security

**Triggers:** `swap`, `trade`, `arbitrage`, `liquidat`, `slippage`, `price`, `oracle`, `pool`, `dex`, `jupiter`, `raydium`, `orca`, `serum`, `openbook`

**Key Concerns:**
- Slippage tolerance configuration
- Price oracle manipulation resistance
- Flash loan attack vectors
- Sandwiching of bot transactions
- Profit calculation errors (rounding, overflow)
- Maximum position/trade size limits
- Loss limits and circuit breakers
- API key permissions for exchange accounts

**Focus Guidance:**
Trace the full trading flow from signal to execution. Check slippage settings and whether they're hardcoded or configurable. Look for oracle price reliance without staleness checks. Verify maximum trade sizes and loss limits. Check if exchange API keys have withdrawal permissions they shouldn't. Look for frontrunning protection.

---

#### BOT-03: Queue & Message Processing

**Triggers:** `bull`, `bullmq`, `agenda`, `bee-queue`, `amqp`, `rabbitmq`, `kafka`, `sqs`, `pubsub`, `nats`, `process`, `consume`, `publish`

**Key Concerns:**
- Message validation before processing
- Poison message handling
- Message ordering guarantees
- Duplicate message processing (at-least-once delivery)
- Dead letter queue security
- Queue authentication and authorization
- Message size limits

**Focus Guidance:**
Find all message consumers/processors. Check if incoming messages are validated before processing. Look for poison message handling (messages that always fail). Verify idempotent processing for at-least-once delivery guarantees. Check queue connection authentication. Look for messages that could trigger resource-intensive operations without limits.

---

### Category: Error Handling & Resilience

#### ERR-01: Error Handling & Fail Modes

**Triggers:** `try`, `catch`, `throw`, `Error`, `reject`, `finally`, `unhandledRejection`, `uncaughtException`, `process.on`, `onerror`

**Key Concerns:**
- Fail-open patterns (catch blocks that continue execution)
- Swallowed exceptions hiding security failures
- Unhandled promise rejections
- Global error handlers missing
- Error recovery that skips security checks
- Error messages leaking internal state

**Focus Guidance:**
Find all catch blocks and error handlers. Check if security-critical operations fail-open (catch and continue) or fail-closed (catch and deny). Look for empty catch blocks that swallow errors. Verify unhandled rejection and uncaught exception handlers exist. Check if error recovery paths maintain security invariants.

---

#### ERR-02: Race Conditions & Concurrency

**Triggers:** `async`, `await`, `Promise.all`, `Promise.race`, `setTimeout`, `setInterval`, `mutex`, `lock`, `semaphore`, `concurrent`, `parallel`, `worker_threads`, `cluster`

**Key Concerns:**
- TOCTOU (Time-of-Check-to-Time-of-Use) bugs
- Double-spend via concurrent requests
- Race conditions in balance checks → deductions
- File access races
- Cache race conditions
- Database transaction isolation issues
- Worker thread shared state

**Focus Guidance:**
Identify operations that check-then-act (verify balance, then deduct). Check if these are atomic. Look for concurrent request handling that could double-process (two withdrawals at once). Check database transaction isolation levels for financial operations. Look for shared mutable state accessed from multiple async paths without synchronization.

---

#### ERR-03: Rate Limiting & Resource Exhaustion

**Triggers:** `rate-limit`, `rateLimit`, `throttle`, `express-rate-limit`, `bottleneck`, `p-limit`, `timeout`, `AbortController`, `maxSockets`

**Key Concerns:**
- Missing rate limiting on authentication endpoints
- Regex DoS (ReDoS) in input validation
- Request body size limits missing
- Connection pool exhaustion
- Memory exhaustion via large payloads
- CPU exhaustion via complex operations
- Algorithmic complexity attacks

**Focus Guidance:**
Check if rate limiting is applied to sensitive endpoints (login, registration, password reset, API). Look for regex patterns that could cause ReDoS. Verify request body size limits are configured. Check for operations with unbounded resource consumption (large file processing, complex queries). Verify timeout configurations on external calls.

---

### Category: Cryptographic Operations

#### CRYPTO-01: Random Number Generation & Nonces

**Triggers:** `Math.random`, `crypto.randomBytes`, `uuid`, `nanoid`, `randomUUID`, `secrets`, `os.urandom`, `nonce`, `salt`

**Key Concerns:**
- Math.random() used for security purposes
- Predictable nonce/salt generation
- Insufficient entropy in token generation
- UUID version (v1 is time-based and guessable, v4 is random)
- Nonce reuse in cryptographic operations
- Seed predictability

**Focus Guidance:**
Find all random value generation. Flag any use of Math.random() for security-sensitive purposes (tokens, nonces, IDs). Verify crypto.randomBytes or equivalent CSPRNG is used. Check UUID version for security-sensitive identifiers. Verify nonces are never reused in cryptographic operations.

---

### Category: Injection (Extended)

#### INJ-05: Prototype Pollution & Deserialization

**Triggers:** `merge`, `deepMerge`, `_.merge`, `lodash`, `Object.assign`, `__proto__`, `constructor`, `JSON.parse`, `deserialize`, `unserialize`, `pickle`, `yaml.load`, `xml2js`

**Key Concerns:**
- Prototype pollution via deep merge of user input
- Object.assign with user-controlled source
- JSON.parse of untrusted data leading to __proto__ injection
- YAML deserialization (yaml.load vs yaml.safeLoad)
- Pickle/marshal deserialization of untrusted data
- XML external entity (XXE) injection
- Gadget chains from prototype pollution to RCE

**Focus Guidance:**
Find all deep merge/extend operations and check if user input flows in. Look for lodash merge/defaultsDeep with user-controlled objects. Check for __proto__ or constructor.prototype in request bodies. Verify YAML parsing uses safe loaders. Check for pickle.loads or equivalent with untrusted input. Look for XML parsing with external entity resolution enabled.

---

#### INJ-06: Server-Side Template Injection (SSTI)

**Triggers:** `ejs`, `pug`, `jade`, `handlebars`, `mustache`, `nunjucks`, `jinja2`, `mako`, `template`, `render`, `compile`

**Key Concerns:**
- User input in template strings
- Template engine misconfiguration allowing code execution
- Sandbox escape in template engines
- Client-side template injection in Angular/Vue
- Template compilation with user-controlled input

**Focus Guidance:**
Find all template rendering calls. Check if user input is ever used as part of the template itself (not just as data passed to it). Look for `compile()` or `render()` with user-controlled template strings. Check if template sandbox is properly configured. Verify user input only flows into template variables, never template logic.

---

### Category: Web Application Security (Extended)

#### WEB-04: Open Redirect & URL Validation

**Triggers:** `redirect`, `302`, `301`, `Location`, `returnUrl`, `next=`, `callback=`, `goto=`, `url=`, `continue=`, `dest=`, `window.location`

**Key Concerns:**
- Unvalidated redirect destinations from user input
- OAuth redirect_uri manipulation
- JavaScript protocol in redirect URLs
- Domain validation bypass (evil.com.example.com)
- Login redirect chain manipulation
- Phishing via trusted domain redirect

**Focus Guidance:**
Find all redirect operations (HTTP 301/302, window.location, router.push). Check if the destination URL can be influenced by user input (query parameters like `?next=`, `?redirect=`). Verify URL validation uses allowlist of trusted domains, not blocklist. Check for javascript: protocol injection in URLs. Verify OAuth redirect_uri validation is strict (exact match, not prefix/suffix).

---

### Category: API & Network (Extended)

#### API-05: Email, SMS & Notification Security

**Triggers:** `nodemailer`, `sendgrid`, `mailgun`, `ses`, `twilio`, `sms`, `email`, `notify`, `push`, `sendEmail`, `sendSMS`, `template`

**Key Concerns:**
- Email header injection (CRLF in To/Subject/From)
- HTML email XSS
- SMS injection / premium number abuse
- Notification content spoofing
- Email template injection
- Rate limiting on notification sending
- Credential exposure in notification services

**Focus Guidance:**
Find all email/SMS/push sending code. Check if user input flows into email headers (To, From, Subject, CC, BCC) without sanitization. Look for CRLF injection in headers. Verify HTML emails sanitize dynamic content. Check rate limiting on notification endpoints. Verify notification service credentials are properly scoped.

---

### Category: Data Security (Extended)

#### DATA-06: PII & Data Privacy

**Triggers:** `email`, `phone`, `address`, `ssn`, `birthdate`, `name`, `gdpr`, `ccpa`, `privacy`, `consent`, `anonymize`, `pseudonymize`, `retention`

**Key Concerns:**
- PII stored without encryption
- PII logged or exposed in error messages
- Missing data retention/deletion policies
- User data exported without authorization
- Cross-border data transfer issues
- Consent management gaps
- Right-to-deletion not implemented
- Data minimization violations

**Focus Guidance:**
Identify all PII data fields in the system (email, name, address, phone, financial info). Check storage encryption and access controls. Verify PII isn't logged or included in error responses. Look for data export/download endpoints and their authorization. Check if user deletion/anonymization is implemented. Verify data is only collected when necessary (minimization).

---

### Category: Blockchain Interaction (Extended)

#### CHAIN-06: Program Account & PDA Interaction

**Triggers:** `findProgramAddress`, `createProgramAddress`, `PDA`, `seeds`, `programId`, `AccountMeta`, `isSigner`, `isWritable`, `remainingAccounts`

**Key Concerns:**
- Off-chain PDA derivation mismatches with on-chain
- Incorrect seed construction
- Account ownership validation in off-chain code
- Passing wrong program IDs to instructions
- Account list construction errors
- Missing account validation before transaction build

**Focus Guidance:**
Find all PDA derivation in off-chain code. Cross-reference with on-chain program expectations (if SOS audit available). Check that seeds match exactly. Verify program IDs are constants, not user-controllable. Look for account list construction where the wrong accounts could be substituted. Check that account metadata (isSigner, isWritable) is correctly set.

---

### Category: Frontend & Client (Extended)

#### FE-03: Deep Link, URL Scheme & Mobile Security

**Triggers:** `deeplink`, `universal link`, `app link`, `scheme://`, `intent://`, `expo-linking`, `react-navigation`, `capacitor`, `cordova`, `react-native`, `webview`

**Key Concerns:**
- Deep link hijacking
- URL scheme injection
- WebView JavaScript bridge exposure
- Missing deep link validation
- Mobile storage security (keychain vs shared prefs)
- Certificate pinning in mobile apps
- Inter-app communication security

**Focus Guidance:**
Find all deep link handlers and URL scheme registrations. Check if deep link parameters are validated before use. Look for WebView configurations that enable JavaScript bridges to native code. Check mobile storage usage (is keychain/keystore used for secrets, or just shared preferences?). Verify certificate pinning is implemented for API calls.

---

### Category: Infrastructure (Extended)

#### INFRA-05: Monitoring, Metrics & Observability Exposure

**Triggers:** `prometheus`, `grafana`, `/metrics`, `/health`, `/debug`, `/status`, `pprof`, `actuator`, `trace`, `opentelemetry`, `datadog`, `newrelic`

**Key Concerns:**
- Unauthenticated metrics endpoints
- Sensitive data in metrics labels
- Debug endpoints accessible in production
- Health check information disclosure
- Tracing data with sensitive payloads
- Monitoring credential exposure
- pprof / profiling endpoints exposed

**Focus Guidance:**
Find all metrics, health, and debug endpoints. Check if they require authentication. Look for sensitive data in metric labels or health check responses. Verify debug endpoints (pprof, /debug/vars, /actuator) are disabled in production. Check if distributed tracing captures request/response bodies that contain sensitive data.

---

### Category: Business Logic

#### LOGIC-01: Business Logic & Workflow Security

**Triggers:** `workflow`, `state`, `status`, `step`, `stage`, `approve`, `reject`, `cancel`, `finalize`, `process`, `transition`, `order`

**Key Concerns:**
- State machine bypass (skipping steps)
- Business rule enforcement gaps
- Multi-step process manipulation
- Order of operations exploitation
- Negative quantity/amount handling
- Coupon/discount stacking abuse
- Feature flag misuse for privilege

**Focus Guidance:**
Map all multi-step workflows and state machines. Check if any state transitions can be skipped or forced out of order. Look for business rules enforced only on the frontend. Verify that state changes validate the current state before transitioning. Check for negative values in quantities, amounts, or prices. Look for logic that assumes operations happen in a specific order without enforcing it.

---

#### LOGIC-02: Financial & Economic Logic

**Triggers:** `balance`, `amount`, `price`, `fee`, `reward`, `deposit`, `withdraw`, `transfer`, `payment`, `stripe`, `paypal`, `decimal`, `BigNumber`, `BN`, `BigInt`

**Key Concerns:**
- Floating-point arithmetic in financial calculations
- Rounding error accumulation
- Integer overflow/underflow
- Double-spend via race conditions
- Fee calculation manipulation
- Reward/yield calculation errors
- Currency conversion precision loss
- Negative amount handling

**Focus Guidance:**
Find all financial calculations. Check if floating-point numbers are used for money (they shouldn't be — use BigNumber, Decimal, or integer cents). Look for rounding that could be exploited over many transactions. Verify balance checks are atomic with deductions. Check for integer overflow in large amounts. Verify fee calculations can't be manipulated via edge cases (zero amounts, dust amounts, maximum values).

---

## Selection Reference

### Always Select (present in virtually all off-chain code)

| ID | Name | Rationale |
|----|------|-----------|
| SEC-02 | Secret & Credential Management | Every project has secrets |
| ERR-01 | Error Handling & Fail Modes | Universal concern |
| DEP-01 | Package & Dependency Security | Every project has deps |
| DATA-04 | Logging & Information Disclosure | Always relevant |
| LOGIC-02 | Financial & Economic Logic | Most Solana projects handle value |

### Select by Component Detection

| Component Detected | Select These Auditors |
|---|---|
| **Private keys / Solana wallet ops** | SEC-01, CHAIN-01, CHAIN-02, CHAIN-06 |
| **Authentication (JWT, sessions, OAuth)** | AUTH-01, AUTH-02, AUTH-03 |
| **API keys / tokens** | AUTH-04 |
| **Database (SQL/NoSQL)** | INJ-01, DATA-01 |
| **Shell execution / eval** | INJ-02 |
| **Outbound HTTP requests** | INJ-03 |
| **File system / uploads** | INJ-04, DATA-03 |
| **Deep merge / object manipulation** | INJ-05 |
| **Template engines** | INJ-06 |
| **Frontend / React / Vue** | WEB-01, WEB-02, WEB-03, FE-01 |
| **Redirects / URL params** | WEB-04 |
| **Wallet adapter** | CHAIN-03 |
| **Indexer / subscriptions** | CHAIN-04 |
| **DEX / trading / swaps** | CHAIN-05, BOT-02 |
| **PDA derivation off-chain** | CHAIN-06 |
| **REST API (Express, etc)** | API-01 |
| **GraphQL** | API-02 |
| **WebSocket / real-time** | API-03 |
| **Webhooks** | API-04 |
| **Email / SMS / notifications** | API-05 |
| **Redis / caching** | DATA-02 |
| **Encryption / crypto** | DATA-05, CRYPTO-01 |
| **PII / user data** | DATA-06 |
| **Docker / k8s** | INFRA-01 |
| **CI/CD pipelines** | INFRA-02 |
| **Cloud provider** | INFRA-03 |
| **TLS configuration** | INFRA-04 |
| **Metrics / health / debug endpoints** | INFRA-05 |
| **Keepers / crons / schedulers** | BOT-01 |
| **Trading bots** | BOT-02 |
| **Message queues** | BOT-03 |
| **Concurrency / async patterns** | ERR-02 |
| **Rate limiting** | ERR-03 |
| **Third-party scripts / CDN** | FE-02 |
| **Mobile / deep links / WebView** | FE-03 |
| **Multi-step workflows** | LOGIC-01 |
| **Financial calculations** | LOGIC-02 |

### Deployment Scaling

The number of auditors deployed scales with the codebase, not a fixed count.

| Tier | Min Auditors | Max Auditors | Selection Strategy |
|------|-------------|-------------|-------------------|
| quick | 8 | 10 | Core 5 + top matched by trigger count |
| standard | 12 | 20 | Core 5 + all with >= 2 trigger matches |
| deep | 15 | no limit | All matched auditors (can be 30+) |

**Batching for large selections:**
- Agents are spawned in batches of 5 (parallel within batch)
- 15 auditors = 3 batches
- 25 auditors = 5 batches
- 40 auditors = 8 batches

**Context window consideration:** Each auditor writes to its own file. More auditors = more context files for Phase 2 synthesis. The strategize phase reads condensed summaries (not full analyses), so this scales well.

### Catalog Statistics

| Category | Count | IDs |
|----------|-------|-----|
| Secrets & Credentials | 2 | SEC-01, SEC-02 |
| Authentication & Authorization | 4 | AUTH-01 through AUTH-04 |
| Input & Injection | 6 | INJ-01 through INJ-06 |
| Web Application Security | 4 | WEB-01 through WEB-04 |
| Blockchain Interaction | 6 | CHAIN-01 through CHAIN-06 |
| API & Network | 5 | API-01 through API-05 |
| Data Security | 6 | DATA-01 through DATA-06 |
| Frontend & Client | 3 | FE-01 through FE-03 |
| Infrastructure | 5 | INFRA-01 through INFRA-05 |
| Dependency & Supply Chain | 1 | DEP-01 |
| Automation & Bot Logic | 3 | BOT-01 through BOT-03 |
| Error Handling & Resilience | 3 | ERR-01 through ERR-03 |
| Cryptographic Operations | 1 | CRYPTO-01 |
| Business Logic | 2 | LOGIC-01, LOGIC-02 |
| **TOTAL** | **51** | |
