# OC-006: Committed .env File with Real Secrets

**Category:** Secrets & Credentials
**Severity:** CRITICAL
**Auditors:** SEC-02
**CWE:** CWE-540 (Inclusion of Sensitive Information in Source Code)
**OWASP:** A05:2021 – Security Misconfiguration

## Description

The `.env` file is the de facto standard for storing environment-specific configuration including secrets like API keys, database passwords, and private keys. When this file is committed to version control, every secret it contains becomes permanently accessible in git history, even if the file is later added to `.gitignore` and removed.

Palo Alto Networks Unit 42 (August 2024) uncovered a massive extortion campaign targeting publicly accessible `.env` files on web servers, compromising 110,000 domains and extracting 90,000+ credentials. The EMERALDWHALE operation (October 2024, discovered by Sysdig) stole 15,000 cloud credentials specifically by targeting exposed Git configuration and `.env` files. GitGuardian reported that in 2024, `.env` files were among the top sources of leaked secrets, with a 25% year-over-year increase in detected leaks.

The problem is compounded by `.env.example` files that accidentally contain real values instead of placeholders, and by developers who copy `.env.production` files into repositories for "backup."

## Detection

```
git ls-files | grep -E "\.env$|\.env\.(production|staging|local|development)$"
grep -rn "\.env" .gitignore
git log --all --diff-filter=A -- "*.env"
grep -rn "DATABASE_URL\|API_KEY\|SECRET\|PASSWORD\|PRIVATE_KEY" --include="*.env"
grep -rn "sk-\|AKIA\|ghp_\|xox[bpas]-" --include="*.env" --include="*.env.*"
```

Check for: `.env` files tracked by git, `.env` files missing from `.gitignore`, `.env.example` files containing actual credentials, `.env` files in Docker build contexts.

## Vulnerable Code

```
# .env (committed to repository)
DATABASE_URL=postgresql://admin:p4ssw0rd_pr0d@db.example.com:5432/myapp
SOLANA_PRIVATE_KEY=[174,47,154,16,202,193,206,113,199,190,53,133]
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
STRIPE_SECRET_KEY=sk_live_51H7...
OPENAI_API_KEY=sk-proj-abc123...
```

```typescript
// Code loading secrets from .env — not inherently vulnerable,
// but dangerous when the .env file is committed to git
import dotenv from "dotenv";
dotenv.config();

const dbUrl = process.env.DATABASE_URL;  // Exposed if .env is committed
```

## Secure Code

```
# .env.example (committed — contains only placeholders)
DATABASE_URL=postgresql://user:password@host:5432/dbname
SOLANA_PRIVATE_KEY=<path-to-keypair-file>
AWS_ACCESS_KEY_ID=<your-aws-key>
AWS_SECRET_ACCESS_KEY=<your-aws-secret>
STRIPE_SECRET_KEY=sk_test_...
OPENAI_API_KEY=sk-proj-...

# .gitignore (must include all env files with real values)
.env
.env.local
.env.production
.env.staging
.env.*.local
```

```typescript
// Pre-commit hook to prevent .env commits (using husky + lint-staged)
// .husky/pre-commit:
// gitleaks detect --source . --verbose --redact
```

## Impact

Committed `.env` files expose all secrets to anyone with repository access — and potentially to the public if the repo is open source or becomes so. Even in private repos, every developer, CI system, and fork receives the secrets. Because git stores full history, deleting the file later does not remove it from past commits. Attackers who gain access to any backup or clone of the repository obtain all secrets permanently.

## References

- Palo Alto Unit 42: 110,000 domains compromised via exposed .env files (August 2024)
- Sysdig EMERALDWHALE: 15,000 credentials stolen from exposed Git configs (October 2024)
- GitGuardian 2025 State of Secrets Sprawl: 25% YoY increase in leaked secrets
- CWE-540: https://cwe.mitre.org/data/definitions/540.html
- GitHub: Remediating a leaked secret in your repository — https://docs.github.com/en/code-security/secret-scanning
