# OC-066: Prototype Pollution via Deep Merge

**Category:** Injection
**Severity:** HIGH
**Auditors:** INJ-05
**CWE:** CWE-1321
**OWASP:** A03:2021 Injection

## Description

Prototype pollution via deep merge occurs when a recursive object merge function processes user-controlled input without filtering dangerous properties like `__proto__`, `constructor`, or `prototype`. By setting `__proto__` properties on an input object, an attacker can inject properties into `Object.prototype`, affecting all objects in the application.

This vulnerability class has been found in widely-used packages including lodash (`_.merge`, `_.defaultsDeep`), jQuery (`$.extend`), hoek, and minimist. The "Silent Spring" research (CISPA, 2023) demonstrated a semi-automated approach to finding RCE gadgets from prototype pollution, exploiting 8 RCE vulnerabilities in high-profile applications including NPM CLI and Parse Server.

A prototype pollution gadget in MongoDB's Node.js driver (2024) demonstrated that polluting `Object.prototype.shell` could lead to RCE because `child_process.spawn` reads the `shell` option from the options object, falling back to the prototype chain.

## Detection

```
# Deep merge patterns
Object\.assign\(
deepMerge|deepExtend|merge\(
_.merge\(|_.defaultsDeep\(|_.set\(
# Recursive object assignment
\[key\]\s*=.*\[key\]
for.*in.*Object
Object\.keys.*forEach.*\[
# JSON parsing without sanitization
JSON\.parse\(.*req\.(body|query)
# Known vulnerable patterns
__proto__
constructor.*prototype
```

## Vulnerable Code

```typescript
// VULNERABLE: Custom deep merge without __proto__ filtering
function deepMerge(target: any, source: any): any {
  for (const key in source) {
    if (typeof source[key] === 'object' && source[key] !== null) {
      if (!target[key]) target[key] = {};
      deepMerge(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
  return target;
}

app.put('/settings', (req, res) => {
  const userSettings = req.body;
  // Attacker sends: {"__proto__": {"isAdmin": true}}
  deepMerge(config, userSettings);
  // Now ALL objects have isAdmin === true
  res.json({ updated: true });
});
```

## Secure Code

```typescript
// SAFE: Filter dangerous keys in merge
function safeDeepMerge(target: any, source: any): any {
  const DANGEROUS_KEYS = ['__proto__', 'constructor', 'prototype'];

  for (const key of Object.keys(source)) {
    if (DANGEROUS_KEYS.includes(key)) continue;

    if (typeof source[key] === 'object' && source[key] !== null
        && !Array.isArray(source[key])) {
      if (!target[key]) target[key] = Object.create(null);
      safeDeepMerge(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
  return target;
}

// SAFE: Use Object.create(null) for config objects
const config = Object.create(null);

// SAFE: Use Map for user-controlled key-value data
const userPrefs = new Map<string, any>();

// SAFE: Schema validation rejects __proto__
import { z } from 'zod';
const settingsSchema = z.object({
  theme: z.enum(['light', 'dark']),
  language: z.string().max(5)
}).strict();
```

## Impact

Application-wide property injection affecting security checks (isAdmin, isAuthenticated). Denial of service via poisoning `toString()` or `valueOf()`. When combined with gadget chains, prototype pollution leads to remote code execution.

## References

- CVE-2025-55182: Next.js prototype pollution to RCE (React2Shell, CVSS 10.0)
- CWE-1321: Improperly Controlled Modification of Object Prototype Attributes
- Silent Spring: Prototype Pollution Leads to RCE in Node.js (CISPA, 2023)
- MongoDB prototype pollution gadget leading to RCE (2024)
- Snyk: Prototype pollution in lodash
