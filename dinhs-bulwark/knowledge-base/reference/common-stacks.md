# Common Technology Stacks

Reference guide for technology stacks commonly found in Solana/crypto projects. Used during Phase 0 (scan) for component detection and during Phase 3 (strategize) for stack-specific attack surface mapping.

---

## Stack Archetypes

### 1. Next.js + Anchor dApp

The dominant Solana dApp pattern. A Next.js frontend connects to an Anchor program on-chain. Backend concerns are handled via Next.js API routes or server actions, often with a database for off-chain state (user profiles, referrals, leaderboards).

**Components:** Next.js (App Router or Pages Router), @coral-xyz/anchor, @solana/wallet-adapter-react, Prisma or Drizzle ORM, PostgreSQL, Redis (sessions/cache), Vercel deployment

**Detection signals:**
- `next.config.js` or `next.config.mjs` at repo root
- `@coral-xyz/anchor` in `package.json`
- `@solana/wallet-adapter-react`, `@solana/wallet-adapter-base` in `package.json`
- `prisma/` directory with `schema.prisma`, or `drizzle.config.ts`
- `app/` or `pages/api/` directory with API routes
- `.env.local` or `.env` with `NEXT_PUBLIC_RPC_URL`, `DATABASE_URL`
- `idl/` or `target/idl/` containing Anchor-generated JSON IDLs
- `create-solana-dapp` scaffold (anchor-web3js-nextjs template)

**Common patterns:** Wallet adapter provider wrapping the app, server actions for database writes, API routes for off-chain indexing/webhooks, Helius webhooks for on-chain event processing, sign-in-with-Solana (SIWS) for authentication

**Key security concerns:**
- Server Actions bypass traditional REST authorization — each action must independently verify the caller's identity and permissions; there is no middleware layer protecting them by default (OC-040, OC-042, OC-043)
- `NEXT_PUBLIC_` prefix variables are bundled into the client-side JavaScript and are visible to anyone who downloads the page; private keys, RPC auth tokens, or database URLs must never use this prefix (OC-004, OC-202)
- API route handlers in `pages/api/` or `app/api/` do not automatically inherit session context; missing `getServerSession()` calls leave endpoints unauthenticated (OC-040)
- Webhook handlers (Helius, Stripe) must verify the signature header before processing the payload; a missing check allows arbitrary callers to trigger fund movements (OC-144, OC-145, OC-146)
- SIWS replay attacks: wallet message signing without a server-generated nonce allows an attacker who captures a signature to reuse it for authentication (OC-121, OC-119)
- Prisma raw queries (`$queryRaw` with string interpolation) or Drizzle `sql` template misuse introduce SQL injection (OC-049, OC-050)
- Redis used for sessions without authentication or with a predictable key scheme enables session hijacking (OC-162, OC-165)
- `dangerouslySetInnerHTML` in JSX renders user-supplied content as raw HTML (OC-084)

**Relevant auditors:** AUTH-01, AUTH-02, AUTH-03, AUTH-04, WEB-01, WEB-02, WEB-03, API-04, CHAIN-03, INJ-01, DATA-02, SEC-01, SEC-02, FE-01

---

### 2. Express / Fastify Backend API

A standalone Node.js REST API serving as the backend for a dApp or trading system. Often used when the frontend is a separate React SPA (not Next.js), or when the API needs to be consumed by multiple clients (web, mobile, bots).

**Components:** Express.js or Fastify, @solana/web3.js or @solana/kit, PostgreSQL or MongoDB, Redis, JWT or session-based auth, Docker deployment

**Detection signals:**
- `express` or `fastify` in `package.json` dependencies
- `src/routes/`, `src/controllers/`, `src/middleware/` directory structure
- `app.listen()` or `fastify.listen()` in entry point
- `jsonwebtoken`, `@fastify/jwt` in dependencies
- `cors`, `helmet`, `express-rate-limit` in dependencies
- `src/solana/` or `lib/solana/` with web3.js connection utilities
- No `next.config.*` at root

**Common patterns:** JWT issued after wallet signature verification (Phantom wallet authentication flow), REST CRUD for user data, middleware-based auth guards, rate limiting per IP or wallet, PostgreSQL for transactions/orders, Redis for caching balances and price data

