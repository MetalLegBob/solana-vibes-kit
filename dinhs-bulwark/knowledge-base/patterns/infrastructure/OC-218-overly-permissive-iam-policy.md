# OC-218: Overly Permissive IAM Policy

**Category:** Infrastructure
**Severity:** HIGH
**Auditors:** INFRA-03
**CWE:** CWE-269 (Improper Privilege Management)
**OWASP:** A01:2021 - Broken Access Control

## Description

Cloud IAM (Identity and Access Management) policies that grant excessive permissions such as `Action: "*"`, `Resource: "*"`, or managed policies like `AdministratorAccess` violate the principle of least privilege and dramatically expand the blast radius of any credential compromise. Research shows that attackers can go from initial access to full AWS admin in as little as 8 minutes when exposed credentials meet permissive roles and AI-assisted automation.

Overly permissive IAM policies are one of the most common cloud misconfigurations. Sysdig's 2025 research found that machine identities outnumber humans 40,000 to 1 in cloud-native environments, and each carries IAM permissions that teams rarely review. Red Hat's State of Kubernetes Security report found that 90% of organizations experienced at least one container or Kubernetes security incident, with over 50% citing misconfigurations as the leading cause.

The danger is compounded by the fact that IAM policies are often created during initial development with broad permissions "to get things working" and are never tightened before production. Terraform modules and CloudFormation templates frequently ship with wildcard permissions that teams deploy without review.

## Detection

```
# Search Terraform for wildcard permissions
grep -rn '"Action":\s*"\*"\|"Action":\s*\["\*"\]' **/*.tf **/*.json
grep -rn '"Resource":\s*"\*"' **/*.tf **/*.json

# Search for known over-permissive managed policies
grep -rn "AdministratorAccess\|PowerUserAccess\|FullAccess" **/*.tf **/*.yml **/*.json

# Search for broad S3 permissions
grep -rn "s3:\*\|s3:Get\*\|s3:Put\*" **/*.tf **/*.json

# Search CloudFormation for wildcard
grep -rn "Effect.*Allow" **/*.yml **/*.yaml | grep -A2 "Action.*\*"

# Search for IAM policies in CDK
grep -rn "PolicyStatement.*actions.*\['\*'\]" **/*.ts **/*.js
grep -rn "grant.*Admin\|addToPolicy" **/*.ts **/*.js
```

## Vulnerable Code

```hcl
# main.tf - overly permissive IAM role
resource "aws_iam_role_policy" "app_policy" {
  name = "app-policy"
  role = aws_iam_role.app_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = "*"       # Full access to everything
        Resource = "*"       # On all resources
      }
    ]
  })
}

# Or using a managed policy
resource "aws_iam_role_policy_attachment" "admin" {
  role       = aws_iam_role.app_role.name
  policy_arn = "arn:aws:iam::aws:policy/AdministratorAccess"
}
```

## Secure Code

```hcl
# main.tf - least-privilege IAM role
resource "aws_iam_role_policy" "app_policy" {
  name = "app-policy"
  role = aws_iam_role.app_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "ReadAppBucket"
        Effect   = "Allow"
        Action   = [
          "s3:GetObject",
          "s3:ListBucket"
        ]
        Resource = [
          "arn:aws:s3:::my-app-bucket",
          "arn:aws:s3:::my-app-bucket/*"
        ]
      },
      {
        Sid      = "WriteAppLogs"
        Effect   = "Allow"
        Action   = [
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:us-east-1:123456:log-group:/app/*"
      }
    ]
  })
}

# Use IAM Access Analyzer to identify unused permissions
# aws accessanalyzer generate-policy --job-id <id>
```

## Impact

An attacker who obtains credentials with overly permissive IAM policies can:
- Access, modify, or delete any resource in the cloud account
- Exfiltrate data from all S3 buckets, databases, and secrets
- Create persistent IAM users or roles for long-term access
- Modify network configurations, security groups, and firewalls
- Launch compute resources for cryptomining (causing massive bills)
- Delete infrastructure or data (ransomware-style attacks)
- Pivot to other accounts via cross-account trust relationships

## References

- Sysdig 2025: Machine identities outnumber humans 40,000:1 in cloud environments
- Red Hat State of Kubernetes Security: 90% experienced security incidents
- AWS IAM Best Practices: https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html
- AWS IAM Access Analyzer: https://docs.aws.amazon.com/IAM/latest/UserGuide/what-is-access-analyzer.html
- CWE-269: https://cwe.mitre.org/data/definitions/269.html
- Wiz research: AKS clusters face first attack within 18 minutes of creation
