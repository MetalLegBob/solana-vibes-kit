# AI-Generated Code Pitfalls: Injection
<!-- Domain: injection -->
<!-- Relevant auditors: INJ-01, INJ-02, INJ-03, INJ-04, INJ-05, INJ-06 -->

AI code generators frequently produce injection-vulnerable code. Template literals, eval-based patterns, and unsanitized user input flow into dangerous sinks because LLMs optimize for readability and conciseness, not security. This file catalogs the most common AI-generated injection pitfalls.

---

## AIP-026: SQL Queries Built with Template Literals

**Patterns:** OC-049, OC-050, OC-054
**Auditors:** INJ-01
**Risk:** CRITICAL

AI generators almost always produce SQL queries using JavaScript template literals rather than parameterized queries. When asked to "query the database for a user," the generated code interpolates `${req.body.username}` directly into the SQL string.

```typescript
// AI-generated (VULNERABLE)
const user = await db.query(`SELECT * FROM users WHERE id = ${req.params.id}`);

// What it should generate
const user = await db.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
```

**Why AI does this:** Template literals are more "readable" and LLMs favor patterns that look like natural language. Parameterized queries require array syntax that LLMs tend to omit.

**Detection:** Search for `\`SELECT.*\$\{` and `\`INSERT.*\$\{` patterns in generated code.

---

## AIP-027: Using eval() for JSON Parsing or Math

**Patterns:** OC-056
**Auditors:** INJ-02
**Risk:** CRITICAL

AI generators sometimes suggest `eval()` for parsing JSON strings, evaluating mathematical expressions, or converting string representations of objects. This is especially common when the prompt asks for a "calculator" or "expression evaluator."

```typescript
// AI-generated (VULNERABLE)
const result = eval(req.body.expression);

// What it should generate
import { evaluate } from 'mathjs';
const result = evaluate(req.body.expression);
```

**Why AI does this:** `eval()` is the shortest path to executing dynamic expressions. Training data includes many examples using `eval()` for quick prototypes.

**Detection:** Grep for `eval(` and `new Function(` in generated server-side code.

---

## AIP-028: child_process.exec() Instead of execFile()

**Patterns:** OC-055
**Auditors:** INJ-02
**Risk:** CRITICAL

When AI generates code to run system commands, it almost universally uses `exec()` (which invokes a shell) instead of `execFile()` (which does not). It then interpolates user input directly into the command string.

```typescript
// AI-generated (VULNERABLE)
exec(`ffmpeg -i ${req.file.path} -o output.mp4`);

// What it should generate
execFile('ffmpeg', ['-i', req.file.path, '-o', 'output.mp4']);
```

**Why AI does this:** `exec()` with template literals mirrors how humans describe shell commands. `execFile()` with argument arrays is less intuitive to generate.

**Detection:** Search for `exec(` combined with template literals or `req.` references.

---

## AIP-029: MongoDB Queries Without Type Validation

**Patterns:** OC-051, OC-052
**Auditors:** INJ-01
**Risk:** HIGH

AI generates MongoDB login flows that pass `req.body` properties directly to `findOne()` without validating that the values are strings. This enables operator injection where `{"$ne": ""}` bypasses authentication.

```typescript
// AI-generated (VULNERABLE)
const user = await User.findOne({ email: req.body.email, password: req.body.password });

// What it should generate
const { email, password } = z.object({
  email: z.string().email(),
  password: z.string()
}).parse(req.body);
const user = await User.findOne({ email });
// Then verify password with bcrypt.compare
```

**Why AI does this:** The AI does not reason about runtime type coercion. It assumes `req.body.password` is always a string.

**Detection:** Look for `findOne({ ... req.body` patterns without schema validation.

---

## AIP-030: URL Fetching Without SSRF Protection

**Patterns:** OC-057, OC-058, OC-059
**Auditors:** INJ-03
**Risk:** CRITICAL

AI happily generates webhook testers, URL previewers, and image proxies that fetch user-supplied URLs with no validation against internal addresses or cloud metadata endpoints.

```typescript
// AI-generated (VULNERABLE)
const response = await fetch(req.body.url);
res.json(await response.json());

// What it should generate
if (!await isExternalUrl(req.body.url)) {
  return res.status(400).json({ error: 'URL not allowed' });
}
const response = await fetch(req.body.url, { redirect: 'error', signal: AbortSignal.timeout(5000) });
```