**Key security concerns:**
- JWT algorithm confusion: if the server accepts `alg: none` or allows `HS256` on a system expecting `RS256`, an attacker can forge tokens without a secret (OC-021)
- JWT secret hardcoded in source or `.env` committed to git (OC-022, OC-006)
- Missing `exp` (expiry) claim validation means stolen tokens are valid indefinitely (OC-023)
- Missing authorization middleware on specific routes — Express middleware chain ordering errors leave admin endpoints unprotected (OC-040, OC-042)
- CORS misconfiguration: `origin: "*"` with `credentials: true` is invalid per the spec but some libraries allow it, exposing session cookies cross-origin (OC-088, OC-089)
- Fastify's `schema: false` on route validation skips input sanitization, enabling mass assignment or injection (OC-131, OC-049)
- Wallet signature verification done with non-constant-time comparison — susceptible to timing attacks (OC-291)
- Rate limiting absent on `/auth/login` or `/auth/verify` enables credential stuffing or nonce brute-forcing (OC-029, OC-278)
- RPC URL accepted from request parameters enables RPC endpoint spoofing: caller routes signing operations through a malicious node (OC-113)

**Relevant auditors:** AUTH-01, AUTH-02, AUTH-03, API-01, WEB-02, WEB-03, INJ-01, INJ-03, CHAIN-02, CHAIN-03, DATA-01, DATA-02, ERR-03

---

### 3. Trading Bot / MEV Bot

An automated agent that monitors markets and submits transactions. Typically written in Rust (high-performance, on-chain programs or low-latency clients) or TypeScript/Node.js. Interacts with DEXs (Raydium, Orca, Jupiter, Pump.fun) and may use Jito bundles for MEV protection or MEV extraction.

**Components (Rust):** Rust binary, `solana-client` crate, `anchor-client` crate, `tokio` async runtime, Jito SDK for bundle submission, Redis for state, config via TOML/env vars

**Components (TypeScript):** Node.js process, `@solana/web3.js` or `@solana/kit`, Jupiter API for routing, WebSocket subscription for price feeds (Pyth, Switchboard), PM2 or systemd for process management

**Detection signals:**
- `Cargo.toml` with `solana-client`, `solana-sdk`, `anchor-client` (Rust bot)
- `src/strategies/`, `src/arbitrage/`, `src/mev/` directories
- `jito-sdk` or `jito-ts` in dependencies
- `config.toml` or `config.yaml` with `rpc_url`, `private_key`, `slippage_bps`
- `PRIVATE_KEY` or `KEYPAIR_PATH` environment variables
- Cron jobs or loop constructs with sleep intervals
- `jupiter-ag-sdk` or `@jup-ag/core` in package.json
- References to `bundleTransactions`, `sendBundle`, Jito tip accounts

**Common patterns:** Arbitrage across DEXs (multi-leg atomic swaps), sandwich detection avoidance or execution, token sniping on new launches (Pump.fun), flash loan integration (Kamino), price feed polling with Pyth oracle, WebSocket subscription to `logsSubscribe` or `programSubscribe`

**Key security concerns:**
- Private key or mnemonic stored in plaintext config file, environment variable, or hardcoded string (OC-001, OC-002, OC-003)
- No maximum trade size limit — a price feed glitch or manipulated oracle can cause the bot to submit a transaction that drains its entire wallet in one operation (OC-255)
- No circuit breaker or loss limit — runaway bots have lost entire fund allocations in minutes during volatile markets (OC-256)
- No kill switch / emergency shutdown mechanism — the bot cannot be halted without killing the process, which may leave in-flight transactions (OC-248)
- Hardcoded slippage tolerance (`slippage_bps: 9999`) makes every swap a sandwich attack target (OC-253, OC-258, OC-128, OC-129)
- Fee escalation in retry loop: each retry raises priority fee without a maximum cap, draining SOL in congested conditions (OC-250)
- Exchange API keys (Binance, Bybit, CEX APIs) stored with withdrawal permissions enabled — compromise allows direct fund extraction (OC-257)
- Oracle price staleness not checked: Pyth or Switchboard price confidence interval and `publish_time` must be validated before use (OC-254)
- Automated signing without human approval: bots can be tricked via manipulated price feeds into signing draining transactions (OC-246)
- Bot operating on stale slot data due to RPC lag — commitment level mismatch causes double-processing of already-settled events (OC-265, OC-116, OC-117)

**Relevant auditors:** BOT-01, BOT-02, BOT-03, SEC-01, CHAIN-01, CHAIN-02, CHAIN-04, CHAIN-05, ERR-01, ERR-02

---

### 4. Keeper / Crank Service

An off-chain automation service that monitors on-chain state and submits transactions to advance protocol state machines. Common in lending protocols (liquidations), AMMs (rebalancing), options protocols (settlement), and perpetuals (funding rate updates). Historically used Clockwork (now deprecated); modern alternatives include Tuktuk (Helium) and custom TypeScript daemons.

