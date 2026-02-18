# OC-056: Code Injection via eval()

**Category:** Injection
**Severity:** CRITICAL
**Auditors:** INJ-02
**CWE:** CWE-94
**OWASP:** A03:2021 Injection

## Description

Code injection via `eval()` and related dynamic code execution functions (`new Function()`, `setTimeout(string)`, `setInterval(string)`) occurs when user-controlled data is passed to these functions, allowing arbitrary JavaScript execution on the server.

CVE-2026-1245 demonstrated this with the `new Function()` constructor in a Node.js binary parser library, where user-supplied field names were interpolated into generated code strings, achieving full RCE. The `safe-eval` and `safe-eval-2` npm packages, designed as secure alternatives to `eval()`, were repeatedly found vulnerable to sandbox escapes using prototype chain traversal — attackers used `hasOwnProperty.__proto__.constructor` to access the process object and execute system commands.

The js-yaml library before version 3.13.1 was vulnerable to code execution through its YAML deserialization which used `new Function()` internally. This pattern of libraries using `eval()` or `Function()` for performance optimization is a recurring source of RCE vulnerabilities in the Node.js ecosystem.

## Detection

```
# Direct eval usage
eval\(
eval\(`
# Function constructor
new Function\(
Function\(
# String-based setTimeout/setInterval
setTimeout\([`'"]
setInterval\([`'"]
# vm module (often bypassed)
vm\.runInNewContext
vm\.createScript
vm2
```

## Vulnerable Code

```typescript
// VULNERABLE: eval with user input
app.post('/calculate', (req, res) => {
  const { expression } = req.body;
  const result = eval(expression);
  res.json({ result });
  // Attacker: expression = "process.mainModule.require('child_process').execSync('id').toString()"
});

// VULNERABLE: Function constructor
app.post('/template', (req, res) => {
  const { code } = req.body;
  const fn = new Function('data', code);
  const result = fn(templateData);
  res.json({ result });
});

// VULNERABLE: setTimeout with string
const handler = req.body.callback;
setTimeout(`handleCallback('${handler}')`, 1000);
```

## Secure Code

```typescript
import { evaluate } from 'mathjs';

// SAFE: Use a math expression parser instead of eval
app.post('/calculate', (req, res) => {
  const { expression } = req.body;
  try {
    // mathjs safely evaluates math expressions without code execution
    const result = evaluate(expression);
    res.json({ result });
  } catch {
    res.status(400).json({ error: 'Invalid expression' });
  }
});

// SAFE: Use JSON.parse instead of eval for data parsing
app.post('/parse', (req, res) => {
  try {
    const data = JSON.parse(req.body.data);
    res.json({ parsed: data });
  } catch {
    res.status(400).json({ error: 'Invalid JSON' });
  }
});
```

## Impact

Full remote code execution. An attacker can execute any JavaScript code in the context of the Node.js process, including spawning child processes, reading the filesystem, accessing environment variables (secrets, database credentials), and establishing reverse shells.

## References

- CVE-2026-1245: Node.js binary parser RCE via new Function() (CWE-94)
- CVE-2017-1000228: js-yaml code execution via deserialization
- CWE-94: Improper Control of Generation of Code ('Code Injection')
- Snyk: 5 ways to prevent code injection in JavaScript and Node.js
- Node.js Security: Disclosing code injection vulnerabilities in safe-eval-2
