# OC-183: No Data Retention/Deletion Policy

**Category:** Data Security
**Severity:** MEDIUM
**Auditors:** DATA-06
**CWE:** CWE-459 (Incomplete Cleanup)
**OWASP:** A04:2021 – Insecure Design

## Description

Applications that lack a data retention and deletion policy accumulate personal data indefinitely, violating the storage limitation principle of GDPR (Article 5(1)(e)) and similar regulations. Without defined retention periods and automated deletion mechanisms, databases grow without bound, increasing the blast radius of any breach and creating regulatory liability for every record that should have been deleted.

The Hamburg Commissioner for Data Protection imposed a EUR 900,000 fine on a debt collection company in 2024 for retaining personal data of debtors up to five years beyond statutory deletion periods. TikTok was fined EUR 530 million (2025) by the Irish DPC for GDPR violations including inadequate data handling. These cases demonstrate that regulators actively enforce retention limits and that "keeping everything" is not a defensible position.

In practice, data retention failures manifest as: no TTL on database records, no scheduled cleanup jobs, no archival pipeline, deactivated user accounts retained with full PII, log data kept indefinitely, and backups retained beyond their useful life. Applications must define retention periods per data category, implement automated deletion or anonymization, and verify that deletion propagates to all replicas, caches, backups, and third-party systems.

## Detection

```
grep -rn "retention\|ttl\|expir\|cleanup\|purge\|archive\|delete.*old\|remove.*old" --include="*.ts" --include="*.js"
grep -rn "cron\|schedule\|setInterval\|agenda\|bull" --include="*.ts" --include="*.js"
grep -rn "deletedAt\|softDelete\|isDeleted\|deactivated" --include="*.ts" --include="*.js"
grep -rn "createdAt\|created_at\|timestamp" --include="*.ts" --include="*.js"
```

Look for: absence of any cleanup/purge/archive code, no cron jobs or scheduled tasks for data deletion, soft-delete patterns without hard-delete follow-up, no `deletedAt` or `expiresAt` fields in schemas, user account deactivation that retains all PII.

## Vulnerable Code

```typescript
import { Schema, model } from "mongoose";

// VULNERABLE: No retention fields, no deletion mechanism
const userSchema = new Schema({
  email: String,
  name: String,
  ssn: String,
  createdAt: { type: Date, default: Date.now },
  // No expiresAt, no deletedAt, no retention policy
});

const User = model("User", userSchema);

// VULNERABLE: "Deactivation" keeps all PII
async function deactivateAccount(userId: string) {
  await User.updateOne({ _id: userId }, { active: false });
  // All PII remains in database indefinitely
}

// VULNERABLE: Audit logs never cleaned
const auditLogSchema = new Schema({
  action: String,
  userId: String,
  details: Object,  // May contain PII
  timestamp: { type: Date, default: Date.now },
  // No TTL index, no cleanup job
});
```

## Secure Code

```typescript
import { Schema, model } from "mongoose";
import cron from "node-cron";

// SECURE: Schema with retention-aware fields
const userSchema = new Schema({
  email: String,
  name: String,
  ssnEncrypted: String,
  createdAt: { type: Date, default: Date.now },
  deletedAt: Date,
  dataRetentionExpiry: Date, // When PII must be purged
});

const User = model("User", userSchema);

// SECURE: Account deletion anonymizes PII
async function deleteAccount(userId: string) {
  await User.updateOne({ _id: userId }, {
    $set: {
      email: `deleted-${userId}@anonymized.local`,
      name: "Deleted User",
      ssnEncrypted: null,
      deletedAt: new Date(),
    },
  });
  // Also delete from: cache, search index, third-party systems
  await redis.del(`user:${userId}`);
  await searchIndex.delete("users", userId);
}

// SECURE: Automated cleanup job
cron.schedule("0 2 * * *", async () => { // Daily at 2 AM
  const expiryDate = new Date();
  expiryDate.setFullYear(expiryDate.getFullYear() - 2); // 2-year retention

  // Purge soft-deleted users after retention period
  const expired = await User.find({
    deletedAt: { $lt: expiryDate },
  });

  for (const user of expired) {
    await User.deleteOne({ _id: user._id }); // Hard delete
    console.log(`Purged user ${user._id} (deleted ${user.deletedAt})`);
  }
});

// SECURE: Audit logs with TTL index (auto-expire)
const auditLogSchema = new Schema({
  action: String,
  userId: String,
  timestamp: { type: Date, default: Date.now, index: { expires: "365d" } },
});
```

## Impact

Indefinite data retention increases breach severity (more records exposed), creates regulatory liability under GDPR/CCPA (fines up to 4% of global turnover), makes right-to-deletion requests impossible to fulfill, and increases infrastructure costs. When a breach occurs, the notification scope includes every historical record that should have been deleted but was not.

## References

- Hamburg DPA Fine (2024): EUR 900,000 for retaining PII beyond statutory deletion periods
- TikTok GDPR Fine (2025): EUR 530 million for data handling violations
- GDPR Article 5(1)(e): Storage Limitation Principle
- CWE-459: Incomplete Cleanup — https://cwe.mitre.org/data/definitions/459.html
- OWASP A04:2021 – Insecure Design
