# OC-082: Stored XSS

**Category:** Web Application Security
**Severity:** HIGH
**Auditors:** WEB-01
**CWE:** CWE-79
**OWASP:** A03:2021 - Injection

## Description

Stored Cross-Site Scripting (XSS) occurs when an attacker's payload is persisted in the application's data store (database, cache, file system) and later rendered to other users without proper sanitization. This is the most dangerous form of XSS because it does not require social engineering -- every user who views the affected page is automatically compromised.

Stored XSS is commonly found in user profile fields, forum posts, comment systems, support tickets, and any feature that stores and later displays user-generated content. The Joplin note-taking application (CVE-2025-25187) suffered from stored XSS via note titles rendered using React's `dangerouslySetInnerHTML` without sanitization, combined with missing CSP and enabled `nodeIntegration`, which escalated the XSS to arbitrary code execution.

Modern JavaScript applications frequently receive HTML-rich content from APIs and render it client-side, making stored XSS a persistent threat even in SPA architectures.

## Detection

```
# Database content rendered without sanitization
grep -rn "dangerouslySetInnerHTML" --include="*.tsx" --include="*.jsx"
grep -rn "innerHTML\s*=" --include="*.ts" --include="*.js"
grep -rn "\.html\(" --include="*.ts" --include="*.js"
grep -rn "v-html=" --include="*.vue"
grep -rn "\[innerHTML\]=" --include="*.html"

# Content from database/API rendered as HTML
grep -rn "\.findOne\|\.findMany\|\.find(" --include="*.ts" -l | xargs grep -l "innerHTML\|dangerouslySetInnerHTML"
```

## Vulnerable Code

```typescript
import React from 'react';

interface Comment {
  id: string;
  author: string;
  body: string; // HTML content from database
  createdAt: Date;
}

// VULNERABLE: Renders stored HTML content without sanitization
function CommentList({ comments }: { comments: Comment[] }) {
  return (
    <div className="comments">
      {comments.map((comment) => (
        <div key={comment.id} className="comment">
          <strong>{comment.author}</strong>
          {/* Attacker stores: <img src=x onerror="fetch('/api/steal?c='+document.cookie)"> */}
          <div dangerouslySetInnerHTML={{ __html: comment.body }} />
        </div>
      ))}
    </div>
  );
}
```

## Secure Code

```typescript
import React from 'react';
import DOMPurify from 'dompurify';

interface Comment {
  id: string;
  author: string;
  body: string;
  createdAt: Date;
}

// SECURE: Sanitize stored HTML before rendering
function CommentList({ comments }: { comments: Comment[] }) {
  return (
    <div className="comments">
      {comments.map((comment) => (
        <div key={comment.id} className="comment">
          <strong>{comment.author}</strong>
          <div
            dangerouslySetInnerHTML={{
              __html: DOMPurify.sanitize(comment.body, {
                ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
                ALLOWED_ATTR: ['href'],
              }),
            }}
          />
        </div>
      ))}
    </div>
  );
}
```

## Impact

Every user who views the page containing the stored payload is compromised. Attackers can hijack sessions at scale, steal credentials, perform mass account takeover, inject cryptocurrency mining scripts, or deploy phishing overlays. In Electron-based apps with `nodeIntegration` enabled, stored XSS can escalate to full Remote Code Execution (RCE).

## References

- CVE-2025-25187: Joplin stored XSS via dangerouslySetInnerHTML in note titles, escalating to RCE
- CVE-2025-55182 (React2Shell): React Server Components RCE via unsafe handling
- OWASP Testing Guide: Testing for Stored XSS (WSTG-INPV-02)
- CWE-79: Improper Neutralization of Input During Web Page Generation
