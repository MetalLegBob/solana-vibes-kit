# OC-057: SSRF to Cloud Metadata (169.254.169.254)

**Category:** Injection
**Severity:** CRITICAL
**Auditors:** INJ-03
**CWE:** CWE-918
**OWASP:** A10:2021 Server-Side Request Forgery

## Description

Server-Side Request Forgery (SSRF) targeting cloud metadata services is one of the most impactful web vulnerabilities in cloud-hosted applications. The AWS Instance Metadata Service (IMDS) at `169.254.169.254` returns IAM credentials, instance identity documents, and user data scripts. Similar services exist in GCP (`metadata.google.internal`) and Azure (`169.254.169.254` with specific headers).

SSRF attacks surged 452% in 2024 according to Vectra AI research, driven by automated scanning tools. The Capital One breach (2019) demonstrated the catastrophic potential: an SSRF in a WAF configuration exposed IAM credentials via the metadata service, leading to 100 million customer records stolen. In October 2025, the Cl0p ransomware group weaponized an SSRF in Oracle E-Business Suite (CVE-2025-61882) affecting Fortune 500 organizations.

Mandiant has identified attackers performing automated scanning for SSRF vulnerabilities specifically to harvest IAM credentials from the metadata endpoint. While AWS IMDSv2 mitigates basic SSRF by requiring a PUT request with a hop-limit header, many organizations still run IMDSv1.

## Detection

```
# URL handling that could reach metadata
169\.254\.169\.254
metadata\.google\.internal
metadata\.azure\.com
# User-controlled URL fetching
fetch\(.*req\.(body|query|params)
axios\.(get|post)\(.*req\.
http\.get\(.*req\.
urllib\.request
got\(.*req\.
# URL parsing/construction
new URL\(.*req\.
```

## Vulnerable Code

```typescript
import axios from 'axios';

app.post('/fetch-url', async (req, res) => {
  const { url } = req.body;
  // VULNERABLE: No validation on the URL
  const response = await axios.get(url);
  res.json(response.data);
  // Attacker sends: url = "http://169.254.169.254/latest/meta-data/iam/security-credentials/"
});

// Also vulnerable: image proxy, webhook testing, URL preview
app.get('/preview', async (req, res) => {
  const { link } = req.query;
  const response = await fetch(link);
  const html = await response.text();
  res.send(extractTitle(html));
});
```

## Secure Code

```typescript
import axios from 'axios';
import { URL } from 'url';
import dns from 'dns/promises';
import ipaddr from 'ipaddr.js';

async function isUrlSafe(urlString: string): Promise<boolean> {
  const url = new URL(urlString);
  if (!['http:', 'https:'].includes(url.protocol)) return false;

  const addresses = await dns.resolve4(url.hostname);
  for (const addr of addresses) {
    const parsed = ipaddr.parse(addr);
    const range = parsed.range();
    // Block private, loopback, and link-local ranges
    if (['private', 'loopback', 'linkLocal', 'uniqueLocal'].includes(range)) {
      return false;
    }
  }
  return true;
}

app.post('/fetch-url', async (req, res) => {
  const { url } = req.body;
  if (!await isUrlSafe(url)) {
    return res.status(400).json({ error: 'URL not allowed' });
  }
  // SAFE: also set timeout and max redirects
  const response = await axios.get(url, {
    maxRedirects: 0,
    timeout: 5000
  });
  res.json(response.data);
});
```

## Impact

Theft of cloud IAM credentials granting access to S3 buckets, databases, and other AWS services. Full cloud account takeover. Access to internal services behind the firewall. Exfiltration of instance user data which may contain startup secrets.

## References

- CVE-2025-61882: Oracle EBS SSRF exploited by Cl0p ransomware (CISA KEV)
- CVE-2026-26019: Langchain Community SSRF via RecursiveUrlLoader
- CWE-918: Server-Side Request Forgery
- Hacking The Cloud: Steal EC2 Metadata Credentials via SSRF
- Resecurity: SSRF to AWS Metadata Exposure — How Attackers Steal Cloud Credentials
- Capital One breach (2019): SSRF to IMDS credential theft
