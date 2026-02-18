# OC-068: YAML Deserialization RCE

**Category:** Injection
**Severity:** CRITICAL
**Auditors:** INJ-05
**CWE:** CWE-502
**OWASP:** A08:2021 Software and Data Integrity Failures

## Description

YAML deserialization can lead to remote code execution when a YAML parser processes untrusted input with custom type handlers enabled. In JavaScript, the `js-yaml` library (90M+ weekly downloads on npm) had multiple vulnerabilities: versions before 3.13.1 were vulnerable to code execution via `!!js/function` tags that used `new Function()` internally, and CVE-2025-64718 demonstrated prototype pollution via the YAML merge key (`<<`) in versions before 4.1.1.

The `js-yaml` library offers two modes: `safeLoad()` (restricts to standard YAML types) and `load()` (allows JavaScript-specific types including functions and regular expressions). Using `load()` with untrusted input is equivalent to `eval()` — an attacker can embed arbitrary JavaScript in the YAML that gets executed during parsing.

The vulnerability disclosure for js-yaml 3.14.0 by Acylia confirmed that code execution was achievable through crafted YAML documents despite the "possible code execution" fix in the changelog. The `yaml` npm package is a safer alternative that does not support JavaScript-specific types.

## Detection

```
# Unsafe js-yaml usage
yaml\.load\(
js-yaml.*load\(
# Without safeLoad (deprecated in v4, but still dangerous in v3)
require\(['"]js-yaml['"]\)
# YAML parsing with untrusted input
yaml\.parse\(.*req\.
yaml\.load\(.*req\.
# Dangerous YAML tags in input
!!js/function
!!js/regexp
!!js/undefined
!!python/object
```

## Vulnerable Code

```typescript
import yaml from 'js-yaml';
import fs from 'fs';

// VULNERABLE: yaml.load allows JavaScript types
app.post('/import-config', (req, res) => {
  const config = yaml.load(req.body.yamlContent);
  // Attacker sends YAML with:
  // evil: !!js/function 'function(){ return process.mainModule.require("child_process").execSync("id").toString() }'
  res.json({ config });
});

// VULNERABLE: Loading untrusted YAML files
app.post('/upload-config', upload.single('config'), (req, res) => {
  const content = fs.readFileSync(req.file.path, 'utf8');
  const config = yaml.load(content); // Unsafe — allows JS types
  applyConfig(config);
  res.json({ applied: true });
});
```

## Secure Code

```typescript
import yaml from 'js-yaml';

// SAFE: Use safeLoad (js-yaml v3) or load with SAFE_SCHEMA (v4)
app.post('/import-config', (req, res) => {
  try {
    // js-yaml v4: load uses safe schema by default
    // But explicitly specify for clarity
    const config = yaml.load(req.body.yamlContent, {
      schema: yaml.FAILSAFE_SCHEMA // Most restrictive
    });
    // Validate the parsed config shape
    const validated = configSchema.parse(config);
    res.json({ config: validated });
  } catch (e) {
    res.status(400).json({ error: 'Invalid YAML configuration' });
  }
});

// SAFEST: Use the 'yaml' package (YAML 1.2, no JS types)
import { parse } from 'yaml';
app.post('/import-config', (req, res) => {
  const config = parse(req.body.yamlContent);
  res.json({ config });
});
```

## Impact

Remote code execution via arbitrary JavaScript function execution during YAML parsing. Prototype pollution via YAML merge keys affecting all objects in the application. Configuration manipulation and data exfiltration.

## References

- CVE-2025-64718: js-yaml prototype pollution via merge key (CVSS 5.3)
- CVE-2017-1000228: js-yaml code execution via deserialization
- GHSA-mh29-5h37-fv8m: js-yaml prototype pollution in merge
- Acylia: Vulnerability Disclosure — js-yaml 3.14.0 code execution
- Snyk: Preventing insecure deserialization in Node.js
