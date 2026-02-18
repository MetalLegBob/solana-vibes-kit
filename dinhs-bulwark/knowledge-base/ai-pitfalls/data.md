# AI-Generated Code Pitfalls: Data Security
<!-- Domain: data -->
<!-- Relevant auditors: DATA-01, DATA-02, DATA-03, DATA-04, DATA-05, DATA-06 -->

## Overview

AI code generators produce data handling code that consistently fails on security fundamentals. When asked to "connect to a database," "cache user data," "handle file uploads," or "encrypt a field," LLMs generate the simplest working code from their training data — which overwhelmingly consists of tutorials, Stack Overflow answers, and README examples where security is an afterthought. The result is code that functions correctly in development but creates severe vulnerabilities in production.

The core pattern is that AI generators do not understand deployment context: a database connection works the same whether TLS is on or off, encryption looks correct whether the key is hardcoded or loaded from a vault, and a file upload handler functions whether it validates types or not. Since the AI's feedback loop is "does this code compile and run," security properties are systematically omitted. Research by Apiiro (2025) found over 40% of AI-generated code contains vulnerabilities, and Snyk's 2024 analysis confirmed that AI assistants frequently produce code with known insecure patterns for data handling.

## Pitfalls

### AIP-079: Database Connection Without TLS Configuration
**Frequency:** Very Frequent
**Why AI does this:** Tutorial-quality database connection code almost never includes TLS configuration because localhost development does not require it. When asked "how to connect to PostgreSQL with Node.js," AI produces a minimal `new Pool()` with host/user/password/database but omits the `ssl` block entirely. The connection works, so the AI considers it correct.
**What to look for:**
- `new Pool({...})` or `mongoose.connect()` without `ssl` or `tls` options
- Connection strings (`postgres://`, `mongodb://`) without `?ssl=true` or `?tls=true`
- `rejectUnauthorized: false` disabling certificate validation

**Vulnerable (AI-generated):**
```typescript
import { Pool } from "pg";

const pool = new Pool({
  host: "db.production.example.com",
  user: "app_user",
  password: process.env.DB_PASSWORD,
  database: "myapp",
});
```

**Secure (corrected):**
```typescript
import { Pool } from "pg";
import { readFileSync } from "fs";

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: {
    rejectUnauthorized: true,
    ca: readFileSync(process.env.DB_CA_CERT!).toString(),
  },
});
```

### AIP-080: Redis Connection Without Authentication
**Frequency:** Very Frequent
**Why AI does this:** Redis tutorials universally show `new Redis("redis://localhost:6379")` without authentication because local Redis instances default to no password. AI models reproduce this pattern for all contexts. The CVE-2025-49844 (CVSS 10.0) Redis RCE demonstrated that unauthenticated Redis is a critical risk.
**What to look for:**
- `new Redis()` or `createClient()` without `password` option
- Redis URLs without credentials (`redis://host:6379` instead of `redis://:password@host:6379`)
- Missing `tls` configuration for Redis connections

**Vulnerable (AI-generated):**
```typescript
import Redis from "ioredis";

const redis = new Redis({
  host: "cache.production.internal",
  port: 6379,
});
```

**Secure (corrected):**
```typescript
import Redis from "ioredis";

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: 6380,
  password: process.env.REDIS_PASSWORD,
  tls: { rejectUnauthorized: true },
});
```

### AIP-081: Logging Entire Request Body (Leaks Passwords and PII)
**Frequency:** Very Frequent
**Why AI does this:** When asked to "add logging to an Express handler," AI generates `console.log(req.body)` or `logger.info("Request", { body: req.body })` because logging the full request is the most helpful for debugging. The model does not distinguish between login endpoints (where `req.body` contains passwords) and other endpoints.
**What to look for:**
- `console.log(req.body)` or `logger.info(..., { body: req.body })`
- `JSON.stringify(req)` or `JSON.stringify(req.headers)` in log statements
- Error handlers that log `err` objects containing user data

**Vulnerable (AI-generated):**
```typescript
app.post("/auth/login", async (req, res) => {
  console.log("Login request:", req.body);
  // Output: Login request: { email: "user@example.com", password: "secret123" }
  const user = await authenticate(req.body.email, req.body.password);
  res.json({ token: user.token });
});
```

**Secure (corrected):**
```typescript
app.post("/auth/login", async (req, res) => {
  logger.info("Login attempt", { email: req.body.email }); // Only log non-sensitive fields
  const user = await authenticate(req.body.email, req.body.password);
  logger.info("Login successful", { userId: user.id });
  res.json({ token: user.token });
});
```

