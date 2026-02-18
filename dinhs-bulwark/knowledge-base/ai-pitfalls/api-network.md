# AI-Generated Code Pitfalls: API & Network
<!-- Domain: api-network -->
<!-- Relevant auditors: API-01, API-02, API-03, API-04, API-05 -->

## Overview

AI code generators produce APIs that prioritize functionality and developer convenience over security. The generated code is often a direct translation of tutorial patterns: a REST endpoint that accepts input, processes it, and returns a response. The security gaps are not in what the code does, but in what it omits: rate limiting, input validation, output filtering, signature verification, and authorization checks. These omissions are especially dangerous in the API & Network domain because APIs are the primary attack surface for modern applications, and missing controls are directly exploitable from the internet without any prerequisite access.

## Pitfalls

### AIP-066: GraphQL Server Without Depth or Complexity Limits
**Frequency:** Frequent
**Why AI does this:** AI generates GraphQL servers with `typeDefs` and `resolvers` as the minimal working configuration. Depth limiting and query complexity analysis require importing additional packages (`graphql-depth-limit`, `graphql-query-complexity`) and adding them to `validationRules`, which AI omits because the server functions without them.
**What to look for:**
- `new ApolloServer({ typeDefs, resolvers })` without `validationRules`
- Missing `graphql-depth-limit` or `graphql-query-complexity` in dependencies
- Circular relationships in schema without complexity controls

**Vulnerable (AI-generated):**
```typescript
const server = new ApolloServer({
  typeDefs,
  resolvers,
  // No validationRules -- unlimited query depth and complexity
});
```

**Secure (corrected):**
```typescript
import depthLimit from 'graphql-depth-limit';
import { createComplexityLimitRule } from 'graphql-validation-complexity';

const server = new ApolloServer({
  typeDefs,
  resolvers,
  introspection: process.env.NODE_ENV !== 'production',
  validationRules: [depthLimit(7), createComplexityLimitRule(1000)],
});
```

---

### AIP-067: REST API Without Request Body Size Limits
**Frequency:** Frequent
**Why AI does this:** AI generates `app.use(express.json())` without a `limit` parameter because it is the canonical one-liner for enabling JSON body parsing. The default Express limit of 100KB is often overridden to `'50mb'` or removed entirely when the AI is asked to handle file uploads or large payloads, without understanding the DoS implications.
**What to look for:**
- `express.json()` without `{ limit: '...' }`
- `express.json({ limit: '50mb' })` or higher
- `multer()` without `limits.fileSize`

**Vulnerable (AI-generated):**
```typescript
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));
```

**Secure (corrected):**
```typescript
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
```

---

### AIP-068: Webhook Endpoint Without Signature Verification
**Frequency:** Frequent
**Why AI does this:** When asked to create a Stripe/GitHub/Slack webhook handler, AI generates code that parses the JSON body and processes the event type. Signature verification requires reading the raw body (before JSON parsing), accessing a specific header, and calling a verification function -- three extra steps that AI often skips because the event processing is the "interesting" part.
**What to look for:**
- Webhook POST handlers that use `express.json()` middleware (body already parsed)
- Missing `stripe.webhooks.constructEvent()` or equivalent
- No reference to signature headers (`Stripe-Signature`, `X-Hub-Signature-256`)

**Vulnerable (AI-generated):**
```typescript
app.post('/webhooks/stripe', async (req, res) => {
  const event = req.body;
  if (event.type === 'checkout.session.completed') {
    await activateSubscription(event.data.object.customer);
  }
  res.json({ received: true });
});
```

**Secure (corrected):**
```typescript
app.post('/webhooks/stripe',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    let event;
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        req.headers['stripe-signature'],
        process.env.STRIPE_WEBHOOK_SECRET,
      );
    } catch (err) {
      return res.status(400).json({ error: 'Invalid signature' });
    }
    if (event.type === 'checkout.session.completed') {
      await activateSubscription(event.data.object.customer);
    }
    res.json({ received: true });
  },
);
```

