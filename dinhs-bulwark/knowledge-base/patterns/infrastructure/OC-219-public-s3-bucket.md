# OC-219: Public S3 Bucket / Storage

**Category:** Infrastructure
**Severity:** CRITICAL
**Auditors:** INFRA-03
**CWE:** CWE-284 (Improper Access Control)
**OWASP:** A01:2021 - Broken Access Control

## Description

Amazon S3 buckets configured with public access (via bucket policies, ACLs, or disabled Block Public Access settings) expose stored data to the entire internet. This is one of the most common and consequential cloud misconfigurations, responsible for numerous high-profile data breaches including exposures at Capital One (2019, 100M+ records), Twitch (2021, full source code), and countless smaller organizations.

S3 bucket misconfigurations typically occur in three ways: (1) bucket policies with `Principal: "*"` allowing anonymous access, (2) legacy ACLs granting `public-read` or `public-read-write` permissions, and (3) disabled S3 Block Public Access settings at the account or bucket level. AWS has incrementally tightened defaults (Block Public Access is now enabled by default for new buckets since April 2023), but legacy buckets and Infrastructure-as-Code templates created before this change remain at risk.

The same risk applies to other cloud storage services: Google Cloud Storage buckets with `allUsers` or `allAuthenticatedUsers` permissions, and Azure Blob Storage containers with public access enabled.

## Detection

```
# Search Terraform for public bucket policies
grep -rn 'Principal.*"\*"' **/*.tf | grep -i "s3\|bucket"
grep -rn "acl.*public-read\|acl.*public-read-write" **/*.tf
grep -rn "block_public_acls\s*=\s*false" **/*.tf
grep -rn "block_public_policy\s*=\s*false" **/*.tf
grep -rn "restrict_public_buckets\s*=\s*false" **/*.tf

# Search CloudFormation for public access
grep -rn "PublicAccessBlockConfiguration" **/*.yml **/*.yaml **/*.json
grep -rn "BlockPublicAcls.*false\|BlockPublicPolicy.*false" **/*.yml **/*.json

# Search for public bucket in CDK
grep -rn "publicReadAccess\|BlockPublicAccess.NONE\|grantPublicAccess" **/*.ts **/*.js

# Check for public S3 URLs in source code
grep -rn "s3\.amazonaws\.com\|s3://.*public" **/*.ts **/*.js **/*.env*
```

## Vulnerable Code

```hcl
# main.tf - public S3 bucket
resource "aws_s3_bucket" "data" {
  bucket = "company-user-data"
}

resource "aws_s3_bucket_public_access_block" "data" {
  bucket = aws_s3_bucket.data.id

  # All public access controls DISABLED
  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

resource "aws_s3_bucket_policy" "data" {
  bucket = aws_s3_bucket.data.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "PublicRead"
        Effect    = "Allow"
        Principal = "*"           # Anonymous access
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.data.arn}/*"
      }
    ]
  })
}
```

## Secure Code

```hcl
# main.tf - properly secured S3 bucket
resource "aws_s3_bucket" "data" {
  bucket = "company-user-data"
}

# Block ALL public access
resource "aws_s3_bucket_public_access_block" "data" {
  bucket = aws_s3_bucket.data.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Enable server-side encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "data" {
  bucket = aws_s3_bucket.data.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "aws:kms"
    }
    bucket_key_enabled = true
  }
}

# Enable versioning for data protection
resource "aws_s3_bucket_versioning" "data" {
  bucket = aws_s3_bucket.data.id
  versioning_configuration {
    status = "Enabled"
  }
}

# Access only through specific IAM roles
resource "aws_s3_bucket_policy" "data" {
  bucket = aws_s3_bucket.data.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "DenyUnencryptedTransport"
        Effect    = "Deny"
        Principal = "*"
        Action    = "s3:*"
        Resource  = ["${aws_s3_bucket.data.arn}/*"]
        Condition = {
          Bool = { "aws:SecureTransport" = "false" }
        }
      }
    ]
  })
}
```

## Impact

An attacker who discovers a public S3 bucket can:
- Download all stored data (PII, credentials, intellectual property)
- If write access is enabled, upload malicious content or replace existing files
- Use the bucket for hosting malware or phishing pages
- Enumerate bucket contents to find sensitive files
- Data breaches may result in regulatory fines (GDPR, CCPA, HIPAA)
- Reputational damage from public disclosure of data exposure

## References

- Capital One breach (2019) - SSRF to S3, 100M+ records exposed
- AWS S3 Block Public Access: https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-control-block-public-access.html
- AWS IAM Access Analyzer for S3: https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-analyzer.html
- Prisma Cloud: "AWS S3 bucket policy overly permissive to any principal"
- CWE-284: https://cwe.mitre.org/data/definitions/284.html
- OWASP Cloud-Native Security: S3 bucket misconfigurations
