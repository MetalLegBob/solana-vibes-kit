# OC-062: Path Traversal in File Read

**Category:** Injection
**Severity:** HIGH
**Auditors:** INJ-04
**CWE:** CWE-22
**OWASP:** A01:2021 Broken Access Control

## Description

Path traversal in file read operations occurs when user-supplied input is used to construct file paths without proper validation, allowing attackers to read files outside the intended directory using `../` sequences. In Node.js applications, this commonly appears in file download endpoints, document viewers, and static file serving.

CVE-2024-21896 (CVSS 9.8) demonstrated a path traversal vulnerability in Node.js's experimental permission model where monkey-patching `Buffer.prototype.utf8Write` could bypass `path.resolve()` protections. CVE-2025-27210 showed that Windows-specific device names (CON, PRN, AUX) could bypass directory restrictions in Node.js. CVE-2025-61686 in React Router (react-router) affected file serving with a critical path traversal.

The `path.join()` function does NOT prevent path traversal — `path.join('/uploads', '../../../etc/passwd')` normalizes to `/etc/passwd`. Only explicit validation after resolution can prevent this.

## Detection

```
# File read with user input
fs\.readFile\(.*req\.(body|query|params)
fs\.readFileSync\(.*req\.
fs\.createReadStream\(.*req\.
# Path construction with user input
path\.join\(.*req\.
path\.resolve\(.*req\.
# sendFile / download with user input
res\.sendFile\(.*req\.
res\.download\(.*req\.
# Express static with dynamic root
express\.static\(.*req\.
```

## Vulnerable Code

```typescript
import fs from 'fs';
import path from 'path';

app.get('/download', (req, res) => {
  const { filename } = req.query;
  // VULNERABLE: path.join does NOT prevent traversal
  const filePath = path.join(__dirname, 'uploads', filename);
  // filename = "../../etc/passwd" => reads /etc/passwd
  res.sendFile(filePath);
});

app.get('/documents/:name', (req, res) => {
  // VULNERABLE: direct interpolation
  const content = fs.readFileSync(`./docs/${req.params.name}`);
  res.send(content);
});
```

## Secure Code

```typescript
import fs from 'fs';
import path from 'path';

const UPLOADS_DIR = path.resolve(__dirname, 'uploads');

app.get('/download', (req, res) => {
  const { filename } = req.query;
  // Resolve the full path
  const filePath = path.resolve(UPLOADS_DIR, filename);

  // SAFE: Verify the resolved path is within the allowed directory
  if (!filePath.startsWith(UPLOADS_DIR + path.sep)) {
    return res.status(403).json({ error: 'Access denied' });
  }
  // Additional check: no null bytes
  if (filename.includes('\0')) {
    return res.status(400).json({ error: 'Invalid filename' });
  }

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.sendFile(filePath);
});
```

## Impact

Reading arbitrary files from the server including source code, configuration files with secrets, `/etc/passwd`, private keys, and database files. In cloud environments, reading environment variable files or service account credentials.

## References

- CVE-2024-21896: Node.js path traversal via Buffer.prototype.utf8Write (CVSS 9.8)
- CVE-2025-27210: Node.js path traversal on Windows via device names
- CVE-2025-61686: React Router path traversal (Critical)
- CWE-22: Improper Limitation of a Pathname to a Restricted Directory
- OWASP: Path Traversal
