# OC-071: JSON Prototype Pollution (__proto__)

**Category:** Injection
**Severity:** HIGH
**Auditors:** INJ-05
**CWE:** CWE-1321
**OWASP:** A03:2021 Injection

## Description

JSON prototype pollution occurs when `JSON.parse()` processes untrusted input containing `__proto__` keys, and the resulting object is then used in operations that traverse the prototype chain (deep merge, deep clone, object spread with recursive assignment). While `JSON.parse()` itself creates objects with `__proto__` as a regular property, the pollution occurs when this property is consumed by recursive operations.

Express.js body parsers parse JSON request bodies and deliver objects that may contain `__proto__` properties. If these objects flow into lodash `_.merge()`, custom deep-copy functions, or configuration updates, prototype pollution occurs.

The js-yaml CVE-2025-64718 demonstrated that the YAML merge key (`<<`) could be abused for prototype pollution in parsed documents. Express middleware libraries like `qs` (query string parser) also parse nested objects from query strings, enabling pollution via `?__proto__[isAdmin]=true`.

## Detection

```
# __proto__ in code
__proto__
constructor\.prototype
# Express body parsing without filtering
express\.json\(\)
bodyParser\.json\(\)
# Query string parsing with objects
qs\.parse
extended:\s*true
# Object operations after parsing
Object\.assign\(.*req\.body
_.merge\(.*req\.body
{...req\.body}
```

## Vulnerable Code

```typescript
import express from 'express';
import _ from 'lodash';

const app = express();
app.use(express.json());

const defaultConfig = {
  theme: 'light',
  notifications: true
};

app.put('/preferences', (req, res) => {
  // VULNERABLE: lodash merge with user input
  // Attacker sends: {"__proto__": {"isAdmin": true}}
  const prefs = _.merge({}, defaultConfig, req.body);
  res.json(prefs);
  // Now: ({}).isAdmin === true for ALL objects
});

// Also vulnerable via query string
// GET /search?__proto__[polluted]=true
app.get('/search', (req, res) => {
  const opts = { ...defaults };
  Object.assign(opts, req.query); // Pollution via query params
  performSearch(opts);
});
```

## Secure Code

```typescript
import express from 'express';
import { z } from 'zod';

const app = express();
app.use(express.json());

// SAFE: Schema validation strips unknown properties
const preferencesSchema = z.object({
  theme: z.enum(['light', 'dark']).optional(),
  notifications: z.boolean().optional()
}).strict(); // Reject any extra keys

app.put('/preferences', (req, res) => {
  const prefs = preferencesSchema.parse(req.body);
  // Only validated properties survive — __proto__ rejected
  Object.assign(defaultConfig, prefs);
  res.json(defaultConfig);
});

// SAFE: Sanitize parsed objects
function sanitizeObject(obj: any): any {
  if (typeof obj !== 'object' || obj === null) return obj;
  const clean = Object.create(null);
  for (const key of Object.keys(obj)) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
    clean[key] = sanitizeObject(obj[key]);
  }
  return clean;
}

// SAFE: Use Map for user-controlled key-value pairs
const userSettings = new Map<string, any>();
```

## Impact

Application-wide property injection. Bypass of authorization checks (polluting `isAdmin`, `role`). Denial of service via poisoning `toString()`. When combined with gadget chains (OC-067), leads to remote code execution.

## References

- CVE-2025-64718: js-yaml prototype pollution via __proto__ in merge key
- CWE-1321: Improperly Controlled Modification of Object Prototype Attributes
- OWASP: Prototype Pollution Prevention Cheat Sheet
- HackerOne: Prototype pollution reports
- Lodash CVE-2020-8203: Prototype pollution in zipObjectDeep
