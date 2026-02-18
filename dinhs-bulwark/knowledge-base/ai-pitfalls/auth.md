# AI-Generated Code Pitfalls: Authentication & Authorization
<!-- Domain: auth -->
<!-- Relevant auditors: AUTH-01, AUTH-02, AUTH-03, AUTH-04 -->

## Overview

Authentication and authorization is the domain where AI code generators make the most dangerous mistakes. LLMs produce code that authenticates users and checks permissions in ways that appear correct but contain subtle, exploitable flaws. The core problem is that AI optimizes for "functional" auth -- code that lets the right people in -- rather than "secure" auth -- code that keeps the wrong people out. JWT handling, session management, password hashing, OAuth flows, and RBAC enforcement all have common AI-generated failure patterns that look correct in demos but break in production.

## Pitfalls

### AIP-011: JWT Verification Without Algorithm Pinning
**Frequency:** Frequent
**Why AI does this:** AI generates the minimal `jwt.verify(token, secret)` call because that is the most common pattern in tutorials and documentation examples. Specifying the `algorithms` option is an extra parameter that is not required for the code to function.
**What to look for:**
- `jwt.verify(token, secret)` or `jwt.verify(token, key)` without options
- Missing `algorithms: [...]` in verify options
- `jwt.decode()` used where `jwt.verify()` should be

**Vulnerable (AI-generated):**
```typescript
const decoded = jwt.verify(token, process.env.JWT_SECRET);
// Accepts any algorithm the token declares, including "none"
```

**Secure (corrected):**
```typescript
const decoded = jwt.verify(token, process.env.JWT_SECRET, {
  algorithms: ['HS256'],
  issuer: 'https://auth.myapp.com',
  audience: 'https://api.myapp.com',
});
```

---

### AIP-012: Hardcoded JWT Secrets in Example Code Left in Production
**Frequency:** Frequent
**Why AI does this:** AI generates complete, self-contained examples and fills in string literals for secrets. Developers copy the code and replace the database config but forget to replace the JWT secret. The code works with the hardcoded value so there is no error.
**What to look for:**
- `const JWT_SECRET = 'secret'` or similar string literals
- `jwt.sign(payload, 'your-secret-here')`
- Secret values that look like placeholder text

**Vulnerable (AI-generated):**
```typescript
const JWT_SECRET = 'your-256-bit-secret';
const token = jwt.sign(payload, JWT_SECRET);
```

**Secure (corrected):**
```typescript
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET environment variable must be set (min 32 chars)');
}
const token = jwt.sign(payload, JWT_SECRET, { algorithm: 'HS256', expiresIn: '1h' });
```

---

### AIP-013: Password Hashing with SHA-256 Instead of bcrypt/argon2
**Frequency:** Common
**Why AI does this:** When asked to "hash a password," AI sometimes uses `crypto.createHash('sha256')` because it interprets "hash" literally and reaches for the standard library's hash functions. SHA-256 is a valid cryptographic hash, so the code passes any review that checks for "is the password hashed."
**What to look for:**
- `crypto.createHash('sha256').update(password)`
- `crypto.createHash('md5').update(password)`
- Any use of `createHash` near password-related variable names
- Password hashing without a salt parameter

**Vulnerable (AI-generated):**
```typescript
const hash = crypto.createHash('sha256').update(password).digest('hex');
await db.query('INSERT INTO users (email, password) VALUES ($1, $2)', [email, hash]);
```

**Secure (corrected):**
```typescript
const hash = await bcrypt.hash(password, 12);
await db.query('INSERT INTO users (email, password_hash) VALUES ($1, $2)', [email, hash]);
```

---

### AIP-014: Missing Session Regeneration After Login
**Frequency:** Common
**Why AI does this:** AI generates the minimal login flow: verify credentials, set session data, redirect. Session regeneration is an additional step that has no visible effect on functionality. Most tutorials and Stack Overflow examples also omit it.
**What to look for:**
- `req.session.userId = user.id` without prior `req.session.regenerate()`
- Login handlers that set session properties directly after authentication
- No call to `regenerate()` between credential verification and session assignment

