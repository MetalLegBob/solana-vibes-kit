# OC-086: XSS via SVG Upload

**Category:** Web Application Security
**Severity:** MEDIUM
**Auditors:** WEB-01, DATA-03
**CWE:** CWE-79
**OWASP:** A03:2021 - Injection

## Description

Scalable Vector Graphics (SVG) files are XML-based and can contain embedded JavaScript via `<script>` elements, event handlers (`onload`, `onclick`), `<foreignObject>` elements with HTML, and `<a>` elements with `javascript:` hrefs. When an application accepts SVG file uploads and serves them with the correct MIME type (`image/svg+xml`), any embedded JavaScript executes when the SVG is viewed in a browser.

This vulnerability is widespread because many file upload validators check only file extensions or MIME types from the `Content-Type` header, both of which are trivially spoofed. Even applications that validate image dimensions or perform basic content checks often miss embedded script content in SVG files.

The attack is particularly dangerous in avatar/profile picture uploads, where the SVG is served from the application's own origin, giving the embedded JavaScript access to the same cookies and session data as the main application.

## Detection

```
# SVG allowed in upload validation
grep -rn "\.svg\|image/svg\|svg\+xml" --include="*.ts" --include="*.js"

# File upload handlers without SVG-specific filtering
grep -rn "multer\|formidable\|busboy\|upload" --include="*.ts" --include="*.js"

# Serving uploaded files directly
grep -rn "express\.static\|sendFile\|createReadStream" --include="*.ts" --include="*.js"

# Check Content-Type header handling for uploads
grep -rn "content-type\|mimetype\|mime" --include="*.ts" --include="*.js"
```

## Vulnerable Code

```typescript
import express from 'express';
import multer from 'multer';
import path from 'path';

const app = express();

// VULNERABLE: Allows SVG uploads without sanitization
const upload = multer({
  storage: multer.diskStorage({
    destination: './uploads/avatars',
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `${req.user.id}${ext}`);
    },
  }),
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.svg'];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  },
});

app.post('/api/avatar', upload.single('avatar'), (req, res) => {
  res.json({ url: `/uploads/avatars/${req.file!.filename}` });
});

// Serves SVG with its MIME type, executing embedded JS
app.use('/uploads', express.static('uploads'));
```

## Secure Code

```typescript
import express from 'express';
import multer from 'multer';
import path from 'path';
import sharp from 'sharp';

const app = express();

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    // SECURE: Reject SVG uploads entirely
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowed.includes(ext)) {
      return cb(new Error('SVG files are not allowed'));
    }
    cb(null, true);
  },
  limits: { fileSize: 5 * 1024 * 1024 },
});

app.post('/api/avatar', upload.single('avatar'), async (req, res) => {
  // SECURE: Re-encode image through sharp to strip any embedded content
  const safeImage = await sharp(req.file!.buffer)
    .resize(256, 256, { fit: 'cover' })
    .png()
    .toBuffer();

  const filename = `${req.user.id}.png`;
  await fs.writeFile(`./uploads/avatars/${filename}`, safeImage);
  res.json({ url: `/uploads/avatars/${filename}` });
});

// Serve uploads with Content-Disposition to prevent inline rendering
app.use('/uploads', express.static('uploads', {
  setHeaders: (res, filePath) => {
    res.set('Content-Disposition', 'attachment');
    res.set('X-Content-Type-Options', 'nosniff');
  },
}));
```

## Impact

When a malicious SVG is uploaded as a user avatar or image, every visitor who views a page displaying that image has JavaScript executed in their browser under the application's origin. This enables mass session hijacking, cookie theft, and CSRF attacks against all users who view the malicious content.

## References

- CWE-79: Improper Neutralization of Input During Web Page Generation
- OWASP: Unrestricted File Upload (https://owasp.org/www-community/vulnerabilities/Unrestricted_File_Upload)
- PortSwigger Research: Exploiting XSS via SVG file uploads
- HackerOne reports: Multiple SVG XSS findings across bug bounty programs