**Why AI does this:** SSRF protection requires DNS resolution, IP range checking, and redirect handling — complex logic the AI omits for brevity.

**Detection:** Search for `fetch(req.body` or `axios.get(req.` without preceding URL validation.

---

## AIP-031: path.join() Assumed to Prevent Traversal

**Patterns:** OC-062, OC-063
**Auditors:** INJ-04
**Risk:** HIGH

AI generates file access code using `path.join(baseDir, userInput)` and treats it as safe. But `path.join('/uploads', '../../../etc/passwd')` resolves to `/etc/passwd`. AI models do not understand that `path.join` normalizes traversal sequences rather than blocking them.

```typescript
// AI-generated (VULNERABLE)
const filePath = path.join('./uploads', req.params.filename);
res.sendFile(filePath);

// What it should generate
const filePath = path.resolve('./uploads', req.params.filename);
if (!filePath.startsWith(path.resolve('./uploads') + path.sep)) {
  return res.status(403).send('Forbidden');
}
res.sendFile(filePath);
```

**Why AI does this:** `path.join()` appears "safe" because it is a standard library function. The AI conflates path normalization with path restriction.

**Detection:** Search for `path.join(` followed by `sendFile`, `readFile`, or `writeFile` without a `startsWith` check.

---

## AIP-032: User Input Directly in Template Rendering

**Patterns:** OC-072, OC-073
**Auditors:** INJ-06
**Risk:** CRITICAL

AI generates template rendering code that passes user input as the template itself rather than as template data. The user controls the template source, enabling SSTI and code execution.

```typescript
// AI-generated (VULNERABLE)
const html = nunjucks.renderString(`Hello ${req.query.name}!`, {});

// What it should generate
res.render('greeting.html', { name: req.query.name });
```

**Why AI does this:** Inline template rendering is shorter than setting up template files. The AI does not distinguish between "user input as data" and "user input as template."

**Detection:** Search for `renderString(`, `ejs.render(`, or `pug.render(` with `req.` references.

---

## AIP-033: Using Original Upload Filename

**Patterns:** OC-064
**Auditors:** INJ-04
**Risk:** HIGH

AI generates file upload handlers that store files using the original filename from the client without sanitization, enabling path traversal and file type confusion.

```typescript
// AI-generated (VULNERABLE)
const dest = path.join('uploads', req.file.originalname);
fs.renameSync(req.file.path, dest);

// What it should generate
const safeName = `${randomUUID()}${allowedExtension}`;
const dest = path.resolve('uploads', safeName);
```

**Why AI does this:** Using `originalname` preserves user-friendly filenames. The AI prioritizes usability over security.

**Detection:** Search for `originalname` or `file.name` in path construction.

---

## AIP-034: Lodash merge/extend with Request Body

**Patterns:** OC-066, OC-071
**Auditors:** INJ-05
**Risk:** HIGH

AI generates settings update endpoints using `_.merge(config, req.body)` or `Object.assign(defaults, req.body)` without filtering `__proto__` properties, enabling prototype pollution.

```typescript
// AI-generated (VULNERABLE)
const settings = _.merge({}, defaults, req.body);

// What it should generate
const validated = settingsSchema.parse(req.body);
Object.assign(settings, validated);
```

**Why AI does this:** `_.merge` is a clean one-liner. Schema validation requires defining a schema, which adds boilerplate the AI avoids.

**Detection:** Search for `_.merge(`, `_.defaultsDeep(`, or `Object.assign(` with `req.body`.

---

## AIP-035: Dynamic require() for Plugin Loading

**Patterns:** OC-078
**Auditors:** INJ-02
**Risk:** HIGH

AI generates plugin or locale loading systems using `require(userInput)` or `` require(`./plugins/${name}`) `` without validating the name against an allowlist. Attackers can load arbitrary modules.

```typescript
// AI-generated (VULNERABLE)
const plugin = require(`./plugins/${req.body.pluginName}`);

// What it should generate
const PLUGINS = { chart: require('./plugins/chart'), table: require('./plugins/table') };
const plugin = PLUGINS[req.body.pluginName];
if (!plugin) return res.status(404).send('Unknown plugin');
```