**Components:** Node.js or Rust daemon, @solana/web3.js, `programSubscribe` or polling loop, dedicated keeper keypair, PostgreSQL or Redis for tracking what has been processed, alerting (PagerDuty, Telegram bot)

**Detection signals:**
- `keeper/`, `crank/`, `liquidator/`, `settler/` directories
- Long-running main loop with `while (true)` or `setInterval`
- `logsSubscribe`, `programSubscribe`, `accountSubscribe` WebSocket calls
- Dedicated keypair for the keeper separate from admin keys
- `KEEPER_PRIVATE_KEY`, `KEEPER_KEYPAIR` env vars
- References to `liquidate`, `crank`, `settle`, `updateFundingRate` instructions
- Helm charts or systemd service files for persistent deployment

**Common patterns:** Fetch all accounts matching a filter, identify those meeting trigger conditions (unhealthy positions, expired options), submit instruction with keeper as fee payer, record processed accounts to avoid double-cranking, retry with exponential backoff on failure

**Key security concerns:**
- Keeper operating on stale slot data: if the keeper reads account state from an RPC node that is lagging, it may attempt to liquidate a position that has already been made healthy, wasting fees or worse triggering an on-chain error path (OC-265, OC-116)
- WebSocket reconnection loses events: when the WebSocket drops and reconnects, events emitted during the outage are never replayed — the keeper misses liquidation windows (OC-125)
- Cron job overlap: if two instances of the keeper run simultaneously (e.g., after a deploy without proper shutdown), both may submit the same instruction, causing double-processing (OC-264, OC-260)
- Non-idempotent processing: the keeper does not check whether a transaction was already submitted before retrying, leading to double-execution of irreversible state changes (OC-252)
- Commitment level mismatch: reading account state at `processed` but acting on it assumes the slot will not be reverted — use `confirmed` for reads that drive financial transactions (OC-117, OC-126)
- Missing reorg handling: a slot rollback invalidates processed events, but most keepers do not re-check accounts after a reorg (OC-124)
- No alerting: keeper silently fails due to RPC timeout; liquidatable positions accumulate and the protocol takes bad debt (OC-251)
- Keeper keypair stored insecurely — it typically needs SOL to pay fees, making it a partial fund-loss risk if compromised (OC-001, OC-002)

**Relevant auditors:** BOT-01, BOT-03, CHAIN-02, CHAIN-04, ERR-01, ERR-02, ERR-03, SEC-01

---

### 5. Python Data Pipeline / Indexer

An off-chain analytics or indexing service that ingests on-chain data, transforms it, and stores it in a data warehouse or serves it via API. Used for dashboards, analytics, ML trading features, and compliance reporting. Commonly uses Geyser plugins, Substreams (StreamingFast / The Graph), or direct RPC polling.

**Components:** Python (pandas, polars, asyncio), `solders` library (Rust-backed Solana bindings for Python), `solana-py`, PostgreSQL or ClickHouse or BigQuery, Kafka or Redis Streams for event queuing, Airflow or Prefect for scheduling, dbt for transformations

**Detection signals:**
- `requirements.txt` or `pyproject.toml` with `solders`, `solana`, `anchorpy`
- `airflow/`, `dags/`, `prefect/` directories
- `models/` with dbt SQL files
- `substreams.yaml` manifest file
- Python scripts named `indexer.py`, `pipeline.py`, `sync.py`
- Pickle files (`*.pkl`) for serialized data or models
- `.env` with `HELIUS_API_KEY`, `QUICKNODE_URL`, `DATABASE_URL`

**Common patterns:** Subscribe to Geyser plugin stream for real-time slot data, decode Anchor instruction data using IDL, write parsed events to PostgreSQL, serve aggregated data via FastAPI endpoint, schedule backfill jobs with Airflow DAGs

**Key security concerns:**
- Pickle/marshal deserialization for cached model objects or inter-process communication — a compromised cache allows RCE (OC-069)
- YAML config file loaded with `yaml.load()` (not `yaml.safe_load()`) enables code execution via specially crafted YAML (OC-068)
- FastAPI endpoints serving indexed data without authentication expose wallet balances, trade history, or position data (OC-040, OC-134)
- SQL injection via f-string interpolation into raw database queries (Psycopg2 `cursor.execute(f"SELECT ... {user_input}")`) (OC-049)
- Double-processing of blockchain events when the pipeline crashes mid-batch and restarts without an idempotency key, causing duplicate records or double-credited rewards (OC-123, OC-260)
- Missing reorg handling: Solana can roll back slots; an indexer that does not handle `blockNotification` with reorg signals writes incorrect historical state (OC-124)
- Sensitive data (wallet addresses, trade volumes) written to application logs without masking (OC-172, OC-182)
- Airflow DAG secrets (database passwords, API keys) visible in plain text in the Airflow web UI if variables are not stored in the Secrets Backend (OC-006, OC-157)

