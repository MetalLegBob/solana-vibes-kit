# OC-168: File Size Limit Missing or Too Large

**Category:** Data Security
**Severity:** MEDIUM
**Auditors:** DATA-03
**CWE:** CWE-770 (Allocation of Resources Without Limits or Throttling)
**OWASP:** A05:2021 – Security Misconfiguration

## Description

When file upload endpoints lack size limits or set excessively large limits, attackers can exhaust server resources through disk space consumption, memory exhaustion during processing, or bandwidth saturation. This is a straightforward denial-of-service vector that also facilitates other attacks by allowing upload of arbitrarily large payloads.

In Node.js applications using multer, the default behavior is no size limit. Express.js body parsers similarly default to relatively large limits (100kb for JSON, unlimited for raw). When file uploads are processed in memory (using `multer.memoryStorage()`), a single large upload can exhaust the Node.js process heap. When stored to disk, repeated large uploads can fill the disk partition, potentially crashing the database, logging infrastructure, or the application itself.

The VvvebJs vulnerability (CVE-2024-29272) combined unrestricted file type with no size limit, enabling attackers to upload arbitrarily large malicious files. Even with file type restrictions in place, missing size limits remain a DoS risk and can be used to store exfiltrated data on the server (using the upload endpoint as a dead drop).

## Detection

```
grep -rn "multer\|fileSize\|fileSizeLimit\|maxFileSize\|bodyParser" --include="*.ts" --include="*.js"
grep -rn "limits.*fileSize\|limits.*fieldSize" --include="*.ts" --include="*.js"
grep -rn "maxBodyLength\|maxContentLength" --include="*.ts" --include="*.js"
grep -rn "express\.json\|express\.urlencoded\|express\.raw" --include="*.ts" --include="*.js"
```

Look for: multer configuration without `limits.fileSize`, express body parsers without `limit` option, streaming upload handlers without size tracking, missing Content-Length header validation.

## Vulnerable Code

```typescript
import express from "express";
import multer from "multer";

const app = express();

// VULNERABLE: No size limit on file upload
const upload = multer({
  dest: "uploads/",
  // No limits specified — accepts files of any size
});

app.post("/upload", upload.single("file"), (req, res) => {
  res.json({ filename: req.file!.filename });
});

// VULNERABLE: Memory storage without limit — OOM risk
const memUpload = multer({
  storage: multer.memoryStorage(),
  // 10GB upload goes directly into process memory
});

// VULNERABLE: Body parser with excessive limit
app.use(express.json({ limit: "500mb" }));
```

## Secure Code

```typescript
import express from "express";
import multer from "multer";

const app = express();

const MAX_FILE_SIZE = 5 * 1024 * 1024;  // 5MB
const MAX_FILES = 5;

// SECURE: Explicit size and count limits
const upload = multer({
  dest: "/tmp/uploads/",
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: MAX_FILES,
    fields: 10,
    fieldSize: 1024,           // 1KB for text fields
  },
});

// SECURE: Error handler for limit violations
app.post("/upload", upload.array("files", MAX_FILES), (req, res) => {
  res.json({ count: req.files?.length });
});

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({ error: `File exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit` });
    }
    if (err.code === "LIMIT_FILE_COUNT") {
      return res.status(400).json({ error: `Maximum ${MAX_FILES} files allowed` });
    }
  }
  next(err);
});

// SECURE: Appropriate body parser limits
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ limit: "100kb", extended: true }));
```

## Impact

An attacker can exhaust server disk space causing application crashes and data loss, exhaust process memory via in-memory upload processing causing OOM kills, saturate network bandwidth preventing legitimate traffic, and use the upload endpoint to store malicious content or exfiltrated data. Repeated large uploads can also increase cloud storage costs significantly.

## References

- CVE-2024-29272: VvvebJs unrestricted file upload (no size or type limits)
- CWE-770: Allocation of Resources Without Limits or Throttling — https://cwe.mitre.org/data/definitions/770.html
- OWASP A05:2021 – Security Misconfiguration
- Multer documentation: limits configuration
