# OC-180: Missing Encryption for Data at Rest

**Category:** Data Security
**Severity:** HIGH
**Auditors:** DATA-05
**CWE:** CWE-311 (Missing Encryption of Sensitive Data)
**OWASP:** A02:2021 – Cryptographic Failures

## Description

Missing encryption at rest means sensitive data stored on disk, in databases, in cloud storage, or in backups is not encrypted at the storage layer. While application-level field encryption (OC-159) protects specific fields, storage-level encryption protects the entire data volume against physical theft, backup exposure, decommissioned hardware, and cloud storage misconfigurations.

The EY data breach (October 2025) is the definitive case: a 4TB SQL Server backup (.BAK file) was discovered unencrypted on Azure Blob Storage. The file contained credentials, API keys, session tokens, and financial records in a format directly importable into SQL Server. Had Azure Storage encryption (or SQL Server TDE) been properly configured, the exposed file would have been unreadable without the encryption key.

Cloud providers offer transparent encryption at rest: AWS S3 Server-Side Encryption (SSE-S3, SSE-KMS), Azure Storage Service Encryption, Google Cloud default encryption, RDS/Cloud SQL encryption. These are often not enabled by default for existing resources or older configurations. Similarly, database-level encryption like PostgreSQL pgcrypto, MongoDB Encrypted Storage Engine, and SQL Server TDE must be explicitly configured.

Applications must also ensure that local file storage (temporary files, upload staging, export files) uses encrypted volumes, and that backups are encrypted independently of the source storage.

## Detection

```
grep -rn "ServerSideEncryption\|sse\|encryption\|encrypted" --include="*.ts" --include="*.js" --include="*.yaml" --include="*.json"
grep -rn "writeFile\|createWriteStream\|fs\.write" --include="*.ts" --include="*.js"
grep -rn "backup\|dump\|export\|pg_dump\|mongodump" --include="*.ts" --include="*.js" --include="*.sh"
grep -rn "TDE\|transparent.*encryption\|pgcrypto" --include="*.sql" --include="*.ts"
```

Look for: S3 `PutObject` without `ServerSideEncryption`, database backup scripts without encryption flags, file writes to unencrypted volumes, Terraform/CDK resources without encryption configuration, temporary files containing sensitive data.

## Vulnerable Code

```typescript
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { exec } from "child_process";
import fs from "fs";

const s3 = new S3Client({ region: "us-east-1" });

// VULNERABLE: S3 upload without encryption
async function uploadBackup(data: Buffer) {
  await s3.send(new PutObjectCommand({
    Bucket: "app-backups",
    Key: `backup-${Date.now()}.sql`,
    Body: data,
    // No ServerSideEncryption — stored as plaintext
  }));
}

// VULNERABLE: Database backup without encryption
function backupDatabase() {
  exec("pg_dump production > /backups/db-$(date +%Y%m%d).sql");
  // Plaintext SQL dump on disk
}

// VULNERABLE: Sensitive export to unencrypted temp file
async function exportUserData(userId: string) {
  const data = await getUserData(userId);
  const path = `/tmp/export-${userId}.json`;
  fs.writeFileSync(path, JSON.stringify(data));
  // PII in plaintext temp file — survives process termination
  return path;
}
```

## Secure Code

```typescript
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import crypto from "crypto";
import fs from "fs/promises";
import { pipeline } from "stream/promises";

const s3 = new S3Client({ region: "us-east-1" });

// SECURE: S3 upload with KMS encryption
async function uploadBackup(data: Buffer) {
  await s3.send(new PutObjectCommand({
    Bucket: process.env.BACKUP_BUCKET!,
    Key: `backup-${Date.now()}.sql.enc`,
    Body: data,
    ServerSideEncryption: "aws:kms",
    SSEKMSKeyId: process.env.KMS_KEY_ID!,
  }));
}

// SECURE: Encrypted database backup
// pg_dump production | gpg --symmetric --cipher-algo AES256 -o /backups/db-$(date +%Y%m%d).sql.gpg

// SECURE: Temporary files cleaned up and on encrypted volume
async function exportUserData(userId: string): Promise<Buffer> {
  const data = await getUserData(userId);
  const encrypted = encryptData(JSON.stringify(data)); // Application-level encryption
  const path = `/tmp/export-${crypto.randomUUID()}.enc`;

  try {
    await fs.writeFile(path, encrypted, { mode: 0o600 });
    return await fs.readFile(path);
  } finally {
    await fs.unlink(path).catch(() => {}); // Always clean up
  }
}

// CDK: Encrypted S3 bucket
// new s3.Bucket(this, 'BackupBucket', {
//   encryption: s3.BucketEncryption.KMS,
//   encryptionKey: kmsKey,
// });
```

## Impact

Unencrypted data at rest is directly readable if storage media is stolen, lost, or improperly decommissioned. Cloud storage misconfigurations expose plaintext data to the internet. Backup files without encryption create copies of sensitive data outside the application's access controls. Regulatory frameworks (PCI DSS Requirement 3.4, HIPAA, GDPR) mandate encryption at rest; non-compliance results in fines and legal liability.

## References

- EY Azure Exposure (October 2025): 4TB unencrypted SQL Server backup publicly accessible
- CWE-311: Missing Encryption of Sensitive Data — https://cwe.mitre.org/data/definitions/311.html
- OWASP A02:2021 – Cryptographic Failures
- AWS S3 Server-Side Encryption documentation
- PCI DSS Requirement 3.4: Render PAN unreadable anywhere it is stored
