# AI-Generated Code Pitfalls: Secrets & Credentials
<!-- Domain: secrets -->
<!-- Relevant auditors: SEC-01, SEC-02 -->

## Overview

AI code generators (Copilot, ChatGPT, Claude, Cursor) are particularly bad at secret handling because they are trained on millions of code examples where secrets are embedded inline for simplicity. LLMs optimize for "code that works" — and the fastest way to make code work is to put the credential right where it is used. Research by GitGuardian (March 2025) confirmed that GitHub Copilot can leak real, valid secrets from its training data when prompted. Wiz Research (2025) documented that AI-assisted development is accelerating secret exposure patterns. Apiiro's 2025 analysis found that over 40% of AI-generated code contains vulnerabilities, with hardcoded credentials being a leading category.

The core problem: AI generators have no concept of a threat model, no awareness of deployment context, and no understanding that a "working example" becomes a production liability. Developers who trust AI output without security review propagate these patterns directly into codebases.

## Pitfalls

### AIP-001: Inline Private Key for "Quick Start" Code
**Frequency:** Frequent
**Why AI does this:** Training data is saturated with tutorials and examples that embed keypairs inline. When asked to "create a Solana bot" or "sign a transaction," the model produces the most common pattern it has seen — a hardcoded Uint8Array or base58 string. The model cannot distinguish between tutorial code and production code.
**What to look for:**
- `Keypair.fromSecretKey(Uint8Array.from([...])`
- `bs58.decode("5KJx...")`
- Byte arrays of exactly 64 elements (Solana keypair size)

**Vulnerable (AI-generated):**
```typescript
import { Keypair } from "@solana/web3.js";

const wallet = Keypair.fromSecretKey(
  Uint8Array.from([
    174, 47, 154, 16, 202, 193, 206, 113, 199, 190, 53, 133,
    // ... 64 bytes total
  ])
);
```

**Secure (corrected):**
```typescript
import { Keypair } from "@solana/web3.js";
import { readFileSync } from "fs";

const wallet = Keypair.fromSecretKey(
  Uint8Array.from(
    JSON.parse(readFileSync(process.env.KEYPAIR_PATH!, "utf-8"))
  )
);
```

### AIP-002: API Key Directly in fetch/axios Call
**Frequency:** Frequent
**Why AI does this:** When generating HTTP request code, models inline the API key in the header or URL because that is the pattern in API documentation examples. The model does not suggest environment variables unless explicitly asked. Cyble Research (February 2026) found 3,000+ production websites with AI-model API keys embedded in client-side JavaScript.
**What to look for:**
- `Authorization: "Bearer sk-..."` with literal string
- `"x-api-key": "..."` with literal string
- API keys in URL template literals

**Vulnerable (AI-generated):**
```typescript
const response = await fetch("https://api.openai.com/v1/chat/completions", {
  headers: {
    "Authorization": "Bearer sk-proj-abc123def456...",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ model: "gpt-4", messages }),
});
```

**Secure (corrected):**
```typescript
const response = await fetch("https://api.openai.com/v1/chat/completions", {
  headers: {
    "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ model: "gpt-4", messages }),
});
```

### AIP-003: process.env Secret Used in NEXT_PUBLIC_ or VITE_ Variable
**Frequency:** Common
**Why AI does this:** When generating Next.js or Vite code, models use the framework's public environment variable prefix (NEXT_PUBLIC_, VITE_) for all config including secrets, because that is the simplest way to make the variable accessible in the component. The model does not understand that these prefixes expose values to the client-side bundle.
**What to look for:**
- `NEXT_PUBLIC_SECRET`, `NEXT_PUBLIC_PRIVATE_KEY`, `NEXT_PUBLIC_API_SECRET`
- `VITE_SECRET_KEY`, `VITE_ADMIN_PASSWORD`
- `REACT_APP_SECRET` (Create React App equivalent)

**Vulnerable (AI-generated):**
```typescript
// .env
NEXT_PUBLIC_ALCHEMY_SECRET=your-secret-key-here
NEXT_PUBLIC_ADMIN_PRIVATE_KEY=5KJxo9...

// Component
const connection = new Connection(
  `https://solana-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_SECRET}`
);
```

**Secure (corrected):**
```typescript
// .env (server-only — no NEXT_PUBLIC_ prefix)
ALCHEMY_SECRET=your-secret-key-here