**Relevant auditors:** INJ-01, INJ-05, DATA-01, DATA-04, DATA-06, AUTH-03, CHAIN-04, BOT-03, ERR-01

---

### 6. React SPA + REST API

A fully separated frontend/backend where the React single-page application talks to a dedicated REST API. The SPA is served from a CDN. Common in older projects or where the team has dedicated frontend and backend engineers. Frequently seen in NFT marketplaces and GameFi projects.

**Components:** React (Vite, Create React App, or Parcel), React Query or SWR for data fetching, @solana/wallet-adapter-react, Axios or Fetch, Express/Fastify/NestJS backend, PostgreSQL, S3 for NFT/game assets

**Detection signals:**
- `vite.config.ts` or `react-scripts` in `package.json` (not `next`)
- `src/api/` or `src/services/` directory with Axios instances
- Separate `backend/` or `server/` directory
- `proxy` field in `package.json` pointing to localhost
- `REACT_APP_*` env vars (Create React App) or `VITE_*` vars (Vite)
- `@solana/wallet-adapter-react-ui` without any Next.js dependencies

**Common patterns:** All business logic in the REST API, React fetches data and renders, wallet connection in a React context provider, JWT stored in `localStorage` or `httpOnly` cookie, NFT metadata fetched from Arweave/IPFS via API proxy

**Key security concerns:**
- Auth token (JWT) stored in `localStorage` is accessible to any JavaScript on the page — XSS anywhere in the SPA exfiltrates the token (OC-187, OC-186)
- `REACT_APP_` or `VITE_` prefixed variables are embedded in the compiled JS bundle — any secret placed here (RPC auth, API keys) is publicly visible (OC-004)
- Client-side route guards (React Router `<PrivateRoute>`) are bypassed by calling the API directly — every API endpoint must enforce authorization server-side (OC-043, OC-205)
- Third-party scripts loaded without Subresource Integrity (SRI) hashes allow CDN compromise to inject wallet drainers into the page (OC-191, OC-193)
- `dangerouslySetInnerHTML` used to render NFT descriptions or user-supplied content creates stored XSS (OC-084, OC-082)
- `postMessage` handlers in wallet adapter code that do not check `event.origin` enable cross-origin injection (OC-087, OC-194)
- CORS: API configured with reflected `Origin` header (`res.setHeader('Access-Control-Allow-Origin', req.headers.origin)`) without an allowlist check (OC-089)

**Relevant auditors:** FE-01, FE-02, WEB-01, WEB-02, WEB-03, AUTH-01, AUTH-02, AUTH-03, CHAIN-03, INJ-01, DEP-01

---

### 7. Full-Stack Monorepo (Turborepo / Nx)

A monorepo containing multiple packages: Anchor program, Next.js web app, shared TypeScript types, React Native mobile app, and possibly a Node.js API. Common in mature protocols and VC-backed teams. Turborepo is favored in the Solana ecosystem (create-solana-dapp scaffold generates one).

**Components:** Turborepo or Nx, pnpm workspaces or Yarn workspaces, `apps/web` (Next.js), `apps/api` (Express/Fastify), `packages/program` (Anchor + Rust), `packages/sdk` (shared TypeScript SDK), `packages/ui` (shared component library)

**Detection signals:**
- `turbo.json` or `nx.json` at repo root
- `pnpm-workspace.yaml` or `workspaces` in root `package.json`
- `apps/` and `packages/` directories
- `create-solana-dapp` scaffold comment in README
- Multiple `package.json` files at different directory depths
- Shared `tsconfig.json` at root with `references`

**Common patterns:** Shared IDL types auto-generated from Anchor build, shared Zod schemas for API request/response validation across frontend and backend, centralized environment variable management with Turborepo pipelines

