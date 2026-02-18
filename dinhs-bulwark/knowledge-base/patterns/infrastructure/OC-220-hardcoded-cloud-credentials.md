# OC-220: Hardcoded Cloud Credentials

**Category:** Infrastructure
**Severity:** CRITICAL
**Auditors:** INFRA-03, SEC-02
**CWE:** CWE-798 (Use of Hard-coded Credentials)
**OWASP:** A07:2021 - Identification and Authentication Failures

## Description

Hardcoded AWS access keys, GCP service account keys, Azure connection strings, and other cloud credentials in source code, configuration files, or Infrastructure-as-Code templates provide direct access to cloud resources. These credentials frequently end up in version control, where they persist in git history even after being "removed."

GitHub's secret scanning service reports detecting millions of leaked secrets annually. Researchers have demonstrated that leaked AWS keys on public repositories are exploited within minutes of being pushed, with attackers using automated scanners to detect and abuse them. The typical attack pattern is: discover leaked credentials, enumerate permissions, exfiltrate data or deploy cryptominers.

Modern cloud platforms provide alternatives that eliminate the need for long-lived credentials: AWS IAM roles with OIDC federation for CI/CD, GCP Workload Identity, Azure Managed Identities, and instance profiles for compute workloads. Using these mechanisms means there are no credentials to leak.

## Detection

```
# Search for AWS access keys (AKIA prefix)
grep -rn "AKIA[0-9A-Z]\{16\}" **/*.ts **/*.js **/*.py **/*.env* **/*.yml **/*.json **/*.tf

# Search for AWS secret keys (40-char base64)
grep -rn "aws_secret_access_key\|AWS_SECRET_ACCESS_KEY" **/*.ts **/*.js **/*.env* **/*.tf

# Search for GCP service account keys
grep -rn "\"type\":\s*\"service_account\"" **/*.json
grep -rn "GOOGLE_APPLICATION_CREDENTIALS\|GOOGLE_CLOUD_KEYFILE" **/*.env* **/*.yml

# Search for Azure connection strings
grep -rn "AccountKey=\|SharedAccessSignature=\|DefaultEndpointsProtocol=" **/*.ts **/*.js **/*.env*

# Search for generic cloud credentials in code
grep -rn "client_secret\|api_key\|access_token" **/*.ts **/*.js **/*.py | grep -v "node_modules\|\.git"
```

## Vulnerable Code

```typescript
// config.ts - hardcoded AWS credentials
import { S3Client } from "@aws-sdk/client-s3";

const s3Client = new S3Client({
  region: "us-east-1",
  credentials: {
    // These will end up in git history forever
    accessKeyId: "AKIAIOSFODNN7EXAMPLE",
    secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
  },
});
```

```hcl
# main.tf - hardcoded provider credentials
provider "aws" {
  region     = "us-east-1"
  access_key = "AKIAIOSFODNN7EXAMPLE"
  secret_key = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
}
```

## Secure Code

```typescript
// config.ts - use SDK default credential chain
import { S3Client } from "@aws-sdk/client-s3";

// SDK automatically uses: env vars -> shared credentials -> IAM role
// No credentials in code
const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
});
```

```yaml
# .github/workflows/deploy.yml - use OIDC federation
jobs:
  deploy:
    permissions:
      id-token: write
      contents: read
    steps:
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          # OIDC: no long-lived credentials, short-lived tokens only
          role-to-assume: arn:aws:iam::123456:role/DeployRole
          aws-region: us-east-1
```

```hcl
# main.tf - use environment or IAM role, never hardcode
provider "aws" {
  region = "us-east-1"
  # Credentials from environment or instance profile
  # No access_key or secret_key in code
}
```

## Impact

An attacker who obtains hardcoded cloud credentials can:
- Access all resources the credential is authorized for
- Exfiltrate data from storage, databases, and secrets managers
- Deploy infrastructure for cryptomining (bills reaching tens of thousands of dollars)
- Delete or encrypt data for ransom
- Create persistent backdoor accounts or roles
- Credentials in git history are exploitable even after "removal"
- Automated scanners find and exploit leaked keys within minutes

## References

- GitHub Secret Scanning: millions of leaked secrets detected annually
- AWS: "Managing access keys for IAM users" best practices
- CWE-798: https://cwe.mitre.org/data/definitions/798.html
- GitGuardian State of Secrets Sprawl 2024: 12.8M new secrets detected in public repos
- AWS OIDC federation: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_oidc.html
- TruffleHog: https://github.com/trufflesecurity/trufflehog