// API route (server-side only: app/api/rpc/route.ts)
export async function POST(req: Request) {
  const connection = new Connection(
    `https://solana-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_SECRET}`
  );
  // ... handle request server-side
}
```

### AIP-004: .env File Without .gitignore Entry
**Frequency:** Common
**Why AI does this:** When AI generates project scaffolding or setup instructions, it creates a `.env` file with real-looking placeholder values but does not always generate or update the `.gitignore` file. Even when it does, it may create `.env.example` with instructions to "copy to .env and fill in values" but populate the example with working credentials.
**What to look for:**
- `.env` files tracked by git (`git ls-files | grep .env`)
- `.gitignore` missing `.env` entries
- `.env.example` with real-looking values (not placeholders)

**Vulnerable (AI-generated):**
```bash
# AI-generated setup instructions:
# "Create a .env file with the following:"
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/myapp
JWT_SECRET=my-super-secret-jwt-key-12345
SOLANA_PRIVATE_KEY=[1,2,3,4,5...]
# No mention of .gitignore
```

**Secure (corrected):**
```bash
# .gitignore (created FIRST, before any .env file)
.env
.env.*
!.env.example

# .env.example (placeholders only)
DATABASE_URL=postgresql://user:password@host:5432/dbname
JWT_SECRET=<generate-with: openssl rand -hex 32>
SOLANA_PRIVATE_KEY=<path-to-keypair-file>
```

### AIP-005: Plaintext Password Storage Instead of Hashing
**Frequency:** Common
**Why AI does this:** When generating user registration code, models often store the password field directly from the request body into the database without hashing. The model produces the shortest path to "working code" — and plaintext storage works perfectly in testing. Some models add bcrypt only when explicitly asked about "secure password storage."
**What to look for:**
- `user.password = req.body.password` without hashing
- `prisma.user.create({ data: { password } })` with raw password
- Absence of bcrypt/argon2/scrypt imports in auth modules

**Vulnerable (AI-generated):**
```typescript
app.post("/register", async (req, res) => {
  const { email, password } = req.body;
  const user = await prisma.user.create({
    data: { email, password }, // Stored as plaintext
  });
  res.json({ id: user.id });
});
```

**Secure (corrected):**
```typescript
import argon2 from "argon2";

app.post("/register", async (req, res) => {
  const { email, password } = req.body;
  const hashedPassword = await argon2.hash(password, { type: argon2.argon2id });
  const user = await prisma.user.create({
    data: { email, password: hashedPassword },
  });
  res.json({ id: user.id });
});
```

### AIP-006: Database Connection String with Embedded Credentials
**Frequency:** Frequent
**Why AI does this:** Models generate database connection strings with credentials inline because that is the format shown in every database driver's documentation. The pattern `postgresql://user:password@host/db` is the most common example in training data. The model rarely suggests using separate credential management.
**What to look for:**
- `mongodb://admin:password@` in source files
- `postgresql://user:pass@` hardcoded
- `mysql://root:` in configuration

**Vulnerable (AI-generated):**
```typescript
import { PrismaClient } from "@prisma/client";

// AI generates the connection directly in code
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://admin:s3cur3_p4ss@prod-db.example.com:5432/myapp?sslmode=require"
    }
  }
});
```

**Secure (corrected):**
```typescript
import { PrismaClient } from "@prisma/client";

// Connection URL from environment variable only
// .env: DATABASE_URL=postgresql://...
const prisma = new PrismaClient();
// Prisma reads DATABASE_URL from environment automatically
```

### AIP-007: Secret in Docker ENV/ARG Instead of Secret Mount
**Frequency:** Common
**Why AI does this:** When generating Dockerfiles, models use `ARG` and `ENV` to pass secrets because these are simpler syntax than BuildKit secret mounts. Training data contains vastly more examples of `ARG SECRET_KEY` than `RUN --mount=type=secret`. The model produces the pattern that appears most frequently in its training set.
**What to look for:**
- `ARG` with secret-sounding names in Dockerfiles
- `ENV` with credential values in Dockerfiles
- `--build-arg` with secrets in docker-compose or CI scripts

**Vulnerable (AI-generated):**
```dockerfile
FROM node:20-alpine
ARG DATABASE_PASSWORD
ARG NPM_TOKEN
ENV DATABASE_URL=postgresql://admin:${DATABASE_PASSWORD}@db:5432/app
RUN echo "//registry.npmjs.org/:_authToken=${NPM_TOKEN}" > .npmrc && \
    npm install && rm .npmrc
```

