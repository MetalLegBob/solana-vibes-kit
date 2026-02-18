# OC-055: OS Command Injection via exec/spawn

**Category:** Injection
**Severity:** CRITICAL
**Auditors:** INJ-02
**CWE:** CWE-78
**OWASP:** A03:2021 Injection

## Description

OS command injection occurs when user-controlled input is passed to system command execution functions like `child_process.exec()`, `child_process.execSync()`, or `child_process.spawn()` with shell mode enabled. The `exec` family of functions uses the system shell to interpret the command string, making them vulnerable to shell metacharacter injection (`;`, `|`, `&&`, backticks, `$()`).

CVE-2024-27980 (CVSS 8.1) demonstrated that even `child_process.spawn()` without shell mode was vulnerable on Windows due to improper handling of batch files, allowing command injection via malicious arguments. CVE-2024-36138 was a bypass of the original fix, showing the persistence of this attack surface.

In Node.js applications, command injection commonly appears in file processing endpoints (ImageMagick, FFmpeg), PDF generation, network utilities (ping, nslookup), and Git operations where developers shell out to command-line tools.

## Detection

```
# exec with user input
exec\(.*req\.(body|query|params)
exec\(`.*\$\{
execSync\(.*req\.
execSync\(`.*\$\{
# spawn with shell: true
spawn\(.*\{.*shell:\s*true
# Dangerous shell-out patterns
child_process
require\(['"]child_process['"]\)
```

## Vulnerable Code

```typescript
import { exec } from 'child_process';

app.post('/convert', async (req, res) => {
  const { filename } = req.body;
  // VULNERABLE: filename could contain shell metacharacters
  exec(`convert uploads/${filename} -resize 100x100 thumbnails/${filename}`,
    (error, stdout) => {
      if (error) return res.status(500).send('Conversion failed');
      res.send('OK');
    }
  );
  // Attacker sends: filename = "test.jpg; rm -rf /"
});

app.get('/ping', (req, res) => {
  const { host } = req.query;
  // VULNERABLE: direct command injection
  exec(`ping -c 4 ${host}`, (err, stdout) => {
    res.send(stdout);
  });
});
```

## Secure Code

```typescript
import { execFile, spawn } from 'child_process';
import path from 'path';

app.post('/convert', async (req, res) => {
  const { filename } = req.body;
  // Validate filename — alphanumeric + extension only
  if (!/^[\w.-]+$/.test(filename)) {
    return res.status(400).send('Invalid filename');
  }
  const input = path.join('uploads', path.basename(filename));
  const output = path.join('thumbnails', path.basename(filename));

  // SAFE: execFile does not use a shell, args are passed as array
  execFile('convert', [input, '-resize', '100x100', output],
    (error) => {
      if (error) return res.status(500).send('Conversion failed');
      res.send('OK');
    }
  );
});

app.get('/ping', (req, res) => {
  const { host } = req.query;
  // Validate: hostname/IP only
  if (!/^[\w.-]+$/.test(host)) {
    return res.status(400).send('Invalid host');
  }
  // SAFE: execFile with arguments as array, no shell
  execFile('ping', ['-c', '4', host], (err, stdout) => {
    res.send(stdout);
  });
});
```

## Impact

Full remote code execution with the privileges of the Node.js process. Attackers can read/write arbitrary files, install backdoors, pivot to internal systems, exfiltrate data, and completely compromise the server.

## References

- CVE-2024-27980: Node.js child_process.spawn command injection on Windows (CVSS 8.1)
- CVE-2024-36138: Node.js child_process command injection bypass
- CWE-78: Improper Neutralization of Special Elements used in an OS Command
- Snyk: 5 ways to prevent code injection in JavaScript and Node.js
- Node.js security advisory: April 2024 Security Releases