### AIP-082: File Upload Without Type or Size Validation
**Frequency:** Frequent
**Why AI does this:** When asked to "add file upload to Express," AI generates a minimal multer setup with `dest: "uploads/"` and no `fileFilter` or `limits`. The model focuses on making the upload functional, not secure. The resulting code accepts any file type of any size.
**What to look for:**
- `multer({ dest: "..." })` without `fileFilter` or `limits`
- Upload destinations inside `public/` or `static/` directories
- Original filename used without sanitization

**Vulnerable (AI-generated):**
```typescript
import multer from "multer";

const upload = multer({ dest: "public/uploads/" });

app.post("/upload", upload.single("file"), (req, res) => {
  res.json({ url: `/uploads/${req.file!.originalname}` });
});
```

**Secure (corrected):**
```typescript
import multer from "multer";
import crypto from "crypto";
import { fileTypeFromBuffer } from "file-type";

const ALLOWED = new Set(["image/jpeg", "image/png", "application/pdf"]);

const upload = multer({
  dest: "/tmp/uploads/",
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if ([".jpg", ".jpeg", ".png", ".pdf"].includes(ext)) cb(null, true);
    else cb(new Error("Invalid file type"));
  },
});

app.post("/upload", upload.single("file"), async (req, res) => {
  const buffer = await fs.readFile(req.file!.path);
  const type = await fileTypeFromBuffer(buffer);
  if (!type || !ALLOWED.has(type.mime)) {
    await fs.unlink(req.file!.path);
    return res.status(400).json({ error: "Invalid file" });
  }
  const safeName = `${crypto.randomUUID()}.${type.ext}`;
  // Move to non-public directory, serve via controlled handler
});
```

### AIP-083: AES Encryption with ECB Mode or Hardcoded Key
**Frequency:** Frequent
**Why AI does this:** When asked to "encrypt data in Node.js," AI frequently produces code using `crypto.createCipher()` (deprecated, uses ECB-like behavior) or `crypto.createCipheriv("aes-256-cbc", ...)` with a hardcoded key and IV. Training data is full of simplified encryption examples where the key is a literal string.
**What to look for:**
- `crypto.createCipher()` (deprecated API)
- `crypto.createCipheriv("aes-256-ecb", ...)`
- `Buffer.from("my-secret-key-here")` as encryption key
- `Buffer.alloc(16)` or `Buffer.from("0000000000000000")` as IV

**Vulnerable (AI-generated):**
```typescript
import crypto from "crypto";

const key = Buffer.from("my-secret-encryption-key-32bytes!", "utf8");
const iv = Buffer.alloc(16, 0);

function encrypt(text: string): string {
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  return cipher.update(text, "utf8", "hex") + cipher.final("hex");
}
```

