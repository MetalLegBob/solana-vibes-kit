# OC-147: SSRF via User-Configurable Webhook URL

**Category:** API & Network
**Severity:** HIGH
**Auditors:** API-04, INJ-03
**CWE:** CWE-918
**OWASP:** API7:2023 - Server Side Request Forgery

## Description

Server-Side Request Forgery (SSRF) via webhook URLs occurs when an application allows users to configure a webhook delivery URL and the server makes HTTP requests to that URL without validating the target. An attacker sets the webhook URL to an internal service address (e.g., `http://169.254.169.254/latest/meta-data/` for cloud metadata, `http://localhost:6379/` for Redis, or `http://internal-admin.svc.cluster.local/`) and the server sends webhook payloads to that internal target.

This is one of the most exploited SSRF vectors in modern applications because webhook configuration is a legitimate feature that requires the server to make outbound HTTP requests by design. The distinction between a legitimate webhook URL (`https://hooks.slack.com/services/...`) and a malicious one (`http://169.254.169.254/`) must be enforced explicitly, and many applications fail to do so.

OWASP API Security Top 10 (2023) includes SSRF as API7:2023, specifically calling out user-controlled URLs for webhook and callback mechanisms. In cloud environments, the cloud metadata service at `169.254.169.254` is the primary target: successful SSRF against it yields IAM credentials, instance metadata, and access keys. Capital One's 2019 breach (which exposed data of 106 million customers) was caused by an SSRF vulnerability that accessed AWS metadata endpoints.

## Detection

```
# User-configurable URL fields
grep -rn "webhookUrl\|callback_url\|notification_url\|endpoint_url" --include="*.ts" --include="*.js"
# HTTP requests to user-controlled URLs
grep -rn "fetch\|axios\|request\|got\|http\.request" --include="*.ts" --include="*.js" | grep -i "webhook\|url\|endpoint"
# Missing URL validation
grep -rn "webhookUrl\|callbackUrl" --include="*.ts" --include="*.js" | grep -v "validate\|whitelist\|allowlist\|block\|deny"
# Cloud metadata IP
grep -rn "169\.254\.169\.254\|metadata\.google" --include="*.ts" --include="*.js"
```

## Vulnerable Code

```typescript
import express from 'express';
import axios from 'axios';

// VULNERABLE: User sets any webhook URL, server fetches it without validation
app.post('/api/settings/webhook', authenticate, async (req, res) => {
  const { webhookUrl } = req.body;
  // No URL validation -- attacker sets http://169.254.169.254/latest/meta-data/iam/
  await db.query('UPDATE users SET webhook_url = $1 WHERE id = $2', [webhookUrl, req.user.id]);
  res.json({ success: true });
});

// Later, when sending webhook events:
async function sendWebhook(userId: string, event: object) {
  const user = await db.query('SELECT webhook_url FROM users WHERE id = $1', [userId]);
  // VULNERABLE: Server makes request to attacker-controlled URL
  await axios.post(user.webhook_url, event, { timeout: 5000 });
  // If URL is http://169.254.169.254/latest/meta-data/iam/security-credentials/
  // the response contains AWS IAM credentials
}
```

## Secure Code

```typescript
import express from 'express';
import axios from 'axios';
import { URL } from 'url';
import dns from 'dns/promises';
import ipaddr from 'ipaddr.js';

const BLOCKED_HOSTS = ['localhost', '127.0.0.1', '0.0.0.0', '::1', 'metadata.google.internal'];
const BLOCKED_RANGES = [
  '10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16',  // Private
  '169.254.0.0/16',                                    // Link-local / cloud metadata
  '100.64.0.0/10',                                     // Carrier-grade NAT
  'fc00::/7',                                           // IPv6 private
];

async function validateWebhookUrl(urlString: string): Promise<boolean> {
  let parsed: URL;
  try {
    parsed = new URL(urlString);
  } catch {
    return false;
  }

  // Must be HTTPS
  if (parsed.protocol !== 'https:') return false;

  // Block known dangerous hosts
  if (BLOCKED_HOSTS.includes(parsed.hostname)) return false;

  // Resolve DNS and check against blocked IP ranges
  const addresses = await dns.resolve4(parsed.hostname);
  for (const addr of addresses) {
    const ip = ipaddr.parse(addr);
    for (const range of BLOCKED_RANGES) {
      if (ip.match(ipaddr.parseCIDR(range))) return false;
    }
  }

  return true;
}

app.post('/api/settings/webhook', authenticate, async (req, res) => {
  const { webhookUrl } = req.body;

  if (!await validateWebhookUrl(webhookUrl)) {
    return res.status(400).json({ error: 'Invalid webhook URL: must be HTTPS and not target internal networks' });
  }

  await db.query('UPDATE users SET webhook_url = $1 WHERE id = $2', [webhookUrl, req.user.id]);
  res.json({ success: true });
});

async function sendWebhook(userId: string, event: object) {
  const user = await db.query('SELECT webhook_url FROM users WHERE id = $1', [userId]);

  // Re-validate at send time (DNS may have changed)
  if (!await validateWebhookUrl(user.webhook_url)) {
    logger.warn({ userId, url: user.webhook_url, msg: 'Webhook URL failed revalidation' });
    return;
  }

  await axios.post(user.webhook_url, event, {
    timeout: 5000,
    maxRedirects: 0,  // Prevent redirect-based SSRF bypass
  });
}
```

## Impact

SSRF via webhook URLs allows attackers to access cloud metadata services and steal IAM credentials, scan and interact with internal network services, read data from internal databases (Redis, Elasticsearch, Memcached), access internal admin interfaces, and pivot to other internal systems using stolen credentials. In cloud environments, the metadata endpoint SSRF can yield full account compromise.

## References

- CWE-918: Server-Side Request Forgery (SSRF)
- OWASP API7:2023 - Server Side Request Forgery: https://owasp.org/API-Security/editions/2023/en/0xa7-server-side-request-forgery/
- Capital One 2019 breach via SSRF (106M records)
- OWASP SSRF Prevention Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html
