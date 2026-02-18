# OC-274: File Access Race Condition

**Category:** Error Handling & Resilience
**Severity:** MEDIUM
**Auditors:** ERR-02
**CWE:** CWE-367 (Time-of-check Time-of-use)
**OWASP:** A10:2025 -- Mishandling of Exceptional Conditions

## Description

File access race conditions occur when an application checks a property of a file (existence, permissions, type, size) and then acts on the file in a separate operation. Between the check and the use, an attacker or concurrent process can replace, modify, or symlink the file, causing the application to operate on a different file than the one it validated.

In Node.js applications, this commonly manifests with `fs.existsSync()` or `fs.access()` followed by `fs.readFile()` or `fs.writeFile()`. The Node.js documentation itself deprecates `fs.exists()` because its design invites TOCTOU bugs and recommends using `fs.open()` with error handling instead. CVE-2024-50379 in Apache Tomcat is a prominent example: a TOCTOU race condition during JSP compilation on case-insensitive file systems allowed remote code execution by exploiting the gap between file existence checks and file reads.

In upload handling, this pattern is especially dangerous: the application checks the uploaded file's MIME type or extension, then moves it to a permanent location. An attacker can potentially exploit the race window to swap the file between validation and storage.

## Detection

```
grep -rn "existsSync\|fs\.exists\|fs\.access" --include="*.ts" --include="*.js" -A 5 | grep "readFile\|writeFile\|unlink\|rename"
grep -rn "statSync\|fs\.stat" --include="*.ts" --include="*.js" -A 5 | grep "readFile\|writeFile\|unlink"
grep -rn "accessSync" --include="*.ts" --include="*.js" -A 3
```

Look for: `fs.existsSync()` followed by `fs.readFileSync()`, `fs.access()` followed by any file operation, `fs.stat()` used to check file type then followed by `fs.readFile()`.

## Vulnerable Code

```typescript
import fs from "fs";
import path from "path";

// VULNERABLE: Check-then-act pattern on file system
async function serveUserFile(userId: string, filename: string) {
  const filePath = path.join("/uploads", userId, filename);

  // Step 1: Check if file exists and is a regular file
  const stats = await fs.promises.stat(filePath);
  if (!stats.isFile()) {
    throw new Error("Not a regular file");
  }

  // RACE WINDOW: Between stat and readFile, the file could be
  // replaced with a symlink to /etc/passwd or another sensitive file

  // Step 2: Read and return the file
  return fs.promises.readFile(filePath);
}

// VULNERABLE: Temp file race in upload processing
async function processUpload(tempPath: string, destDir: string) {
  // Check the file is under size limit
  const stats = await fs.promises.stat(tempPath);
  if (stats.size > 10 * 1024 * 1024) {
    await fs.promises.unlink(tempPath);
    throw new Error("File too large");
  }

  // RACE WINDOW: File could be swapped between stat and rename
  const destPath = path.join(destDir, path.basename(tempPath));
  await fs.promises.rename(tempPath, destPath);
}
```

## Secure Code

```typescript
import fs from "fs";
import path from "path";

// SECURE: Open-then-use pattern -- no gap between check and use
async function serveUserFile(userId: string, filename: string) {
  const filePath = path.join("/uploads", userId, filename);

  // Validate the resolved path stays within the upload directory
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(path.resolve("/uploads", userId))) {
    throw new Error("Path traversal detected");
  }

  let fd: fs.promises.FileHandle | undefined;
  try {
    // Open the file first -- this gives us a handle to the actual file
    fd = await fs.promises.open(filePath, "r");
    const stats = await fd.stat();

    if (!stats.isFile()) {
      throw new Error("Not a regular file");
    }

    // Read using the file handle -- guaranteed to be the same file we stat'd
    const content = await fd.readFile();
    return content;
  } finally {
    await fd?.close();
  }
}

// SECURE: Use O_EXCL for exclusive file creation, avoid temp file races
async function processUpload(stream: NodeJS.ReadableStream, destDir: string) {
  const destPath = path.join(destDir, crypto.randomUUID());

  // Write directly to destination with size limit enforcement during write
  const fd = await fs.promises.open(destPath, "wx"); // O_EXCL: fail if exists
  try {
    let bytesWritten = 0;
    const MAX_SIZE = 10 * 1024 * 1024;

    for await (const chunk of stream) {
      bytesWritten += chunk.length;
      if (bytesWritten > MAX_SIZE) {
        await fd.close();
        await fs.promises.unlink(destPath);
        throw new Error("File too large");
      }
      await fd.write(chunk);
    }
    await fd.close();
  } catch (error) {
    await fd.close().catch(() => {});
    await fs.promises.unlink(destPath).catch(() => {});
    throw error;
  }
}
```

## Impact

File access race conditions can be exploited for local file inclusion (reading sensitive files via symlink substitution), arbitrary file overwrite, or bypassing file type and size restrictions in upload handlers. In the Apache Tomcat case (CVE-2024-50379), the exploitation led to remote code execution. Even in less critical scenarios, attackers can bypass file validation checks to upload malicious content.

## References

- CWE-367: Time-of-check Time-of-use (TOCTOU) -- https://cwe.mitre.org/data/definitions/367.html
- CVE-2024-50379: Apache Tomcat TOCTOU RCE via JSP compilation race
- Node.js fs.exists() deprecation -- https://nodejs.org/api/fs.html#fsexistspath-callback
- CVE-2024-56337: Apache Tomcat incomplete fix for CVE-2024-50379
- OWASP A10:2025 -- Mishandling of Exceptional Conditions
