# OC-185: Right-to-Deletion Not Implemented

**Category:** Data Security
**Severity:** MEDIUM
**Auditors:** DATA-06
**CWE:** CWE-459 (Incomplete Cleanup)
**OWASP:** A04:2021 – Insecure Design

## Description

The right to deletion (also called the "right to be forgotten") is a fundamental requirement under GDPR Article 17, CCPA Section 1798.105, and similar privacy regulations. When an application does not implement this right, or implements it incompletely, user data persists across the system even after deletion is requested, creating regulatory liability and eroding user trust.

The European Data Protection Board (EDPB) documented a case where an airline company failed to properly inform a data subject of the completion of an erasure request, resulting in enforcement action by the Hungarian Supervisory Authority. The Hamburg DPA fined a debt collection company EUR 900,000 (2024) for retaining personal data beyond statutory periods. These cases show that regulators actively enforce deletion rights and that technical capability to delete is not sufficient — the process must be complete, verifiable, and timely.

Complete deletion requires removing user data from: the primary database, all replica databases, search indices, caches (Redis, CDN), log aggregation systems, backup systems, analytics platforms, third-party services (payment processors, email providers, analytics), and message queues. Soft-delete alone (setting a `deleted` flag) does not satisfy the right to deletion because the PII remains stored and accessible.

## Detection

```
grep -rn "deleteAccount\|deleteUser\|removeUser\|eraseUser\|forgetUser" --include="*.ts" --include="*.js"
grep -rn "right.*delet\|right.*forget\|right.*erasure\|gdpr.*delet" --include="*.ts" --include="*.js"
grep -rn "anonymize\|pseudonymize\|purge\|redact" --include="*.ts" --include="*.js"
grep -rn "softDelete\|isDeleted\|deletedAt" --include="*.ts" --include="*.js"
```

Look for: absence of any account deletion API endpoint, soft-delete that only sets a flag without removing PII, deletion that only affects the primary database (missing cache/search/third-party cleanup), no mechanism for handling deletion requests within the regulatory timeline (30 days for GDPR).

## Vulnerable Code

```typescript
import { User } from "./models/user";

// VULNERABLE: Soft delete only — PII remains in database
async function deleteAccount(userId: string) {
  await User.updateOne({ _id: userId }, { isDeleted: true });
  // Name, email, SSN, address, phone — all still in database
  // Cache still contains user profile
  // Search index still returns user
  // Analytics still reference user PII
  // Backups contain pre-deletion data
}

// VULNERABLE: Incomplete deletion — misses dependent data
async function deleteUserPartial(userId: string) {
  await User.deleteOne({ _id: userId });
  // But user's orders, messages, comments still contain PII
  // Third-party services (Stripe, SendGrid) still have user data
  // Log files contain user activity with PII
}

// VULNERABLE: No deletion endpoint exists
// Users must email support, which creates a manual process
// that often fails to meet the 30-day GDPR deadline
```

## Secure Code

```typescript
import { User, Order, Message, Comment, AuditLog } from "./models";
import { redis } from "./cache";
import { searchClient } from "./search";
import { stripe } from "./payments";

interface DeletionResult {
  userId: string;
  deletedFrom: string[];
  failedSources: string[];
  completedAt: Date;
}

async function deleteAccountCompletely(userId: string): Promise<DeletionResult> {
  const result: DeletionResult = {
    userId,
    deletedFrom: [],
    failedSources: [],
    completedAt: new Date(),
  };

  const tasks = [
    // Primary database — anonymize referenced data, delete user
    async () => {
      await Order.updateMany({ userId }, { $set: { customerName: "Deleted User", customerEmail: null } });
      await Message.deleteMany({ $or: [{ senderId: userId }, { recipientId: userId }] });
      await Comment.updateMany({ authorId: userId }, { $set: { authorName: "Deleted User" } });
      await User.deleteOne({ _id: userId });
      result.deletedFrom.push("database");
    },
    // Cache
    async () => {
      await redis.del(`user:${userId}`, `session:${userId}`, `profile:${userId}`);
      result.deletedFrom.push("cache");
    },
    // Search index
    async () => {
      await searchClient.delete("users", userId);
      result.deletedFrom.push("search-index");
    },
    // Third-party: payment processor
    async () => {
      await stripe.customers.del(userId);
      result.deletedFrom.push("stripe");
    },
  ];

  for (const task of tasks) {
    try {
      await task();
    } catch (err) {
      result.failedSources.push((err as Error).message);
    }
  }

  // Audit the deletion itself (without PII)
  await AuditLog.create({
    action: "account_deletion",
    userId,
    result: { deletedFrom: result.deletedFrom, failedSources: result.failedSources },
    timestamp: new Date(),
  });

  return result;
}

// API endpoint with re-authentication
app.post("/api/account/delete", authMiddleware, async (req, res) => {
  // Require password confirmation for account deletion
  const isValid = await verifyPassword(req.user!.id, req.body.password);
  if (!isValid) return res.status(401).json({ error: "Invalid password" });

  const result = await deleteAccountCompletely(req.user!.id);

  if (result.failedSources.length > 0) {
    // Queue retry for failed sources
    await deletionRetryQueue.add({ userId: req.user!.id, failedSources: result.failedSources });
  }

  res.json({ status: "deleted", completedAt: result.completedAt });
});
```

## Impact

Failure to implement right-to-deletion violates GDPR Article 17 (fines up to 4% of global turnover), CCPA Section 1798.105, and similar regulations. Individual complaints can trigger supervisory authority investigations. Retained PII increases the scope and severity of any subsequent data breach. User trust is damaged when deletion requests are not honored.

## References

- EDPB: Airline company failure to complete erasure request (2023)
- Hamburg DPA Fine (2024): EUR 900,000 for retaining data beyond statutory periods
- GDPR Article 17: Right to Erasure ("Right to be Forgotten")
- CCPA Section 1798.105: Consumer's Right to Deletion
- CWE-459: Incomplete Cleanup — https://cwe.mitre.org/data/definitions/459.html
- OWASP A04:2021 – Insecure Design