---

### AIP-069: WebSocket Server Without Authentication
**Frequency:** Frequent
**Why AI does this:** AI generates `new WebSocketServer({ port: 8080 })` and immediately handles the `connection` event because WebSocket tutorials focus on the message-passing mechanics. Authentication requires manual handling of the HTTP upgrade request, which is not part of the basic WebSocket API and adds significant complexity.
**What to look for:**
- `new WebSocketServer({ port })` without `verifyClient` or `noServer: true`
- `wss.on('connection', ...)` without user verification
- `io.on('connection', ...)` without `io.use()` auth middleware

**Vulnerable (AI-generated):**
```typescript
const wss = new WebSocketServer({ port: 8080 });
wss.on('connection', (ws) => {
  ws.on('message', (data) => handleMessage(ws, data));
});
```

**Secure (corrected):**
```typescript
const wss = new WebSocketServer({ noServer: true });
httpServer.on('upgrade', (req, socket, head) => {
  const token = new URL(req.url, 'http://localhost').searchParams.get('token');
  try {
    const user = jwt.verify(token, SECRET, { algorithms: ['HS256'] });
    wss.handleUpgrade(req, socket, head, (ws) => {
      ws.user = user;
      wss.emit('connection', ws, req);
    });
  } catch {
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
    socket.destroy();
  }
});
```

---

### AIP-070: Mass Assignment via Direct ORM Binding
**Frequency:** Frequent
**Why AI does this:** AI generates clean, concise CRUD endpoints using `Model.create(req.body)` or `new Model(req.body)` because this is the idiomatic pattern in ORM documentation and tutorials. Adding a DTO layer or explicit field allowlisting is extra boilerplate that the AI avoids for brevity.
**What to look for:**
- `Model.create(req.body)` or `new Model(req.body)`
- `Model.findByIdAndUpdate(id, req.body)`
- `prisma.model.create({ data: req.body })`
- `...req.body` in create or update operations

**Vulnerable (AI-generated):**
```typescript
app.post('/api/users', async (req, res) => {
  const user = await User.create(req.body);
  res.json(user);
});
```

**Secure (corrected):**
```typescript
const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  password: z.string().min(8),
});

app.post('/api/users', async (req, res) => {
  const { email, name, password } = CreateUserSchema.parse(req.body);
  const user = await User.create({ email, name, password: await hash(password, 12), role: 'user' });
  res.json({ id: user.id, email: user.email, name: user.name });
});
```

---

### AIP-071: API Returning Full Database Objects in Responses
**Frequency:** Frequent
**Why AI does this:** AI generates `res.json(user)` because it is the simplest way to return data. Creating a DTO, response serializer, or field selection requires extra code with no functional benefit. The AI does not distinguish between internal and external representations of data.
**What to look for:**
- `res.json(user)` or `res.json(result)` returning full ORM objects
- Missing `.select()` or `.project()` in database queries
- No response serialization layer or DTO mapping

**Vulnerable (AI-generated):**
```typescript
app.get('/api/users/:id', async (req, res) => {
  const user = await User.findById(req.params.id);
  res.json(user); // Includes passwordHash, internalId, stripeCustomerId, etc.
});
```

**Secure (corrected):**
```typescript
app.get('/api/users/:id', async (req, res) => {
  const user = await User.findById(req.params.id).select('id name email avatar createdAt');
  if (!user) return res.status(404).json({ error: 'Not found' });
  res.json(user);
});
```

---

### AIP-072: Verbose Error Responses with Stack Traces
**Frequency:** Common
**Why AI does this:** AI generates error handling that returns `err.message` and `err.stack` because this is the most helpful pattern for debugging. The AI generates code for a development environment by default and does not add production-specific error sanitization.
**What to look for:**
- `res.json({ error: err.message, stack: err.stack })`
- `res.status(500).json(err)` sending the full error object
- Error handlers that include `err.sql`, `err.query`, or `err.code`

