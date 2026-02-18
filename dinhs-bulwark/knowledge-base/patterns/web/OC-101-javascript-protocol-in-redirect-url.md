# OC-101: JavaScript Protocol in Redirect URL

**Category:** Web Application Security
**Severity:** HIGH
**Auditors:** WEB-04
**CWE:** CWE-79
**OWASP:** A03:2021 - Injection

## Description

The `javascript:` protocol allows execution of JavaScript code when used in URL contexts such as `window.location`, anchor `href` attributes, `window.open()`, and HTTP redirect responses. When an application accepts user-controlled URLs and uses them for navigation without validating the protocol scheme, attackers can inject `javascript:` URLs to achieve XSS.

This attack vector bypasses many XSS filters that focus on `<script>` tags and event handlers. URL validation that only checks for the presence of a domain or path component may miss `javascript:` entirely. Variants include `JAVASCRIPT:` (case-insensitive), `java\nscript:` (newline insertion), `java\tscript:` (tab insertion), and `\x01javascript:` (control character prefix), all of which may bypass naive validation.

In React applications, `href` attributes on `<a>` elements that accept user input are a common source of this vulnerability. React does not automatically block `javascript:` URLs in JSX `href` props, unlike its automatic escaping of text content.

## Detection

```
# Dynamic URL assignment to location or href
grep -rn "window\.location\s*=\|location\.href\s*=\|location\.assign\|location\.replace" --include="*.ts" --include="*.js" --include="*.tsx"
grep -rn "href={.*\(props\.\|state\.\|data\.\|param\)" --include="*.tsx" --include="*.jsx"

# window.open with user-controlled URL
grep -rn "window\.open(" --include="*.ts" --include="*.js" --include="*.tsx"

# URL parameters used in navigation
grep -rn "req\.query.*redirect\|req\.params.*url" --include="*.ts" --include="*.js"

# Anchor tags with dynamic href
grep -rn '<a.*href=.*{' --include="*.tsx" --include="*.jsx"
```

## Vulnerable Code

```typescript
import React from 'react';

interface UserProfile {
  name: string;
  website: string; // User-provided URL
}

// VULNERABLE: User-controlled URL in href without protocol validation
function ProfileCard({ user }: { user: UserProfile }) {
  return (
    <div className="profile">
      <h2>{user.name}</h2>
      {/* Attacker sets website to: javascript:fetch('/api/steal?c='+document.cookie) */}
      <a href={user.website}>Visit Website</a>
    </div>
  );
}

// VULNERABLE: Redirect using user-controlled URL
function handleRedirect(url: string) {
  // URL from query parameter: ?next=javascript:alert(document.cookie)
  window.location.href = url;
}

// VULNERABLE: Server-side redirect without scheme validation
app.get('/go', (req, res) => {
  const url = req.query.url as string;
  if (url) {
    // javascript: URLs are valid redirect targets
    res.redirect(url);
  }
});
```

## Secure Code

```typescript
import React from 'react';

interface UserProfile {
  name: string;
  website: string;
}

// Validate URL has a safe protocol scheme
function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['https:', 'http:', 'mailto:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

// SECURE: Validate protocol before rendering in href
function ProfileCard({ user }: { user: UserProfile }) {
  const safeUrl = isSafeUrl(user.website) ? user.website : '#';

  return (
    <div className="profile">
      <h2>{user.name}</h2>
      <a href={safeUrl} rel="noopener noreferrer" target="_blank">
        Visit Website
      </a>
    </div>
  );
}

// SECURE: Validate protocol before client-side redirect
function handleRedirect(url: string) {
  if (isSafeUrl(url)) {
    window.location.href = url;
  } else {
    window.location.href = '/';
  }
}

// SECURE: Server-side with protocol validation
app.get('/go', (req, res) => {
  const url = req.query.url as string;
  if (url && isSafeUrl(url)) {
    res.redirect(url);
  } else {
    res.redirect('/');
  }
});
```

## Impact

JavaScript protocol injection in URLs achieves the same impact as traditional XSS: session hijacking, credential theft, page manipulation, and redirection to malicious sites. It is particularly dangerous in user profile fields and social features where URLs are displayed as clickable links to other users, creating stored XSS-like conditions.

## References

- CWE-79: Improper Neutralization of Input During Web Page Generation
- React documentation: Warning about javascript: URLs in JSX
- OWASP: Unvalidated Redirects and Forwards
- "Why React Didn't Kill XSS: The New JavaScript Injection Playbook" -- The Hacker News (2025)
