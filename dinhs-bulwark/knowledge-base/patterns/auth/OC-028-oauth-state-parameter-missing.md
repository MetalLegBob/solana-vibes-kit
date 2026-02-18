# OC-028: OAuth State Parameter Missing (CSRF)

**Category:** Authentication & Authorization
**Severity:** HIGH
**Auditors:** AUTH-01, WEB-03
**CWE:** CWE-352
**OWASP:** A07:2021 - Identification and Authentication Failures

## Description

The OAuth 2.0 `state` parameter is a CSRF protection mechanism that binds the authorization request to the user's session. When omitted or not validated, an attacker can perform a login CSRF attack: they initiate an OAuth flow with their own account, then trick a victim into completing it. The victim's session becomes linked to the attacker's identity, or the attacker's code gets exchanged in the victim's session.

Without the `state` parameter, an attacker can also perform authorization code injection, where a stolen code from one session is replayed in another. The OAuth 2.0 Security Best Current Practice (RFC 9700) explicitly requires the `state` parameter for CSRF protection unless PKCE is used.

This is one of the most common OAuth implementation flaws found in security assessments. Doyensec's comprehensive OAuth vulnerability guide lists it as a top finding, noting that many developers skip it because the OAuth flow "works" without it.

## Detection

```
# OAuth authorization URL construction without state
grep -rn "authorize\?.*client_id" --include="*.ts" --include="*.js" | grep -v "state"
# OAuth callback handler without state validation
grep -rn "\/callback\|\/oauth.*callback\|authCallback" --include="*.ts" --include="*.js"
# Missing state generation
grep -rn "state.*=.*random\|state.*=.*uuid\|state.*=.*crypto" --include="*.ts" --include="*.js"
```

## Vulnerable Code

```typescript
// VULNERABLE: No state parameter in OAuth flow
app.get('/auth/github', (req, res) => {
  const authUrl = `https://github.com/login/oauth/authorize?` +
    `client_id=${CLIENT_ID}&redirect_uri=${CALLBACK_URL}&scope=user:email`;
  // No state parameter -- vulnerable to CSRF
  res.redirect(authUrl);
});

app.get('/auth/github/callback', async (req, res) => {
  const { code } = req.query;
  // No state validation
  const token = await exchangeCode(code);
  req.session.user = await getUserInfo(token);
  res.redirect('/dashboard');
});
```

## Secure Code

```typescript
import crypto from 'crypto';

// SECURE: Generate and validate state parameter
app.get('/auth/github', (req, res) => {
  const state = crypto.randomBytes(32).toString('hex');
  req.session.oauthState = state;
  const authUrl = `https://github.com/login/oauth/authorize?` +
    `client_id=${CLIENT_ID}&redirect_uri=${CALLBACK_URL}` +
    `&scope=user:email&state=${state}`;
  res.redirect(authUrl);
});

app.get('/auth/github/callback', async (req, res) => {
  const { code, state } = req.query;
  // Validate state matches session
  if (!state || state !== req.session.oauthState) {
    delete req.session.oauthState;
    return res.status(403).json({ error: 'Invalid state parameter' });
  }
  delete req.session.oauthState;
  const token = await exchangeCode(code);
  req.session.user = await getUserInfo(token);
  res.redirect('/dashboard');
});
```

## Impact

An attacker can link a victim's session to the attacker's account, gaining the ability to monitor the victim's activity or inject their own identity into the victim's session. This enables account confusion attacks and potentially full account takeover.

## References

- RFC 6749 Section 10.12: Cross-Site Request Forgery
- RFC 9700: OAuth 2.0 Security Best Current Practice
- https://blog.doyensec.com/2025/01/30/oauth-common-vulnerabilities.html
- https://owasp.org/Top10/A07_2021-Identification_and_Authentication_Failures/
