# OC-067: Prototype Pollution to RCE via Gadget Chain

**Category:** Injection
**Severity:** CRITICAL
**Auditors:** INJ-05
**CWE:** CWE-1321
**OWASP:** A03:2021 Injection

## Description

Prototype pollution to RCE requires two components: a prototype pollution source (ability to set properties on `Object.prototype`) and a gadget (application code that reads a polluted property and passes it to a dangerous sink like `child_process.exec()`). When these components align, attackers can achieve remote code execution.

CVE-2025-55182 (React2Shell, CVSS 10.0) demonstrated this devastating combination in Next.js applications running React Server Components. The vulnerability allowed pre-authentication RCE by polluting prototype properties consumed by the server rendering pipeline. Trend Micro confirmed in-the-wild exploitation in December 2025.

The PortSwigger Web Security Academy documented the canonical pattern: polluting `Object.prototype.shell` causes `child_process.spawn()` to use a shell (because it reads `options.shell` from the prototype), then polluting `Object.prototype.env` or `Object.prototype.NODE_OPTIONS` enables code injection through the spawned process.

## Detection

```
# Prototype pollution sources (see OC-066)
__proto__
constructor\.prototype
# Gadget patterns — properties read from prototype chain
options\.(shell|env|execPath|nodePath)
child_process\.(spawn|exec|fork)
# Properties commonly used as gadgets
\.shell\b
\.env\b
\.NODE_OPTIONS
\.sourceMappingURL
\.outputFunctionName
# EJS gadget
opts\.outputFunctionName
```

## Vulnerable Code

```typescript
// Source: prototype pollution via deep merge (see OC-066)
// Gadget: child_process.spawn reads shell from prototype

import { spawn } from 'child_process';

// Application has a prototype pollution vulnerability elsewhere
// Attacker sets: Object.prototype.shell = true
// Attacker sets: Object.prototype.env = {NODE_OPTIONS: "--require /proc/self/environ"}

function runCommand(cmd: string, args: string[]) {
  // VULNERABLE: spawn reads `shell` and `env` from options object
  // If options = {}, spawn checks options.shell which falls through
  // to Object.prototype.shell (polluted to true)
  const child = spawn(cmd, args, {});
  return child;
}

// EJS gadget — polluting outputFunctionName
// Object.prototype.outputFunctionName = "x;process.mainModule.require('child_process').execSync('id');x"
// EJS template rendering then executes the polluted function name
```

## Secure Code

```typescript
import { spawn } from 'child_process';

function runCommand(cmd: string, args: string[]) {
  // SAFE: Explicitly set all security-sensitive options
  const child = spawn(cmd, args, {
    shell: false,          // Explicit, not relying on prototype
    env: process.env,      // Explicit environment
    cwd: '/app'            // Explicit working directory
  });
  return child;
}

// SAFE: Freeze Object.prototype (aggressive but effective)
// Only in controlled environments — may break some libraries
Object.freeze(Object.prototype);

// SAFE: Use Object.create(null) for option objects
function buildOptions(): Record<string, any> {
  const opts = Object.create(null);
  opts.shell = false;
  opts.timeout = 5000;
  return opts;
}

// SAFE: Input validation prevents pollution at source
import { z } from 'zod';
const schema = z.object({
  name: z.string(),
  value: z.number()
}).strict(); // .strict() rejects extra properties
```

## Impact

Full remote code execution without authentication. Complete server compromise. The CVE-2025-55182 (React2Shell) was rated CVSS 10.0 and was actively exploited in the wild.

## References

- CVE-2025-55182: React2Shell — Prototype pollution to RCE in Next.js (CVSS 10.0)
- Trend Micro: CVE-2025-55182 Analysis, PoC Chaos, and In-the-Wild Exploitation
- Silent Spring: Prototype Pollution Leads to RCE in Node.js (CISPA, 2023)
- PortSwigger: Remote code execution via server-side prototype pollution
- MongoDB NPM package prototype pollution gadget to RCE (2024)