**Vulnerable (AI-generated):**
```typescript
app.use((err, req, res, next) => {
  res.status(500).json({ message: err.message, stack: err.stack });
});
```

**Secure (corrected):**
```typescript
app.use((err, req, res, next) => {
  const errorId = crypto.randomUUID();
  logger.error({ errorId, message: err.message, stack: err.stack });
  res.status(err.status || 500).json({ error: 'Internal server error', errorId });
});
```

---

### AIP-073: GraphQL Introspection Left Enabled in Production
**Frequency:** Common
**Why AI does this:** AI generates Apollo Server or Express GraphQL configurations with default settings. Introspection is enabled by default in most GraphQL servers, and the AI does not add `introspection: false` because there is no runtime error or warning when it is left on.
**What to look for:**
- `new ApolloServer({ typeDefs, resolvers })` without `introspection: false`
- No `NODE_ENV` check for introspection toggle
- GraphiQL or GraphQL Playground enabled without restriction

**Vulnerable (AI-generated):**
```typescript
const server = new ApolloServer({ typeDefs, resolvers });
```

**Secure (corrected):**
```typescript
const server = new ApolloServer({
  typeDefs,
  resolvers,
  introspection: process.env.NODE_ENV !== 'production',
});
```

---

### AIP-074: No Rate Limiting on Any API Endpoints
**Frequency:** Frequent
**Why AI does this:** Rate limiting is an infrastructure concern that requires importing a middleware package and configuring it. AI generates individual route handlers without this cross-cutting concern because each handler is generated in isolation as a self-contained piece of functionality.
**What to look for:**
- `express-rate-limit` missing from `package.json`
- No rate limiting middleware in the middleware chain
- Login, registration, and password reset endpoints without throttling

**Vulnerable (AI-generated):**
```typescript
app.post('/api/login', async (req, res) => { /* ... */ });
app.post('/api/register', async (req, res) => { /* ... */ });
app.post('/api/forgot-password', async (req, res) => { /* ... */ });
// No rate limiting on any endpoint
```

**Secure (corrected):**
```typescript
import rateLimit from 'express-rate-limit';
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5 });
const generalLimiter = rateLimit({ windowMs: 60 * 1000, max: 100 });

app.use(generalLimiter);
app.post('/api/login', authLimiter, async (req, res) => { /* ... */ });
app.post('/api/forgot-password', authLimiter, async (req, res) => { /* ... */ });
```

---

### AIP-075: Webhook Handler Not Idempotent
**Frequency:** Common
**Why AI does this:** When asked to handle a webhook event, AI generates the business logic directly inside the handler (e.g., `UPDATE balance SET amount = amount + event.amount`). Adding idempotency requires tracking processed event IDs, which is an additional database table and query that AI considers extraneous to the core request.
**What to look for:**
- Webhook handlers that directly mutate state without checking event ID
- `balance = balance + amount` without deduplication
- `INSERT INTO` without `ON CONFLICT` or prior existence check
- No `processed_events` table or equivalent

**Vulnerable (AI-generated):**
```typescript
// Each retry credits the user again
if (event.type === 'payment_intent.succeeded') {
  await db.query('UPDATE accounts SET balance = balance + $1 WHERE user_id = $2',
    [event.data.object.amount, event.data.object.metadata.userId]);
}
```

**Secure (corrected):**
```typescript
if (event.type === 'payment_intent.succeeded') {
  await db.transaction(async (tx) => {
    await tx.query('INSERT INTO processed_events (event_id) VALUES ($1) ON CONFLICT DO NOTHING', [event.id]);
    const { rowCount } = await tx.query('SELECT 1 FROM processed_events WHERE event_id = $1', [event.id]);
    if (rowCount === 0) return; // Already processed
    await tx.query('UPDATE accounts SET balance = balance + $1 WHERE user_id = $2',
      [event.data.object.amount, event.data.object.metadata.userId]);
  });
}
```

---

