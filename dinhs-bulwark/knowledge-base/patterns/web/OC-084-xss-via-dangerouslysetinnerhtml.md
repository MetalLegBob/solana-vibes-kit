# OC-084: XSS via dangerouslySetInnerHTML

**Category:** Web Application Security
**Severity:** HIGH
**Auditors:** WEB-01
**CWE:** CWE-79
**OWASP:** A03:2021 - Injection

## Description

React escapes rendered content by default, preventing most XSS attacks. However, the `dangerouslySetInnerHTML` prop explicitly bypasses this protection and injects raw HTML into the DOM. When developers use this prop with user-controlled content or content from untrusted APIs without sanitization, it creates a direct XSS vector.

This pattern is pervasive in React applications. The Joplin note-taking application (CVE-2025-25187) used `dangerouslySetInnerHTML` to render note titles without escaping HTML entities. Combined with the absence of a restrictive CSP and Electron's `nodeIntegration: true`, this led to a chain from XSS to arbitrary code execution. React Router also suffered from XSS (CVE-2025-59057) in its `meta()`/`<Meta>` APIs when generating `script:ld+json` tags during SSR.

The pattern is especially dangerous in applications that render rich text, markdown output, CMS content, or email HTML, as developers assume the content is "safe" because it comes from an internal API.

## Detection

```
# Direct usage of dangerouslySetInnerHTML
grep -rn "dangerouslySetInnerHTML" --include="*.tsx" --include="*.jsx" --include="*.ts" --include="*.js"

# Check if DOMPurify or sanitize-html is used near dangerouslySetInnerHTML
grep -rn "dangerouslySetInnerHTML" --include="*.tsx" --include="*.jsx" -l | xargs grep -L "DOMPurify\|sanitize-html\|sanitize\|purify"

# Check if content source is user-controlled
grep -rn "dangerouslySetInnerHTML.*\(props\.\|state\.\|data\.\)" --include="*.tsx" --include="*.jsx"
```

## Vulnerable Code

```typescript
import React, { useEffect, useState } from 'react';

interface Article {
  title: string;
  body: string; // HTML from CMS
}

function ArticlePage({ articleId }: { articleId: string }) {
  const [article, setArticle] = useState<Article | null>(null);

  useEffect(() => {
    fetch(`/api/articles/${articleId}`)
      .then((res) => res.json())
      .then(setArticle);
  }, [articleId]);

  if (!article) return <div>Loading...</div>;

  return (
    <article>
      {/* VULNERABLE: Title from API rendered as raw HTML */}
      <h1 dangerouslySetInnerHTML={{ __html: article.title }} />
      {/* VULNERABLE: Body from CMS rendered without sanitization */}
      <div dangerouslySetInnerHTML={{ __html: article.body }} />
    </article>
  );
}
```

## Secure Code

```typescript
import React, { useEffect, useState } from 'react';
import DOMPurify from 'dompurify';

interface Article {
  title: string;
  body: string;
}

// Configure DOMPurify to strip dangerous content
const PURIFY_CONFIG = {
  ALLOWED_TAGS: [
    'h1', 'h2', 'h3', 'p', 'br', 'strong', 'em', 'a',
    'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 'img',
  ],
  ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class'],
  ALLOW_DATA_ATTR: false,
};

function ArticlePage({ articleId }: { articleId: string }) {
  const [article, setArticle] = useState<Article | null>(null);

  useEffect(() => {
    fetch(`/api/articles/${articleId}`)
      .then((res) => res.json())
      .then(setArticle);
  }, [articleId]);

  if (!article) return <div>Loading...</div>;

  return (
    <article>
      {/* SECURE: Title rendered as text, not HTML */}
      <h1>{article.title}</h1>
      {/* SECURE: Body sanitized before rendering */}
      <div
        dangerouslySetInnerHTML={{
          __html: DOMPurify.sanitize(article.body, PURIFY_CONFIG),
        }}
      />
    </article>
  );
}
```

## Impact

Attackers can inject arbitrary JavaScript that executes in the context of every user who views the affected content. This enables mass session hijacking, credential theft, cryptocurrency wallet address swapping, and in Electron applications, full Remote Code Execution. The Joplin CVE-2025-25187 demonstrated the full XSS-to-RCE chain.

## References

- CVE-2025-25187: Joplin XSS via dangerouslySetInnerHTML in note titles leading to RCE
- CVE-2025-59057: React Router XSS in meta() API during SSR
- Sourcery Vulnerability Database: "XSS via non-constant HTML in React dangerouslySetInnerHTML"
- React documentation: https://react.dev/reference/react-dom/components/common#dangerously-setting-the-inner-html
