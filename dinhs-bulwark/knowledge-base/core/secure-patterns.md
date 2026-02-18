# Secure Off-Chain Patterns Guide
<!-- What good off-chain code looks like — organized by category -->
<!-- Last updated: 2026-02-18 -->
<!-- Purpose: Help auditors recognize well-implemented security patterns -->

## Why This Matters

Knowing what "good" looks like is as important as knowing what's bad. These patterns represent industry best practices for off-chain security. When code matches these patterns, it's likely safe — when it deviates, investigate why.

---

## Secrets & Credentials

### SP-001: Environment-Based Secret Loading
```javascript
// GOOD: Secrets loaded from environment with validation
const PRIVATE_KEY = process.env.PRIVATE_KEY;
if (!PRIVATE_KEY) throw new Error('PRIVATE_KEY required');
```

### SP-002: KMS/HSM Key Management
```javascript
// GOOD: Keys managed by cloud KMS, never in app memory
const signer = new KMSSigner({ keyId: process.env.KMS_KEY_ID });
```

### SP-003: Secret Rotation Support
```javascript
// GOOD: Config supports current + previous key for zero-downtime rotation
const keys = [process.env.JWT_SECRET, process.env.JWT_SECRET_PREVIOUS].filter(Boolean);
```

---

## Authentication & Sessions

### SP-004: JWT with Algorithm Enforcement
```javascript
// GOOD: Explicit algorithm prevents alg:none attack
jwt.verify(token, secret, { algorithms: ['RS256'] });
```

### SP-005: Constant-Time Comparison
```javascript
// GOOD: Timing-safe comparison for secrets
const crypto = require('crypto');
const isValid = crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
```

### SP-006: Bcrypt with Adequate Rounds
```javascript
// GOOD: bcrypt with >= 10 rounds (12 preferred)
const hash = await bcrypt.hash(password, 12);
```

### SP-007: HTTP-Only Secure Cookies
```javascript
// GOOD: Session cookie with all security flags
res.cookie('session', token, {
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
  maxAge: 3600000
});
```

---

## Input Validation & Injection Prevention

### SP-008: Parameterized Queries
```javascript
// GOOD: Parameterized query prevents SQL injection
const user = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
```

### SP-009: Zod Schema Validation at API Boundary
```javascript
// GOOD: Runtime validation at the API boundary
const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
});
const data = CreateUserSchema.parse(req.body);
```

### SP-010: Child Process with Array Arguments
```javascript
// GOOD: Array arguments prevent shell injection
spawn('git', ['log', '--oneline', '-n', count.toString()]);
// BAD: exec(`git log --oneline -n ${count}`);
```

### SP-011: URL Validation for SSRF Prevention
```javascript
// GOOD: Allowlist-based URL validation
const allowedHosts = ['api.example.com', 'cdn.example.com'];
const url = new URL(userInput);
if (!allowedHosts.includes(url.hostname)) throw new Error('Forbidden host');
```

---

## Web Security

### SP-012: Content Security Policy
```javascript
// GOOD: Strict CSP preventing inline scripts
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'"], // Only if truly needed
    imgSrc: ["'self'", 'data:', 'https:'],
  }
}));
```

### SP-013: CORS with Explicit Origins
```javascript
// GOOD: Explicit origin allowlist (not wildcard)
app.use(cors({
  origin: ['https://app.example.com'],
  credentials: true,
}));
```

### SP-014: Security Headers via Helmet
```javascript
// GOOD: Helmet applies common security headers
app.use(helmet());
// Sets: X-Content-Type-Options, X-Frame-Options, HSTS, etc.
```

---

## Blockchain Interaction

### SP-015: Confirmed Commitment for Financial Operations
```javascript
// GOOD: Use confirmed/finalized for financial decisions
const balance = await connection.getBalance(pubkey, 'confirmed');
```

### SP-016: Transaction Simulation Before Submission
```javascript
// GOOD: Simulate before sending
const simResult = await connection.simulateTransaction(transaction);
if (simResult.value.err) throw new Error('Simulation failed');
await connection.sendTransaction(transaction);
```

