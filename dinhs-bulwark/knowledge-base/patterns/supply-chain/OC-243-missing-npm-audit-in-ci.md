# OC-243: Missing npm/yarn audit in CI

**Category:** Supply Chain & Dependencies
**Severity:** LOW
**Auditors:** DEP-01
**CWE:** CWE-1035 (OWASP Top Ten 2017 Category A9 -- Using Components with Known Vulnerabilities)
**OWASP:** A06:2021 -- Vulnerable and Outdated Components

## Description

The absence of automated dependency auditing in the CI/CD pipeline means that known vulnerabilities in dependencies are not caught before code reaches production. While `npm audit` is a simple, free, built-in tool, many projects fail to integrate it as a required pipeline step. This means that developers can add or update dependencies with critical CVEs without any automated gate preventing deployment.

The 2025-2026 attack landscape has made CI-integrated auditing non-optional. The Bastion 2026 Defense Guide states explicitly: "'just run npm audit' is no longer adequate" for modern supply chain threats -- but not running it at all is far worse. The tool catches known advisories from the GitHub Advisory Database (GHSA), which aggregates CVEs, npm advisories, and community-reported vulnerabilities. Without this check in CI, a project may run with dependencies that have been publicly reported as compromised for weeks or months.

The September 2025 npm attack (18 packages, 2.6 billion weekly downloads) demonstrated that even a basic `npm audit` would have flagged compromised packages within hours of the advisory being published -- but only if audit was actually running as part of the build pipeline. Organizations without automated auditing had to rely on manual discovery, social media alerts, or Dependabot notifications, all of which have latency measured in hours to days.

## Detection

```
# Check CI configuration for audit step
grep -rn "npm audit\|yarn audit\|pnpm audit\|audit-ci\|snyk test" \
  .github/workflows/ .gitlab-ci.yml Jenkinsfile .circleci/ bitbucket-pipelines.yml 2>/dev/null

# Check package.json for audit scripts
grep -n "audit" package.json

# Check if audit is part of precommit or pre-push hooks
cat .husky/pre-commit .husky/pre-push 2>/dev/null | grep -i audit
```

Look for: absence of `npm audit`, `yarn audit`, `pnpm audit`, `audit-ci`, or `snyk test` in any CI configuration file, no Dependabot or Renovate configuration, no pre-commit hooks checking for vulnerabilities.

## Vulnerable Code

```yaml
# .github/workflows/ci.yml -- VULNERABLE: no audit step
name: CI
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run build
      - run: npm test
```

## Secure Code

```yaml
# .github/workflows/ci.yml -- SECURE: audit step with severity threshold
name: CI
on: [push, pull_request]
jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci --ignore-scripts
      - run: npx audit-ci --critical
      # Or: npm audit --audit-level=critical

  build:
    needs: audit
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run build
      - run: npm test
```

```yaml
# .github/dependabot.yml -- Automated vulnerability alerting
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "daily"
    open-pull-requests-limit: 20
```

## Impact

Without automated auditing in CI, known-vulnerable dependencies proceed to production undetected. The lag between CVE publication and manual developer awareness can range from hours to months. During this window, the application runs exploitable code. For critical vulnerabilities like CVE-2024-54134 (@solana/web3.js), this means the application may be draining user wallets while the development team remains unaware. Automated CI auditing reduces this window to the build cycle time -- typically minutes.

## References

- Bastion: npm Supply Chain Attacks 2026 Defense Guide -- "just run npm audit is no longer adequate"
- September 2025 npm attack: 18 packages, 2.6B weekly downloads -- detectable via npm audit
- npm audit documentation: https://docs.npmjs.com/cli/v10/commands/npm-audit
- audit-ci: CI-friendly npm audit wrapper -- https://github.com/IBM/audit-ci
- Qualys: Responding to the NPM Supply Chain Attack (September 2025)
- CWE-1035: https://cwe.mitre.org/data/definitions/1035.html