**Key security concerns:**
- Shared `packages/sdk` often contains the private key loading utilities — a supply chain compromise of this internal package affects every consuming app (OC-231, OC-236)
- A single leaked secret in any package's `.env` file can affect multiple apps if secrets are inadvertently shared through the monorepo's shared environment pipeline (OC-006, OC-010)
- Internal packages not published to npm can still be confused with public packages if the registry is misconfigured — dependency confusion risk (OC-237, OC-241)
- Build cache poisoning via Turborepo remote cache: if the remote cache endpoint is unauthenticated, an attacker with network access can inject malicious build artifacts (OC-217)
- Prototype pollution in shared deep-merge utilities used across multiple apps — a single vulnerable internal package affects the entire monorepo (OC-066)
- Workspace hoisting: `node_modules` at root may hoist a vulnerable transitive dependency shared across all apps, making the blast radius of a single CVE larger (OC-231, OC-233)
- Mobile app (`apps/mobile`) often has weaker secret management than web — `EXPO_PUBLIC_*` vars are embedded in the app bundle distributed via app stores (OC-004, OC-198)

**Relevant auditors:** DEP-01, SEC-01, SEC-02, INFRA-01, INFRA-02, INJ-05, FE-01, FE-03

---

### 8. Serverless (Vercel / AWS Lambda)

API logic deployed as serverless functions. Very common for Solana dApps using Next.js API routes on Vercel (which compile to Lambda@Edge or serverless functions), or for dedicated Lambda functions handling webhook processing, cron jobs via EventBridge, or background tasks.

**Components:** Vercel Functions or AWS Lambda, API Gateway, Next.js API routes or standalone TypeScript handlers, EventBridge or Vercel cron for scheduling, SQS or upstash-kafka for queuing, S3 for storage, Secrets Manager or Vercel environment variables for secrets

**Detection signals:**
- `vercel.json` with `functions` or `rewrites` configuration
- `serverless.yml` or `serverless.ts` (Serverless Framework)
- AWS CDK or SAM template with Lambda resources
- `handler.ts` or `handler.js` with `export const handler = async (event, context)`
- References to `@aws-sdk/client-s3`, `@aws-sdk/client-sqs`, `@aws-sdk/client-secrets-manager`
- `AWS_LAMBDA_FUNCTION_NAME` in environment variable references

**Common patterns:** Webhook handler deployed as Lambda triggered by API Gateway, cron-based keeper running as EventBridge-scheduled Lambda, signed URL generation for S3 uploads, fan-out processing via SQS

**Key security concerns:**
- SSRF to AWS metadata endpoint (`169.254.169.254` or `fd00:ec2::254`): if the Lambda accepts a user-supplied URL and fetches it, an attacker can retrieve the Lambda's IAM role credentials from the metadata service (OC-057)
- Over-permissive IAM role: Lambda execution role with `s3:*` or `secretsmanager:*` on `*` resources — compromise of the function grants full account access (OC-218)
- Secrets in Lambda environment variables visible in plain text via `aws lambda get-function-configuration` to anyone with the IAM permission (OC-002, OC-007)
- Cold start timing attacks: the first invocation initializes database connections and key material — timing differences can leak information (OC-031)
- Missing webhook signature verification on the Lambda handler — any IP can invoke the endpoint via the API Gateway URL (OC-144)
- Concurrent Lambda executions with shared mutable state (module-level variables) — Lambda reuses execution environments, so state from one invocation may bleed into another (OC-277)
- Function timeout handling: if the Lambda times out mid-transaction (e.g., while submitting a Solana transaction), the operation may partially complete but the function reports failure, causing double-submission on retry (OC-252, OC-272)
- Verbose error responses: unhandled exceptions propagate to the HTTP response body, leaking stack traces with internal paths and library versions (OC-132, OC-173)

**Relevant auditors:** INFRA-03, INJ-03, API-04, AUTH-03, ERR-01, ERR-02, SEC-02, DATA-04

---

## Framework-Specific Security Notes

### Next.js

**Server Actions (`"use server"` functions):**
- Server Actions are HTTP POST endpoints auto-generated by Next.js — they are not protected by middleware unless you explicitly check the session inside each action
- Do not assume that client-side UI guards (disabled buttons, hidden routes) protect server actions from direct invocation; any POST to the action URL will execute it
- Session checking must occur inside the action body: `const session = await auth(); if (!session) throw new Error("Unauthorized")`
- Server Actions are susceptible to CSRF if the application does not enforce `SameSite=Strict` or `Lax` cookies — Next.js does include origin checks for same-origin actions in v14+, but custom fetch-based callers bypass this
- Files written or read inside a server action using user-supplied paths are vulnerable to path traversal (OC-062, OC-063)

