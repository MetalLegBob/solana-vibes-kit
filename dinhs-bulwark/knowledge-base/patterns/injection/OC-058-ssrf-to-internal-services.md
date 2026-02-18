# OC-058: SSRF to Internal Services

**Category:** Injection
**Severity:** HIGH
**Auditors:** INJ-03
**CWE:** CWE-918
**OWASP:** A10:2021 Server-Side Request Forgery

## Description

SSRF to internal services occurs when an attacker can make the server issue requests to internal network resources that are not directly accessible from the internet. This includes databases, admin panels, caches (Redis, Memcached), message queues, internal APIs, and Kubernetes services.

Unlike SSRF targeting cloud metadata, internal service SSRF exploits the server's network position to reach services protected by network segmentation. In microservice architectures, internal services often have minimal or no authentication because they rely on network-level isolation. An SSRF vulnerability in any internet-facing service bridges this isolation.

CVE-2025-54122 demonstrated a critical unauthenticated SSRF that enabled internal data exposure via a management interface. The Langchain Community package CVE-2026-26019 showed how a string-comparison-based URL validation could be bypassed to access internal services.

## Detection

```
# URL fetching with user input
fetch\(.*req\.(body|query|params)
axios\.(get|post|put)\(.*url
http\.request\(.*url
got\(.*url
request\(.*url
# Internal URL patterns
localhost
127\.0\.0\.1
0\.0\.0\.0
10\.\d+\.\d+\.\d+
172\.(1[6-9]|2\d|3[01])
192\.168\.
```

## Vulnerable Code

```typescript
// VULNERABLE: Webhook URL tester
app.post('/test-webhook', async (req, res) => {
  const { webhookUrl } = req.body;
  // No validation — can reach internal services
  const response = await fetch(webhookUrl, {
    method: 'POST',
    body: JSON.stringify({ test: true }),
    headers: { 'Content-Type': 'application/json' }
  });
  res.json({ status: response.status });
  // Attacker: webhookUrl = "http://redis-server:6379/"
  // Or: webhookUrl = "http://admin-panel.internal:3000/api/users"
});

// VULNERABLE: PDF generation from URL
app.post('/generate-pdf', async (req, res) => {
  const { pageUrl } = req.body;
  const pdf = await puppeteer.goto(pageUrl);
  res.send(pdf);
});
```

## Secure Code

```typescript
import { URL } from 'url';
import dns from 'dns/promises';
import ipaddr from 'ipaddr.js';

const BLOCKED_PORTS = [6379, 11211, 5432, 3306, 27017, 9200];
const ALLOWED_SCHEMES = ['http:', 'https:'];

async function validateExternalUrl(urlString: string): Promise<boolean> {
  const url = new URL(urlString);
  if (!ALLOWED_SCHEMES.includes(url.protocol)) return false;
  if (BLOCKED_PORTS.includes(Number(url.port))) return false;

  const addresses = await dns.resolve4(url.hostname);
  for (const addr of addresses) {
    const parsed = ipaddr.parse(addr);
    if (parsed.range() !== 'unicast') return false;
  }
  return true;
}

app.post('/test-webhook', async (req, res) => {
  const { webhookUrl } = req.body;
  if (!await validateExternalUrl(webhookUrl)) {
    return res.status(400).json({ error: 'URL must be external' });
  }
  const response = await fetch(webhookUrl, {
    method: 'POST',
    body: JSON.stringify({ test: true }),
    redirect: 'error',
    signal: AbortSignal.timeout(5000)
  });
  res.json({ status: response.status });
});
```

## Impact

Access to internal databases, admin panels, and microservices. Data exfiltration via internal APIs. Redis command execution via HTTP protocol smuggling. Port scanning of the internal network.

## References

- CVE-2025-54122: Critical SSRF enabling internal data exposure
- CVE-2026-26019: Langchain Community SSRF URL validation bypass
- CWE-918: Server-Side Request Forgery
- OWASP: Server-Side Request Forgery Prevention Cheat Sheet
- PortSwigger: SSRF attacks against internal services
