# OC-184: User Data Export Without Authorization

**Category:** Data Security
**Severity:** HIGH
**Auditors:** DATA-06
**CWE:** CWE-862 (Missing Authorization)
**OWASP:** A01:2021 – Broken Access Control

## Description

Data export endpoints that lack proper authorization checks allow attackers to download other users' data by manipulating user IDs, export tokens, or download URLs. This is a specific form of Insecure Direct Object Reference (IDOR) applied to data portability features, where the exported data typically contains the most comprehensive collection of a user's PII in a single downloadable file.

GDPR Article 20 (Right to Data Portability) and CCPA require applications to provide users with their data in a machine-readable format. While compliance with these regulations is mandatory, the export mechanism must verify that the requesting user is authorized to access the specific export. Common failures include: export endpoints that accept a userId parameter without verifying it matches the authenticated session, download URLs with predictable or guessable tokens, presigned URLs with excessive expiry times, and export jobs that do not verify the requester when the export is retrieved.

Data export files are high-value targets because they contain comprehensive PII in a single package: names, emails, addresses, transaction histories, messages, and any other user-associated data. A successful IDOR on an export endpoint is equivalent to a targeted data breach for the specific user.

## Detection

```
grep -rn "export\|download\|portability\|takeout\|gdpr" --include="*.ts" --include="*.js"
grep -rn "req\.params\.userId\|req\.query\.userId\|req\.params\.id" --include="*.ts" --include="*.js"
grep -rn "presignedUrl\|getSignedUrl\|signedUrl" --include="*.ts" --include="*.js"
grep -rn "Content-Disposition.*attachment\|res\.download\|res\.sendFile" --include="*.ts" --include="*.js"
```

Look for: export endpoints that accept a user ID parameter, download handlers without authentication middleware, presigned URLs created without verifying ownership, export job results accessible by export ID alone (without user verification).

## Vulnerable Code

```typescript
import express from "express";
import { generateExport } from "./export-service";

const app = express();

// VULNERABLE: No authorization check — any authenticated user can export any user's data
app.get("/api/user/:userId/export", async (req, res) => {
  const userId = req.params.userId; // Attacker changes to another user's ID
  const exportData = await generateExport(userId);
  res.json(exportData); // Returns victim's complete PII
});

// VULNERABLE: Predictable download token
app.post("/api/export/request", async (req, res) => {
  const exportId = `export-${req.user.id}-${Date.now()}`; // Guessable
  await queueExport(req.user.id, exportId);
  res.json({ downloadUrl: `/api/export/download/${exportId}` });
});

// VULNERABLE: Download without verifying ownership
app.get("/api/export/download/:exportId", async (req, res) => {
  const file = await getExportFile(req.params.exportId);
  res.download(file.path); // No check that requester owns this export
});
```

## Secure Code

```typescript
import express from "express";
import crypto from "crypto";
import { generateExport, getExportMetadata } from "./export-service";

const app = express();

// SECURE: Verify authenticated user matches export target
app.get("/api/user/me/export", authMiddleware, async (req, res) => {
  // Only allow exporting own data — no userId parameter
  const userId = req.user!.id;
  const exportData = await generateExport(userId);

  // Re-authenticate before sensitive operation
  res.json({ exportId: exportData.id, status: "processing" });
});

// SECURE: Cryptographically random, time-limited download token
app.post("/api/export/request", authMiddleware, async (req, res) => {
  const exportToken = crypto.randomBytes(32).toString("hex");
  await queueExport(req.user!.id, exportToken, {
    expiresAt: new Date(Date.now() + 3600000), // 1 hour
  });
  res.json({ downloadUrl: `/api/export/download/${exportToken}` });
});

// SECURE: Verify ownership and expiry on download
app.get("/api/export/download/:token", authMiddleware, async (req, res) => {
  const meta = await getExportMetadata(req.params.token);

  if (!meta) return res.status(404).json({ error: "Export not found" });
  if (meta.userId !== req.user!.id) return res.status(403).json({ error: "Forbidden" });
  if (meta.expiresAt < new Date()) return res.status(410).json({ error: "Export expired" });

  res.set("Content-Disposition", `attachment; filename="data-export.json"`);
  res.sendFile(meta.filePath);

  // Delete after download
  await deleteExportFile(meta.filePath);
});
```

## Impact

Unauthorized data export enables targeted data theft of any user's complete PII. An attacker can enumerate user IDs to bulk-export user data, effectively replicating the user database. Exported data typically contains the most comprehensive collection of user information available, making this the highest-impact IDOR vector.

## References

- GDPR Article 20: Right to Data Portability
- CCPA Section 1798.100: Consumer right to access personal information
- CWE-862: Missing Authorization — https://cwe.mitre.org/data/definitions/862.html
- OWASP A01:2021 – Broken Access Control
- OWASP Testing Guide: Testing for IDOR
