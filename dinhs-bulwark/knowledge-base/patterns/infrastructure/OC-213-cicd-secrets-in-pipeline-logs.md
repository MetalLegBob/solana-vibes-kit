# OC-213: CI/CD Secrets in Pipeline Logs

**Category:** Infrastructure
**Severity:** HIGH
**Auditors:** INFRA-02
**CWE:** CWE-532 (Insertion of Sensitive Information into Log File)
**OWASP:** A09:2021 - Security Logging and Monitoring Failures

## Description

CI/CD pipelines frequently leak secrets into build logs through echo statements, verbose command output, debug flags, and error messages. Most CI/CD platforms (GitHub Actions, GitLab CI, Jenkins) automatically mask secrets that are defined as platform-level secrets, but this masking is trivially bypassed. If a secret is base64-encoded, reversed, split across multiple log lines, or used in a URL, the masking fails to detect it.

A common pattern is `echo $SECRET` for debugging, but more subtle leaks occur when tools print their configuration (e.g., `npm config list` exposing registry tokens), when error messages include credentials (e.g., `401 Unauthorized for https://user:pass@registry.com`), or when `set -x` is enabled in shell scripts (which prints every command and its expanded arguments).

Pipeline logs are often accessible to all repository contributors, stored indefinitely, and sometimes forwarded to log aggregation systems. The tj-actions/changed-files supply chain attack (March 2025) specifically targeted GitHub Actions workflows to exfiltrate repository secrets via build logs.

## Detection

```
# Search CI/CD configs for echo of secret variables
grep -rn "echo.*\$\{\{.*secret" **/.github/workflows/*.yml
grep -rn "echo.*\$SECRET\|echo.*\$TOKEN\|echo.*\$PASSWORD" **/*.yml **/*.sh

# Search for set -x (prints all commands with expanded variables)
grep -rn "set -x" **/.github/workflows/*.yml **/.gitlab-ci.yml **/*.sh

# Search for verbose/debug flags that dump config
grep -rn "\-\-verbose\|\-v\|DEBUG=\*\|DEBUG=true\|LOG_LEVEL=debug" **/.github/workflows/*.yml

# Search for npm config list or pip config (dumps credentials)
grep -rn "npm config list\|pip config list\|env\b\|printenv" **/*.yml **/*.sh

# Search for curl with credentials in URL
grep -rn "curl.*://.*:.*@" **/*.yml **/*.sh
```

## Vulnerable Code

```yaml
# .github/workflows/deploy.yml
name: Deploy
on: push
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Debug credentials
        run: |
          # Direct secret echo - masked by GitHub but easily bypassed
          echo "Token: ${{ secrets.DEPLOY_TOKEN }}"

          # Base64 bypasses masking
          echo "${{ secrets.DEPLOY_TOKEN }}" | base64

          # set -x prints expanded commands including secrets
          set -x
          curl -H "Authorization: Bearer ${{ secrets.API_KEY }}" https://api.example.com/deploy

      - name: Build with verbose output
        run: |
          # npm config list exposes registry tokens
          npm config list
          npm ci --loglevel verbose
        env:
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

## Secure Code

```yaml
# .github/workflows/deploy.yml
name: Deploy
on: push
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy
        run: |
          # Never echo secrets, even for debugging
          # Use set +x to prevent command tracing
          set +x

          # Use environment variables, not inline interpolation
          curl -sf -H "Authorization: Bearer ${DEPLOY_TOKEN}" \
            https://api.example.com/deploy
        env:
          DEPLOY_TOKEN: ${{ secrets.DEPLOY_TOKEN }}

      - name: Build
        run: |
          # Configure registry without exposing token in logs
          echo "//registry.npmjs.org/:_authToken=${NPM_TOKEN}" > .npmrc
          npm ci --loglevel warn  # Not verbose
          rm -f .npmrc
        env:
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}

      - name: Mask custom values
        run: |
          # Register dynamic values for masking
          echo "::add-mask::${DYNAMIC_SECRET}"
          ./deploy.sh
        env:
          DYNAMIC_SECRET: ${{ secrets.DYNAMIC_SECRET }}
```

## Impact

An attacker who obtains CI/CD logs containing secrets can:
- Access production systems using leaked deployment credentials
- Push malicious code using leaked repository tokens
- Access private registries and package repositories
- Impersonate service accounts
- Exfiltrate data from connected cloud services
- In public repositories, anyone can view workflow logs

## References

- tj-actions/changed-files supply chain attack (March 2025) - secret exfiltration via CI logs
- Unit 42: GitHub Actions Supply Chain Attack targeting Coinbase (March 2025)
- GitHub Security: "Keeping secrets out of your Actions logs"
- CWE-532: https://cwe.mitre.org/data/definitions/532.html
- OWASP CI/CD Security: https://owasp.org/www-project-top-10-ci-cd-security-risks/
