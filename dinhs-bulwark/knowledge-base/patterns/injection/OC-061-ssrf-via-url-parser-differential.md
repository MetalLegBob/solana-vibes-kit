# OC-061: SSRF via URL Parser Differential

**Category:** Injection
**Severity:** HIGH
**Auditors:** INJ-03
**CWE:** CWE-918
**OWASP:** A10:2021 Server-Side Request Forgery

## Description

SSRF via URL parser differential exploits inconsistencies between different URL parsing implementations used for validation versus actual request dispatch. When the validation library parses a URL differently from the HTTP client, an attacker can craft a URL that appears safe to the validator but targets an internal resource when fetched.

Common parser differentials include: handling of `@` in URLs (`http://public.com@169.254.169.254`), backslash normalization (`http://169.254.169.254\@public.com`), Unicode normalization differences, IPv6 bracket handling, and URL-encoding of special characters. The Node.js `url.parse()` (legacy) and `new URL()` (WHATWG) APIs parse certain edge cases differently, which has led to multiple CVEs.

The Langchain Community CVE-2026-26019 demonstrated this class: the `preventOutside` option relied on a simple string comparison (`url.startsWith(baseUrl)`) that could be bypassed with `https://example.com.attacker.com`, exploiting the difference between string prefix matching and actual DNS resolution.

## Detection

```
# URL parsing for validation
url\.parse\(
new URL\(
# Inconsistent URL usage patterns
parse.*url.*then.*fetch
validate.*hostname.*then.*get
# Legacy url.parse (known differential issues)
require\(['"]url['"]\)\.parse
# User-controlled URL with @
```

## Vulnerable Code

```typescript
import { parse } from 'url';

function isAllowedHost(urlString: string): boolean {
  // VULNERABLE: url.parse handles @ differently than fetch
  const parsed = parse(urlString);
  const blocked = ['169.254.169.254', 'localhost', '127.0.0.1'];
  return !blocked.includes(parsed.hostname || '');
}

app.post('/proxy', async (req, res) => {
  const { url } = req.body;
  if (!isAllowedHost(url)) {
    return res.status(403).json({ error: 'Blocked host' });
  }
  // url.parse sees hostname as "safe.com"
  // but fetch sees hostname as "169.254.169.254"
  // due to @ handling: http://safe.com@169.254.169.254/latest/
  const response = await fetch(url);
  res.json(await response.json());
});
```

## Secure Code

```typescript
import { URL } from 'url';
import dns from 'dns/promises';
import ipaddr from 'ipaddr.js';

async function validateAndFetch(urlString: string): Promise<Response> {
  // Use WHATWG URL parser consistently
  const url = new URL(urlString);

  // Block URLs with credentials/userinfo
  if (url.username || url.password) {
    throw new Error('URLs with credentials not allowed');
  }
  // Only allow http/https
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('Invalid protocol');
  }
  // Resolve and validate IP
  const addresses = await dns.resolve4(url.hostname);
  for (const addr of addresses) {
    if (ipaddr.parse(addr).range() !== 'unicast') {
      throw new Error('Internal address blocked');
    }
  }
  return fetch(url.toString(), { redirect: 'error' });
}
```

## Impact

Bypass of URL-based SSRF protections allowing access to cloud metadata, internal services, and private network resources. Parser differentials are a common root cause of SSRF filter bypasses.

## References

- CVE-2026-26019: Langchain Community SSRF via string-comparison URL validation bypass
- CWE-918: Server-Side Request Forgery
- Orange Tsai: A New Era of SSRF — Exploiting URL Parsers (BlackHat 2017)
- Node.js docs: Differences between url.parse and new URL