**Why AI does this:** Dynamic `require()` is more flexible and requires less upfront enumeration. The AI generates "general" solutions.

**Detection:** Search for `require(` or `import(` with template literals containing `req.`.

---

## AIP-036: Building LDAP Filters with String Concatenation

**Patterns:** OC-075
**Auditors:** INJ-01
**Risk:** HIGH

AI generates LDAP authentication code with string-concatenated filters, directly interpolating username into the LDAP query without escaping metacharacters.

```typescript
// AI-generated (VULNERABLE)
const filter = `(&(uid=${username})(userPassword=${password}))`;

// What it should generate
const filter = `(uid=${escapeLdapFilter(username)})`;
// Then use LDAP bind for password verification
```

**Why AI does this:** String interpolation is the natural way to build query strings. LDAP escaping functions are niche and rarely in training data.

**Detection:** Search for LDAP filter patterns `(uid=`, `(cn=`, `(sAMAccountName=` with `${`.

---

## AIP-037: User Input in regex Without Escaping

**Patterns:** OC-079
**Auditors:** INJ-02, ERR-03
**Risk:** MEDIUM

AI generates search features using `new RegExp(userInput)` without escaping regex metacharacters, enabling ReDoS attacks and regex injection.

```typescript
// AI-generated (VULNERABLE)
const matches = items.filter(i => new RegExp(req.query.search, 'i').test(i.name));

// What it should generate
const escaped = req.query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const matches = items.filter(i => new RegExp(escaped, 'i').test(i.name));
```

**Why AI does this:** `new RegExp(input)` is the standard way to create dynamic patterns. Escaping adds complexity the AI skips.

**Detection:** Search for `new RegExp(req.` or `RegExp(` with user-sourced variables.

---

## AIP-038: Logging User Input Without Sanitization

**Patterns:** OC-077
**Auditors:** INJ-01, DATA-04
**Risk:** MEDIUM

AI generates logging statements that interpolate user input with template literals (`console.log(\`User: ${username}\``), enabling log injection via newline characters.

```typescript
// AI-generated (VULNERABLE)
console.log(`Login attempt: ${req.body.username}`);

// What it should generate
logger.info({ username: req.body.username, event: 'login_attempt' });
```

**Why AI does this:** `console.log` with template literals is the simplest logging pattern. Structured logging requires library setup.

**Detection:** Search for `console.log(` with `req.body`, `req.query`, or `req.params`.

---

## AIP-039: YAML Parsing with Unsafe Load

**Patterns:** OC-068
**Auditors:** INJ-05
**Risk:** CRITICAL

AI generates YAML configuration loading using `yaml.load()` (js-yaml) which in version 3 allows JavaScript type execution. The safe alternative `yaml.safeLoad()` (v3) or the default safe schema (v4) is not used.

```typescript
// AI-generated (VULNERABLE)
const config = yaml.load(userYamlString);

// What it should generate
const config = yaml.load(userYamlString, { schema: yaml.FAILSAFE_SCHEMA });
// Or use the 'yaml' package instead of 'js-yaml'
```

**Why AI does this:** `yaml.load()` is the obvious function name. The AI does not distinguish between v3 (unsafe default) and v4 (safe default) behavior.

**Detection:** Search for `yaml.load(` without explicit schema specification, especially in js-yaml v3 projects.

---

## AIP-040: GraphQL Resolvers Without Input Validation

**Patterns:** OC-080
**Auditors:** INJ-01, API-02
**Risk:** MEDIUM

AI generates GraphQL resolvers that trust argument types from the schema without runtime validation. GraphQL type validation only ensures type correctness, not business logic safety. Batch mutations and aliases are not limited.

```typescript
// AI-generated (VULNERABLE)
const resolvers = {
  Mutation: {
    login: async (_, { email, password }) => {
      // No rate limiting, no batch protection
      const user = await User.findOne({ email });
      if (user && await bcrypt.compare(password, user.password)) {
        return { token: generateToken(user) };
      }
      throw new Error('Invalid credentials');
    }
  }
};

// What it should generate: rate limiting per operation, alias limiting, batch controls
```

**Why AI does this:** AI focuses on the happy path of resolver logic. Rate limiting, alias counting, and batch controls are infrastructure concerns the AI does not consider.

**Detection:** Search for GraphQL resolvers handling login/auth without rate limiting middleware.
