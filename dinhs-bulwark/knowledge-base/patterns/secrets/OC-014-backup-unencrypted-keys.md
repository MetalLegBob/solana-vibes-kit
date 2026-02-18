# OC-014: Backup/Export Containing Unencrypted Keys

**Category:** Secrets & Credentials
**Severity:** HIGH
**Auditors:** SEC-01
**CWE:** CWE-311 (Missing Encryption of Sensitive Data)
**OWASP:** A02:2021 – Cryptographic Failures

## Description

Database backups, configuration exports, system snapshots, and data dumps frequently contain cryptographic keys, passwords, and other secrets in plaintext. When these backups are stored without encryption — on shared drives, cloud storage, or backup services — they become a high-value target for attackers, providing access to secrets that may have been properly protected in the running system.

The problem extends beyond database backups: key export features in wallet management tools, configuration export/import functionality, disaster recovery archives, and even developer machine Time Machine backups can contain unencrypted key material. The 2024 Sysdig research into EMERALDWHALE showed attackers targeting backup files and git bundles specifically because they aggregate secrets from multiple sources into a single extractable archive.

In the Solana off-chain context, this commonly manifests as JSON keypair files included in server backups, database dumps containing encrypted-at-rest data in plaintext export format, and configuration snapshots with embedded RPC keys and signing credentials.

## Detection

```
grep -rn "backup\|export\|dump\|snapshot\|archive" --include="*.ts" --include="*.js" --include="*.sh"
grep -rn "pg_dump\|mongodump\|mysqldump" --include="*.sh" --include="*.yml" --include="*.yaml"
grep -rn "writeFile.*key\|writeFile.*secret\|createWriteStream.*backup" --include="*.ts" --include="*.js"
find . -name "*.bak" -o -name "*.dump" -o -name "*.sql" -o -name "*.tar.gz" | head -20
```

Look for: backup scripts without encryption steps, S3 buckets for backups without SSE, database dump commands without piping through encryption, keypair files in backup directories.

## Vulnerable Code

```typescript
import { exec } from "child_process";
import { writeFileSync } from "fs";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

// VULNERABLE: Database backup with secrets stored unencrypted on S3
async function backupDatabase() {
  // pg_dump outputs all data including any stored credentials
  exec("pg_dump -U admin myapp_db > /tmp/backup.sql", async (err) => {
    if (err) throw err;

    const s3 = new S3Client({ region: "us-east-1" });
    await s3.send(new PutObjectCommand({
      Bucket: "myapp-backups",
      Key: `backups/${Date.now()}.sql`,
      Body: readFileSync("/tmp/backup.sql"),
      // No encryption specified — stored in plaintext
    }));
  });
}

// Also vulnerable: exporting keypair without encryption
function exportKeypair(keypair: Keypair, path: string) {
  writeFileSync(path, JSON.stringify(Array.from(keypair.secretKey)));
}
```

## Secure Code

```typescript
import { exec } from "child_process";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { createCipheriv, randomBytes } from "crypto";

// SECURE: Encrypted backup with server-side encryption
async function backupDatabase() {
  // Encrypt the backup before upload
  exec(
    "pg_dump -U admin myapp_db | gpg --encrypt --recipient backup-key@example.com > /tmp/backup.sql.gpg",
    async (err) => {
      if (err) throw err;

      const s3 = new S3Client({ region: "us-east-1" });
      await s3.send(new PutObjectCommand({
        Bucket: "myapp-backups",
        Key: `backups/${Date.now()}.sql.gpg`,
        Body: readFileSync("/tmp/backup.sql.gpg"),
        ServerSideEncryption: "aws:kms", // Additional S3-level encryption
        SSEKMSKeyId: process.env.BACKUP_KMS_KEY_ID,
      }));

      // Remove local temporary files
      unlinkSync("/tmp/backup.sql.gpg");
    }
  );
}

// SECURE: Keypair export uses password-based encryption
function exportKeypairEncrypted(keypair: Keypair, path: string, password: string) {
  const iv = randomBytes(16);
  const key = scryptSync(password, randomBytes(32), 32);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(keypair.secretKey), cipher.final()]);
  const authTag = cipher.getAuthTag();
  writeFileSync(path, JSON.stringify({ iv: iv.toString("hex"), authTag: authTag.toString("hex"), data: encrypted.toString("hex") }));
}
```

## Impact

Unencrypted backups containing keys provide a single point of access to all secrets in the system. An attacker who gains access to backup storage (misconfigured S3 bucket, compromised backup service, or stolen backup media) obtains credentials for every service, every wallet, and every user in the system. The backup may contain historical secrets that are still active due to lack of rotation (see OC-009).

## References

- Sysdig EMERALDWHALE: Targeting backup files and git bundles for secret extraction (2024)
- CWE-311: Missing Encryption of Sensitive Data — https://cwe.mitre.org/data/definitions/311.html
- AWS: S3 bucket encryption best practices
- OWASP: Cryptographic Storage Cheat Sheet
