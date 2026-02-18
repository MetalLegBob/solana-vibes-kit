# OC-063: Path Traversal in File Write

**Category:** Injection
**Severity:** CRITICAL
**Auditors:** INJ-04
**CWE:** CWE-22
**OWASP:** A01:2021 Broken Access Control

## Description

Path traversal in file write operations is a critical vulnerability that allows attackers to write files to arbitrary locations on the server filesystem. This is more dangerous than read-based traversal because it enables overwriting configuration files, planting web shells, injecting SSH keys, modifying application code, or writing to cron directories for code execution.

In Node.js applications, this commonly appears in file upload handlers, template/config editing features, and export functionality. When a user-controlled filename or path is used with `fs.writeFile()`, `fs.writeFileSync()`, or streaming writes, attackers can escape the intended directory.

A common anti-pattern is using the original filename from the upload `Content-Disposition` header. Libraries like `multer` sanitize filenames by default, but custom upload handlers often do not. Zip file extraction (zip-slip) is another vector where archived filenames containing `../` can write files outside the extraction directory.

## Detection

```
# File write with user input
fs\.writeFile\(.*req\.(body|query|params)
fs\.writeFileSync\(.*req\.
fs\.createWriteStream\(.*req\.
# Filename from upload
originalname
\.filename
Content-Disposition
# Zip extraction
unzip|extract|decompress|archiver
yauzl|adm-zip|extract-zip
```

## Vulnerable Code

```typescript
import fs from 'fs';
import path from 'path';

app.post('/upload', (req, res) => {
  const { filename, content } = req.body;
  // VULNERABLE: user controls the path
  const filePath = path.join('./uploads', filename);
  // filename = "../../app/routes/backdoor.js"
  fs.writeFileSync(filePath, content);
  res.json({ saved: filePath });
});

// Zip extraction vulnerability (zip-slip)
app.post('/extract', async (req, res) => {
  const zip = new AdmZip(req.file.buffer);
  zip.getEntries().forEach(entry => {
    // VULNERABLE: entry.entryName may contain ../
    const outputPath = path.join('./extracted', entry.entryName);
    fs.writeFileSync(outputPath, entry.getData());
  });
});
```

## Secure Code

```typescript
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

const UPLOAD_DIR = path.resolve(__dirname, 'uploads');

app.post('/upload', (req, res) => {
  // SAFE: Generate server-side filename, ignore user-provided name
  const ext = path.extname(req.body.filename || '').toLowerCase();
  const allowedExts = ['.jpg', '.png', '.pdf', '.txt'];
  if (!allowedExts.includes(ext)) {
    return res.status(400).json({ error: 'Invalid file type' });
  }

  const safeName = `${randomUUID()}${ext}`;
  const filePath = path.resolve(UPLOAD_DIR, safeName);

  if (!filePath.startsWith(UPLOAD_DIR + path.sep)) {
    return res.status(403).json({ error: 'Invalid path' });
  }

  fs.writeFileSync(filePath, req.body.content);
  res.json({ saved: safeName });
});

// Safe zip extraction
app.post('/extract', async (req, res) => {
  const zip = new AdmZip(req.file.buffer);
  const extractDir = path.resolve('./extracted');
  zip.getEntries().forEach(entry => {
    const outputPath = path.resolve(extractDir, entry.entryName);
    if (!outputPath.startsWith(extractDir + path.sep)) {
      throw new Error('Zip slip detected');
    }
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, entry.getData());
  });
});
```

## Impact

Remote code execution via writing web shells or modifying application code. Server compromise via overwriting SSH authorized_keys, cron jobs, or systemd services. Data destruction via overwriting critical files.

## References

- CWE-22: Improper Limitation of a Pathname to a Restricted Directory
- Snyk: Zip Slip vulnerability (arbitrary file overwrite via archive extraction)
- CVE-2024-21896: Node.js path traversal
- OWASP: Path Traversal
