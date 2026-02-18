# OC-065: Symlink Following in File Operations

**Category:** Injection
**Severity:** HIGH
**Auditors:** INJ-04
**CWE:** CWE-59
**OWASP:** A01:2021 Broken Access Control

## Description

Symlink following vulnerabilities occur when an application performs file operations (read, write, delete) on a path that contains or resolves through a symbolic link created by an attacker. If the application runs with elevated privileges or operates in a shared directory, an attacker can plant a symlink that points to a sensitive file, causing the application to operate on the wrong target.

In Node.js, `fs.readFile()`, `fs.writeFile()`, and most filesystem operations follow symlinks by default. This is dangerous in upload directories, temporary file handling, and any scenario where the application processes files in a user-writable location. Container environments add complexity — a symlink created inside a container could point to a host filesystem path if volumes are incorrectly mounted.

The `lstat()` function (as opposed to `stat()`) does not follow symlinks and can be used to detect them. The `fs.realpath()` function resolves all symlinks and can be used to verify the true target path.

## Detection

```
# File operations without symlink checks
fs\.readFile\(
fs\.writeFile\(
fs\.unlink\(
fs\.rename\(
fs\.createReadStream
fs\.createWriteStream
# Missing lstat / realpath before operation
# Temporary file handling
tmp|temp|upload
mkdtemp|tmpdir
# Container volume mounts
volumes.*:/
```

## Vulnerable Code

```typescript
import fs from 'fs';
import path from 'path';

// VULNERABLE: Application processes files in user-writable uploads dir
app.delete('/files/:filename', async (req, res) => {
  const filePath = path.resolve('./uploads', req.params.filename);

  if (!filePath.startsWith(path.resolve('./uploads'))) {
    return res.status(403).send('Forbidden');
  }

  // VULNERABLE: follows symlinks — attacker creates:
  // uploads/evil -> /etc/important-config
  // Then DELETE /files/evil deletes the real target
  fs.unlinkSync(filePath);
  res.json({ deleted: true });
});

// VULNERABLE: temp file write follows symlinks
function processUpload(tempPath: string, data: Buffer) {
  // If tempPath is a symlink to /app/.env, this overwrites .env
  fs.writeFileSync(tempPath, data);
}
```

## Secure Code

```typescript
import fs from 'fs';
import path from 'path';

app.delete('/files/:filename', async (req, res) => {
  const filePath = path.resolve('./uploads', req.params.filename);

  if (!filePath.startsWith(path.resolve('./uploads') + path.sep)) {
    return res.status(403).send('Forbidden');
  }

  // SAFE: Check for symlinks using lstat
  const stat = fs.lstatSync(filePath);
  if (stat.isSymbolicLink()) {
    return res.status(403).json({ error: 'Symlinks not allowed' });
  }

  // SAFE: Also verify realpath matches
  const realPath = fs.realpathSync(filePath);
  if (!realPath.startsWith(path.resolve('./uploads') + path.sep)) {
    return res.status(403).json({ error: 'Path escapes upload dir' });
  }

  fs.unlinkSync(filePath);
  res.json({ deleted: true });
});

// SAFE: Use O_NOFOLLOW flag where available
function safeWriteFile(filePath: string, data: Buffer) {
  const fd = fs.openSync(filePath, fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_TRUNC);
  fs.writeSync(fd, data);
  fs.closeSync(fd);
}
```

## Impact

Reading or writing arbitrary files via symlink redirection. Overwriting configuration files, deleting critical system files, or reading secrets. In containerized environments, potential escape to host filesystem.

## References

- CWE-59: Improper Link Resolution Before File Access
- CWE-61: UNIX Symbolic Link Following
- OWASP: Path Traversal via symlinks
- Node.js fs module: lstat vs stat behavior