**API Routes (`pages/api/` or `app/api/route.ts`):**
- Each route file is a standalone endpoint — middleware in `middleware.ts` only runs for matched patterns; routes not covered by the matcher are unprotected
- Request body is not automatically limited in size — add `export const config = { api: { bodyParser: { sizeLimit: '1mb' } } }` (OC-135, OC-285)
- API routes execute in a Node.js runtime by default; edge runtime has different capabilities and limitations
- Never proxy user-controlled URLs via `fetch(req.body.url)` inside an API route — classic SSRF vector (OC-057, OC-058)

**Middleware (`middleware.ts`):**
- Middleware runs before authentication in the request lifecycle — do not put secrets or auth-dependent logic here unless you understand it runs on the edge
- Middleware path matching with regex or glob patterns can be bypassed via URL encoding or double-slash normalization; test patterns thoroughly
- Middleware cannot reliably protect API routes if the API gateway or CDN in front of Vercel allows direct Lambda invocation bypassing the middleware layer

**`next.config.*` security relevant settings:**
- `headers()` function: use to set CSP, HSTS, X-Frame-Options, X-Content-Type-Options
- `images.domains` or `images.remotePatterns`: overly broad patterns (e.g., `**`) allow image SSRF via the Next.js image optimization proxy (OC-057)
- `rewrites()`: can inadvertently expose internal services if rewrite targets are derived from user input

---

### Express.js

- Middleware ordering is critical: `express-session` must come before route handlers; `cors()` must come before other middleware to correctly handle preflight requests
- `express.json()` body parser has a default size limit of 100kb — increase with `{ limit: '10mb' }` only if needed, and document why
- `req.body` fields should be validated with a schema validator (Zod, Joi, Ajv) before use — mass assignment attacks occur when ORM `.create(req.body)` is called directly (OC-131)
- `res.send(err.message)` in error handlers leaks internal error details; use a generic response and log the full error server-side (OC-132, OC-173)
- `app.set('trust proxy', 1)` is required when behind a load balancer or reverse proxy for correct IP detection in rate limiters; incorrect trust proxy settings allow IP spoofing to bypass rate limits
- `helmet()` should be applied globally early in the middleware chain — it sets `Content-Security-Policy`, `X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security`
- Route parameter injection: `router.get('/users/:id', ...)` where `:id` is passed to a database query without validation can be a NoSQL operator injection vector in MongoDB (OC-051)

---

### FastAPI (Python)

- Pydantic models validate request bodies by default, but `orm_mode = True` or `from_orm()` with SQLAlchemy models can expose fields not intended for the API response (OC-134)
- Dependency injection for authentication (`Depends(get_current_user)`) must be applied to every protected route — FastAPI does not apply dependencies globally by default
- Background tasks (`BackgroundTasks`) run in the same process — a long-running background task blocks the event loop in some configurations; use a task queue (Celery, ARQ) for heavy work
- `FileResponse` or `StreamingResponse` with user-controlled paths enables path traversal (OC-062)
- Debug mode (`debug=True` in Uvicorn) exposes full stack traces and interactive debugger in HTTP responses (OC-174)
- CORS: `allow_origins=["*"]` with `allow_credentials=True` is rejected by browsers per spec but can still be set — set an explicit origin allowlist (OC-088)
- `pickle.loads()` used for caching serialized Python objects enables RCE if cache (Redis) is compromised (OC-069)

---

## Database Patterns

### PostgreSQL with Prisma
- **Detection:** `prisma/schema.prisma`, `@prisma/client` in `package.json`, `prisma migrate` commands in scripts
- **Security concerns:** `$queryRaw` with template literal interpolation instead of `$queryRaw(Prisma.sql\`...\`)` introduces SQL injection (OC-049, OC-050); `$executeRaw` similarly; ensure database user has only SELECT/INSERT/UPDATE on application tables, not DDL privileges; enable SSL (`sslmode=require`) in `DATABASE_URL` (OC-156); connection string in `.env` must not be committed (OC-006, OC-157)

### PostgreSQL with Drizzle
- **Detection:** `drizzle.config.ts`, `drizzle-orm` in `package.json`, `drizzle/` migration directory
- **Security concerns:** `sql` tagged template literal with string interpolation (`sql\`SELECT * FROM ${tableName}\``) is vulnerable; use parameterized helpers; same connection string and SSL concerns as Prisma

### MongoDB
- **Detection:** `mongoose` or `mongodb` in `package.json`, `mongoose.connect()` calls, schema files with `mongoose.Schema`
- **Security concerns:** NoSQL operator injection via `req.body` passed directly to `.find(req.body)` — an attacker supplies `{ "$gt": "" }` as a field value to bypass equality checks (OC-051, OC-052); disable `mongoose` strict mode carefully; connection string with credentials must not be committed; enable auth on the MongoDB instance (OC-162 analog)

