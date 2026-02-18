# OC-242: Pinned to Vulnerable Version Range

**Category:** Supply Chain & Dependencies
**Severity:** MEDIUM
**Auditors:** DEP-01
**CWE:** CWE-1395 (Dependency on Vulnerable Third-Party Component)
**OWASP:** A06:2021 -- Vulnerable and Outdated Components

## Description

Version pinning to a vulnerable range occurs when package.json specifies exact versions or narrow ranges that include known-vulnerable versions while excluding available patches. This pattern manifests in two opposite ways, both dangerous: pinning to an exact vulnerable version (e.g., `"lodash": "4.17.20"`) that prevents receiving security patches, or using an overly broad range (e.g., `"lodash": "*"` or `"lodash": ">=4.0.0"`) that accepts any version including potentially compromised future releases.

The tension between stability and security in version ranges is a fundamental challenge. Exact pinning (`"1.2.3"`) provides reproducibility but prevents automatic security patches. Caret ranges (`"^1.2.3"`) allow minor and patch updates but trust that all future minor versions are safe. Tilde ranges (`"~1.2.3"`) allow only patch updates. Wildcard ranges (`"*"`) or greater-than ranges (`">=1.0.0"`) accept anything, including major version bumps that may introduce breaking changes or -- in an attack scenario -- malicious code published under a valid version number.

The @solana/web3.js attack (CVE-2024-54134) illustrated the risk of broad ranges perfectly. Projects specifying `"@solana/web3.js": "^1.95.0"` automatically received the malicious versions 1.95.6 and 1.95.7 when they ran `npm install`. Conversely, projects pinned to `"@solana/web3.js": "1.95.5"` (the last safe version before the compromise) were protected. The correct approach is to use caret ranges with lockfiles: the range expresses compatibility intent while the lockfile pins the exact resolved version, and `npm ci` enforces the lockfile.

## Detection

```
# Find exact-pinned dependencies (no range prefix)
node -e "
  const pkg = require('./package.json');
  const deps = {...pkg.dependencies, ...pkg.devDependencies};
  Object.entries(deps).forEach(([name, ver]) => {
    if (/^\d/.test(ver)) console.log('Exact-pinned:', name, ver);
    if (ver === '*' || ver.startsWith('>=')) console.log('Wildcard/open:', name, ver);
  });
"

# Check if pinned versions have known vulnerabilities
npm audit

# Check for outdated packages with security fixes
npm outdated --long
```

Look for: exact version strings without `^` or `~` prefix, wildcard `*` versions, greater-than-or-equal `>=` ranges, version ranges that span a known-vulnerable version, `latest` tag in dependency specifications.

## Vulnerable Code

```json
{
  "dependencies": {
    "lodash": "4.17.20",
    "@solana/web3.js": "*",
    "express": ">=4.0.0",
    "jsonwebtoken": "latest",
    "axios": "0.21.0"
  }
}
```

## Secure Code

```json
{
  "dependencies": {
    "lodash": "^4.17.21",
    "@solana/web3.js": "^1.95.8",
    "express": "^4.21.0",
    "jsonwebtoken": "^9.0.2",
    "axios": "^1.7.4"
  },
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=9.0.0"
  }
}
```

```yaml
# Dependabot or Renovate configuration for automated updates
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10
    groups:
      security:
        applies-to: security-updates
```

## Impact

Pinning to a vulnerable version means the application runs known-exploitable code indefinitely, while overly broad ranges mean the application will automatically install whatever is published, including malicious versions. Either way, the attacker benefits. In the @solana/web3.js case, projects with `*` or `^1.x.x` ranges that ran `npm install` without lockfile enforcement received malicious versions within the 5-hour attack window. Projects pinned to older vulnerable versions (e.g., lodash 4.17.20 with prototype pollution) remain permanently exposed to known exploitation techniques.

## References

- CVE-2024-54134: @solana/web3.js malicious versions published within valid semver range (December 2024)
- npm semver documentation: https://docs.npmjs.com/about-semantic-versioning
- CVE-2020-8203: lodash prototype pollution in versions below 4.17.21
- Mend Renovate: Automated dependency update management
- CWE-1395: https://cwe.mitre.org/data/definitions/1395.html