**Vulnerable (AI-generated):**
```typescript
app.post('/login', async (req, res) => {
  const user = await authenticate(req.body);
  req.session.userId = user.id; // Session ID not regenerated
  res.redirect('/dashboard');
});
```

**Secure (corrected):**
```typescript
app.post('/login', async (req, res) => {
  const user = await authenticate(req.body);
  req.session.regenerate((err) => {
    if (err) return res.status(500).end();
    req.session.userId = user.id;
    res.redirect('/dashboard');
  });
});
```

---

### AIP-015: IDOR Vulnerability in CRUD Endpoints
**Frequency:** Frequent
**Why AI does this:** AI generates RESTful CRUD operations that directly use URL parameters for database lookups without ownership checks. The pattern `findById(req.params.id)` is the canonical REST pattern in every tutorial, and adding `WHERE user_id = req.user.id` requires understanding authorization context the AI may not infer.
**What to look for:**
- `Model.findById(req.params.id)` without ownership filter
- `db.query('SELECT * FROM X WHERE id = $1', [req.params.id])` without user_id filter
- DELETE/PUT endpoints that accept an ID parameter without verifying ownership

**Vulnerable (AI-generated):**
```typescript
app.get('/api/documents/:id', authenticate, async (req, res) => {
  const doc = await Document.findById(req.params.id);
  res.json(doc); // Any user can read any document
});
```

**Secure (corrected):**
```typescript
app.get('/api/documents/:id', authenticate, async (req, res) => {
  const doc = await Document.findOne({ _id: req.params.id, owner: req.user.id });
  if (!doc) return res.status(404).json({ error: 'Not found' });
  res.json(doc);
});
```

---

### AIP-016: OAuth Flow Without State Parameter
**Frequency:** Common
**Why AI does this:** AI generates the OAuth authorization URL with `client_id`, `redirect_uri`, and `scope` because those are the required parameters. The `state` parameter is recommended but optional in the protocol, so AI omits it. The flow works correctly without it.
**What to look for:**
- OAuth authorize URL without `state=` parameter
- Callback handler that does not validate a `state` parameter
- Missing `crypto.randomBytes()` for state generation

