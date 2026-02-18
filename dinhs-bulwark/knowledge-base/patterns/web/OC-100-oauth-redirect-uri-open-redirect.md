# OC-100: OAuth redirect_uri Open Redirect

**Category:** Web Application Security
**Severity:** HIGH
**Auditors:** WEB-04, AUTH-01
**CWE:** CWE-601
**OWASP:** A07:2021 - Identification and Authentication Failures

## Description

OAuth 2.0 uses `redirect_uri` to send authorization codes and tokens back to the client application after user authentication. If the OAuth server does not strictly validate the `redirect_uri` against a pre-registered allowlist, an attacker can modify it to redirect the authorization code or token to an attacker-controlled server, enabling account takeover.

Common redirect_uri validation failures include: (1) prefix matching that allows `https://legit.com.evil.com`, (2) allowing subdirectory manipulation like `https://legit.com/callback/../../../evil.com`, (3) accepting any subdomain like `https://anything.legit.com`, and (4) ignoring the path component entirely. Salt Security researchers (2024) discovered the "Open Response Type" vulnerability, where any XSS on the redirect domain could be chained with OAuth implicit flow to achieve long-lived account takeover.

Clerk reported that while 99.7% of their customers were protected by default configuration, the remaining 0.3% were vulnerable to the Open Response Type attack. The CVE-2024-31253 in WordPress OAuth Server allowed unauthenticated open redirects due to insufficient redirect_uri validation.

## Detection

```
# OAuth redirect_uri handling
grep -rn "redirect_uri\|redirectUri\|redirect_url" --include="*.ts" --include="*.js"

# OAuth callback endpoints
grep -rn "callback\|authorize\|oauth" --include="*.ts" --include="*.js"

# Redirect URI validation logic
grep -rn "redirect.*startsWith\|redirect.*includes\|redirect.*match\|redirect.*endsWith" --include="*.ts" --include="*.js"

# OAuth configuration
grep -rn "clientId\|client_id\|clientSecret\|client_secret" --include="*.ts" --include="*.js" --include="*.env"
```

## Vulnerable Code

```typescript
import express from 'express';

const app = express();

// VULNERABLE: OAuth server with weak redirect_uri validation
app.get('/oauth/authorize', (req, res) => {
  const { client_id, redirect_uri, response_type, state } = req.query;

  const client = db.oauthClients.findById(client_id as string);
  if (!client) return res.status(400).send('Invalid client');

  // VULNERABLE: Only checks that redirect_uri starts with the registered base
  // Attacker: redirect_uri=https://legit.com.evil.com/steal
  // Attacker: redirect_uri=https://legit.com/callback/../../evil.com
  if (!redirect_uri || !(redirect_uri as string).startsWith(client.registeredUri)) {
    return res.status(400).send('Invalid redirect_uri');
  }

  const code = generateAuthCode(client_id as string, req.user.id);
  // Authorization code sent to attacker-controlled URL
  res.redirect(`${redirect_uri}?code=${code}&state=${state}`);
});
```

## Secure Code

```typescript
import express from 'express';

const app = express();

// SECURE: Strict exact-match redirect_uri validation
app.get('/oauth/authorize', (req, res) => {
  const { client_id, redirect_uri, response_type, state } = req.query;

  const client = db.oauthClients.findById(client_id as string);
  if (!client) return res.status(400).send('Invalid client');

  // SECURE: Exact match against pre-registered URIs
  const normalizedRedirect = new URL(redirect_uri as string).toString();
  const allowedUris = client.registeredRedirectUris.map(
    (uri: string) => new URL(uri).toString()
  );

  if (!allowedUris.includes(normalizedRedirect)) {
    return res.status(400).json({
      error: 'invalid_request',
      error_description: 'redirect_uri does not match any registered URIs',
    });
  }

  const code = generateAuthCode(client_id as string, req.user.id);

  // Build redirect URL safely
  const redirectUrl = new URL(normalizedRedirect);
  redirectUrl.searchParams.set('code', code);
  if (state) redirectUrl.searchParams.set('state', state as string);

  res.redirect(redirectUrl.toString());
});
```

## Impact

An attacker who controls the redirect_uri receives the OAuth authorization code, which can be exchanged for an access token, granting full account access. This enables account takeover, data exfiltration, and unauthorized actions on behalf of the victim. In cryptocurrency platforms, this can lead to theft of funds through API access.

## References

- CVE-2024-31253: WordPress OAuth Server open redirect
- Salt Security: "Open Response Type" OAuth vulnerability (2024)
- Clerk: "Mitigating OAuth's recently discovered Open Response Type vulnerability" (2024)
- CWE-601: URL Redirection to Untrusted Site
- OWASP: OAuth 2.0 Security Best Current Practice
- RFC 6819: OAuth 2.0 Threat Model and Security Considerations
