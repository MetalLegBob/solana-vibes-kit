# OC-171: S3 Bucket ACL Misconfiguration

**Category:** Data Security
**Severity:** HIGH
**Auditors:** DATA-03, INFRA-03
**CWE:** CWE-732 (Incorrect Permission Assignment for Critical Resource)
**OWASP:** A01:2021 – Broken Access Control

## Description

Amazon S3 bucket ACL misconfiguration occurs when bucket policies, ACLs, or public access settings allow unauthorized users to read, write, or list bucket contents. Despite AWS making buckets private by default since 2023, misconfigurations remain the leading cause of cloud data breaches. The fundamental issue is that a single permissive policy statement (e.g., `"Principal": "*"`) can expose terabytes of sensitive data to the entire internet.

The EY data breach (October 2025) is a defining example: a 4TB SQL Server backup was found publicly accessible on Azure Blob Storage (the Azure equivalent of S3). Research from 2025 shows approximately 7% of all S3 buckets are completely public. In March 2025, a misconfigured AWS S3 bucket exposed over 86,000 healthcare worker records including names, addresses, and Social Security numbers. Automated scanners continuously probe for public buckets, and tools like `bucket-finder`, `AWSBucketDump`, and `grayhatwarfare.com` make discovery trivial.

In application code, misconfigurations arise from using `ACL: 'public-read'` in upload operations, creating overly permissive bucket policies via IaC templates, and failing to enable S3 Block Public Access at the account or bucket level.

## Detection

```
grep -rn "public-read\|public-read-write\|authenticated-users" --include="*.ts" --include="*.js" --include="*.json" --include="*.yaml"
grep -rn "Principal.*\*\|Effect.*Allow" --include="*.json" --include="*.yaml"
grep -rn "ACL.*public\|s3:PutBucketAcl\|s3:PutObjectAcl" --include="*.ts" --include="*.js"
grep -rn "BlockPublicAccess\|blockPublicAccess\|PublicAccessBlockConfiguration" --include="*.ts" --include="*.js" --include="*.yaml"
grep -rn "putBucketPolicy\|PutBucketPolicy\|BucketPolicy" --include="*.ts" --include="*.js"
```

Look for: `ACL: 'public-read'` in S3 upload calls, bucket policies with `"Principal": "*"`, CDK/CloudFormation/Terraform missing `BlockPublicAccess`, presigned URLs with excessively long expiry times.

## Vulnerable Code

```typescript
import { S3Client, PutObjectCommand, PutBucketPolicyCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({ region: "us-east-1" });

// VULNERABLE: Uploading with public-read ACL
async function uploadFile(key: string, body: Buffer) {
  await s3.send(new PutObjectCommand({
    Bucket: "my-app-uploads",
    Key: key,
    Body: body,
    ACL: "public-read", // Anyone on the internet can read this
  }));
  return `https://my-app-uploads.s3.amazonaws.com/${key}`;
}

// VULNERABLE: Bucket policy allowing anyone to list and read
const policy = {
  Version: "2012-10-17",
  Statement: [{
    Sid: "PublicReadGetObject",
    Effect: "Allow",
    Principal: "*",           // ANYONE
    Action: ["s3:GetObject", "s3:ListBucket"],
    Resource: [
      "arn:aws:s3:::my-app-uploads",
      "arn:aws:s3:::my-app-uploads/*",
    ],
  }],
};
```

## Secure Code

```typescript
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({ region: "us-east-1" });

// SECURE: Upload with private ACL (default)
async function uploadFile(key: string, body: Buffer, contentType: string) {
  await s3.send(new PutObjectCommand({
    Bucket: process.env.S3_BUCKET!,
    Key: key,
    Body: body,
    ContentType: contentType,
    ServerSideEncryption: "aws:kms", // Encryption at rest
    // No ACL specified — defaults to private
  }));
}

// SECURE: Generate short-lived presigned URL for access
async function getFileUrl(key: string): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET!,
    Key: key,
  });
  return getSignedUrl(s3, command, {
    expiresIn: 300, // 5 minute expiry
  });
}

// CDK: Enable Block Public Access at bucket level
// new s3.Bucket(this, 'AppBucket', {
//   blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
//   encryption: s3.BucketEncryption.KMS,
//   enforceSSL: true,
// });
```

## Impact

Public S3 buckets expose all stored data to the internet, including user uploads, database backups, application secrets, and internal documents. Attackers use automated tools to discover and exfiltrate data from public buckets. Write access enables data tampering, malware hosting, and ransomware. S3 breaches consistently rank among the largest data exposures, affecting millions of records.

## References

- EY Azure Exposure (October 2025): 4TB SQL Server backup publicly accessible on cloud storage
- AWS S3 Healthcare Records Exposure (March 2025): 86,000+ worker records exposed
- CWE-732: Incorrect Permission Assignment — https://cwe.mitre.org/data/definitions/732.html
- OWASP A01:2021 – Broken Access Control
- AWS S3 Block Public Access documentation
- Cloud Security Alliance: Misconfiguration as top cloud threat (2025)
