# OC-011: Secret in URL Query Parameter

**Category:** Secrets & Credentials
**Severity:** HIGH
**Auditors:** SEC-02, DATA-04
**CWE:** CWE-598 (Use of GET Request Method With Sensitive Query Strings)
**OWASP:** A04:2021 – Insecure Design

## Description

Placing secrets — API keys, tokens, passwords, or signing material — in URL query parameters causes them to be recorded in multiple locations outside the application's control: browser history, HTTP server access logs, proxy logs, CDN logs, referrer headers, and analytics platforms. URLs are treated as non-sensitive by most infrastructure components and are logged, cached, and shared freely.

This pattern frequently occurs with RPC endpoint authentication (e.g., `https://solana-mainnet.g.alchemy.com/v2/<API_KEY>`), webhook verification tokens, and API keys passed as query strings. While some services require this pattern, applications should treat the URL as a public channel and avoid placing high-value secrets in it.

The risk is amplified in browser-based applications where URLs are visible in the address bar, stored in browser history, sent in `Referer` headers on navigation, and captured by browser extensions. Even in server-to-server communication, URLs are logged by load balancers, WAFs, and monitoring tools.

## Detection

```
grep -rn "api[_-]key=\|token=\|secret=\|password=\|auth=" --include="*.ts" --include="*.js"
grep -rn "apiKey.*\?\|key=.*http" --include="*.ts" --include="*.js"
grep -rn "query.*secret\|query.*key\|query.*token" --include="*.ts" --include="*.js"
grep -rn "\?.*=.*sk[-_]\|api_key=" --include="*.ts" --include="*.js" --include="*.env"
```

Look for: URLs constructed with secret values in query strings, fetch/axios calls with tokens in URL, RPC endpoints with API keys in path or query.

## Vulnerable Code

```typescript
// VULNERABLE: API key in URL query parameter
const RPC_URL = `https://solana-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_KEY}`;

// The key appears in every log line, every error trace, and monitoring
const connection = new Connection(RPC_URL);

// Also vulnerable: webhook secret in callback URL
app.post("/register-webhook", async (req, res) => {
  const callbackUrl = `https://api.example.com/webhook?secret=${process.env.WEBHOOK_SECRET}`;
  await registerCallback(callbackUrl);
});
```

## Secure Code

```typescript
// SECURE: Use headers for authentication where possible
// For RPC endpoints that require key in URL, ensure the URL is never logged

// Keep the URL construction isolated and marked as sensitive
const getRpcUrl = (): string => {
  const key = process.env.ALCHEMY_KEY;
  if (!key) throw new Error("ALCHEMY_KEY not set");
  return `https://solana-mainnet.g.alchemy.com/v2/${key}`;
};

// Configure logging to redact URLs with keys
const connection = new Connection(getRpcUrl(), {
  // Don't log the full URL
  commitment: "confirmed",
});

// For webhook verification: use HMAC signature in headers instead
app.post("/webhook", (req, res) => {
  const signature = req.headers["x-webhook-signature"];
  const expectedSig = crypto
    .createHmac("sha256", process.env.WEBHOOK_SECRET!)
    .update(JSON.stringify(req.body))
    .digest("hex");

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
    return res.status(401).json({ error: "Invalid signature" });
  }
  // Process webhook...
});
```

## Impact

Secrets in URLs are logged by web servers, proxies, CDNs, browser history, analytics tools, and error monitoring services. Each of these becomes an additional attack surface. An attacker who gains access to any log source obtains the secret. For RPC API keys, this means unauthorized usage and cost amplification. For authentication tokens, this means account takeover.

## References

- CWE-598: Use of GET Request Method With Sensitive Query Strings — https://cwe.mitre.org/data/definitions/598.html
- OWASP: Information Exposure Through Query Strings in URL
- RFC 9110: HTTP Semantics — URLs should not contain sensitive information
- Alchemy/Infura documentation: API key security best practices
