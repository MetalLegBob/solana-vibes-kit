# OC-099: Open Redirect via Unvalidated URL

**Category:** Web Application Security
**Severity:** MEDIUM
**Auditors:** WEB-04
**CWE:** CWE-601
**OWASP:** A01:2021 - Broken Access Control

## Description

Open redirect vulnerabilities occur when an application accepts a user-controlled URL parameter and redirects the user to it without validation. Attackers exploit this to redirect victims from a trusted domain to a malicious site, which is highly effective for phishing because the URL initially appears to belong to the legitimate application.

The Spring Framework suffered from open redirect vulnerabilities in `UriComponentsBuilder` (CVE-2024-22243 and CVE-2024-22262), affecting versions 5.3.0-5.3.31 and 6.0.0-6.0.16. The WordPress OAuth Server plugin (CVE-2024-31253) allowed unauthenticated open redirects in all versions up to 4.3.3 due to insufficient redirect URL validation.

Open redirects are frequently chained with other vulnerabilities. In OAuth flows, an open redirect on the authorized redirect domain can steal authorization codes. SSRF attacks can chain open redirects to bypass URL allowlists. Dark Lab (2025) documented over 70 cases of open redirect attacks weaponizing trusted Hong Kong domains for SEO manipulation and gambling content injection.

## Detection

```
# Redirect endpoints with user-controlled URLs
grep -rn "res\.redirect\|redirect(\|location.*=\|Location.*=" --include="*.ts" --include="*.js"
grep -rn "req\.query\.redirect\|req\.query\.url\|req\.query\.next\|req\.query\.returnTo\|req\.query\.return_url" --include="*.ts" --include="*.js"

# URL parameters commonly used for redirects
grep -rn "redirect_uri\|return_url\|next\|returnTo\|goto\|dest\|destination\|redir\|url\|continue" --include="*.ts" --include="*.js"

# Window.location assignment from parameters
grep -rn "window\.location\s*=\|location\.href\s*=" --include="*.ts" --include="*.js" --include="*.tsx"
```

## Vulnerable Code

```typescript
import express from 'express';

const app = express();

// VULNERABLE: Redirect to any user-supplied URL
app.get('/login', (req, res) => {
  const returnUrl = req.query.returnTo as string || '/dashboard';
  // After authentication...
  if (authenticateUser(req)) {
    // Attacker: /login?returnTo=https://evil.com/fake-login
    res.redirect(returnUrl);
  }
});

// VULNERABLE: Partial URL validation (bypassable)
app.get('/redirect', (req, res) => {
  const url = req.query.url as string;
  // Bug: "https://evil.com@example.com" includes "example.com"
  if (url && url.includes('example.com')) {
    res.redirect(url);
  }
});

// VULNERABLE: Protocol-relative URL bypass
app.get('/goto', (req, res) => {
  const dest = req.query.dest as string;
  // Bug: "//evil.com" starts with "/" but redirects externally
  if (dest && dest.startsWith('/')) {
    res.redirect(dest);
  }
});
```

## Secure Code

```typescript
import express from 'express';

const app = express();

// SECURE: Validate redirect is a relative path on same origin
function isSafeRedirect(url: string): boolean {
  // Must start with / but not // (protocol-relative)
  if (!url.startsWith('/') || url.startsWith('//')) return false;

  // Parse and verify no host component
  try {
    const parsed = new URL(url, 'https://placeholder.com');
    return parsed.hostname === 'placeholder.com';
  } catch {
    return false;
  }
}

app.get('/login', (req, res) => {
  const returnUrl = req.query.returnTo as string || '/dashboard';

  if (authenticateUser(req)) {
    const safeUrl = isSafeRedirect(returnUrl) ? returnUrl : '/dashboard';
    res.redirect(safeUrl);
  }
});

// For known external redirects, use an allowlist
const ALLOWED_EXTERNAL_REDIRECTS = new Set([
  'https://docs.example.com',
  'https://support.example.com',
]);

app.get('/redirect', (req, res) => {
  const url = req.query.url as string;
  if (url && ALLOWED_EXTERNAL_REDIRECTS.has(url)) {
    res.redirect(url);
  } else {
    res.redirect('/');
  }
});
```

## Impact

Open redirects enable highly convincing phishing attacks that leverage the trusted domain's reputation. When chained with OAuth, they enable authorization code theft and account takeover. When combined with SSRF, they bypass URL validation to reach internal services. Open redirects on government or banking domains are especially dangerous for social engineering campaigns.

## References

- CVE-2024-22243: Spring Framework open redirect in UriComponentsBuilder
- CVE-2024-22262: Spring Framework open redirect (additional bypass)
- CVE-2024-31253: WordPress OAuth Server open redirect
- CWE-601: URL Redirection to Untrusted Site
- Dark Lab (2025): "Redirected, Taken Over, & Defaced" -- 70+ weaponized open redirects in Hong Kong
- Clerk: "Mitigating OAuth's Open Response Type Vulnerability" (2024)
