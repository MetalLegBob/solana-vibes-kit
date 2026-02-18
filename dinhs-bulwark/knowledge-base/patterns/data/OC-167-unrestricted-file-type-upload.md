# OC-167: Unrestricted File Type Upload

**Category:** Data Security
**Severity:** HIGH
**Auditors:** DATA-03
**CWE:** CWE-434 (Unrestricted Upload of File with Dangerous Type)
**OWASP:** A04:2021 – Insecure Design

## Description

Unrestricted file upload occurs when an application accepts file uploads without validating the file type, extension, or content. An attacker can upload executable files (`.php`, `.jsp`, `.aspx`, `.phar`), scripts, or files with manipulated MIME types to achieve remote code execution, stored XSS, or other attacks when the uploaded file is accessed.

This vulnerability remains one of the most common and impactful web application flaws. CVE-2025-34100 (BuilderEngine 3.5.0) demonstrated unrestricted file upload via the elFinder file manager's jQuery File Upload plugin, allowing attackers to upload and execute malicious PHP files. CVE-2024-29272 (VvvebJs) had an EPSS exploitation likelihood of 89.26%, showing how frequently these flaws are exploited in the wild. CVE-2024-48093 (Operately v0.1.0) showed the same pattern in a modern application.

In Node.js/TypeScript applications, the risk manifests when using multer, formidable, or busboy without file type validation. Even when validation exists, checking only the MIME type from the `Content-Type` header is insufficient because it is client-controlled. The file's actual content (magic bytes) and extension must both be validated server-side.

## Detection

```
grep -rn "multer\|formidable\|busboy\|fileUpload\|upload" --include="*.ts" --include="*.js"
grep -rn "mimetype\|content-type\|file\.type" --include="*.ts" --include="*.js"
grep -rn "fileFilter\|allowedTypes\|accept" --include="*.ts" --include="*.js"
grep -rn "\.originalname\|\.filename\|\.path" --include="*.ts" --include="*.js"
```

Look for: multer configured without `fileFilter`, upload handlers that save files without checking extension or content type, reliance on client-provided MIME type for validation, uploaded files stored in publicly accessible directories.

## Vulnerable Code

```typescript
import express from "express";
import multer from "multer";
import path from "path";

const app = express();

// VULNERABLE: No file type validation
const upload = multer({
  dest: "public/uploads/", // Publicly accessible directory
  // No fileFilter — accepts ANY file type
});

app.post("/upload", upload.single("file"), (req, res) => {
  // VULNERABLE: Using original filename (path traversal + extension bypass)
  const filePath = path.join("public/uploads", req.file!.originalname);
  // Attacker uploads "malicious.html" or "shell.php"
  res.json({ url: `/uploads/${req.file!.originalname}` });
});

// VULNERABLE: Checking only MIME type from client
const weakUpload = multer({
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true); // Client can lie about MIME type
    } else {
      cb(new Error("Only images"));
    }
  },
});
```

## Secure Code

```typescript
import express from "express";
import multer from "multer";
import crypto from "crypto";
import { fileTypeFromBuffer } from "file-type";
import path from "path";
import fs from "fs/promises";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

// SECURE: Strict file filter with content validation
const upload = multer({
  dest: "/tmp/uploads/", // Non-public staging directory
  limits: { fileSize: MAX_SIZE },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (![".jpg", ".jpeg", ".png", ".webp", ".pdf"].includes(ext)) {
      return cb(new Error("Invalid file extension"));
    }
    cb(null, true);
  },
});

app.post("/upload", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file" });

  // SECURE: Validate actual file content (magic bytes)
  const buffer = await fs.readFile(req.file.path);
  const type = await fileTypeFromBuffer(buffer);
  if (!type || !ALLOWED_TYPES.has(type.mime)) {
    await fs.unlink(req.file.path);
    return res.status(400).json({ error: "Invalid file content" });
  }

  // SECURE: Generate random filename — never use original
  const safeName = `${crypto.randomUUID()}.${type.ext}`;
  const finalPath = path.join("/data/uploads/", safeName);
  await fs.rename(req.file.path, finalPath);

  res.json({ url: `/files/${safeName}` }); // Served via separate handler
});
```

## Impact

An attacker can upload and execute server-side scripts for remote code execution, upload HTML/SVG files containing JavaScript for stored XSS, upload malware that is served to other users, or exhaust disk space with large or numerous uploads. Successful exploitation can lead to complete server compromise.

## References

- CVE-2025-34100: BuilderEngine 3.5.0 unrestricted file upload via elFinder
- CVE-2024-29272: VvvebJs arbitrary file upload to RCE (EPSS: 89.26%)
- CVE-2024-48093: Operately v0.1.0 unrestricted file upload to RCE
- CWE-434: Unrestricted Upload of File with Dangerous Type — https://cwe.mitre.org/data/definitions/434.html
- OWASP A04:2021 – Insecure Design
