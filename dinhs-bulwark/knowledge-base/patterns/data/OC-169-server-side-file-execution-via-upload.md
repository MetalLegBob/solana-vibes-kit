# OC-169: Server-Side File Execution via Upload

**Category:** Data Security
**Severity:** CRITICAL
**Auditors:** DATA-03
**CWE:** CWE-434 (Unrestricted Upload of File with Dangerous Type), CWE-94 (Improper Control of Generation of Code)
**OWASP:** A03:2021 – Injection

## Description

Server-side file execution via upload occurs when an uploaded file is stored in a location where the web server or application runtime can execute it. The attacker uploads a file containing server-side code (e.g., a PHP script, JSP page, or Node.js module) and then requests the file's URL, causing the server to execute the malicious code with the application's privileges.

This is the most dangerous outcome of unrestricted file upload and leads directly to remote code execution (RCE). CVE-2025-34100 (BuilderEngine 3.5.0) is a textbook example: the elFinder file manager allowed uploading a `.php` file which was then directly executable by requesting its URL. CVE-2023-53889 (Perch CMS 3.2) demonstrated RCE via uploading a `.phar` file with embedded system command execution through the assets management interface. CVE-2025-15404 (School File Management System) showed the same pattern in a file management endpoint.

In Node.js applications, the risk is lower than PHP environments (since Node.js does not auto-execute uploaded files), but still present if: uploaded files are served through `express.static()` in a directory where dynamic imports (`require()`, `import()`) are used, if the application processes uploaded files through template engines, or if uploaded files are passed to `child_process.exec()` or similar functions.

## Detection

```
grep -rn "express\.static\|serveStatic\|sendFile\|res\.download" --include="*.ts" --include="*.js"
grep -rn "require\(.*upload\|import.*upload\|dynamic.*import" --include="*.ts" --include="*.js"
grep -rn "exec\|spawn\|execFile\|execSync" --include="*.ts" --include="*.js"
grep -rn "dest.*public\|dest.*static\|dest.*www" --include="*.ts" --include="*.js"
```

Look for: uploaded files stored in directories served by `express.static()`, uploaded file paths passed to `require()`, `eval()`, or command execution functions, web server configuration that executes scripts in the upload directory.

## Vulnerable Code

```typescript
import express from "express";
import multer from "multer";
import path from "path";

const app = express();

// VULNERABLE: Uploads stored in publicly served directory
const upload = multer({ dest: "public/uploads/" });
app.use(express.static("public"));

app.post("/upload", upload.single("file"), (req, res) => {
  // File is directly accessible at /uploads/<filename>
  // If behind nginx/Apache with PHP, .php files execute
  res.json({ url: `/uploads/${req.file!.filename}` });
});

// VULNERABLE: Processing uploaded files as code
app.post("/upload-plugin", upload.single("plugin"), async (req, res) => {
  const pluginPath = path.join("plugins/", req.file!.originalname);
  // Dynamic import of user-uploaded code
  const plugin = await import(pluginPath); // RCE
  res.json({ loaded: true });
});
```

## Secure Code

```typescript
import express from "express";
import multer from "multer";
import crypto from "crypto";
import { fileTypeFromBuffer } from "file-type";
import fs from "fs/promises";

const app = express();

// SECURE: Uploads stored in non-served directory
const upload = multer({ dest: "/data/uploads-staging/" });

// SECURE: Files served through controlled handler, not static middleware
app.get("/files/:id", async (req, res) => {
  const fileId = req.params.id;
  if (!/^[a-f0-9-]+$/.test(fileId)) {
    return res.status(400).json({ error: "Invalid file ID" });
  }

  const metadata = await getFileMetadata(fileId);
  if (!metadata) return res.status(404).end();

  // Set Content-Disposition to prevent browser execution
  res.set("Content-Type", metadata.mimeType);
  res.set("Content-Disposition", `attachment; filename="${metadata.safeName}"`);
  res.set("X-Content-Type-Options", "nosniff");
  res.sendFile(metadata.storagePath);
});

app.post("/upload", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).end();

  const buffer = await fs.readFile(req.file.path);
  const type = await fileTypeFromBuffer(buffer);

  // SECURE: Strict allowlist of safe types
  const SAFE_TYPES = new Set(["image/jpeg", "image/png", "application/pdf"]);
  if (!type || !SAFE_TYPES.has(type.mime)) {
    await fs.unlink(req.file.path);
    return res.status(400).json({ error: "Unsupported file type" });
  }

  // SECURE: Random filename with safe extension
  const fileId = crypto.randomUUID();
  const safePath = `/data/uploads/${fileId}.${type.ext}`;
  await fs.rename(req.file.path, safePath);

  await saveFileMetadata(fileId, {
    mimeType: type.mime,
    safeName: `file.${type.ext}`,
    storagePath: safePath,
  });

  res.json({ id: fileId });
});
```

## Impact

Successful server-side execution of uploaded files gives the attacker remote code execution with the application's privileges. This enables complete server compromise: reading all files, accessing databases, pivoting to internal networks, installing backdoors, and exfiltrating all data. This is consistently rated as one of the most critical web application vulnerabilities.

## References

- CVE-2025-34100: BuilderEngine 3.5.0 RCE via unrestricted PHP upload
- CVE-2023-53889: Perch CMS 3.2 RCE via .phar file upload
- CVE-2025-15404: School File Management System RCE via /save_file.php
- CWE-434: Unrestricted Upload of File with Dangerous Type — https://cwe.mitre.org/data/definitions/434.html
- OWASP A03:2021 – Injection
