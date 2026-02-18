# OC-135: No Request Body Size Limit

**Category:** API & Network
**Severity:** MEDIUM
**Auditors:** API-01, ERR-03
**CWE:** CWE-770
**OWASP:** API4:2023 - Unrestricted Resource Consumption

## Description

When an API does not enforce a maximum request body size, attackers can send extremely large payloads to exhaust server memory, cause out-of-memory crashes, or trigger denial-of-service conditions. In Node.js, the default Express JSON body parser accepts up to 100KB, but many applications override this limit or use frameworks that have no default limit at all.

The attack is straightforward: an attacker sends a POST or PUT request with a multi-gigabyte JSON body. The server attempts to buffer and parse the entire body into memory, consuming RAM until the process crashes or the operating system kills it. Even smaller payloads (a few megabytes) of deeply nested JSON can consume disproportionate CPU time during parsing.

This vulnerability is part of the broader OWASP API4:2023 (Unrestricted Resource Consumption) category. It affects not just the targeted endpoint but the entire server process, potentially taking down all API endpoints hosted on the same instance. In containerized environments without proper resource limits, this can cascade to affect other services on the same node.

## Detection

```
# Check body parser configuration
grep -rn "express\.json\|body-parser\|bodyParser" --include="*.ts" --include="*.js"
# Look for explicit limit setting
grep -rn "limit.*['\"]" --include="*.ts" --include="*.js" | grep -i "body\|json\|urlencoded"
# Raw body handling without limits
grep -rn "req\.on.*data\|getRawBody\|raw-body" --include="*.ts" --include="*.js"
# File upload without size limits
grep -rn "multer\|busboy\|formidable" --include="*.ts" --include="*.js" | grep -v "limits"
```

## Vulnerable Code

```typescript
import express from 'express';

const app = express();

// VULNERABLE: Overriding default limit to accept any size
app.use(express.json({ limit: '50mb' }));

// VULNERABLE: No limit set at all (some frameworks default to unlimited)
app.use(express.raw());

// VULNERABLE: File upload with no size limit
import multer from 'multer';
const upload = multer({ dest: 'uploads/' });
app.post('/api/upload', upload.single('file'), (req, res) => {
  // No fileSize limit -- attacker can upload multi-GB files
  res.json({ filename: req.file.filename });
});
```

## Secure Code

```typescript
import express from 'express';
import multer from 'multer';

const app = express();

// SECURE: Enforce a reasonable body size limit
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// SECURE: File upload with explicit size limits
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 5 * 1024 * 1024,  // 5MB max per file
    files: 3,                    // Max 3 files per request
    fieldSize: 100 * 1024,       // 100KB max per field
  },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'application/pdf'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  },
});

app.post('/api/upload', upload.single('file'), (req, res) => {
  res.json({ filename: req.file.filename, size: req.file.size });
});

// SECURE: Custom raw body handler with limit
app.post('/api/webhook', express.raw({ type: 'application/json', limit: '256kb' }), (req, res) => {
  // Process raw body for signature verification
});
```

## Impact

An attacker can crash the server process by sending large payloads that exhaust available memory, cause denial-of-service by consuming all CPU time parsing deeply nested JSON structures, fill up disk space through unlimited file uploads, and degrade performance for all users sharing the same server instance. In cloud environments, this can also lead to unexpected cost increases due to auto-scaling.

## References

- CWE-770: Allocation of Resources Without Limits or Throttling
- OWASP API4:2023 - Unrestricted Resource Consumption: https://owasp.org/API-Security/editions/2023/en/0xa4-unrestricted-resource-consumption/
- Express body-parser documentation: https://expressjs.com/en/api.html#express.json
- Node.js Denial of Service via large HTTP payloads