**Secure (corrected):**
```typescript
import crypto from "crypto";

function encrypt(plaintext: string): string {
  const key = Buffer.from(process.env.ENCRYPTION_KEY!, "hex");
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${enc.toString("hex")}`;
}
```

### AIP-084: S3 Upload with Public ACL
**Frequency:** Frequent
**Why AI does this:** Many AI-generated S3 upload examples include `ACL: "public-read"` because the training data contains countless tutorials where the goal is to generate a public URL. The model does not understand that production uploads should be private with presigned URLs for access.
**What to look for:**
- `ACL: "public-read"` or `ACL: "public-read-write"` in PutObject
- Missing `ServerSideEncryption` parameter
- Long-lived presigned URLs (> 1 hour expiry)

**Vulnerable (AI-generated):**
```typescript
await s3.send(new PutObjectCommand({
  Bucket: "my-bucket",
  Key: `uploads/${filename}`,
  Body: fileBuffer,
  ACL: "public-read",
  ContentType: file.mimetype,
}));
return `https://my-bucket.s3.amazonaws.com/uploads/${filename}`;
```

**Secure (corrected):**
```typescript
await s3.send(new PutObjectCommand({
  Bucket: process.env.S3_BUCKET!,
  Key: `uploads/${crypto.randomUUID()}-${sanitizedName}`,
  Body: fileBuffer,
  ContentType: file.mimetype,
  ServerSideEncryption: "aws:kms",
}));
// Generate short-lived presigned URL for access
const url = await getSignedUrl(s3, new GetObjectCommand({
  Bucket: process.env.S3_BUCKET!, Key: key,
}), { expiresIn: 300 });
```

### AIP-085: Sensitive Data in Cache Without TTL
**Frequency:** Frequent
**Why AI does this:** When caching query results, AI generates `redis.set(key, value)` without a TTL argument because the simplest `set` call is a two-argument form. Session tokens, user profiles, and payment data are cached indefinitely, violating data minimization and creating unbounded cache growth.
**What to look for:**
- `redis.set(key, value)` with only two arguments (no `"EX"` TTL)
- Session data cached without expiration
- PII stored in cache keys or values

**Vulnerable (AI-generated):**
```typescript
async function cacheUser(userId: string, user: User) {
  await redis.set(`user:${userId}`, JSON.stringify(user));
}
```

**Secure (corrected):**
```typescript
async function cacheUser(userId: string, user: User) {
  const safeData = { id: user.id, name: user.name, role: user.role };
  await redis.set(`user:${userId}`, JSON.stringify(safeData), "EX", 300);
}
```

### AIP-086: Stack Traces Sent in API Error Responses
**Frequency:** Very Frequent
**Why AI does this:** AI-generated error handlers consistently include `err.message` and `err.stack` in the JSON response because this is the most "helpful" debugging pattern. The model does not distinguish between development and production error handling.
**What to look for:**
- `res.status(500).json({ error: err.message, stack: err.stack })`
- Catch blocks that forward raw error objects to the response
- Missing `NODE_ENV` checks in error handlers

**Vulnerable (AI-generated):**
```typescript
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  res.status(500).json({
    message: err.message,
    stack: err.stack,
  });
});
```

**Secure (corrected):**
```typescript
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  const errorId = crypto.randomUUID();
  logger.error("Unhandled error", { errorId, error: err });
  res.status(500).json({ error: "Internal server error", errorId });
});
```

### AIP-087: PII Fields as Plain String Types in Database Schema
**Frequency:** Frequent
**Why AI does this:** When generating database schemas or ORM models, AI defines all fields as plain String/Text types including SSN, credit card numbers, and health data. The model has no concept of field sensitivity classification. It generates a "working" schema where all fields are readable and queryable without encryption.
**What to look for:**
- Schema/model definitions with `ssn: String`, `creditCard: String` as plain types
- No encryption hooks or middleware on models with PII
- Missing `encrypted` or `cipher` suffixes on sensitive field names

**Vulnerable (AI-generated):**
```typescript
const userSchema = new Schema({
  name: String,
  email: String,
  ssn: String,
  creditCardNumber: String,
  dateOfBirth: Date,
});
```

**Secure (corrected):**
```typescript
const userSchema = new Schema({
  name: String,
  emailHash: String,            // Blind index for lookups
  emailEncrypted: String,       // AES-256-GCM encrypted
  ssnEncrypted: String,         // AES-256-GCM encrypted
  ssnHash: String,              // HMAC blind index
  dateOfBirthEncrypted: String, // Encrypted
});
userSchema.pre("save", encryptSensitiveFields);
```

### AIP-088: Database Connection as Root/Admin User
**Frequency:** Frequent
**Why AI does this:** AI-generated database setup code uses `user: "postgres"` or `user: "root"` because these are the default superuser accounts used in all tutorials and Docker setup guides. The model never suggests creating a restricted application user.
**What to look for:**
- `user: "postgres"`, `user: "root"`, `user: "admin"`, `user: "sa"`
- No mention of GRANT/REVOKE or permission scoping
- Same credentials for application and migration operations

**Vulnerable (AI-generated):**
```typescript
const pool = new Pool({
  host: "db.production.internal",
  user: "postgres",
  password: process.env.DB_PASSWORD,
  database: "myapp",
});
```

**Secure (corrected):**
```typescript
const pool = new Pool({
  host: process.env.DB_HOST,
  user: "app_readonly",  // Restricted to SELECT on specific tables
  password: process.env.DB_READONLY_PASSWORD,
  database: process.env.DB_NAME,
  ssl: { rejectUnauthorized: true },
});
```

### AIP-089: TypeORM/Prisma synchronize: true in Production
**Frequency:** Frequent
**Why AI does this:** When generating ORM configuration, AI sets `synchronize: true` because it makes the "getting started" experience seamless — the database schema auto-updates without migrations. The model does not add a `NODE_ENV` guard, so this setting ships to production where it can silently alter or drop columns.
**What to look for:**
- `synchronize: true` without `NODE_ENV` check
- `sync({ force: true })` or `sync({ alter: true })` in Sequelize
- Automated migration execution in application startup code

**Vulnerable (AI-generated):**
```typescript
const dataSource = new DataSource({
  type: "postgres",
  synchronize: true,
  entities: [User, Order, Product],
});
```

**Secure (corrected):**
```typescript
const dataSource = new DataSource({
  type: "postgres",
  synchronize: false,
  migrationsRun: false,
  entities: [User, Order, Product],
  migrations: ["dist/migrations/*.js"],
});
// Run migrations via CLI: npx typeorm migration:run
```

### AIP-090: Source Maps Generated in Production Build
**Frequency:** Moderate
**Why AI does this:** When AI generates webpack, Vite, or Next.js configurations, it often includes `devtool: "source-map"` or `sourcemap: true` in the production configuration because source maps help with debugging. The model does not consider that deploying `.map` files exposes the complete original source code.
**What to look for:**
- `devtool: "source-map"` in production webpack config
- `productionBrowserSourceMaps: true` in Next.js
- `build.sourcemap: true` in Vite production config

**Vulnerable (AI-generated):**
```typescript
module.exports = {
  mode: "production",
  devtool: "source-map",
};
```

**Secure (corrected):**
```typescript
module.exports = {
  mode: "production",
  devtool: false, // Or "hidden-source-map" with maps uploaded to Sentry only
};
```

### AIP-091: User-Input Directly in Cache Keys Without Validation
**Frequency:** Moderate
**Why AI does this:** When asked to implement caching, AI constructs cache keys by directly interpolating request parameters: `` `cache:${req.params.id}` ``. The model treats cache keys as simple string lookups without considering that user input can contain delimiters, path traversal characters, or other users' identifiers.
**What to look for:**
- Template literals with `req.params`, `req.query` in cache key construction
- No input validation before cache key construction
- Missing tenant/user scoping in multi-tenant cache keys

**Vulnerable (AI-generated):**
```typescript
app.get("/api/data/:id", async (req, res) => {
  const cached = await redis.get(`data:${req.params.id}`);
  if (cached) return res.json(JSON.parse(cached));
  // Attacker sends id = "../../session:admin-token"
});
```

**Secure (corrected):**
```typescript
app.get("/api/data/:id", async (req, res) => {
  if (!/^\d+$/.test(req.params.id)) {
    return res.status(400).json({ error: "Invalid ID" });
  }
  const cacheKey = `data:${req.user!.tenantId}:${req.params.id}`;
  const cached = await redis.get(cacheKey);
  if (cached) return res.json(JSON.parse(cached));
});
```

### AIP-092: No Account Deletion Endpoint (GDPR Right-to-Deletion)
**Frequency:** Moderate
**Why AI does this:** When generating a CRUD API, AI creates endpoints for creating, reading, and updating users but rarely generates a comprehensive account deletion endpoint. The model focuses on the "happy path" of user management and does not consider regulatory requirements for data erasure across all systems.
**What to look for:**
- User CRUD with no DELETE endpoint, or DELETE that only soft-deletes
- No cleanup of user data in caches, search indices, third-party services
- No data retention/expiry fields in user schemas

**Vulnerable (AI-generated):**
```typescript
// AI generates CRUD but "delete" only sets a flag
app.delete("/api/users/:id", async (req, res) => {
  await User.updateOne({ _id: req.params.id }, { isDeleted: true });
  res.json({ success: true });
  // PII remains in database, cache, search, analytics, backups
});
```

**Secure (corrected):**
```typescript
app.delete("/api/users/me", authMiddleware, async (req, res) => {
  const isValid = await verifyPassword(req.user!.id, req.body.password);
  if (!isValid) return res.status(401).end();
  await deleteAccountCompletely(req.user!.id); // DB + cache + search + third-party
  res.json({ status: "deleted" });
});
```

### AIP-093: Deserialized Cache Data Used Without Schema Validation
**Frequency:** Moderate
**Why AI does this:** When reading cached data, AI generates `JSON.parse(cached) as User` with a TypeScript type assertion but no runtime validation. If the cache is compromised or data is corrupted, the application trusts the deserialized object completely, which can lead to prototype pollution or logic bypass.
**What to look for:**
- `JSON.parse(cached) as Type` without runtime validation
- No zod/joi/yup schema validation after deserialization
- Type assertions (`as`) used as a substitute for data validation

**Vulnerable (AI-generated):**
```typescript
const cached = await redis.get(`user:${userId}`);
if (cached) {
  const user = JSON.parse(cached) as User;
  if (user.role === "admin") grantAdminAccess(); // Trusts cached data
}
```

**Secure (corrected):**
```typescript
import { z } from "zod";

const UserSchema = z.object({
  id: z.string(), name: z.string(), role: z.enum(["user", "admin"]),
});

const cached = await redis.get(`user:${userId}`);
if (cached) {
  const parsed = UserSchema.safeParse(JSON.parse(cached));
  if (!parsed.success) {
    await redis.del(`user:${userId}`); // Purge invalid cache
    return null;
  }
  const user = parsed.data;
}
```
