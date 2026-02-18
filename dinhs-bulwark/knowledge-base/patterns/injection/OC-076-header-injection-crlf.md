# OC-076: Header Injection (CRLF)

**Category:** Injection
**Severity:** HIGH
**Auditors:** INJ-01
**CWE:** CWE-113
**OWASP:** A03:2021 Injection

## Description

HTTP header injection (CRLF injection) occurs when user-controlled input containing carriage return (`\r`, `%0d`) and line feed (`\n`, `%0a`) characters is included in HTTP response headers. An attacker can inject new headers or split the response to inject an entirely new HTTP response body, enabling cache poisoning, XSS, session fixation, and redirect attacks.

In Node.js, modern versions of the `http` module reject header values containing `\r` and `\n` characters, but older versions (before Node.js 18.19.0 and 20.11.0) were vulnerable. Applications using frameworks that set headers via `res.setHeader()` with user input are at risk. Common attack vectors include: redirect URLs in `Location` headers, user-controlled `Set-Cookie` values, and custom headers derived from request parameters.

HTTP response splitting occurs when CRLF injection allows the attacker to terminate the response headers and inject a fake response body, followed by a second fake response. This is particularly dangerous when a caching proxy stores the poisoned response.

## Detection

```
# User input in response headers
res\.setHeader\(.*req\.(body|query|params)
res\.header\(.*req\.
res\.set\(.*req\.
res\.redirect\(.*req\.
# Location header with user input
Location.*req\.(body|query|params)
# Set-Cookie with user input
Set-Cookie.*req\.
# Custom headers from user input
res\.writeHead\(.*req\.
```

## Vulnerable Code

```typescript
app.get('/redirect', (req, res) => {
  const { url } = req.query;
  // VULNERABLE: user input in Location header
  // Attacker: ?url=http://example.com%0d%0aSet-Cookie:%20admin=true
  res.redirect(url);
});

app.get('/lang', (req, res) => {
  const { language } = req.query;
  // VULNERABLE: user input in Set-Cookie header
  // Attacker: ?language=en%0d%0a%0d%0a<script>alert(1)</script>
  res.setHeader('Set-Cookie', `lang=${language}; Path=/`);
  res.send('Language set');
});

app.get('/download', (req, res) => {
  const { filename } = req.query;
  // VULNERABLE: filename in Content-Disposition header
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(fileContent);
});
```

## Secure Code

```typescript
// SAFE: Validate and sanitize header values
function sanitizeHeaderValue(value: string): string {
  // Remove CR and LF characters
  return value.replace(/[\r\n]/g, '');
}

app.get('/redirect', (req, res) => {
  const { url } = req.query;
  // SAFE: Validate redirect URL against allowlist
  const allowedHosts = ['example.com', 'app.example.com'];
  try {
    const parsed = new URL(url);
    if (!allowedHosts.includes(parsed.hostname)) {
      return res.status(400).send('Invalid redirect');
    }
    res.redirect(parsed.toString());
  } catch {
    res.status(400).send('Invalid URL');
  }
});

app.get('/lang', (req, res) => {
  const { language } = req.query;
  // SAFE: Allowlist for language values
  const allowed = ['en', 'es', 'fr', 'de', 'ja'];
  if (!allowed.includes(language)) {
    return res.status(400).send('Invalid language');
  }
  res.cookie('lang', language, { path: '/', httpOnly: true });
  res.send('Language set');
});
```

## Impact

HTTP response splitting enabling XSS, cache poisoning, and session fixation. Setting arbitrary cookies to hijack sessions. Redirecting users to malicious sites. Defacing cached responses.

## References

- CWE-113: Improper Neutralization of CRLF Sequences in HTTP Headers
- OWASP: HTTP Response Splitting
- PortSwigger: HTTP response header injection
- Invicti: CRLF injection, HTTP response splitting & HTTP header injection
- CAPEC-34: HTTP Response Splitting
