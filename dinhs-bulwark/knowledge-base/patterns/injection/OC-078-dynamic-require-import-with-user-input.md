# OC-078: Dynamic require/import with User Input

**Category:** Injection
**Severity:** HIGH
**Auditors:** INJ-02
**CWE:** CWE-94
**OWASP:** A03:2021 Injection

## Description

Dynamic `require()` or `import()` with user-controlled input allows attackers to load arbitrary Node.js modules, potentially achieving code execution. When a user-supplied string is passed to `require()` or the dynamic `import()` function, an attacker can load built-in modules (`child_process`, `fs`) or navigate the filesystem to load malicious modules.

This vulnerability commonly appears in plugin systems, theme loaders, and localization (i18n) modules where the module name is derived from user input. Even if the intended modules are in a specific directory, an attacker can use path traversal (`../../`) to load modules from elsewhere, or use bare module names to load Node.js built-in modules.

The `require()` function resolves modules from `node_modules`, built-in modules, and relative paths. An attacker providing `child_process` as input gets direct access to command execution. With `import()`, the same risk applies, and the dynamic nature makes static analysis harder.

## Detection

```
# Dynamic require with variable
require\(.*req\.(body|query|params)
require\(`.*\$\{
require\(.*\+.*req\.
require\(.*variable
# Dynamic import with variable
import\(.*req\.(body|query|params)
import\(`.*\$\{
# Plugin/theme loading patterns
require\(.*plugin
require\(.*theme
require\(.*locale
require\(.*module
```

## Vulnerable Code

```typescript
// VULNERABLE: Dynamic require with user-controlled path
app.get('/api/:module/:action', (req, res) => {
  const { module, action } = req.params;
  const handler = require(`./handlers/${module}`);
  // Attacker: /api/../../node_modules/child_process/exec
  const result = handler[action](req.query);
  res.json(result);
});

// VULNERABLE: i18n locale loading
app.get('/set-locale', (req, res) => {
  const { locale } = req.query;
  // Attacker: ?locale=../../../etc/passwd (file read via require)
  // Or: ?locale=child_process (loads built-in module)
  const messages = require(`./locales/${locale}.json`);
  res.json(messages);
});

// VULNERABLE: Plugin system
app.post('/load-plugin', (req, res) => {
  const { pluginName } = req.body;
  const plugin = require(pluginName); // Arbitrary module load
  plugin.init();
});
```

## Secure Code

```typescript
// SAFE: Allowlist of permitted modules
const HANDLERS: Record<string, any> = {
  users: require('./handlers/users'),
  products: require('./handlers/products'),
  orders: require('./handlers/orders')
};

app.get('/api/:module/:action', (req, res) => {
  const { module, action } = req.params;
  const handler = HANDLERS[module];
  if (!handler || typeof handler[action] !== 'function') {
    return res.status(404).json({ error: 'Not found' });
  }
  const result = handler[action](req.query);
  res.json(result);
});

// SAFE: Validate locale against known set
const VALID_LOCALES = ['en', 'es', 'fr', 'de', 'ja', 'zh'];

app.get('/set-locale', (req, res) => {
  const { locale } = req.query;
  if (!VALID_LOCALES.includes(locale)) {
    return res.status(400).json({ error: 'Invalid locale' });
  }
  const messages = require(`./locales/${locale}.json`);
  res.json(messages);
});
```

## Impact

Arbitrary code execution by loading `child_process` or other dangerous modules. File read via `require()` of JSON/text files. Module cache poisoning. In severe cases, full server compromise.

## References

- CWE-94: Improper Control of Generation of Code
- CWE-829: Inclusion of Functionality from Untrusted Control Sphere
- OWASP: Code Injection
- Node.js docs: Module resolution algorithm
- Snyk: 5 ways to prevent code injection in JavaScript and Node.js