**Vulnerable (AI-generated):**
```typescript
app.get('/auth/google', (req, res) => {
  res.redirect(`https://accounts.google.com/o/oauth2/auth?` +
    `client_id=${CLIENT_ID}&redirect_uri=${CALLBACK}&scope=email&response_type=code`);
});
```

**Secure (corrected):**
```typescript
app.get('/auth/google', (req, res) => {
  const state = crypto.randomBytes(32).toString('hex');
  req.session.oauthState = state;
  res.redirect(`https://accounts.google.com/o/oauth2/auth?` +
    `client_id=${CLIENT_ID}&redirect_uri=${CALLBACK}&scope=email` +
    `&response_type=code&state=${state}`);
});
```

---

### AIP-017: Account Enumeration via Differentiated Error Messages
**Frequency:** Frequent
**Why AI does this:** AI generates "helpful" error messages that distinguish between "user not found" and "wrong password" because that is better UX. From a usability perspective, the AI is correct. It does not weight security concerns over usability by default.
**What to look for:**
- `"User not found"` vs `"Wrong password"` in login handlers
- Different HTTP status codes (404 vs 401) for login failures
- Registration endpoint returning `"Email already exists"`

**Vulnerable (AI-generated):**
```typescript
const user = await findByEmail(email);
if (!user) return res.status(404).json({ error: 'User not found' });
if (!await bcrypt.compare(password, user.hash)) {
  return res.status(401).json({ error: 'Wrong password' });
}
```

**Secure (corrected):**
```typescript
const user = await findByEmail(email);
const valid = user && await bcrypt.compare(password, user.hash);
if (!valid) return res.status(401).json({ error: 'Invalid email or password' });
```

---

### AIP-018: Cookie Configuration Missing Security Flags
**Frequency:** Frequent
**Why AI does this:** AI generates `res.cookie('token', value)` or session configuration with minimal options because that is the shortest working code. Security flags like `httpOnly`, `secure`, and `sameSite` are optional and the cookie works without them. AI may add `httpOnly` but omit `secure` and `sameSite`.
**What to look for:**
- `res.cookie(name, value)` with no options object
- Session cookie config missing `httpOnly`, `secure`, or `sameSite`
- `sameSite: 'none'` without strong justification

**Vulnerable (AI-generated):**
```typescript
res.cookie('auth_token', token, { maxAge: 86400000 });
```

**Secure (corrected):**
```typescript
res.cookie('auth_token', token, {
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
  maxAge: 86400000,
  path: '/',
});
```

---

### AIP-019: Authorization Checks Only in React/Frontend Components
**Frequency:** Common
**Why AI does this:** When asked to implement admin-only features in a React/Next.js app, AI adds conditional rendering (`{user.role === 'admin' && <AdminPanel />}`) and route guards in the frontend. It may generate the API endpoint without corresponding server-side role checks because the frontend "handles" access control.
**What to look for:**
- `user.role === 'admin'` checks in JSX/TSX files
- `ProtectedRoute` or `RoleGuard` components without matching server middleware
- API routes under `/admin/` without `requireRole()` middleware

**Vulnerable (AI-generated):**
```typescript
// Frontend only:
function App() {
  return user.isAdmin ? <AdminDashboard /> : <UserDashboard />;
}
// API: no role check
app.get('/api/admin/stats', authenticate, async (req, res) => {
  res.json(await getAdminStats());
});
```

**Secure (corrected):**
```typescript
// Frontend (UI hint):
function App() {
  return user.isAdmin ? <AdminDashboard /> : <UserDashboard />;
}
// API: server-side enforcement
app.get('/api/admin/stats', authenticate, requireRole('admin'), async (req, res) => {
  res.json(await getAdminStats());
});
```

---

### AIP-020: Mass Assignment Allowing Role Escalation
**Frequency:** Common
**Why AI does this:** AI generates clean, concise CRUD operations using spread operators or `Object.assign()` to pass all request body fields to the database. Patterns like `User.create(req.body)` and `User.findByIdAndUpdate(id, req.body)` are idiomatic and appear in most ORM documentation.
**What to look for:**
- `...req.body` in create/update operations
- `Model.create(req.body)` without field filtering
- `Model.findByIdAndUpdate(id, req.body)` or `Model.update(req.body)`
- No explicit field whitelist for user-facing mutations

**Vulnerable (AI-generated):**
```typescript
app.post('/api/register', async (req, res) => {
  const user = await User.create(req.body);
  // Attacker includes "role": "admin" in the request body
  res.json(user);
});
```

**Secure (corrected):**
```typescript
app.post('/api/register', async (req, res) => {
  const { email, password, name } = req.body;
  const user = await User.create({
    email, name,
    password: await bcrypt.hash(password, 12),
    role: 'user', // Server-controlled
  });
  res.json({ id: user.id, email: user.email, name: user.name });
});
```

---

### AIP-021: No Rate Limiting on Authentication Endpoints
**Frequency:** Common
**Why AI does this:** AI generates login endpoints as simple request handlers. Rate limiting is an infrastructure concern that requires importing additional middleware. The login endpoint works without it, and the AI's training data heavily features simple login handlers without rate limiting.
**What to look for:**
- `/login` or `/auth` POST handlers without rate-limiting middleware
- No `express-rate-limit` or equivalent in dependencies
- Password reset endpoints without throttling

**Vulnerable (AI-generated):**
```typescript
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await findByEmail(email);
  if (!user || !await bcrypt.compare(password, user.hash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  res.json({ token: generateToken(user) });
});
```

**Secure (corrected):**
```typescript
import rateLimit from 'express-rate-limit';
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  keyGenerator: (req) => `${req.ip}:${req.body?.email}`,
});
app.post('/api/login', loginLimiter, async (req, res) => {
  // ... same handler with rate limiting applied
});
```

---

### AIP-022: JWT Tokens That Never Expire
**Frequency:** Common
**Why AI does this:** When generating a JWT sign call, AI may omit the `expiresIn` option because it is not required. The generated code works, and the token is valid -- indefinitely. AI may also set very long expiry times like `365d` because longer is "more convenient."
**What to look for:**
- `jwt.sign(payload, secret)` without `expiresIn`
- `expiresIn: '365d'` or `expiresIn: '999d'`
- No refresh token mechanism alongside long-lived access tokens

**Vulnerable (AI-generated):**
```typescript
const token = jwt.sign({ userId: user.id, role: user.role }, secret);
// Token valid forever
```

**Secure (corrected):**
```typescript
const accessToken = jwt.sign({ userId: user.id, role: user.role }, secret, {
  algorithm: 'HS256',
  expiresIn: '15m',
});
const refreshToken = jwt.sign({ userId: user.id, type: 'refresh' }, refreshSecret, {
  algorithm: 'HS256',
  expiresIn: '7d',
});
```

---

### AIP-023: Password Comparison Using Equality Operator
**Frequency:** Occasional
**Why AI does this:** AI sometimes generates direct string comparison for password verification (`if (hash === storedHash)`) instead of using the library's constant-time comparison function. This is more likely when the AI generates custom authentication logic rather than using bcrypt's `compare()`.
**What to look for:**
- `hash === storedHash` or `hash == storedHash` for password checks
- `user.password === password` (plaintext comparison)
- Any `===` comparison near password or hash variable names

**Vulnerable (AI-generated):**
```typescript
const hash = crypto.createHash('sha256').update(password).digest('hex');
if (hash === user.passwordHash) {
  // Timing attack: comparison leaks hash length byte by byte
  return generateToken(user);
}
```

**Secure (corrected):**
```typescript
// bcrypt.compare is constant-time internally
const valid = await bcrypt.compare(password, user.passwordHash);
if (valid) return generateToken(user);
```

---

### AIP-024: Logout That Only Clears the Client Cookie
**Frequency:** Occasional
**Why AI does this:** AI generates a logout handler that calls `res.clearCookie()` without destroying the server-side session. For JWT-based auth, AI may generate an empty logout handler because there is "nothing to do server-side" with stateless tokens. Both approaches leave the token or session reusable.
**What to look for:**
- Logout handler without `req.session.destroy()`
- Logout handler that only does `res.clearCookie()`
- JWT logout with empty handler body
- No token blacklist mechanism for JWT auth

**Vulnerable (AI-generated):**
```typescript
app.post('/logout', (req, res) => {
  res.clearCookie('session');
  res.json({ message: 'Logged out' });
  // Server session still valid, stolen cookie still works
});
```

**Secure (corrected):**
```typescript
app.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).end();
    res.clearCookie('connect.sid', { path: '/' });
    res.json({ message: 'Logged out' });
  });
});
```

---

### AIP-025: Refresh Tokens Stored in localStorage
**Frequency:** Common
**Why AI does this:** AI generates frontend auth code that stores both access and refresh tokens in `localStorage` because it is the simplest storage mechanism for client-side JavaScript. This exposes both tokens to any XSS vulnerability. AI rarely suggests HttpOnly cookies for token storage because the implementation is more complex.
**What to look for:**
- `localStorage.setItem('refreshToken', ...)` or `localStorage.setItem('token', ...)`
- `sessionStorage.setItem('token', ...)`
- Token retrieval from localStorage in API interceptors

**Vulnerable (AI-generated):**
```typescript
// After login:
localStorage.setItem('accessToken', response.data.accessToken);
localStorage.setItem('refreshToken', response.data.refreshToken);
// Any XSS can steal both tokens
```

**Secure (corrected):**
```typescript
// Server sets tokens as HttpOnly cookies -- not accessible to JS
// Login response:
res.cookie('access_token', accessToken, {
  httpOnly: true, secure: true, sameSite: 'strict', maxAge: 900000,
});
res.cookie('refresh_token', refreshToken, {
  httpOnly: true, secure: true, sameSite: 'strict', maxAge: 604800000,
  path: '/api/token', // Only sent to refresh endpoint
});
res.json({ message: 'Logged in' });
```
