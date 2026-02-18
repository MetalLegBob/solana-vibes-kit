# OC-059: SSRF via Redirect Following

**Category:** Injection
**Severity:** HIGH
**Auditors:** INJ-03
**CWE:** CWE-918
**OWASP:** A10:2021 Server-Side Request Forgery

## Description

SSRF via redirect following bypasses URL validation by pointing to an attacker-controlled server that responds with an HTTP redirect (301/302) to an internal resource. The application validates the initial URL as external and safe, but then follows the redirect to a forbidden internal address like `169.254.169.254` or `localhost`.

This is a common bypass for SSRF protections that only validate the initial URL. The Langchain Community CVE-2026-26019 demonstrated this pattern: the RecursiveUrlLoader's `preventOutside` option used a simple string comparison on the initial URL, which was trivially bypassed by redirect chains. Most HTTP clients (axios, node-fetch, got, native fetch) follow redirects by default.

The attack chain: attacker submits `https://attacker.com/redirect` which passes validation, the server fetches it, `attacker.com` returns `302 Location: http://169.254.169.254/latest/meta-data/`, and the HTTP client follows the redirect to the metadata service.

## Detection

```
# HTTP clients with default redirect following
axios\.get\(
fetch\(
got\(
http\.get\(
# Check if maxRedirects or redirect policy is configured
maxRedirects
redirect:\s*['"]follow
followRedirect
# Missing redirect: 'error' or redirect: 'manual'
```

## Vulnerable Code

```typescript
import axios from 'axios';

async function isUrlSafe(url: string): Promise<boolean> {
  const parsed = new URL(url);
  // Validates initial URL only
  return !['127.0.0.1', 'localhost'].includes(parsed.hostname)
    && !parsed.hostname.startsWith('169.254');
}

app.post('/preview', async (req, res) => {
  const { url } = req.body;
  if (!await isUrlSafe(url)) {
    return res.status(400).json({ error: 'Blocked' });
  }
  // VULNERABLE: axios follows redirects by default (maxRedirects: 5)
  // attacker.com redirects to http://169.254.169.254/...
  const response = await axios.get(url);
  res.json({ title: extractTitle(response.data) });
});
```

## Secure Code

```typescript
import axios from 'axios';
import dns from 'dns/promises';
import ipaddr from 'ipaddr.js';

async function safeFetch(urlString: string): Promise<string> {
  const maxRedirects = 3;
  let currentUrl = urlString;

  for (let i = 0; i <= maxRedirects; i++) {
    // Validate EVERY URL in the redirect chain
    const url = new URL(currentUrl);
    const addresses = await dns.resolve4(url.hostname);
    for (const addr of addresses) {
      const range = ipaddr.parse(addr).range();
      if (range !== 'unicast') {
        throw new Error('Redirect to internal address blocked');
      }
    }

    const response = await axios.get(currentUrl, {
      maxRedirects: 0,
      validateStatus: (s) => s < 400
    });

    if ([301, 302, 307, 308].includes(response.status)) {
      currentUrl = response.headers.location;
      continue;
    }
    return response.data;
  }
  throw new Error('Too many redirects');
}

app.post('/preview', async (req, res) => {
  try {
    const data = await safeFetch(req.body.url);
    res.json({ title: extractTitle(data) });
  } catch {
    res.status(400).json({ error: 'Failed to fetch URL' });
  }
});
```

## Impact

Bypass of SSRF protections leading to access to cloud metadata credentials, internal services, and private network resources. The redirect technique defeats most first-layer URL validation.

## References

- CVE-2026-26019: Langchain Community SSRF via redirect-based URL validation bypass
- CWE-918: Server-Side Request Forgery
- OWASP: SSRF Prevention Cheat Sheet — redirect handling
- PortSwigger: SSRF with filter bypass via open redirection
