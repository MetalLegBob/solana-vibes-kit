# OC-027: OAuth redirect_uri Validation Bypass

**Category:** Authentication & Authorization
**Severity:** HIGH
**Auditors:** AUTH-01
**CWE:** CWE-601, CWE-20
**OWASP:** A07:2021 - Identification and Authentication Failures

## Description

OAuth 2.0 relies on `redirect_uri` to return authorization codes and tokens to the correct client application. If the authorization server does not strictly validate the redirect URI against a pre-registered allowlist, an attacker can manipulate it to steal authorization codes or access tokens by redirecting the flow to an attacker-controlled endpoint.

This is a recurring vulnerability in major identity providers. CVE-2024-52289 in Authentik demonstrated that regex-based redirect URI validation could be bypassed when URIs were not properly escaped, enabling one-click account takeover. CVE-2023-6927 in Keycloak affected all OAuth clients with redirect URIs ending in a wildcard `*`, allowing attackers to construct URLs that bypassed validation. CVE-2019-3778 in Spring Security OAuth allowed manipulated redirect URIs to leak authorization codes.

Common bypass techniques include path traversal (`https://legit.com/../evil.com`), subdomain manipulation (`https://evil.legit.com`), URL encoding tricks, and open redirect chaining.

## Detection

```
# Redirect URI handling
grep -rn "redirect_uri\|redirectUri\|redirect_url\|callbackUrl" --include="*.ts" --include="*.js"
# Wildcard or regex in redirect validation
grep -rn "redirect.*\*\|redirect.*RegExp\|redirect.*match" --include="*.ts" --include="*.js"
# Missing strict comparison
grep -rn "startsWith\|includes\|indexOf.*redirect" --include="*.ts" --include="*.js"
```

## Vulnerable Code

```typescript
// VULNERABLE: Partial string matching for redirect_uri
app.get('/oauth/authorize', (req, res) => {
  const { redirect_uri, client_id, state } = req.query;
  const client = await getClient(client_id);

  // Attacker uses: https://legit.com.evil.com/callback
  if (redirect_uri.startsWith(client.allowedRedirectBase)) {
    const code = generateAuthCode(req.user, client);
    return res.redirect(`${redirect_uri}?code=${code}&state=${state}`);
  }
  res.status(400).json({ error: 'invalid_redirect_uri' });
});
```

## Secure Code

```typescript
// SECURE: Exact match against pre-registered URIs
app.get('/oauth/authorize', (req, res) => {
  const { redirect_uri, client_id, state } = req.query;
  const client = await getClient(client_id);

  // Strict exact match against allowlist
  if (!client.registeredRedirectUris.includes(redirect_uri)) {
    return res.status(400).json({ error: 'invalid_redirect_uri' });
  }

  const code = generateAuthCode(req.user, client);
  const redirectUrl = new URL(redirect_uri);
  redirectUrl.searchParams.set('code', code);
  redirectUrl.searchParams.set('state', state);
  return res.redirect(redirectUrl.toString());
});
```

## Impact

An attacker can steal OAuth authorization codes or access tokens by redirecting the authentication flow to their server. This enables account takeover of any user who clicks the crafted authorization link.

## References

- CVE-2024-52289: Authentik redirect URI bypass via regex matching
- CVE-2023-6927: Keycloak redirect URI wildcard bypass
- CVE-2019-3778: Spring Security OAuth open redirector leaking authorization codes
- CVE-2024-7260: Keycloak open redirect vulnerability
- https://blog.doyensec.com/2025/01/30/oauth-common-vulnerabilities.html
