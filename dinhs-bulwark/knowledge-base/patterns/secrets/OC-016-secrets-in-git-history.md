# OC-016: Secrets in Git History (Previously Committed)

**Category:** Secrets & Credentials
**Severity:** HIGH
**Auditors:** SEC-02
**CWE:** CWE-540 (Inclusion of Sensitive Information in Source Code)
**OWASP:** A05:2021 – Security Misconfiguration

## Description

Removing a secret from the current version of source code does not remove it from git history. Every previous commit is preserved, and any secret that was ever committed remains accessible through `git log`, `git show`, or by cloning the repository. Simply adding a file to `.gitignore` and deleting it leaves the secret in every previous commit where it existed.

The EMERALDWHALE operation (2024) exploited this by scanning exposed `.git` directories to extract historical secrets from repositories. GitGuardian's research shows that 70% of leaked secrets remain active two years later — meaning even historical commits from years ago contain exploitable credentials. Automated tools like TruffleHog and Gitleaks specifically scan git history for secrets, and attackers use identical techniques.

GitHub's secret scanning service has detected millions of secrets in repository history. GitHub's official remediation guidance emphasizes that the only complete fix is to consider the secret compromised and rotate it, regardless of whether it has been removed from the current codebase.

## Detection

```
# Scan full git history for secrets
gitleaks detect --source . --verbose
trufflehog git file://. --since-commit HEAD~1000

# Manual history search
git log --all -p -S "PRIVATE_KEY" --source
git log --all -p -S "sk-" --source
git log --all -p -S "AKIA" --source
git log --all --diff-filter=D -- "*.env" "*.pem" "*.key"
```

Look for: deleted `.env` files in history, removed key files, commits with messages like "remove secrets" or "fix: remove api key."

## Vulnerable Code

```bash
# VULNERABLE: Developer commits a secret, then "removes" it
$ git add .env
$ git commit -m "initial setup"

# Later realizes the mistake...
$ echo ".env" >> .gitignore
$ git rm --cached .env
$ git commit -m "remove .env from tracking"

# The secret is STILL in the first commit:
$ git show HEAD~1:.env
# DATABASE_URL=postgresql://admin:realPassword@prod-db:5432/app
# SOLANA_PRIVATE_KEY=[174,47,154,...]
```

## Secure Code

```bash
# SECURE: Prevent secrets from ever entering git history

# 1. Set up .gitignore BEFORE creating .env files
echo ".env" >> .gitignore
echo "*.pem" >> .gitignore
echo "*.key" >> .gitignore
git add .gitignore && git commit -m "add secret file patterns to gitignore"

# 2. Install pre-commit hooks to catch secrets before commit
brew install gitleaks
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/sh
gitleaks detect --source . --verbose --redact
EOF
chmod +x .git/hooks/pre-commit

# 3. If a secret WAS committed: rotate it immediately
# Do NOT rely on history rewriting alone — consider the secret burned
# Rotate the credential, THEN clean history if desired:
# git filter-repo --path .env --invert-paths
```

```typescript
// In CI: add secret scanning to pipeline
// .github/workflows/security.yml
// - name: Scan for secrets
//   uses: gitleaks/gitleaks-action@v2
```

## Impact

Any user with clone access to the repository (current or historical) can extract secrets from any past commit. For public repositories, this means anyone on the internet. For private repositories, this includes every developer, every CI system, and every fork that was ever created. Secrets in git history should be treated as fully compromised and must be rotated.

## References

- EMERALDWHALE: Exploiting exposed .git directories for credential theft (Sysdig, 2024)
- GitGuardian 2025: 70% of leaked secrets remain active after 2 years
- GitHub: Remediating a leaked secret — https://docs.github.com/en/code-security/secret-scanning/working-with-secret-scanning-and-push-protection/remediating-a-leaked-secret
- Gitleaks: SAST tool for detecting secrets in git history — https://github.com/gitleaks/gitleaks
- TruffleHog: Secret scanning tool — https://trufflesecurity.com
