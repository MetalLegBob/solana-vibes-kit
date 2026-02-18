# OC-008: Secrets in CI/CD Logs

**Category:** Secrets & Credentials
**Severity:** HIGH
**Auditors:** SEC-02, INFRA-02
**CWE:** CWE-532 (Insertion of Sensitive Information into Log File)
**OWASP:** A09:2021 – Security Logging and Monitoring Failures

## Description

CI/CD pipelines frequently expose secrets in build logs through debugging output, error messages, environment variable dumps, or verbose command output. Even when CI platforms mask known secrets, custom scripts may echo secrets, error handlers may include environment context, and command-line arguments are often logged in full.

The September 2025 NPM supply chain attack ("The Great NPM Heist") demonstrated how compromised CI/CD pipelines can exfiltrate secrets: attackers who gained access to maintainer accounts injected code that could harvest credentials from build environments. The GhostAction attack (September 2025) exfiltrated 3,325 secrets from 817 GitHub repositories by injecting malicious workflows that captured environment variables including PyPI, npm, and DockerHub tokens from CI logs.

In practice, CI logs are often accessible to a wider audience than intended: all repository contributors, security scanners, and sometimes public-facing dashboards. Build logs are also frequently retained for months or years, creating a long-lived exposure window.

## Detection

```
grep -rn "echo.*SECRET\|echo.*KEY\|echo.*PASSWORD\|echo.*TOKEN" --include="*.sh" --include="*.yml" --include="*.yaml"
grep -rn "console\.log.*secret\|console\.log.*key\|console\.log.*password" --include="*.ts" --include="*.js"
grep -rn "printenv\|env\b\|set -x" --include="*.sh" --include="*.yml"
grep -rn "::debug::\|::set-output\|::set-env" --include="*.yml" --include="*.yaml"
```

Review CI configuration files for: verbose flags (`-v`, `--verbose`, `set -x`), debug logging steps, environment dumps, unmasked output commands.

## Vulnerable Code

```yaml
# VULNERABLE: GitHub Actions workflow that leaks secrets in logs
name: Deploy
on: push
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Debug environment
        run: |
          echo "Deploying with key: ${{ secrets.DEPLOY_KEY }}"
          printenv  # Dumps ALL environment variables including secrets
          set -x    # Enables command tracing — shows expanded variables
          npm run deploy
        env:
          SOLANA_PRIVATE_KEY: ${{ secrets.SOLANA_PRIVATE_KEY }}
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

## Secure Code

```yaml
# SECURE: Secrets are never echoed, environment is controlled
name: Deploy
on: push
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy
        run: |
          # Never use set -x with secrets in environment
          # Never echo or printenv
          # Use ::add-mask:: for any dynamic secret values
          npm run deploy
        env:
          SOLANA_PRIVATE_KEY: ${{ secrets.SOLANA_PRIVATE_KEY }}
          DATABASE_URL: ${{ secrets.DATABASE_URL }}

      - name: Verify deployment
        run: |
          # Check deployment health without exposing secrets
          curl -sf https://app.example.com/health || exit 1
```

```typescript
// In application code: never log secrets even at debug level
const logger = createLogger({ level: "info" });

// WRONG: logger.debug("Connecting with key:", process.env.API_KEY);
// RIGHT: logger.debug("Connecting to API service");
```

## Impact

Secrets exposed in CI/CD logs are accessible to anyone with log viewing permissions, which often includes all contributors to a repository. Retained logs extend the exposure window to months or years. Compromised CI/CD credentials enable supply chain attacks, deployment infrastructure takeover, and lateral movement to production environments.

## References

- GhostAction: 3,325 secrets exfiltrated from 817 GitHub repos via malicious workflows (September 2025)
- The Great NPM Heist: Supply chain attack via compromised CI/CD (September 2025)
- CWE-532: Insertion of Sensitive Information into Log File — https://cwe.mitre.org/data/definitions/532.html
- GitHub Docs: Encrypted secrets in GitHub Actions
