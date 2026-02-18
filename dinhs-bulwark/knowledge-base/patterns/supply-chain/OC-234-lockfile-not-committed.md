# OC-234: Lockfile Not Committed

**Category:** Supply Chain & Dependencies
**Severity:** MEDIUM
**Auditors:** DEP-01
**CWE:** CWE-353 (Missing Support for Integrity Check)
**OWASP:** A08:2021 -- Software and Data Integrity Failures

## Description

When a lockfile (package-lock.json, yarn.lock, pnpm-lock.yaml) is not committed to the repository, every `npm install` or `yarn install` resolves dependency versions dynamically based on semver ranges in package.json. This means different developers, CI runners, and production deployments may receive different dependency trees -- including potentially compromised or vulnerable versions that were published after the original development.

The lockfile is a critical integrity artifact. It records the exact resolved version, integrity hash (SHA-512), and resolved URL for every direct and transitive dependency. Without it, the project is vulnerable to "phantom dependency" attacks where a malicious version published within a valid semver range is silently installed. The @solana/web3.js attack (CVE-2024-54134) exploited exactly this vector: malicious versions 1.95.6 and 1.95.7 were published within the valid range of `^1.95.0`, meaning any project without a lockfile pinning an earlier version would have pulled in the compromised code.

A common antipattern is adding lockfiles to `.gitignore`. This often happens because lockfiles generate noisy diffs, but the security consequence is that the project loses all reproducibility guarantees and becomes vulnerable to time-of-install attacks.

## Detection

```
# Check if lockfile exists in repository
git ls-files package-lock.json yarn.lock pnpm-lock.yaml

# Check if lockfile is in .gitignore
grep -n "package-lock\|yarn.lock\|pnpm-lock" .gitignore

# Check CI for --no-package-lock flag
grep -rn "\-\-no-package-lock\|--no-lockfile" .github/ Dockerfile Makefile
```

Look for: missing lockfile in repository root, lockfile patterns in `.gitignore`, CI scripts using `npm install` instead of `npm ci`, `--no-package-lock` or `--no-lockfile` flags in build scripts.

## Vulnerable Code

```gitignore
# .gitignore -- VULNERABLE: lockfile excluded from version control
node_modules/
package-lock.json
yarn.lock
.env
```

```yaml
# CI pipeline -- VULNERABLE: uses npm install which ignores lockfile integrity
steps:
  - run: npm install
  - run: npm run build
  - run: npm test
```

## Secure Code

```gitignore
# .gitignore -- SECURE: only node_modules excluded, lockfile is tracked
node_modules/
.env
```

```yaml
# CI pipeline -- SECURE: uses npm ci which enforces lockfile
steps:
  - run: npm ci
  - run: npm run build
  - run: npm test
```

## Impact

Without a committed lockfile, an attacker who publishes a malicious version within a valid semver range can compromise any installation that occurs after publication. This is a time-based attack: the project is vulnerable every time dependencies are resolved fresh. In CI/CD environments, this means build-to-build inconsistency and a wide attack window. For Solana applications handling wallet operations, a compromised dependency version installed silently during a CI build could introduce key exfiltration or transaction manipulation code into production.

## References

- CVE-2024-54134: @solana/web3.js malicious versions within valid semver range (December 2024)
- npm documentation: package-lock.json -- https://docs.npmjs.com/cli/v10/configuring-npm/package-lock-json
- Lockfile Poisoning: An Attack Vector (SafeDep, December 2023)
- CWE-353: https://cwe.mitre.org/data/definitions/353.html
- OWASP A08:2021 -- Software and Data Integrity Failures
