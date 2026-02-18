# OC-215: Deployment Credential Over-Scoping

**Category:** Infrastructure
**Severity:** HIGH
**Auditors:** INFRA-02
**CWE:** CWE-269 (Improper Privilege Management)
**OWASP:** A01:2021 - Broken Access Control

## Description

CI/CD pipelines frequently use credentials (cloud IAM roles, deploy keys, API tokens) that have far more permissions than needed for the specific deployment task. A GitHub Actions workflow that only needs to push a Docker image to ECR may use an AWS IAM role with full `AdministratorAccess`. A deploy key meant for updating a Kubernetes deployment may have cluster-admin privileges.

Over-scoped credentials dramatically increase the blast radius when a pipeline is compromised. The March 2025 tj-actions supply chain attack demonstrated this risk: any repository whose CI pipeline had over-scoped secrets (write access to package registries, cloud admin credentials, or organization-level tokens) suffered significantly worse outcomes than those with tightly scoped credentials.

The principle of least privilege is especially critical for CI/CD because pipelines are high-value targets. They run automated code, have access to production secrets, and are often triggered by external events (PRs, webhooks). Every CI secret should be scoped to the minimum permission set needed for the specific job.

## Detection

```
# Search for admin/write permissions in GitHub Actions
grep -rn "permissions:" **/.github/workflows/*.yml
grep -rn "contents: write\|packages: write\|admin" **/.github/workflows/*.yml

# Search for wildcard permissions in workflow
grep -rn "permissions: write-all" **/.github/workflows/*.yml

# Search for broad cloud IAM roles in IaC
grep -rn "AdministratorAccess\|PowerUserAccess\|\*:\*" **/*.tf **/*.yml **/*.json

# Search for overly permissive GITHUB_TOKEN
grep -rn "GITHUB_TOKEN" **/.github/workflows/*.yml | grep -v "permissions:"

# Search for long-lived credentials instead of OIDC
grep -rn "AWS_ACCESS_KEY_ID\|AWS_SECRET_ACCESS_KEY" **/.github/workflows/*.yml **/.gitlab-ci.yml
```

## Vulnerable Code

```yaml
# .github/workflows/deploy.yml
name: Deploy
on: push

# Default permissions: write-all (every job gets full access)
permissions: write-all

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          # Over-scoped: AdministratorAccess when only ECR push is needed
          role-to-assume: arn:aws:iam::123456:role/AdminRole
          aws-region: us-east-1

      - name: Deploy
        run: |
          # This role can do ANYTHING in the AWS account
          aws ecs update-service --cluster prod --service api --force-new-deployment
```

## Secure Code

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]

# Minimal default permissions
permissions:
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    # Job-level permissions - only what this job needs
    permissions:
      contents: read
      id-token: write  # For OIDC token
    steps:
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          # Tightly scoped role: only ECR push + ECS update
          role-to-assume: arn:aws:iam::123456:role/DeployECSRole
          aws-region: us-east-1
          # Short session duration
          role-duration-seconds: 900

      - name: Deploy
        run: |
          aws ecs update-service --cluster prod --service api --force-new-deployment
```

```json
// IAM policy for the deploy role - minimum permissions
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken",
        "ecr:BatchCheckLayerAvailability",
        "ecr:PutImage",
        "ecr:InitiateLayerUpload",
        "ecr:UploadLayerPart",
        "ecr:CompleteLayerUpload"
      ],
      "Resource": "arn:aws:ecr:us-east-1:123456:repository/myapp"
    },
    {
      "Effect": "Allow",
      "Action": ["ecs:UpdateService"],
      "Resource": "arn:aws:ecs:us-east-1:123456:service/prod/api"
    }
  ]
}
```

## Impact

An attacker who compromises a CI/CD pipeline with over-scoped credentials can:
- Access and modify any resource the credential allows (potentially the entire cloud account)
- Exfiltrate data from production databases, S3 buckets, secrets managers
- Deploy malicious infrastructure (cryptominers, backdoors)
- Modify DNS records, IAM policies, or network configurations
- Persist access by creating new IAM users or roles
- The blast radius is proportional to the credential scope

## References

- tj-actions supply chain attack (March 2025) - over-scoped secrets amplified impact
- GitHub: "Automatic token permissions for GitHub Actions"
- AWS IAM Best Practices: https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html
- CWE-269: https://cwe.mitre.org/data/definitions/269.html
- OWASP CI/CD Top 10: CICD-SEC-2 Inadequate Identity and Access Management