### Redis (caching + sessions)
- **Detection:** `ioredis` or `redis` in `package.json`, `REDIS_URL` in env vars, `connect-redis` for session storage
- **Security concerns:** Redis deployed without authentication (`requirepass`) or with no TLS — on cloud deployments, ensure the security group restricts Redis to only the application server (OC-162); session keys derived from predictable values enable session fixation (OC-032, OC-165); sensitive data (wallet addresses, balances) stored in Redis without TTL may be exposed after a cache compromise (OC-164); `KEYS *` pattern in production causes full keyspace scans that block the server (OC-282 analog)

### Supabase
- **Detection:** `@supabase/supabase-js` in `package.json`, `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` env vars, `supabase/` directory with migrations
- **Security concerns:** Row Level Security (RLS) must be enabled on every table — Supabase tables are accessible via the REST API using the `anon` key by default; missing RLS policies expose all rows to unauthenticated users (OC-040, OC-041); `NEXT_PUBLIC_SUPABASE_ANON_KEY` is intentionally public but `SUPABASE_SERVICE_ROLE_KEY` must never be exposed client-side — it bypasses all RLS (OC-004, OC-042); Supabase Edge Functions share the same auth context concerns as serverless functions

---

## Authentication Patterns

### JWT + Wallet Signature (Sign-In with Solana)
The user signs a server-issued message with their Solana wallet (Phantom, Backpack, Solflare). The server verifies the signature using `@solana/web3.js` `nacl.sign.detached.verify()` or the `tweetnacl` library and issues a JWT.

**Security requirements:**
- The message must include a server-generated nonce (random, single-use) to prevent replay attacks — nonces must be stored server-side and invalidated after use (OC-121, OC-119)
- The message must include the domain, statement, URI, version, chain ID, nonce, and issued-at timestamp per the SIWS (EIP-4361 adapted) specification
- Signature verification must use constant-time comparison — `nacl.sign.detached.verify()` is constant-time; avoid manual byte comparison (OC-291)
- JWT must include `exp` (expiry), `iss` (issuer), `aud` (audience) and all three must be validated on every request (OC-023, OC-024)
- JWT secret must be cryptographically random (32+ bytes), stored only in server-side environment variables, and rotated on compromise (OC-022)
- Refresh token rotation: on each refresh, the old token must be invalidated — reuse without rotation allows long-lived session persistence after token theft (OC-046)

### NextAuth / Auth.js
- **Detection:** `next-auth` or `@auth/core` in `package.json`, `app/api/auth/[...nextauth]/route.ts`, `NEXTAUTH_SECRET` in env
- **Security concerns:** `NEXTAUTH_SECRET` must be set in production — without it, sessions are signed with an insecure default; OAuth `state` parameter must not be disabled (it prevents CSRF during the OAuth flow) (OC-028); custom callbacks that modify session data must re-validate user roles from the database on each request rather than trusting the JWT claims blindly (OC-042, OC-044); `trustHost: true` should only be set when running behind a trusted reverse proxy

### Session-Based Auth
- **Detection:** `express-session`, `connect-pg-simple`, `connect-redis` in `package.json`
- **Security concerns:** Session cookies must have `httpOnly: true`, `secure: true`, `sameSite: 'strict'` (OC-034, OC-035, OC-036); session must be regenerated after login to prevent session fixation (OC-032); session must be destroyed server-side on logout — client-side cookie deletion is not sufficient (OC-037); session secret must be high-entropy and not committed to source control (OC-022 analog)

---

## RPC and Indexer Patterns

### Helius
- **Primary use cases:** Enhanced transaction history API, Digital Asset Standard (DAS) API for NFT/token data, Webhooks for real-time on-chain event delivery
- **Detection signals:** `HELIUS_API_KEY` or `HELIUS_RPC_URL` in env vars, `helius-sdk` in `package.json`, webhook handler routes checking `x-helius-signature` or similar header
- **Security concerns:** Webhook signature verification is mandatory — Helius signs webhook payloads with an HMAC; the application must verify the header before processing any funds-related logic (OC-144); webhooks can be replayed — check the `timestamp` field in the payload and reject events older than a few minutes (OC-145); webhook delivery is at-least-once — the handler must be idempotent using the transaction signature as a deduplication key (OC-146, OC-123); the API key in `HELIUS_API_KEY` grants access to RPC and enhanced APIs — treat it as a secret, never expose it client-side via `NEXT_PUBLIC_` (OC-004, OC-005)

