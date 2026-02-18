# OC-233: Dependency with Known RCE

**Category:** Supply Chain & Dependencies
**Severity:** CRITICAL
**Auditors:** DEP-01
**CWE:** CWE-94 (Improper Control of Generation of Code), CWE-502 (Deserialization of Untrusted Data)
**OWASP:** A06:2021 -- Vulnerable and Outdated Components

## Description

A dependency with a known Remote Code Execution (RCE) vulnerability allows an attacker to execute arbitrary code on the server, build system, or client machine. RCE vulnerabilities in dependencies are the most severe class of supply chain risk because they provide complete system compromise with no additional chaining required.

The npm ecosystem has seen multiple RCE-capable compromises. The event-stream incident (November 2018) remains a canonical example: a malicious maintainer added the flatmap-stream dependency to the popular event-stream package (2 million weekly downloads), injecting encrypted code that specifically targeted the Copay cryptocurrency wallet to steal Bitcoin from accounts with balances over 100 BTC. The attack was surgically designed -- the payload activated only when imported alongside the copay-dash library, making it invisible to most users.

In October 2023, Veracode (formerly Phylum) discovered a campaign of 48 npm packages published by a single user that deployed reverse shells on installation via preinstall and postinstall hooks. Each package used obfuscated JavaScript in an init.js script to establish a remote connection, giving the attacker full shell access to the developer's machine. The Shai-Hulud worm (September 2025) escalated this further with self-replicating malware that used compromised npm tokens to republish infected versions of packages owned by compromised maintainers, creating exponential propagation across the registry.

## Detection

```
npm audit --json | jq '.vulnerabilities | to_entries[] | select(.value.via[].title | test("RCE|remote code|code execution|arbitrary code"; "i"))'

# Check for known RCE-enabling patterns in dependencies
grep -rn "eval\|Function(" node_modules/*/index.js | head -20
grep -rn "child_process\|exec\|spawn" node_modules/*/package.json

# Check for deserialization vulnerabilities
grep -rn "unserialize\|deserialize\|fromJSON" node_modules/*/lib/*.js
```

Look for: dependencies with GHSA advisories mentioning "remote code execution," packages using `eval()`, `Function()`, or `child_process` in unusual contexts, deserialization libraries with known gadget chains.

## Vulnerable Code

```json
{
  "dependencies": {
    "event-stream": "3.3.6",
    "node-serialize": "0.0.4",
    "js-yaml": "3.13.0",
    "vm2": "3.9.17",
    "shell-quote": "1.7.2"
  }
}
```

```javascript
// Application using a dependency with known deserialization RCE
const serialize = require("node-serialize");

app.post("/api/session", (req, res) => {
  const sessionData = serialize.unserialize(req.cookies.session);
  // node-serialize unserialize() executes IIFE payloads: {"rce":"_$$ND_FUNC$$_function(){require('child_process').exec('...')}()"}
  res.json(sessionData);
});
```

## Secure Code

```json
{
  "dependencies": {
    "event-stream": "4.0.1",
    "js-yaml": "^4.1.0",
    "shell-quote": "^1.8.1"
  },
  "overrides": {
    "node-serialize": "npm:safe-serialize@^1.0.0"
  },
  "scripts": {
    "audit:rce": "npm audit --json | node -e \"const d=require('fs').readFileSync('/dev/stdin','utf8');const a=JSON.parse(d);Object.values(a.vulnerabilities||{}).forEach(v=>{if(v.severity==='critical')process.exit(1)})\""
  }
}
```

```javascript
// Secure: Use safe deserialization with schema validation
const yaml = require("js-yaml"); // v4+ removes dangerous yaml.load behavior

app.post("/api/session", (req, res) => {
  // Never deserialize untrusted data with code-executing deserializers
  const sessionData = JSON.parse(req.cookies.session); // JSON.parse is safe
  const validated = sessionSchema.parse(sessionData);   // Zod validation
  res.json(validated);
});
```

## Impact

An attacker exploiting an RCE vulnerability in a dependency gains full code execution on the target system. In a server environment, this means complete compromise: data exfiltration, lateral movement, persistence, and potentially cryptographic key theft. In a build/CI environment, it means access to deployment credentials, npm tokens, and the ability to inject malware into build artifacts. The event-stream attack specifically targeted cryptocurrency wallets, demonstrating that RCE in dependencies is a direct vector for fund theft in blockchain applications.

## References

- event-stream / flatmap-stream incident (November 2018): cryptocurrency wallet theft targeting Copay
- CVE-2017-5941: node-serialize RCE via IIFE in deserialization
- CVE-2023-37466: vm2 sandbox escape RCE (CVSS 9.8)
- Veracode: 48 npm packages deploying reverse shells via install hooks (October 2023)
- Shai-Hulud worm: self-replicating npm malware with RCE payload (September 2025)
- CWE-94: https://cwe.mitre.org/data/definitions/94.html
