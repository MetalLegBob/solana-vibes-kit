# OC-064: Filename Injection in Upload

**Category:** Injection
**Severity:** HIGH
**Auditors:** INJ-04
**CWE:** CWE-73
**OWASP:** A01:2021 Broken Access Control

## Description

Filename injection occurs when an application uses the original filename provided by the user (via `Content-Disposition` header in multipart uploads) without sanitization. Attackers can inject path separators, null bytes, special characters, or misleading extensions to achieve path traversal, file type confusion, or overwrite existing files.

In Node.js, `multer` uses the original filename from the upload by default. If the application stores or processes files based on this name, several attacks become possible: double extensions (`.jpg.php`), null byte injection (`.php%00.jpg` — in older runtimes), CRLF injection in filenames, and Unicode normalization attacks.

On Windows systems, reserved device names like CON, PRN, NUL, and AUX in filenames (as shown by CVE-2025-27210) can cause unexpected behavior or denial of service. Shell metacharacters in filenames can also lead to command injection if filenames are later used in shell commands.

## Detection

```
# Using original filename from upload
originalname
req\.file\.originalname
file\.name
Content-Disposition.*filename
# Filename used in path construction
path\.join\(.*originalname
path\.join\(.*file\.name
# Filename used in shell commands
exec\(.*filename
exec\(.*file\.name
```

## Vulnerable Code

```typescript
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const upload = multer({ dest: 'uploads/' });

app.post('/upload', upload.single('file'), (req, res) => {
  // VULNERABLE: using original filename directly
  const destPath = path.join('uploads', req.file.originalname);
  fs.renameSync(req.file.path, destPath);
  res.json({ filename: req.file.originalname });
  // Attacker uploads with filename: "../config/app.json"
  // Or: "test.jpg; rm -rf /" (if later used in exec)
  // Or: "..\\..\\windows\\system32\\config" (Windows)
});

// VULNERABLE: Content-Type header spoofing + bad filename
app.post('/avatar', upload.single('avatar'), async (req, res) => {
  const ext = path.extname(req.file.originalname);
  // Extension check is insufficient — Content-Type can lie
  await saveAvatar(userId, req.file.path, ext);
});
```

## Secure Code

```typescript
import multer from 'multer';
import { randomUUID } from 'crypto';
import path from 'path';
import { fileTypeFromBuffer } from 'file-type';

const upload = multer({
  limits: { fileSize: 5 * 1024 * 1024 },
  storage: multer.memoryStorage()
});

app.post('/upload', upload.single('file'), async (req, res) => {
  // SAFE: Detect actual file type from magic bytes
  const type = await fileTypeFromBuffer(req.file.buffer);
  const allowedMimes = ['image/jpeg', 'image/png', 'application/pdf'];

  if (!type || !allowedMimes.includes(type.mime)) {
    return res.status(400).json({ error: 'Invalid file type' });
  }

  // SAFE: Generate server-controlled filename
  const safeName = `${randomUUID()}.${type.ext}`;
  const destPath = path.resolve('uploads', safeName);

  fs.writeFileSync(destPath, req.file.buffer);
  res.json({ filename: safeName });
});
```

## Impact

Path traversal via crafted filenames. File type confusion enabling stored XSS (SVG/HTML files) or server-side code execution. Overwriting existing application files. Command injection if filenames flow into shell commands.

## References

- CVE-2025-27210: Node.js path traversal via Windows device names
- CWE-73: External Control of File Name or Path
- OWASP: Unrestricted File Upload
- Snyk: Zip Slip — filename-based path traversal in archives