### QuickNode
- **Primary use cases:** Solana RPC with Marketplace add-ons (streaming, price feeds), dedicated nodes for low-latency trading
- **Detection signals:** `QUICKNODE_URL` or `QUICKNODE_RPC_URL` in env vars, URL format `https://<name>.solana-mainnet.quiknode.pro/<token>/`
- **Security concerns:** The RPC URL contains the API token as a path component — logging the RPC URL exposes the token (OC-011, OC-172); dedicated node endpoints should be restricted by IP allowlist in the QuickNode dashboard; if the application proxies RPC calls on behalf of users, validate that users cannot supply custom program IDs or account keys that trigger unintended lookups (OC-057 analog)

### Triton (formerly GenesysGo / Triton One)
- **Primary use cases:** High-performance dedicated Solana RPC with Geyser plugin streaming for real-time data pipelines
- **Detection signals:** `TRITON_RPC_URL`, `triton` in env var names, Geyser plugin configuration files
- **Security concerns:** Geyser plugin streams are high-volume and typically unauthenticated at the plugin level — the consuming application must authenticate access to the stream endpoint; if Geyser data is stored in a message queue (Kafka, SQS), the queue must require authentication (OC-261); Geyser events do not include reorg handling — the consumer must detect slot rollbacks and reprocess affected slots (OC-124)

### Custom Geyser Plugins
- **Primary use cases:** Protocol-specific on-chain event indexing, high-frequency data capture beyond what commercial RPC providers expose
- **Detection signals:** Rust crate with `GeyserPlugin` trait implementation, `--geyser-plugin-config` in validator arguments, custom plugin config YAML
- **Security concerns:** Geyser plugins run in the validator process — a bug in the plugin can crash the validator; the plugin's network-facing output (gRPC, Kafka) must be authenticated; the plugin config file contains connection strings and credentials that must be secured with file permissions (OC-006 analog); plugins that write to PostgreSQL directly must use parameterized queries (OC-049)

---

## Deployment Patterns

### Vercel
- **Detection signals:** `vercel.json`, `.vercel/` directory, `VERCEL_URL` env var, Vercel GitHub integration in CI
- **Security concerns:** Environment variables set as "Plain Text" in the Vercel dashboard are visible to all team members with project access — use "Secret" type for sensitive values; `Preview` deployments inherit production environment variables by default unless restricted — a PR from a fork could access production secrets via the CI pipeline (OC-213, OC-214); Vercel edge middleware runs on a globally distributed network — do not assume traditional IP-based rate limiting will work correctly; Vercel deployment URLs (`*.vercel.app`) are discoverable — do not rely on obscurity for staging environment security

### Railway / Render
- **Detection signals:** `railway.json`, `render.yaml`, `Procfile`
- **Security concerns:** `Procfile` and `railway.json` may contain startup commands that expose environment variables in process arguments (visible via `/proc/cmdline`); private services on Railway are network-isolated but public services expose all ports on the deployment URL — do not deploy admin services on public ports; auto-deploy from any pushed branch can deploy unreviewed code to production (OC-214)

### AWS ECS / EKS
- **Detection signals:** `task-definition.json`, `ecs-params.yml`, Kubernetes manifests in `k8s/` or `infra/`, Terraform/CDK with ECS resources
- **Security concerns:** ECS task roles should follow least privilege — a task requiring only `s3:GetObject` on a specific bucket should not have an `s3:*` wildcard (OC-218); secrets in ECS task definitions as plain text environment variables are visible via `DescribeTaskDefinition` — use AWS Secrets Manager or SSM Parameter Store with `valueFrom` references (OC-002, OC-220); Kubernetes Secrets are base64-encoded, not encrypted by default — enable envelope encryption with KMS; pods running as root with hostPID or hostNetwork access can escape the container (OC-206, OC-210)

### Docker Compose
- **Detection signals:** `docker-compose.yml` or `docker-compose.yaml`, `compose.yml`, `.env` file adjacent to compose file
- **Security concerns:** `.env` file read by Docker Compose contains all secrets — it is frequently committed to git by mistake (OC-006); services defined in compose with `ports: "0.0.0.0:5432:5432"` expose the database publicly on all interfaces — use `127.0.0.1:5432:5432` for local-only binding; `privileged: true` in a service definition grants the container full host access (OC-210); secrets passed as build args (`ARG PRIVATE_KEY`) are embedded in image layers and visible in `docker history` (OC-007, OC-207); compose files in CI that use `env_file: .env.production` and commit the env file expose production credentials in CI logs (OC-008, OC-213)