### SP-017: Slippage Protection on Swaps
```javascript
// GOOD: Enforced slippage limit
const minAmountOut = expectedOut * (1 - maxSlippageBps / 10000);
const ix = createSwapInstruction({ ..., minimumAmountOut: minAmountOut });
```

### SP-018: Program ID Constants
```javascript
// GOOD: Program IDs as constants, not configurable
const PROGRAM_ID = new PublicKey('11111111111111111111111111111111');
// Never: const PROGRAM_ID = new PublicKey(req.body.programId);
```

---

## API Security

### SP-019: Rate Limiting on Sensitive Endpoints
```javascript
// GOOD: Rate limiting on auth endpoints
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5 });
app.use('/api/auth/login', authLimiter);
```

### SP-020: Request Body Size Limits
```javascript
// GOOD: Body size limits prevent resource exhaustion
app.use(express.json({ limit: '1mb' }));
```

### SP-021: Webhook Signature Verification
```javascript
// GOOD: HMAC verification with timing-safe comparison
const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');
const isValid = crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
```

---

## Data Security

### SP-022: Sensitive Data Redaction in Logs
```javascript
// GOOD: Redact sensitive fields before logging
const sanitized = { ...user, password: '[REDACTED]', token: '[REDACTED]' };
logger.info('User action', sanitized);
```

### SP-023: Encryption at Rest for Sensitive Data
```javascript
// GOOD: Encrypt sensitive fields before storage
const encrypted = crypto.createCipheriv('aes-256-gcm', key, iv).update(data);
```

### SP-024: File Upload Type Validation
```javascript
// GOOD: Validate by content (magic bytes), not just extension
const fileType = await FileType.fromBuffer(buffer);
if (!['image/png', 'image/jpeg'].includes(fileType?.mime)) throw new Error('Invalid type');
```

---

## Infrastructure

### SP-025: Non-Root Docker User
```dockerfile
# GOOD: Run as non-root
FROM node:20-slim
RUN adduser --disabled-password app
USER app
```

### SP-026: Pinned Base Image
```dockerfile
# GOOD: Pinned to digest for reproducibility
FROM node:20-slim@sha256:abc123...
```

### SP-027: Multi-Stage Build (No Dev Dependencies in Production)
```dockerfile
# GOOD: Production image has no dev dependencies
FROM node:20-slim AS builder
COPY . .
RUN npm ci && npm run build
FROM node:20-slim
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
```

---

## Error Handling

### SP-028: Fail-Closed Error Handling
```javascript
// GOOD: Deny by default on error
try {
  const isAuthorized = await checkAuth(token);
  if (!isAuthorized) throw new Error('Unauthorized');
} catch (err) {
  // Fail closed: deny access on ANY error
  return res.status(401).json({ error: 'Authentication failed' });
}
```

### SP-029: Generic Error Messages to Clients
```javascript
// GOOD: Don't leak internals in error responses
app.use((err, req, res, next) => {
  logger.error(err); // Log full error internally
  res.status(500).json({ error: 'Internal server error' }); // Generic to client
});
```

---

## Cryptography

### SP-030: CSPRNG for Security-Sensitive Values
```javascript
// GOOD: crypto.randomBytes for tokens, nonces, IDs
const token = crypto.randomBytes(32).toString('hex');
// NEVER: Math.random() for security purposes
```

### SP-031: Unique IV/Nonce Per Encryption
```javascript
// GOOD: Generate fresh IV for each encryption
const iv = crypto.randomBytes(16);
const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
```

---

## Business Logic

### SP-032: Atomic Balance Check + Deduction
```javascript
// GOOD: Atomic operation prevents race conditions
const result = await db.query(
  'UPDATE accounts SET balance = balance - $1 WHERE id = $2 AND balance >= $1 RETURNING balance',
  [amount, accountId]
);
if (result.rowCount === 0) throw new Error('Insufficient balance');
```

### SP-033: BigNumber for Financial Math
```javascript
// GOOD: BigNumber for financial calculations
const fee = new BN(amount).mul(new BN(feeBps)).div(new BN(10000));
// NEVER: const fee = amount * feeBps / 10000; (floating point!)
```
