# OC-046: Refresh Token Reuse Without Rotation

**Category:** Authentication & Authorization
**Severity:** HIGH
**Auditors:** AUTH-04
**CWE:** CWE-384
**OWASP:** A07:2021 - Identification and Authentication Failures

## Description

Refresh tokens are long-lived credentials used to obtain new access tokens without requiring the user to re-authenticate. When a refresh token can be used multiple times without being rotated (replaced with a new one on each use), a stolen refresh token grants persistent access that cannot be detected or revoked.

With refresh token rotation, each use of a refresh token issues a new refresh token and invalidates the old one. If an attacker steals and uses a refresh token, either the attacker or the legitimate user will present the old (invalidated) token on their next refresh attempt. The server can detect this reuse as a potential compromise and invalidate all tokens for that session.

Without rotation, both the attacker and legitimate user can use the same refresh token indefinitely. The attacker can maintain access for the full lifetime of the refresh token (often 30-90 days), even if the user changes their password, unless the application specifically invalidates refresh tokens on password change.

## Detection

```
# Refresh token endpoints
grep -rn "refresh.*token\|\/token\/refresh\|\/auth\/refresh" --include="*.ts" --include="*.js"
# Token issuance without rotation logic
grep -rn "refreshToken" --include="*.ts" --include="*.js" | grep -v "rotate\|revoke\|invalidate\|replace\|new.*refresh"
# Refresh token storage
grep -rn "refresh_token.*=\|refreshToken.*=" --include="*.ts" --include="*.js" | grep "save\|insert\|update\|store"
```

## Vulnerable Code

```typescript
// VULNERABLE: Refresh token reused without rotation
app.post('/api/token/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  const tokenData = await db.query(
    'SELECT * FROM refresh_tokens WHERE token = $1', [refreshToken]
  );
  if (!tokenData.rows[0]) return res.status(401).end();
  if (tokenData.rows[0].expires_at < new Date()) return res.status(401).end();

  // Same refresh token remains valid -- attacker can reuse it
  const accessToken = jwt.sign(
    { userId: tokenData.rows[0].user_id },
    secret,
    { expiresIn: '15m' }
  );
  res.json({ accessToken }); // No new refresh token issued
});
```

## Secure Code

```typescript
// SECURE: Refresh token rotation with reuse detection
app.post('/api/token/refresh', async (req, res) => {
  const { refreshToken } = req.body;

  const tokenData = await db.query(
    'SELECT * FROM refresh_tokens WHERE token = $1', [refreshToken]
  );
  if (!tokenData.rows[0]) return res.status(401).end();

  // Check if token was already used (potential theft)
  if (tokenData.rows[0].used) {
    // Reuse detected: invalidate ALL tokens for this family
    await db.query(
      'DELETE FROM refresh_tokens WHERE family = $1',
      [tokenData.rows[0].family]
    );
    return res.status(401).json({ error: 'Token reuse detected. All sessions revoked.' });
  }

  // Mark old token as used
  await db.query('UPDATE refresh_tokens SET used = true WHERE id = $1',
    [tokenData.rows[0].id]);

  // Issue new token pair
  const newRefreshToken = crypto.randomBytes(32).toString('hex');
  await db.query(
    'INSERT INTO refresh_tokens (token, user_id, family, expires_at) VALUES ($1, $2, $3, $4)',
    [newRefreshToken, tokenData.rows[0].user_id, tokenData.rows[0].family,
     new Date(Date.now() + 30 * 24 * 3600 * 1000)]
  );

  const accessToken = jwt.sign(
    { userId: tokenData.rows[0].user_id },
    secret,
    { expiresIn: '15m' }
  );
  res.json({ accessToken, refreshToken: newRefreshToken });
});
```

## Impact

A stolen refresh token grants long-term persistent access (typically 30-90 days). Without rotation, the theft is undetectable -- both attacker and user can operate simultaneously. With rotation, reuse detection provides an automatic theft alert mechanism.

## References

- RFC 6749 Section 10.4: Refresh Token security considerations
- OAuth 2.0 Security Best Current Practice (RFC 9700): Refresh Token Rotation
- CWE-384: Session Fixation (applies to token reuse)
- https://auth0.com/docs/secure/tokens/refresh-tokens/refresh-token-rotation
