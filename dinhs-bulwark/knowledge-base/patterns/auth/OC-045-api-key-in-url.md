# OC-045: API Key in URL (Logged by Proxies/Servers)

**Category:** Authentication & Authorization
**Severity:** MEDIUM
**Auditors:** AUTH-04
**CWE:** CWE-598
**OWASP:** A04:2021 - Insecure Design

## Description

Placing API keys or authentication tokens in URL query parameters exposes them to logging and leakage through multiple channels. URLs are routinely logged by web servers, reverse proxies, CDNs, load balancers, browser history, and analytics services. The HTTP Referer header also transmits the full URL (including query parameters) to any third-party resource loaded from the page.

Cyble's research found over 5,000 GitHub repositories and approximately 3,000 live production websites leaking API keys through hardcoded source code and client-side JavaScript. When these keys appear in URLs, the exposure surface is dramatically larger because URL logs are typically retained for months or years with less strict access controls than application data.

This pattern commonly appears in APIs that use query parameter authentication (e.g., `?api_key=xxx`), webhook URLs with embedded secrets, and signed URLs where the signature doubles as an access credential. OAuth access tokens in URL fragments are a specific variant addressed by the OAuth 2.0 Security Best Current Practice, which recommends against the implicit flow precisely because of this exposure risk.

## Detection

```
# API key in URL patterns
grep -rn "api_key=\|apiKey=\|access_token=\|token=" --include="*.ts" --include="*.js" | grep "url\|URL\|href\|fetch\|axios\|request"
# Query string construction with secrets
grep -rn "\?.*key=\|\?.*secret=\|\?.*token=" --include="*.ts" --include="*.js"
# Template literals with tokens in URL
grep -rn '`.*\$.*key\|`.*\$.*token\|`.*\$.*secret' --include="*.ts" --include="*.js" | grep "http"
```

## Vulnerable Code

```typescript
// VULNERABLE: API key in URL query parameter
async function fetchData(endpoint: string) {
  const apiKey = process.env.API_KEY;
  // Key will be logged by servers, proxies, and in browser history
  const response = await fetch(
    `https://api.service.com/${endpoint}?api_key=${apiKey}`
  );
  return response.json();
}

// VULNERABLE: Webhook URL with embedded secret
const webhookUrl = `https://myapp.com/webhooks/receive?secret=${WEBHOOK_SECRET}`;
await registerWebhook(webhookUrl);
```

## Secure Code

```typescript
// SECURE: API key in Authorization header
async function fetchData(endpoint: string) {
  const apiKey = process.env.API_KEY;
  const response = await fetch(`https://api.service.com/${endpoint}`, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });
  return response.json();
}

// SECURE: Webhook verified via signature header, not URL secret
app.post('/webhooks/receive', (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const expectedSig = crypto
    .createHmac('sha256', process.env.WEBHOOK_SECRET)
    .update(JSON.stringify(req.body))
    .digest('hex');
  if (!crypto.timingSafeEqual(
    Buffer.from(signature), Buffer.from(expectedSig)
  )) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  processWebhook(req.body);
  res.status(200).end();
});
```

## Impact

API keys in URLs are captured by web server logs, proxy logs, browser history, Referer headers, and analytics services. Anyone with access to these logs (including lower-privileged operations staff, log aggregation services, or attackers who compromise logging infrastructure) gains the API key.

## References

- CWE-598: Use of GET Request Method With Sensitive Query Strings
- Cyble: 5,000+ GitHub repos and 3,000+ websites leaking API keys in source code
- RFC 9700: OAuth 2.0 Security Best Current Practice (deprecating implicit flow)
- https://owasp.org/Top10/A04_2021-Insecure_Design/
