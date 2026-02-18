# OC-280: Request Body Size Unlimited

**Category:** Error Handling & Resilience
**Severity:** MEDIUM
**Auditors:** ERR-03
**CWE:** CWE-770 (Allocation of Resources Without Limits or Throttling)
**OWASP:** A10:2025 -- Mishandling of Exceptional Conditions

## Description

When an application does not limit the size of incoming request bodies, an attacker can send arbitrarily large payloads to exhaust server memory, cause out-of-memory crashes, or trigger disk exhaustion on file uploads. Express.js body parsers (`express.json()`, `express.urlencoded()`) have a default limit of 100KB, but developers frequently increase this to accommodate legitimate use cases without understanding the security implications.

The danger scales with the number of concurrent requests. A single 1GB request may not crash a server with 4GB of RAM, but 10 concurrent 1GB requests will. Even the default 100KB limit can be dangerous under high concurrency: 10,000 concurrent requests at 100KB each consume 1GB of memory before any business logic executes. This is a low-skill, high-impact denial-of-service vector.

File upload endpoints are particularly vulnerable. Without size limits, an attacker can upload multi-gigabyte files to fill disk space, exhaust memory during processing, or overwhelm bandwidth. JSON payload parsing is also dangerous because deeply nested JSON structures can cause the parser itself to consume excessive memory and CPU.

## Detection

```
grep -rn "express\.json\|bodyParser\.json\|express\.urlencoded" --include="*.ts" --include="*.js"
grep -rn "limit.*:\|\"limit\"" --include="*.ts" --include="*.js" | grep -i "body\|json\|urlencoded"
grep -rn "multer\|formidable\|busboy" --include="*.ts" --include="*.js" | grep -v "limits\|maxFileSize\|fileSize"
grep -rn "app\.use(express\.json())" --include="*.ts" --include="*.js"
```

Look for: `express.json()` without a `limit` option, file upload middleware without `maxFileSize` or `limits` configuration, absence of `Content-Length` validation, raw body parsing without size limits.

## Vulnerable Code

```typescript
import express from "express";
import multer from "multer";

const app = express();

// VULNERABLE: No body size limit specified (defaults to 100KB,
// but often overridden to accommodate larger payloads)
app.use(express.json({ limit: "50mb" })); // Way too large for most APIs

// VULNERABLE: File upload with no size limit
const upload = multer({ dest: "/tmp/uploads" });
app.post("/api/upload", upload.single("file"), (req, res) => {
  // No fileSize limit -- attacker can upload gigabytes
  res.json({ filename: req.file?.filename });
});

// VULNERABLE: Raw body parsing without limit
app.post("/api/webhook", express.raw({ type: "*/*" }), (req, res) => {
  // express.raw() default limit is 100KB, but type: "*/*" accepts everything
  processWebhook(req.body);
  res.sendStatus(200);
});
```

## Secure Code

```typescript
import express from "express";
import multer from "multer";

const app = express();

// SECURE: Appropriate body size limits per endpoint type
app.use(express.json({ limit: "256kb" })); // Default: reasonable for API payloads
app.use(express.urlencoded({ extended: true, limit: "256kb" }));

// SECURE: File upload with explicit size and count limits
const upload = multer({
  dest: "/tmp/uploads",
  limits: {
    fileSize: 5 * 1024 * 1024,   // 5MB max per file
    files: 5,                     // Max 5 files per request
    fields: 20,                   // Max 20 non-file fields
    fieldSize: 1024 * 100,        // 100KB max per field value
  },
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "application/pdf"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("File type not allowed"));
    }
  },
});

app.post("/api/upload", upload.single("file"), (req, res) => {
  res.json({ filename: req.file?.filename, size: req.file?.size });
});

// SECURE: Webhook with appropriate limit
app.post("/api/webhook",
  express.raw({ type: "application/json", limit: "64kb" }),
  (req, res) => {
    processWebhook(req.body);
    res.sendStatus(200);
  }
);

// SECURE: Additional protection at the server level
const server = app.listen(3000);
server.maxHeadersCount = 50;
server.headersTimeout = 20_000;     // 20s header timeout
server.requestTimeout = 30_000;     // 30s total request timeout
```

## Impact

An attacker can crash the server by sending large payloads that exhaust available memory (OOM kill), fill disk space with large file uploads, or degrade performance by forcing the server to parse massive JSON structures. This is a straightforward denial-of-service attack that requires no authentication and minimal attacker skill.

## References

- CWE-770: Allocation of Resources Without Limits or Throttling -- https://cwe.mitre.org/data/definitions/770.html
- Express.js body-parser documentation: limit option
- OWASP A10:2025 -- Mishandling of Exceptional Conditions
- multer documentation: limits configuration -- https://www.npmjs.com/package/multer
- Node.js HTTP server configuration: requestTimeout, headersTimeout
