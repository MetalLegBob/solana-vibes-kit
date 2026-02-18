# OC-094: Missing X-Content-Type-Options

**Category:** Web Application Security
**Severity:** LOW
**Auditors:** WEB-02
**CWE:** CWE-693
**OWASP:** A05:2021 - Security Misconfiguration

## Description

The `X-Content-Type-Options: nosniff` header prevents browsers from MIME-type sniffing, which is the browser's behavior of guessing the content type of a response by examining its content rather than trusting the `Content-Type` header. Without this header, an attacker can upload a file with a benign extension (e.g., `.txt` or `.jpg`) containing JavaScript, and the browser may execute it as a script if the content looks like JavaScript.

MIME sniffing was historically necessary because many servers sent incorrect Content-Type headers. However, it creates a significant security risk: uploaded files, API responses, or static assets can be reinterpreted as executable content. For example, a user-uploaded `.txt` file containing `<script>alert(1)</script>` could be interpreted as HTML by a sniffing browser, executing the script.

This is a low-severity issue in isolation, but it can amplify other vulnerabilities. When combined with file upload functionality or user-controlled content endpoints, the absence of `nosniff` creates XSS vectors that would otherwise be impossible.

## Detection

```
# Check for X-Content-Type-Options header
grep -rn "X-Content-Type-Options\|noSniff\|nosniff" --include="*.ts" --include="*.js"

# Check helmet.js configuration
grep -rn "helmet\.\|noSniff" --include="*.ts" --include="*.js"

# Check static file serving configuration
grep -rn "express\.static\|serveStatic" --include="*.ts" --include="*.js"

# API endpoints returning user-controlled content
grep -rn "res\.send\|res\.json\|res\.type" --include="*.ts" --include="*.js"
```

## Vulnerable Code

```typescript
import express from 'express';

const app = express();

// VULNERABLE: No X-Content-Type-Options header
// Uploaded files served without MIME type enforcement
app.use('/uploads', express.static('uploads'));

// API endpoint that returns user-controlled content
app.get('/api/paste/:id', async (req, res) => {
  const paste = await db.pastes.findById(req.params.id);
  // Content-Type set to text/plain, but browser may sniff it as HTML
  res.type('text/plain').send(paste.content);
});
```

## Secure Code

```typescript
import express from 'express';
import helmet from 'helmet';

const app = express();

// SECURE: helmet sets X-Content-Type-Options: nosniff by default
app.use(helmet());

// Or set it manually
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
});

// Static files now served with nosniff -- browser trusts Content-Type header
app.use('/uploads', express.static('uploads'));

// API endpoint with explicit Content-Type and nosniff
app.get('/api/paste/:id', async (req, res) => {
  const paste = await db.pastes.findById(req.params.id);
  res.type('text/plain').send(paste.content);
});
```

## Impact

Without `nosniff`, browsers may reinterpret uploaded files or API responses as executable HTML or JavaScript, creating XSS vectors. This is particularly dangerous for file hosting services, paste bins, and any application that serves user-uploaded content. The header is trivial to implement and eliminates an entire class of MIME confusion attacks.

## References

- CWE-693: Protection Mechanism Failure
- MDN: X-Content-Type-Options header reference
- NexTool: "HTTP Security Headers: Complete Guide" (2026)
- BrightSec: "Misconfigured Security Headers" documentation
- OWASP Secure Headers Project