### AIP-076: WebSocket Messages Processed Without Validation
**Frequency:** Common
**Why AI does this:** AI generates WebSocket message handlers with `JSON.parse(data)` followed by direct property access (`msg.type`, `msg.payload`). Schema validation is never applied because WebSocket tutorials focus on the real-time messaging pattern, not input security. The AI treats authenticated WebSocket connections as implicitly trusted.
**What to look for:**
- `JSON.parse(data)` without try-catch in WebSocket handlers
- Direct property access on parsed messages without schema validation
- No Zod, Joi, or similar validation in WebSocket message processing
- String interpolation with WebSocket message content

**Vulnerable (AI-generated):**
```typescript
ws.on('message', (data) => {
  const msg = JSON.parse(data);
  db.query(`SELECT * FROM items WHERE name = '${msg.search}'`);
});
```

**Secure (corrected):**
```typescript
ws.on('message', (data) => {
  let raw;
  try { raw = JSON.parse(data.toString()); } catch { return ws.send('{"error":"Invalid JSON"}'); }
  const result = MessageSchema.safeParse(raw);
  if (!result.success) return ws.send(JSON.stringify({ error: 'Invalid message' }));
  db.query('SELECT * FROM items WHERE name = $1', [result.data.search]);
});
```

---

### AIP-077: Email or SMS Sending Without Per-Recipient Rate Limiting
**Frequency:** Common
**Why AI does this:** AI generates "forgot password" and "send verification" endpoints as simple handlers that send an email or SMS every time they are called. Per-recipient rate limiting requires tracking sends in a database, which is a separate concern the AI does not infer from the request to "create a forgot password endpoint."
**What to look for:**
- `/forgot-password` endpoint that sends email without checking recent sends to that address
- `/send-verification` without per-phone or per-email throttling
- No `notification_log` or `sms_log` table in the schema
- SMS sending without phone number validation or country restrictions

**Vulnerable (AI-generated):**
```typescript
app.post('/api/forgot-password', async (req, res) => {
  const user = await User.findByEmail(req.body.email);
  if (user) await sendResetEmail(user.email, generateResetToken());
  res.json({ message: 'If account exists, email sent' });
});
```

**Secure (corrected):**
```typescript
app.post('/api/forgot-password', ipRateLimiter, async (req, res) => {
  const user = await User.findByEmail(req.body.email);
  if (user) {
    const recentSends = await db.query(
      'SELECT COUNT(*) FROM email_log WHERE recipient = $1 AND sent_at > NOW() - INTERVAL \'1 hour\'',
      [user.email],
    );
    if (parseInt(recentSends.rows[0].count) < 3) {
      await sendResetEmail(user.email, generateResetToken());
      await db.query('INSERT INTO email_log (recipient, action, sent_at) VALUES ($1, $2, NOW())', [user.email, 'reset']);
    }
  }
  res.json({ message: 'If account exists, email sent' });
});
```

---

### AIP-078: Pagination Without Maximum Page Size Enforcement
**Frequency:** Common
**Why AI does this:** AI generates pagination using `req.query.limit` or `req.query.pageSize` and passes the value directly to the database query's `.limit()` method. It does not impose a maximum because the developer's intent is to "support pagination," and arbitrary limits seem contrary to flexibility.
**What to look for:**
- `parseInt(req.query.limit)` used directly in `.limit()` or `LIMIT`
- No `Math.min()` capping the page size
- No `MAX_PAGE_SIZE` constant
- GraphQL queries with `first` argument without maximum validation

**Vulnerable (AI-generated):**
```typescript
app.get('/api/items', async (req, res) => {
  const limit = parseInt(req.query.limit) || 20;
  const items = await Item.find({}).limit(limit); // limit=999999 dumps everything
  res.json(items);
});
```

**Secure (corrected):**
```typescript
const MAX_PAGE_SIZE = 100;
app.get('/api/items', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 20, MAX_PAGE_SIZE);
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const items = await Item.find({}).skip((page - 1) * limit).limit(limit);
  res.json({ data: items, pagination: { page, limit } });
});
```