**Secure (corrected):**
```dockerfile
# syntax=docker/dockerfile:1
FROM node:20-alpine
RUN --mount=type=secret,id=npm_token \
    NPM_TOKEN=$(cat /run/secrets/npm_token) && \
    echo "//registry.npmjs.org/:_authToken=${NPM_TOKEN}" > .npmrc && \
    npm install && rm .npmrc
# Runtime secrets via Docker Swarm secrets or external vault
```

### AIP-008: console.log of Secret Values for "Debugging"
**Frequency:** Common
**Why AI does this:** When generating code with troubleshooting steps or when a user asks "why isn't my API call working," models add `console.log` statements that print secret values. The model treats all variables equally — it does not distinguish between a debug message and a secret exfiltration risk. These log statements are often left in production code.
**What to look for:**
- `console.log` with variables named key, secret, token, password
- `console.log("API Key:", ...)` or `console.log("Config:", config)`
- `JSON.stringify(process.env)` in logging statements

**Vulnerable (AI-generated):**
```typescript
async function connectToExchange() {
  const apiKey = process.env.EXCHANGE_API_KEY;
  const secret = process.env.EXCHANGE_SECRET;
  console.log("Connecting with key:", apiKey, "secret:", secret);
  // Debug logging that ends up in production logs, CI output, etc.
  return new Exchange({ apiKey, secret });
}
```

**Secure (corrected):**
```typescript
async function connectToExchange() {
  const apiKey = process.env.EXCHANGE_API_KEY;
  const secret = process.env.EXCHANGE_SECRET;
  if (!apiKey || !secret) throw new Error("Exchange credentials not configured");
  console.log("Connecting to exchange..."); // Log intent, never credentials
  return new Exchange({ apiKey, secret });
}
```

### AIP-009: Math.random() for Token/Key Generation
**Frequency:** Occasional
**Why AI does this:** When asked to generate tokens, session IDs, or temporary keys, models sometimes use `Math.random()` because it is the most commonly seen random function in JavaScript training data. The model does not reliably distinguish between contexts requiring cryptographic randomness and those where pseudo-randomness suffices.
**What to look for:**
- `Math.random().toString(36)` for tokens or keys
- `Math.random()` in any security-sensitive generation
- Absence of `crypto.randomBytes` or `crypto.randomUUID`

**Vulnerable (AI-generated):**
```typescript
function generateApiKey(): string {
  return "sk_" + Math.random().toString(36).substring(2) +
    Math.random().toString(36).substring(2);
}

function generateSessionToken(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
```

**Secure (corrected):**
```typescript
import { randomBytes, randomUUID } from "crypto";

function generateApiKey(): string {
  return "sk_" + randomBytes(32).toString("hex");
}

function generateSessionToken(): string {
  return randomUUID(); // Or: randomBytes(32).toString('base64url')
}
```

### AIP-010: Fallback to Default Secret When Env Var Is Missing
**Frequency:** Common
**Why AI does this:** Models generate defensive code with fallback values using the `||` or `??` operator. When applied to secrets, this creates a default credential that will be used if the environment variable is not set — which often happens in new deployments, container restarts, or CI environments. The fallback value becomes a backdoor.
**What to look for:**
- `process.env.JWT_SECRET || "default"` or `?? "fallback"`
- `process.env.API_KEY || "test-key"` patterns
- Any `||` or `??` with a string literal for secret-type variables

**Vulnerable (AI-generated):**
```typescript
const JWT_SECRET = process.env.JWT_SECRET || "super-secret-jwt-key";
const DB_PASSWORD = process.env.DB_PASSWORD ?? "postgres";
const API_KEY = process.env.API_KEY || "sk-test-12345";

// If env vars are not set, the application runs with known default secrets
// An attacker who reads the source code knows the actual production secret
```

**Secure (corrected):**
```typescript
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Required environment variable ${name} is not set`);
  }
  return value;
}

const JWT_SECRET = requireEnv("JWT_SECRET");
const DB_PASSWORD = requireEnv("DB_PASSWORD");
const API_KEY = requireEnv("API_KEY");
// Application fails fast if secrets are not properly configured
```
